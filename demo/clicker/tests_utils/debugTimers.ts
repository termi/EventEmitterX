/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

/**
 * Прочитайте [Описание методов нахождения "зависших" таймеров в jest]{@link import('../documentation/jest/jest.md')}
 *
Модуль предназначен для поиска в файлах тестов "зависающих" таймеров (для которых не было вызвано clearTimeout/clearInterval).
Использовать так:
- В самом начале файла написать:
```
import {
    useDebugTimers,
    // dontUseDebugTimers,
    getDebugTimersInfo,
} from 'cftools/spec_utils/debugTimers';
```
- Сразу после `import`, перед импортом других модулей добавить вызов `useDebugTimers();`
- Или в самом верхнем `describe`, добавить (или обновить) функцию `beforeAll`:
   `useDebugTimers();`
- В самом верхнем `describe`, добавить (или обновить) функцию `afterAll`:
   После вызова всех нужных destroy/clearTimers-методов, добавить вывод информации по неочищенным таймерам:
   `console.info(getDebugTimersInfo())` - в Debug-режиме, можно посмотреть, где находиться `func` для зависших таймеров.
 *
 * ## See also [why-is-node-running: Node is running but you don't know why? why-is-node-running is here to help you]{@link https://github.com/mafintosh/why-is-node-running}
 *
 * Example of using `why-is-node-running`:<br />
 * ```
 * There are 5 handle(s) keeping the process running
 *
 * # Timeout
 * /home/maf/dev/node_modules/why-is-node-running/example.js:6  - setInterval(function () {}, 1000)
 * /home/maf/dev/node_modules/why-is-node-running/example.js:10 - createServer()
 *
 * # TCPSERVERWRAP
 * /home/maf/dev/node_modules/why-is-node-running/example.js:7  - server.listen(0)
 * /home/maf/dev/node_modules/why-is-node-running/example.js:10 - createServer()
 *
 * # Timeout
 * /home/maf/dev/node_modules/why-is-node-running/example.js:6  - setInterval(function () {}, 1000)
 * /home/maf/dev/node_modules/why-is-node-running/example.js:11 - createServer()
 *
 * # TCPSERVERWRAP
 * /home/maf/dev/node_modules/why-is-node-running/example.js:7  - server.listen(0)
 * /home/maf/dev/node_modules/why-is-node-running/example.js:11 - createServer()
 *
 * # Timeout
 * /home/maf/dev/node_modules/why-is-node-running/example.js:13 - setTimeout(function () {
 * ```
*/

// todo: Написать обёртку для
//  import {
//   setTimeout, setInterval, setImmediate(?)
//  } from 'timers/promises';
// todo: Написать обёртку для setImmediate ?

// Было до [22.12.2023]:
// import { withGlobal } from "@sinonjs/fake-timers";
// const originalMethodsTimers = withGlobal(globalThis).timers;

const originalMethodsTimers = {
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
};

interface DebugTimerInfo {
    type: 'setInterval' | 'setTimeout';
    timer: ReturnType<typeof originalMethodsTimers.setInterval> | ReturnType<typeof originalMethodsTimers.setTimeout>;
    func: (...args: any[]) => void;
    functionName: string;
    ms: number;
    args: unknown[];
    callStack: string;

    __proto__: null;
}

const debugTimersInfo: Partial<Record<number, DebugTimerInfo>> = Object.create(null);

/**
 * @private
 */
function _destroyDebugTimerInfo(timerId: number) {
    const debugTimerInfo = debugTimersInfo[timerId];

    if (!debugTimerInfo) {
        return;
    }

    {
        /** На случай, если результат работы {@link getDebugTimersInfo} был сохранён, нужно исключить возможность утечки памяти. */
        debugTimerInfo.func = _noop;
        debugTimerInfo.args = [];
    }

    delete debugTimersInfo[timerId];
}

/**
 * todo: Реализовать _debug_setTimeout.__promisify__
 *  * смотреть [setTimeoutPromise]{@link import('node:timers/promises').setTimeout}
 *  * ищите свойство "__promisify__" [по ссылке]{@link import('node:timers').setTimeout}
 */
function _debug_setTimeout(func: (...args: any[]) => void, ms: number, ...args: unknown[]) {
    const wrapper = function(this: unknown, ...args: unknown[]) {
        _destroyDebugTimerInfo(timerId);

        return func.apply(this, args);
    };
    const timer = originalMethodsTimers.setTimeout(wrapper, ms, ...args);
    const timerId = Number(timer);

    debugTimersInfo[timerId] = {
        type: 'setTimeout',
        timer,
        func,
        functionName: func.name || '',
        ms,
        args,
        callStack: (new Error('-get-stack-')).stack || '',

        __proto__: null as null,
    };

    return timer;
}

_debug_setTimeout.isDebugTimer = true;

/**
 * todo: Реализовать _debug_setTimeout.__promisify__
 *  * смотреть [setTimeoutPromise]{@link import('node:timers/promises').setInterval}
 *  * ищите свойство "__promisify__" [по ссылке]{@link import('node:timers').setInterval}
 */
function _debug_setInterval(func: (...args: any[]) => void, ms: number, ...args: unknown[]) {
    const timer = originalMethodsTimers.setInterval(func, ms, ...args);
    const timerId = Number(timer);

    debugTimersInfo[timerId] = {
        type: 'setInterval',
        timer,
        func,
        functionName: func.name || '',
        ms,
        args,
        callStack: (new Error('-get-stack-')).stack || '',

        __proto__: null as null,
    };

    return timer;
}

_debug_setInterval.isDebugTimer = true;

function _debug_clearTimeout(timer: ReturnType<typeof originalMethodsTimers.setTimeout>) {
    _destroyDebugTimerInfo(Number(timer));

    return originalMethodsTimers.clearTimeout(timer);
}

function _debug_clearInterval(timer: ReturnType<typeof originalMethodsTimers.setInterval>) {
    _destroyDebugTimerInfo(Number(timer));

    return originalMethodsTimers.clearInterval(timer);
}

let isDebugTimersInstalled = false;

// noinspection JSUnusedGlobalSymbols
export function useDebugTimers() {
    if (isDebugTimersInstalled) {
        // already fake timers
        return;
    }

    isDebugTimersInstalled = true;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    globalThis.setTimeout = _debug_setTimeout;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    globalThis.setInterval = _debug_setInterval;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    globalThis.clearTimeout = _debug_clearTimeout;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    globalThis.clearInterval = _debug_clearInterval;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    globalThis.getDebugTimersInfo = getDebugTimersInfo;
}

// noinspection JSUnusedGlobalSymbols
export function dontUseDebugTimers() {
    if (!isDebugTimersInstalled) {
        // non fake timers
        return;
    }

    for (const key of Object.keys(debugTimersInfo)) {
        _destroyDebugTimerInfo(Number(key));
    }

    isDebugTimersInstalled = false;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    globalThis.setTimeout = originalMethodsTimers.setTimeout;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    globalThis.setInterval = originalMethodsTimers.setInterval;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    globalThis.clearTimeout = originalMethodsTimers.clearTimeout;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    globalThis.clearInterval = originalMethodsTimers.clearInterval;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    if (globalThis.getDebugTimersInfo === getDebugTimersInfo) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore
        delete globalThis.getDebugTimersInfo;
    }
}

export function getDebugTimersInfo() {
    return debugTimersInfo;
}

export async function getDebugTimersInfoAsync(awaitTime?: number) {
    await new Promise<void>((resolve) => {
        originalMethodsTimers.setTimeout(() => {
            resolve();
        }, awaitTime);
    });

    return debugTimersInfo;
}

function _noop() {}
