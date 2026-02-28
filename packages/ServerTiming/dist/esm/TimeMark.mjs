// eslint-disable-next-line no-redeclare
/* global performance */
'use strict';
var _a;
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
// const HOURS = 60 * MINUTES;
const keyPrefix = `TimeMark_${Math.floor(Math.random() * 9e9).toString(36)}_`;
let keyUniqueCounter = 0;
/** For test or debug use only */
export const kTimeMarkSetDuration = Symbol('kTimeMarkSetDuration');
export class TimeMark {
    /**
     * @param name - The name to give the new timer.
     * @param options
     */
    constructor(name, options = {}) {
        this._started = false;
        this._ended = false;
        this._perf = performance;
        const { data, predefinedDuration = 0, autoStart = false, displayName = void 0, customPerformance = void 0, } = options;
        //
        // Note: the problem below is not relevant for current code, but exists as an example for other code and to
        //  remind that this problem exists in V8.
        //
        // >
        // > It is important to initialize the fields below with doubles.
        // > Otherwise Fibers will deopt and end up having separate shapes when
        // > doubles are later assigned to fields that initially contained smis.
        // > This is a bug in v8 having something to do with Object.preventExtension().
        // >
        // > Learn more about this deopt here:
        // > [Possible v8 de-opt for profiling react-dom bundles #14365](https://github.com/facebook/react/issues/14365)
        // > [Prevent a v8 deopt when profiling #14383](https://github.com/facebook/react/pull/14383)
        // > [Issue 8538: Weird behavior with Object.preventExtensions() and double field instance migrations](https://bugs.chromium.org/p/v8/issues/detail?id=8538)
        // > [The story of a V8 performance cliff in React](https://v8.dev/blog/react-cliff)
        // >
        this._finaleDuration = Number.NaN;
        // >
        // > It's okay to replace the initial doubles with smis after initialization.
        // > This simplifies other profiler code and doesn't trigger the deopt.
        // >
        this._finaleDuration = Number(predefinedDuration);
        name = _toMarkName(name);
        this.name = name;
        this.displayName = String(displayName || name);
        const key = `${keyPrefix}${(++keyUniqueCounter).toString(36)}`;
        this._startKey = `${key}---start`;
        this._endKey = `${key}---end`;
        this._measureKey = `${key}---measure`;
        this._tempKey = `${key}---temp`;
        this._tMeasureKey = `${key}---tempMeasure`;
        this.data = data;
        if (customPerformance) {
            this._perf = customPerformance;
        }
        if (autoStart) {
            this.start();
        }
    }
    destructor() {
        this.end();
        // note:
        //  1. do not set `this._finaleDuration` in NaN here.
        //  2. do not change `this.displayName` here due it's a string
        this._started = false;
        // Seal `this.name` to its finale string form if it non-string.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore readonly reassignment due this is destructor
        // noinspection JSConstantReassignment
        this.name = String(this.name);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore readonly reassignment due this is destructor
        // noinspection JSConstantReassignment
        this.data = null;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore readonly reassignment due this is destructor
        // noinspection JSConstantReassignment
        this._perf = null;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore readonly reassignment due this is destructor
        // noinspection JSConstantReassignment
        this._startKey = this._endKey = this._measureKey = this._tempKey = this._tMeasureKey = '';
    }
    [Symbol.dispose]() {
        this.destructor();
    }
    /**
     * Start timer
     */
    start() {
        if (this._ended) {
            return;
        }
        if (this._started) {
            this.reset();
        }
        this._started = true;
        const performance = this._perf;
        performance.mark(this._startKey);
    }
    /**
     * End timer
     */
    end() {
        if (this._ended) {
            return;
        }
        this._ended = true;
        if (!this._started) {
            return;
        }
        const performance = this._perf;
        performance.mark(this._endKey);
        try {
            performance.measure(this._measureKey, this._startKey, this._endKey);
            const { 0: finaleMeasure } = performance.getEntriesByName(this._measureKey);
            if (finaleMeasure) {
                this._finaleDuration += finaleMeasure.duration;
            }
        }
        catch (err) {
            console.error('TimeMark#end error:', err);
            this._finaleDuration = 0;
        }
        performance.clearMeasures(this._measureKey);
        performance.clearMarks(this._startKey);
        performance.clearMarks(this._endKey);
    }
    reset() {
        if (this._started && !this.ended) {
            const performance = this._perf;
            performance.clearMarks(this._startKey);
            this._started = false;
        }
    }
    /**
     * @deprecated use {@link makeDurationMessage}
     * @see {@link https://console.spec.whatwg.org/#timeend}
     */
    durationMessage(asMilliseconds = false, duration = this.duration) {
        return this.makeDurationMessage(asMilliseconds, duration);
    }
    /**
     * todo: options for colors for "displayName" and "timeString" (see https://github.com/debug-js/debug)
     *
     * @see {@link https://console.spec.whatwg.org/#timeend}
     */
    makeDurationMessage(asMilliseconds = false, duration = this.duration) {
        const { displayName } = this;
        // > 5. Let concat be the concatenation of label, U+003A (:), U+0020 SPACE, and duration.
        if (asMilliseconds) {
            // Округляем до 3х знаков после запятой
            return `${displayName}: ${Math.round(duration * SECONDS) / SECONDS}ms`;
        }
        const minutes = Math.floor(duration / MINUTES);
        const minutesString = String(minutes).padStart(2, '0');
        const secondsAndMs = ((duration % MINUTES) / SECONDS);
        const secondsString = String(Math.floor(secondsAndMs)).padStart(2, '0');
        const msString = secondsAndMs.toFixed(3).split('.')[1];
        return `${displayName}: ${minutesString}:${secondsString}.${msString}`;
    }
    get started() {
        return this._started;
    }
    get ended() {
        return this._ended;
    }
    /** Getter, duration in ms */
    get duration() {
        if (this._ended) {
            return this._finaleDuration;
        }
        if (!this._started) {
            return 0;
        }
        const performance = this._perf;
        performance.mark(this._tempKey);
        performance.measure(this._tMeasureKey, this._startKey, this._tempKey);
        const { 0: measure } = performance.getEntriesByName(this._tMeasureKey);
        performance.clearMeasures(this._tMeasureKey);
        performance.clearMarks(this._tempKey);
        return measure ? measure.duration : 0;
    }
    get seconds() {
        return this.duration / SECONDS;
    }
    get format() {
        const { duration } = this;
        const minutes = Math.floor(duration / MINUTES);
        const seconds = ((duration % MINUTES) / SECONDS).toFixed(0);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    /**
     * For test or debug use only.
     *
     * @param newTestDuration - duration на который хотим перемотать время performance отметки времени
     */
    [kTimeMarkSetDuration](newTestDuration) {
        const performance = this._perf;
        const { duration } = performance.measure(this._startKey);
        performance.mark(this._startKey, { startTime: duration - newTestDuration });
    }
    static startMark(markName, options = {}) {
        return new _a(markName, {
            __proto__: null,
            autoStart: true,
            ...options,
        });
    }
}
_a = TimeMark;
(() => {
    Object.setPrototypeOf(_a.prototype, null);
})();
// eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
// @ts-ignore `TS7053: Element implicitly has an any type because expression of type unique symbol can't be used to index type TimeMark`
TimeMark.prototype[Symbol.toStringTag] = 'TimeMark';
const { hasOwn } = Object;
function _toMarkName(value) {
    const type = typeof value;
    if (type === 'object' && value) {
        if (hasOwn(value, 'valueOf') && typeof value.valueOf === 'function') {
            const result = value.valueOf();
            const type = typeof result;
            if ((type === 'object' && result) || type === 'function') {
                throw new TypeError(`can't convert Object to primitive type`);
            }
            return result;
        }
        if (hasOwn(value, 'toString') && typeof value.toString === 'function') {
            const result = value.toString();
            const type = typeof result;
            if ((type === 'object' && result) || type === 'function' || type === 'symbol') {
                throw new TypeError(`can't convert Object to string`);
            }
            return (type !== 'string' ? String(result) : result);
        }
    }
    if (type !== 'string' && type !== 'number' && type !== 'symbol' && type !== 'bigint') {
        return String(value);
    }
    return value;
}
