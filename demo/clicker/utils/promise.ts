'use strict';

export function promiseTimeout(ms = 100, options?: { signal?: AbortSignal }) {
    const signal = options?.signal;
    const { promise, resolve, reject } = Promise.withResolvers();
    const timer = setTimeout(resolve, ms);

    if (signal) {
        const abortPromiseTimeout = () => {
            clearTimeout(timer);
            reject();
            signal.removeEventListener('abort', abortPromiseTimeout);
        }

        signal.addEventListener('abort', abortPromiseTimeout);
        promise.then(() => {
            signal.removeEventListener('abort', abortPromiseTimeout);
        });
    }

    return promise;
}
