// noinspection JSUnusedGlobalSymbols

'use strict';

import type LoggerCap from "../utils/LoggerCap";

import type {
    FakeTimerWithContext as _FakeTimerWithContext,
    InstalledClock as _InstalledClock,
    FakeMethod,
} from "@sinonjs/fake-timers";

import { withGlobal } from "@sinonjs/fake-timers";

import { EventEmitterX } from "../modules/events";
import { assertIsDefined } from "termi@type_guards";

type FakeTimerWithContext = _FakeTimerWithContext & {
    __clock?: ClockType,
}

type ClockType = ReturnType<FakeTimerWithContext["install"]> & {
    restore: ReturnType<FakeTimerWithContext["install"]>["uninstall"],
    __stacks: {
        stack: string,
        dateOrConfig?: Date | number | string,
    }[],
    __clocks: number,
    __useJump?: boolean,
    __prev_clock?: ClockType,
};
type InstalledClock = _InstalledClock & ClockType & {
    timers: Record<number, { createdAt: number, callAt: number }>
    __useJump?: boolean,
};

// node_modules/.pnpm/@sinonjs+fake-timers@8.1.0/node_modules/@sinonjs/fake-timers/src/fake-timers-src.js
/**
 * Не создаём fakeTimers сразу из-за того, что внутри [функции `withGlobal`]{@link @sinonjs/fake-timers/src/fake-timers-src.js}
 *  есть сохранение текущего конструктора Date, а это помешает нам подменять его в тестах (на EnhancedDate, например).
 */
let defaultFakeTimers: FakeTimerWithContext | undefined = void 0;
let logger: Console | LoggerCap = console;

export const realPerformanceMethods = {
    now: performance.now.bind(performance),
    /* todo: In old version of nodejs and jest running with JSDOM performance has only `now()` method.
    mark: performance.mark.bind(performance),
    measure: performance.measure.bind(performance),
    clearMarks: performance.clearMarks.bind(performance),
    clearMeasures: performance.clearMeasures.bind(performance),
    getEntriesByName: performance.getEntriesByName.bind(performance),
    **/
};

Object.setPrototypeOf(realPerformanceMethods, null);

/**
 * events:
 *  - `before-fakeTimers`
 *  - `fakeTimers`
 *  - `before-realTimers`
 *  - `realTimers`
 *  - `advanceTimersByTime`
 */
export const fakeTimerEvents = new EventEmitterX();

export function setFakeTimersLogger(newLogger: Console | LoggerCap) {
    logger = newLogger || console;
}

function _detectNewNow(newNow?: Date | number | string) {
    const argumentIsDateLike = typeof newNow === "number"
        || newNow instanceof Date
    ;
    const argumentFromDateString = typeof newNow === "string" && (function() {
        const date = new Date(newNow);
        const time = date.getTime();

        if (Number.isNaN(time)) {
            throw new TypeError('Invalid Data string');
        }

        return time;
    })();
    const argumentIsObject = newNow !== null
        && typeof newNow === "object"
    ;
    const hasArgument = argumentIsDateLike || argumentFromDateString || argumentIsObject;
    const _new_now: Date | number | { valueOf(): number } = hasArgument
        ? argumentFromDateString ? argumentFromDateString : (newNow as number)
        : Date.now()
    ;
    const _newNow = _new_now ? Number(_new_now) : void 0;

    return {
        argumentIsDateLike,
        argumentFromDateString,
        argumentIsObject,
        hasArgument,
        newNow: _newNow,
    };
}

export function useFakeTimers(dateOrConfig?: Date | number | string, {
    useJump = false,
    mockSetImmediate = false,
    mockQueueMicrotask = false,
} = {} as {
    useJump?: boolean,
    mockSetImmediate?: boolean,
    mockQueueMicrotask?: boolean,
}) {
    defaultFakeTimers ??= withGlobal(globalThis) as ReturnType<typeof withGlobal> & { __clock?: ClockType };

    const {
        argumentIsDateLike,
        argumentFromDateString,
        argumentIsObject,
        hasArgument,
        newNow: new_now = Date.now(),
    } = _detectNewNow(dateOrConfig);

    const clock = defaultFakeTimers["__clock"];
    const callStackObject = {
        stack: new Error('-get-stack-').stack as string,
        dateOrConfig,
    };
    const clockConfig = mockQueueMicrotask
        ? {
            toFake: [
                "setTimeout",
                "clearTimeout",
                "setInterval",
                "clearInterval",
                "Date",
                mockSetImmediate ? "setImmediate" : void 0,
                mockSetImmediate ? "clearImmediate" : void 0,
                "hrtime",

                // Нужно укачать в списке queueMicrotask и nextTick, чтобы мока queueMicrotask заработала
                "queueMicrotask",
                "nextTick",
            ].filter(a => !!a) as FakeMethod[],
        }
        : void 0
    ;

    if (clock) {
        // already fake timers
        if (hasArgument) {
            const prev_clock = clock;

            if (argumentIsDateLike || argumentFromDateString) {
                const prev_now = prev_clock.now;
                const prev_uninstall = prev_clock.uninstall;

                prev_clock.setSystemTime(new_now);
                prev_clock.uninstall = function() {
                    prev_clock.setSystemTime(prev_now);
                    prev_clock.uninstall = prev_uninstall;
                    prev_clock.restore = prev_uninstall;

                    if (defaultFakeTimers && defaultFakeTimers["__clock"] !== prev_clock) {
                        defaultFakeTimers["__clock"] = prev_clock;
                    }

                    const index = (prev_clock.__stacks || []).indexOf(callStackObject);

                    if (index !== -1) {
                        prev_clock.__stacks.splice(index, 1);
                    }

                    prev_clock.__clocks--;
                };

                prev_clock.restore = prev_clock.uninstall;
                (prev_clock.__stacks ??= []).push(callStackObject);
                prev_clock.__clocks = (prev_clock.__clocks || 1) + 1;

                return prev_clock;
            }
            // todo: Код ниже нужно проверить на работоспособность именно так, как задумано
            else if (argumentIsObject) {
                const newFakeTimers = withGlobal(globalThis);
                const clock = newFakeTimers.install({
                    loopLimit: 100_000,
                    now: new_now,
                    // Очень важное свойство, т.к. далеко не всегда таймеры создаются ДО подмены на фейковое API
                    shouldClearNativeTimers: true,
                    ...clockConfig,
                }) as ClockType;

                _installClockPerformance(clock);

                if (!mockSetImmediate) {
                    _restoreRealImmediate();
                }

                const { uninstall } = clock;

                clock["__prev_clock"] = prev_clock;

                const new_uninstall = function() {
                    if (defaultFakeTimers) {
                        defaultFakeTimers["__clock"] = clock["__prev_clock"];
                    }

                    _uninstallClockPerformance(clock);
                    uninstall();
                };

                clock.uninstall = new_uninstall;
                clock.restore = new_uninstall;
                clock.__stacks = [ callStackObject ];
                clock.__clocks = 1;

                defaultFakeTimers["__clock"] = clock;

                if (useJump) {
                    clock["__useJump"] = useJump;
                }

                return clock;
            }
        }

        return clock;
    }

    {
        fakeTimerEvents.emit('before-fakeTimers');

        const clock = defaultFakeTimers.install({
            loopLimit: 100_000,
            now: new_now,
            shouldClearNativeTimers: true,
            ...clockConfig,
        }) as ClockType;

        _installClockPerformance(clock);

        if (!mockSetImmediate) {
            _restoreRealImmediate();
        }

        const { uninstall } = clock;

        const new_uninstall = function() {
            if (--clock.__clocks > 1) {
                throw new Error('Invalid call.uninstall sequence!');
            }

            _uninstallClockPerformance(clock);
            uninstall();

            if (!mockSetImmediate) {
                _restoreRealImmediate();
            }

            if (defaultFakeTimers && clock === defaultFakeTimers["__clock"]) {
                defaultFakeTimers["__clock"] = void 0;
            }
        };

        clock.uninstall = new_uninstall;
        clock.restore = new_uninstall;
        clock.__stacks = [ callStackObject ];
        clock.__clocks = 1;

        defaultFakeTimers["__clock"] = clock;

        if (useJump) {
            clock["__useJump"] = useJump;
        }

        fakeTimerEvents.emit('fakeTimers');

        return clock;
    }
}

/**
 * Возвращает назад нативные setImmediate/clearImmediate.
 *
 * Это нужно для того, чтобы работали некоторые библиотеки в которых используется setImmediate и для которых
 *  мы не можем отмотать время вперёд.
 *
 * Пример такой библиотеки: Express (node_modules/.pnpm/express@4.17.1/node_modules/express/lib/router/index.js:202).
 */
function _restoreRealImmediate() {
    if (globalThis.setImmediate !== _setImmediate) {
        globalThis.setImmediate = _setImmediate;
    }
    if (globalThis.clearImmediate !== _clearImmediate) {
        globalThis.clearImmediate = _clearImmediate;
    }
}

/**
 * Т.к. "@sinonjs/fake-timers" [не поддерживает полное Performance API (а только performance.now)](https://github.com/sinonjs/fake-timers/issues/420),
 *  возвращаем нужные методы performance в fake-performance объект созданный "@sinonjs/fake-timers".
 *
 * @private
 * @see [performance.mark doesn't exist in node@16 when using jsdom globals](https://github.com/sinonjs/fake-timers/issues/420)
 * @see [Fix that performance.mark is undefined after timer install](https://github.com/sinonjs/fake-timers/pull/160)
 */
function _installClockPerformance(clock: ClockType) {
    if (!clock.performance) {
        return;
    }

    //todo:
    // const fakePerformance = installPerformanceMeasuresFunctions(clock.performance, true);
    //
    // fakePerformance?.setNowMethod(() => {
    //     return clock.performance.now();
    // });
}

function _uninstallClockPerformance(clock: ClockType) {
    if (!clock.performance) {
        return;
    }

    //todo:
    // const fakePerformance = uninstallPerformanceMeasuresFunctions(clock.performance);
    //
    // fakePerformance?.setNowMethod(void 0);
}

/**
 * @see [Jest / runAllTimers]{@link https://jestjs.io/ru/docs/jest-object#jestrunalltimers}
 */
export function runAllTimers() {
    const clock = _checkFakeTimers(defaultFakeTimers);

    if (clock) {
        clock.runAll();
    }
}

/**
 * @see [Jest / clearAllTimers]{@link https://jestjs.io/ru/docs/jest-object#jestclearalltimers}
 */
export function clearAllTimers() {
    const clock = _checkFakeTimers(defaultFakeTimers);

    if (clock) {
        clock.reset();
    }
}

export function ensureFakeTimers() {
    if (checkIsFakeTimers()) {
        // nothing to do
    }
    else {
        useFakeTimers();
    }
}

/** @deprecated use {@link checkIsFakeTimers} */
export function isFakeTimers() {
    return checkIsFakeTimers();
}

export function checkIsFakeTimers() {
    return !!defaultFakeTimers?.["__clock"];
}

/**
 * @see [Jest / useRealTimers]{@link https://jestjs.io/ru/docs/jest-object#jestuserealtimers}
 */
export function useRealTimers() {
    const clock = _checkFakeTimers(defaultFakeTimers);

    if (clock) {
        assertIsDefined(defaultFakeTimers);

        fakeTimerEvents.emit('before-realTimers');

        delete defaultFakeTimers["__clock"];

        clock.uninstall();

        // Предотвращаем infinite loop
        let justInCaseCounter = 0;

        while (defaultFakeTimers["__clock"]) {
            const clock = defaultFakeTimers["__clock"] as ClockType;

            delete defaultFakeTimers["__clock"];

            clock.uninstall();

            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            if (++justInCaseCounter > 1000) {
                fakeTimerEvents.emit('realTimers');

                throw new Error('Unexpected ERROR. Too many fakeTimers["__clock"].uninstall()');
            }
        }

        fakeTimerEvents.emit('realTimers');
    }
}

export function setSystemTime(newNow: Date | number | string) {
    const _newNow = _detectNewNow(newNow).newNow;

    const clock = _checkFakeTimers(defaultFakeTimers);

    if (!clock) {
        throw new Error(`Can't set current time due FakeTimers is off`);
    }

    if (_newNow === void 0 || _newNow === clock.now) {
        // nothing to do
        return;
    }

    const diff = _newNow - clock.now;

    clock.now = _newNow;

    _updateTimersTimes(clock, diff);
}

export function isUsingFakeTimers() {
    return !!_checkFakeTimers(defaultFakeTimers);
}

function _updateTimersCallTime(clock: InstalledClock, msToRun: number) {
    // Для всех таймеров, которые должны запуститься после перемотки времени, обновляем их локальное время на
    //  то значение, которое будет после перемотки в `Date.now()`.
    const newNow = clock.now + msToRun;

    // У "clock" будет отсутствовать свойство "timers" до тех пор, пока хотя бы один `setTimeout` не будет вызван.
    if (clock["timers"]) {
        _assertClockWithTimers(clock);

        // update timers and intervals `callAt` to new Date.now()
        for (const timer of Object.values(clock.timers)) {
            if (timer.callAt < newNow) {
                timer.callAt = newNow;
            }
        }
    }
}

function _updateTimersTimes(clock: InstalledClock, msToRun: number) {
    // Делаем аналогичный код, который вызывается внутри `clock.setSystemTime`, т.к. сам `clock.setSystemTime` мы не можем
    //  вызвать напрямую, потому что он "сбросит" текущее время для `performance.now` (т.е., смещение msToRun не будет учитываться).

    // У "clock" будет отсутствовать свойство "timers" до тех пор, пока хотя бы один `setTimeout` не будет вызван.
    if (clock["timers"]) {
        _assertClockWithTimers(clock);

        const timersList = Object.values(clock.timers);

        if (timersList.length > 1000) {
            console.warn('fakeTimers: too big timers list');
        }

        // update timers and intervals `callAt` to new Date.now()
        for (const timer of timersList) {
            // Безусловно обновляем, не сравнивая значения
            timer.createdAt += msToRun;
            timer.callAt += msToRun;

            if (timer.callAt < 0) {
                throw new TypeError('Something went wrong then updating timer.callAt');
            }
        }
    }
}

function _updateTimersTimesForNegativeAdvance(clock: InstalledClock, msToRun: number) {
    if (msToRun >= 0) {
        throw new TypeError('"msToRun" should be negative');
    }

    _updateTimersTimes(clock, msToRun);
}

type _SinonInternalTimer = {
    callAt: number,
    createdAt: number,
    type: 'AnimationFrame' | 'IdleCallback' | 'Immediate' | 'Interval' | 'Timeout',
    delay?: number,
};

function _isSinonInternalTimer(maybeTimer: unknown): maybeTimer is _SinonInternalTimer {
    const _maybeTimer = maybeTimer as _SinonInternalTimer;

    return !(
        typeof maybeTimer !== 'object'
        || !maybeTimer
        || !('callAt' in maybeTimer)
        || !('createdAt' in maybeTimer)
        || (_maybeTimer.type !== 'Immediate' && !('delay' in maybeTimer))
    );
}

/**
 * `clock.jump` analog.
 *
 * @see [\[Feature\] Jump forward in time to simulate throttled timers](https://github.com/sinonjs/fake-timers/issues/452)
 * @see [Add clock.jump method](https://github.com/sinonjs/fake-timers/pull/465/files)
 */
function _clock_jump(ms: number, clock: InstalledClock) {
    const msToRun = Math.floor(ms);
    const { now } = clock;
    const new_now = now + msToRun;

    for (const timer of Object.values(clock["timers"] || {})) {
        if (!_isSinonInternalTimer(timer)) {
            throw new Error('clock with invalid "timers" property');
        }

        if (new_now > timer.callAt) {
            timer.callAt = new_now;
        }
    }

    clock.tick(ms);
}

/**
 * Отмотать время вперёд и выполнить все таймеры, которые должны быть выполнены после смещения времени.
 *
 * Обновляет значение `Date.now()`.
 *
 * @param msToRun - на сколько отмотать вперёд. Значение в миллисекундах.
 * @param updateTimersCallTime - обновляем время таймеров, которые будут выполнены после перемотки времени, чтобы их время выполнения соответствовало `Date.now()`.
 *  Аналог браузерного "Timers throttling": [Heavy throttling of chained JS timers beginning in Chrome 88]{@link https://developer.chrome.com/blog/timer-throttling-in-chrome-88/}.
 * @param reason
 * @param dontUseJump - Dont use `clock.jump` analog. See [\[Feature\] Jump forward in time to simulate throttled timers](https://github.com/sinonjs/fake-timers/issues/452) and [Add clock.jump method](https://github.com/sinonjs/fake-timers/pull/465/files)
 *
 * @see [Jest / advanceTimersByTime]{@link https://jestjs.io/ru/docs/jest-object#jestadvancetimersbytimemstorun}
 * @see [Jest / Advance Timers by Time]{@link https://jestjs.io/ru/docs/timer-mocks#advance-timers-by-time}
 */
export function advanceTimersByTime(msToRun: number, {
    updateTimersCallTime = false,
    reason = void 0,
    // note: Тут должно быть undefined по-умолчанию
    useJump = void 0,
}: {
    updateTimersCallTime?: boolean,
    reason?: string,
    useJump?: boolean,
} = {}) {
    if (Number.isNaN(msToRun) || msToRun == null) {
        throw new RangeError(`Invalid "msToRun" (${msToRun})`);
    }

    const clock = _checkFakeTimers(defaultFakeTimers);
    const isFakeTimers = !!clock;

    fakeTimerEvents.emit('advanceTimersByTime', {
        isAsync: false,
        now: isFakeTimers ? clock.now : Date.now(),
        time: msToRun,
        isFakeTimers,
        reason,
    });

    if (isFakeTimers) {
        useJump ??= !!clock["__useJump"];

        if (updateTimersCallTime) {
            _updateTimersCallTime(clock, msToRun);
        }

        if (msToRun >= 0) {// prevent error: `TypeError: Negative ticks are not supported`
            // Сейчас параметр "reason" не поддерживается `clock.tick()`, однако тут нужно его использовать,
            //  чтобы в режиме дебага можно было получить его значение. А в дальнейшем, параметр "reason"
            //  будет использовать в новой реализации `clock.tick()`, которая также будет сохранять статистику по таймерам.
            void reason;

            if (useJump) {
                _clock_jump(msToRun, clock);
            }
            else {
                clock.tick(msToRun);
            }
        }
        else {// Lowdown clock.now value (msToRun is negative)
            _updateTimersTimesForNegativeAdvance(clock, msToRun);

            // Тут нельзя вызывать `clock.setSystemTime`, т.к. эта функция "сбросит" текущее время для `performance.now` (т.е., смещение msToRun не будет учитываться).
            clock.now += msToRun;
        }
    }
}

/**
 * Отмотать время вперёд и выполнить все таймеры, которые должны быть выполнены после смещения времени.
 *
 * Обновляет значение `Date.now()`.
 *
 * @param msToRun - на сколько отмотать вперёд. Значение в миллисекундах.
 * @param updateTimersCallTime - обновляем время таймеров, которые будут выполнены после перемотки времени, чтобы их время выполнения соответствовало `Date.now()`.
 *  Аналог браузерного "Timers throttling": [Heavy throttling of chained JS timers beginning in Chrome 88]{@link https://developer.chrome.com/blog/timer-throttling-in-chrome-88/}.
 * @param reasonString
 *
 * @see [Jest / advanceTimersByTime]{@link https://jestjs.io/ru/docs/jest-object#jestadvancetimersbytimemstorun}
 * @see [Jest / Advance Timers by Time]{@link https://jestjs.io/ru/docs/timer-mocks#advance-timers-by-time}
 */
export async function advanceTimersByTimeAsync(msToRun: number, {
    updateTimersCallTime = false,
    reason = void 0,
    useJump,
}: {
    updateTimersCallTime?: boolean,
    reason?: string,
    useJump?: boolean,
} = {}) {
    if (Number.isNaN(msToRun) || msToRun == null) {
        throw new RangeError(`Invalid "msToRun" (${msToRun})`);
    }

    // Минимальная задержка, чтобы resolved Promise успели выполнить then в микротаске
    //  (это можно заменить на использование SyncPromise)
    // Allowing any scheduled promise callbacks to execute before running the timers.
    await realSleep();

    const clock = _checkFakeTimers(defaultFakeTimers);
    const isFakeTimers = !!clock;

    fakeTimerEvents.emit('advanceTimersByTime', {
        isAsync: true,
        now: isFakeTimers ? clock.now : Date.now(),
        time: msToRun,
        isFakeTimers,
        reason,
    });

    if (isFakeTimers) {
        if (useJump === void 0) {
            useJump = !!clock["__useJump"];
        }

        if (updateTimersCallTime) {
            _updateTimersCallTime(clock, msToRun);
        }

        if (msToRun >= 0) {// prevent error: `TypeError: Negative ticks are not supported`
            // Сейчас параметр "reason" не поддерживается `clock.tick()`, однако тут нужно его использовать,
            //  чтобы в режиме дебага можно было получить его значение. А в дальнейшем, параметр "reason"
            //  будет использовать в новой реализации `clock.tick()`, которая также будет сохранять статистику по таймерам.
            void reason;

            if (useJump) {
                _clock_jump(msToRun, clock);
            }
            else {
                clock.tick(msToRun);
            }
        }
        else {// Lowdown clock.now value (msToRun is negative)
            _updateTimersTimesForNegativeAdvance(clock, msToRun);

            // Тут нельзя вызывать `clock.setSystemTime`, т.к. эта функция "сбросит" текущее время для `performance.now` (т.е., смещение msToRun не будет учитываться).
            clock.now += msToRun;
        }

        // Минимальная задержка, чтобы resolved Promise успели выполнить then в микротаске
        //  (это можно заменить на использование SyncPromise)
        // Allowing any scheduled promise callbacks to execute.
        await realSleep();
    }
}

function _assertClockWithTimers(clock: InstalledClock): asserts clock is InstalledClock & { timers: Record<string, { callAt: number, createdAt: number, delay: number }> } {
    if (!('timers' in clock)) {
        throw new Error('clock without "timers" property');
    }

    const { timers } = clock as InstalledClock & { timers: Record<string, { callAt: number, createdAt: number }> };

    // noinspection LoopStatementThatDoesntLoopJS
    for (const a in timers) {// eslint-disable-line no-unreachable-loop
        const timer = timers[a] as NonNullable<typeof timers[0]>;

        if (!_isSinonInternalTimer(timer)) {
            throw new Error('clock with invalid "timers" property');
        }

        break;
    }
}

/*
function runOnlyPendingTimers() {
    const clock = _checkFakeTimers(fakeTimers);

    if (clock) {
        clock.runToLast();
    }
}
*/

function _checkFakeTimers(fakeTimers: FakeTimerWithContext | undefined): InstalledClock | void {
    if (!fakeTimers) {
        return void 0;
    }

    if (!fakeTimers["__clock"]) {
        const errorMessage = 'A function to advance timers was called but the timers API is not '
            + 'mocked with fake timers. Call `useFakeTimers()` in this test or '
            + 'enable fake timers globally by setting `"timers": "fake"` in the '
            + 'configuration file\nStack Trace:\n'
        ;
        const errorStack = new Error('-get-stack-').stack;

        try {
            logger.warn(errorMessage, errorStack);
        }
        catch (error) {
            const _error = String((error as Error)?.message || error || '');

            if (_error.includes('no such file or directory, lstat')
                && _error.includes('jest-util')
            ) {
                const _global = (globalThis as typeof globalThis & { nodejsConsole?: Console });

                // Тут может быть ошибка типа `ENOENT: no such file or directory, lstat 'D:\work\Callforce\cftools\node_modules\.pnpm\@jest+console@27.5.1\node_modules\jest-util'`
                // Если в момент вызова `logger.warn` активен fsMock.
                //
                // Попробуем найти глобальный nodejsConsole и вывести ошибку через него
                if (typeof _global["nodejsConsole"] === 'object'
                    && typeof (_global["nodejsConsole"] as Console).warn === 'function'
                ) {
                    (_global["nodejsConsole"] as Console).warn(errorMessage, errorStack);
                }
                else {
                    // todo: Что делать?
                }
            }
            else {
                throw error;
            }
        }

        return;
    }

    return fakeTimers["__clock"] as InstalledClock;
}

export function getJestTimersDebugInfo() {
    const clock = _checkFakeTimers(defaultFakeTimers);

    return clock?.["timers"];
}

// globalThis.nodejsSetTimeout from _dev/jest/jestProcess_onCreate
const _nonJest_setTimeout = (globalThis as unknown as { nodejsSetTimeout?: typeof setTimeout }).nodejsSetTimeout || setTimeout;
// globalThis.nodejsClearTimeout from _dev/jest/jestProcess_onCreate
const _nonJest_clearTimeout = (globalThis as unknown as { nodejsClearTimeout?: typeof clearTimeout }).nodejsClearTimeout || clearTimeout;
// globalThis.nodejsSetInterval from _dev/jest/jestProcess_onCreate
const _nonJest_setInterval = (globalThis as unknown as { nodejsSetInterval?: typeof setInterval }).nodejsSetInterval || setInterval;
// globalThis.nodejsClearInterval from _dev/jest/jestProcess_onCreate
const _nonJest_clearInterval = (globalThis as unknown as { nodejsClearInterval?: typeof clearInterval }).nodejsClearInterval || clearInterval;
// globalThis.nodejsSetImmediate from _dev/jest/jestProcess_onCreate
const _nonJest_setImmediate: typeof setImmediate | undefined =
    (globalThis as unknown as { nodejsSetImmediate?: typeof setImmediate }).nodejsSetImmediate
    || globalThis.setImmediate
    || void 0
;
// globalThis.nodejsClearImmediate from _dev/jest/jestProcess_onCreate
const _nonJest_clearImmediate: typeof clearImmediate | undefined =
    (globalThis as unknown as { nodejsClearImmediate?: typeof clearImmediate }).nodejsClearImmediate
    || globalThis.clearImmediate
    || void 0
;
// globalThis.nodejsQueueMicrotask from _dev/jest/jestProcess_onCreate
const _nonJest_queueMicrotask: typeof queueMicrotask | undefined =
    (globalThis as unknown as { nodejsQueueMicrotask?: typeof queueMicrotask }).nodejsQueueMicrotask
    || globalThis.queueMicrotask
    || void 0
;

const _setTimeout = _nonJest_setTimeout;
const _clearTimeout = _nonJest_clearTimeout;
// In jsdom env setImmediate is undefined
const _setImmediate = _nonJest_setImmediate || _setTimeout;
const _clearImmediate = _nonJest_clearImmediate || _clearTimeout;
// globalThis.nodejsQueueMicrotask from _dev/jest/jestProcess_onCreate
const _queueMicrotask = _nonJest_queueMicrotask || _setImmediate;

/**
 * @deprecated use {@link realSetTimeout}
 */
export function getRealSetTimeout() {
    return _setTimeout;
}

/**
 * @deprecated use {@link realClearTimeout}
 */
export function getRealClearTimeout() {
    return _clearTimeout;
}

export const nodejsSetTimeout = _nonJest_setTimeout;
export const nodejsClearTimeout = _nonJest_clearTimeout;
export const nodejsSetInterval = _nonJest_setInterval;
export const nodejsClearInterval = _nonJest_clearInterval;
export const nodejsSetImmediate = _nonJest_setImmediate;
export const nodejsClearImmediate = _nonJest_clearImmediate;
export const nodejsQueueMicrotask = _nonJest_queueMicrotask;
/** Unlike {@link nodejsSetTimeout} can be from DOMJS impl. But not the Jest Fake Timers (@sinonjs/fake-timers). */
export const realSetTimeout = _setTimeout;
/** Unlike {@link nodejsClearTimeout} can be from DOMJS impl. But not the Jest Fake Timers (@sinonjs/fake-timers). */
export const realClearTimeout = _clearTimeout;
export const realSetInterval = _nonJest_setInterval;
export const realClearInterval = _nonJest_clearInterval;
/** Unlike {@link nodejsSetImmediate} can be from DOMJS impl. But not the Jest Fake Timers (@sinonjs/fake-timers). */
export const realSetImmediate = _setImmediate;
/** Unlike {@link nodejsClearImmediate} can be from DOMJS impl. But not the Jest Fake Timers (@sinonjs/fake-timers). */
export const realClearImmediate = _clearImmediate;
/** Unlike {@link nodejsQueueMicrotask} can be from DOMJS impl. But not the Jest Fake Timers (@sinonjs/fake-timers). */
export const realQueueMicrotask = _queueMicrotask;

/**
 * * `ms > 0` - use `setTimeout(resolve, ms);`
 * * `ms == 0` - use `setImmediate(resolve);`
 * * `ms < 0` - use `queueMicrotask(resolve);`
 */
export function realSleep(ms = 0): Promise<void> {
    return new Promise(resolve => {
        if (ms > 0) {
            _setTimeout(resolve, ms);
        }
        else if (ms < 0) {
            _queueMicrotask(resolve);
        }
        else {
            _setImmediate(resolve);
        }
    });
}
