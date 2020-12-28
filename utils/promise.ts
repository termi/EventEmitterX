'use strict';

export async function queueMicrotaskPromise(): Promise<void> {
    return new Promise((resolve) => {
        // queueMicrotask should be polyfill'ed for old js agents.
        queueMicrotask(resolve);
    });
}

const _setImmediateFallback = function(callback: Function) {// eslint-disable-line promise/prefer-await-to-callbacks
    return setTimeout(callback, 0);
};

type TimerOptions = {
    signal?: AbortSignal,
};

/** int32, LONG_MAX. C/C++ "long" and "int" max. 2_147_483_647, 2147483648, 0x7FFFFFFF, 2 ** 31 - 1 */
const INT32_MAX_VALUE = 2_147_483_647;
/**
 * Browsers store the delay as a 32-bit signed integer internally.
 * This causes an integer overflow when using delays larger than 2,147,483,647 ms (about 24.8 days).
 * Any timeout larger than 2,147,483,647 ms results in an immediate execution.
 */
const MAX_SET_TIMEOUT_DELAY = INT32_MAX_VALUE;

/**
 * If {@link ms} is `undefined` or `0` using {@link setImmediate} if available, otherwise using {@link setTimeout}.
 * @param ms - any negative values will be interpreted as `0`.
 * @param options
 *
 * @example common usage
 // sleep 30 seconds
 await sleep(30 * 1000);
 * @example immediate invoke with using setImmediate if available
 await sleep();
 await sleep(0);
 await sleep(-1);
 * @example abortable
 const ac = new AbortController();

 setTimeout(() => ac.abort('reason to abort'), 5 * 1000);

 try {
 // sleep 30 seconds
 await sleep(30 * 1000, { signal: ac.signal });
 }
 catch (error) {
 // error is 'reason to abort';
 console.error('sleep was aborted with reason:', error);
 }
 */
export async function sleep(ms?: number, options?: TimerOptions): Promise<void> {
    const signal = options?.signal;

    if (signal?.aborted) {
        throw signal.reason;
    }

    // handle ms as object with valueOf()
    const msNumber = ms == null ? 0 : Number(ms);
    // 0, NaN, Number.NEGATIVE_INFINITY, negative number
    const use_setImmediate = !(msNumber > 0);

    if (!use_setImmediate && !Number.isFinite(msNumber)) {
        throw new TypeError(`First parameter is invalid: ${msNumber}. Should be positive number or null/undefined/NaN.`);
    }

    if (msNumber > MAX_SET_TIMEOUT_DELAY) {
        throw new TypeError(`First parameter too large: ${msNumber}.`);
    }

    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const timer = use_setImmediate
        ? (globalThis.setImmediate || _setImmediateFallback)(resolve)
        : setTimeout(resolve, ms || 0)
    ;

    if (signal) {
        const abortCallback = () => {
            if (use_setImmediate) {
                (globalThis.clearImmediate || clearTimeout)(timer as ReturnType<typeof setImmediate>);
            }
            else {
                clearTimeout(timer as ReturnType<typeof setTimeout>);
            }

            reject(signal.reason);
        };
        const clearCallback = signal.removeEventListener.bind(signal, 'abort', abortCallback, void 0);

        signal.addEventListener('abort', abortCallback);

        // eslint-disable-next-line promise/prefer-await-to-then
        promise.then(clearCallback, clearCallback);
    }

    return promise;
}
