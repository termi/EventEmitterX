'use strict';

/**
 * @private
 */
function _noop() {}
function _noopFalse() {
    return false;
}


// /**
//  * The function wrapper comes with
//  *      a cancel method to cancel delayed func invocations
//  *  and a flush method to immediately invoke them
//  *  and a stop method to destroying this function wrapper
//  *
//  * @typedef {function(...args): *} DebounceFunction
//  * @property {function} stop - полное очищение
//  * @property {function} cancel - очищение последнего известного состояния
//  * @property {function} [clear] - alias to cancel, deprecated
//  * @property {function} flush
//  **/

export interface DebouncedFunc<T extends (...args: any[]) => any = (...args: any[]) => any> {
    /**
     * Call the original function, but applying the debounce rules.
     *
     * If the debounced function can be run immediately, this calls it and returns its return
     * value.
     *
     * Otherwise, it returns the return value of the last invocation, or undefined if the debounced
     * function was not invoked yet.
     */
    (...args: Parameters<T>): ReturnType<T> | undefined;
    /**
     * Throw away any pending invocation of the debounced function.
     */
    cancelLast(): void;
    /**
     * If there is a pending invocation of the debounced function, invoke it immediately and return
     * its return value.
     *
     * Otherwise, return the value from the last invocation, or undefined if the debounced function
     * was never invoked.
     */
    flush(): ReturnType<T> | undefined;
    /**
     * If there is a pending invocation of the debounced function.
     * @see {@link flush}
     */
    isPending(): boolean;
    /**
     * Clear all inner states and stop original function from being called from this DebounceFunction wrapper.
     */
    stop(): void;
}

const _debounceFunction_noop: DebouncedFunc<any> = function _debounceFunction_noop() {
    /*
    if (isTest) {
        console.error('Function invocation after DebouncedFunc stop.');
        throw new Error('Function invocation after DebouncedFunc stop.');
    }
    */
};

_debounceFunction_noop.stop = _noop;
_debounceFunction_noop.cancelLast = _noop;
_debounceFunction_noop.flush = _noop;
_debounceFunction_noop.isPending = _noopFalse;

/**
 * https://lodash.com/docs/4.17.11#throttle
 * TODO:: throttle - это вызов debounce с параметрами leading=true, trailing=true и maxWait=ms . maxWait - отвечает за то, что func будет вызываться каждые maxWait, а не откладываться постоянно
 * TODO:: See https://github.com/lodash/lodash/blob/4.17.11/lodash.js#L10898
 * TODO:: See https://learn.javascript.ru/settimeout-setinterval#tormozilka
 * Вернет функцию wrapper, которая будет вызывать func максимум 2 раза в течение ms миллисекунд:
 * 1. В момент вызова wrapper, если в течение ms миллисекунд wrapper ещё не вызывался
 * 2. Через ms миллисекунд, выполнит func с последними параметра, если wrapper был вызван второй или более раз в течение этих ms миллисекунд.
 * @param func - Функция для вызова
 * @param ms - как часто, в миллисекундах, можно вызывать функцию func
 * @param boundedThis - Если передано не undefined, то это значение будет использоваться в качестве this при вызове func
 * @returns wrapper
 * @see [«Тормозящий» декоратор `throttle(f, ms)`. При многократном вызове он передает вызов `f` не чаще одного раза в ms миллисекунд.]{@link https://learn.javascript.ru/call-apply-decorators#tormozyaschiy-throttling-dekorator}
 */
export function throttle<
    T extends(this: R, ...args: any) => any,
    R = undefined,
>(
    func: T,
    ms: number,
    boundedThis?: R,
): DebouncedFunc<T> {
    let _func = func;
    let _ms: number | undefined = ms;
    let _boundedThis = boundedThis;
    let throttleTimeout: ReturnType<typeof setTimeout> | undefined;
    let savedArgs: Parameters<T> | undefined;
    let savedThis: R | undefined;
    let lastResult: ReturnType<T> | undefined;

    let cancelLast = function() {
        // Только очищение последнего известного состояния
        if (throttleTimeout) {
            clearTimeout(throttleTimeout);
            throttleTimeout = void 0;
        }

        savedArgs = savedThis = void 0;
    };
    let invokeFunc = function() {
        throttleTimeout = void 0;

        if (savedArgs) {
            const _savedArgs = savedArgs;
            const _savedThis = savedThis;

            // Очищаем ссылки перед вызовом wrapper, чтобы исключить возможность неочищенных ссылок при exception внутри wrapper
            savedArgs = savedThis = void 0;

            wrapper.apply(_savedThis as R, _savedArgs);
        }
    };
    let flush = function() {
        if (throttleTimeout) {
            clearTimeout(throttleTimeout);
            throttleTimeout = void 0;
        }

        invokeFunc();

        return lastResult;
    };
    let wrapper = function(this: R, ...args: Parameters<T>) {
        if (throttleTimeout) {
            savedArgs = args;

            if (_boundedThis === void 0) {
                /*jshint validthis:true */
                // eslint-disable-next-line unicorn/no-this-assignment
                savedThis = this;
                /*jshint validthis:false */
            }

            return lastResult;
        }

        /*jshint validthis:true */
        // eslint-disable-next-line prefer-rest-params
        lastResult = _func.apply(_boundedThis === void 0 ? this : _boundedThis, args);
        /*jshint validthis:false */

        throttleTimeout = setTimeout(invokeFunc, _ms);

        return lastResult;
    } as DebouncedFunc<T>;

    wrapper.stop = function() {
        cancelLast();

        _ms = void 0;// В ms можно передать ссылку на объект типа ```obj = { ms: 100, valueOf() { return this.ms } };```
        _boundedThis = void 0;
        lastResult = void 0;
        _func = _noop as unknown as T;

        cancelLast = _noop;
        invokeFunc = _noop;
        flush = _noop as unknown as T;

        // wrapper.thread = _noop;
        wrapper.stop = _noop;
        wrapper.cancelLast = cancelLast;
        wrapper.flush = flush;
        wrapper.isPending = _noopFalse;

        wrapper = _debounceFunction_noop as unknown as DebouncedFunc<T>;
    };

    wrapper.cancelLast = cancelLast;
    wrapper.flush = flush;
    wrapper.isPending = function() {
        return savedArgs !== void 0;
    };

    return wrapper;
}
