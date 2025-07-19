'use strict';

type Deferred<T> = /* ReturnType<typeof Promise.withResolvers<T>> */{
    resolve: (value: PromiseLike<T> | T) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reject: (reason?: any) => void,
    promise: Promise<T>,
};
type DeferredWithTimer<T> = Deferred<T> & {
    timer: ReturnType<typeof setTimeout> | undefined,
};
type DisposableDeferredWithTimer<T> = DeferredWithTimer<T> & {
    [Symbol.dispose](): void,
};

/**
 * @throws `Error('TIMEOUT')`
 */
function _createDeferTimout<T=void>(ms: number, resolveOnTimeout = false, options?: promiseTimeout.Options) {
    const signal = options?.signal;
    const deferred = Promise.withResolvers<T>() as DeferredWithTimer<T>;
    const { promise, resolve, reject } = deferred;
    const timer = setTimeout(() => {
        deferred.timer = void 0;

        if (resolveOnTimeout) {
            resolve(void 0 as T);
        }
        else {
            reject(new Error('TIMEOUT'));
        }
    }, ms);

    Object.setPrototypeOf(deferred, null);

    if (signal) {
        const abortPromiseTimeout = () => {
            clearTimeout(timer);
            deferred.timer = void 0;
            reject();
            signal.removeEventListener('abort', abortPromiseTimeout);
        };

        signal.addEventListener('abort', abortPromiseTimeout);
        promise.then(() => {
            signal.removeEventListener('abort', abortPromiseTimeout);
        });
    }

    deferred.timer = timer as unknown as ReturnType<typeof setTimeout>;

    return deferred;
}

export function promiseTimeout(ms = 100, options?: promiseTimeout.Options) {
    return _createDeferTimout(ms, true, options).promise;
}

export namespace promiseTimeout {
    export type Options = {
        signal?: AbortSignal,
    };
}

/**
 * @throws `Error('TIMEOUT')`
 */
export function makeDeferredWithTimeout<T=unknown>(
    ms = 100,
    options?: promiseDeferWithTimeout.Options,
): DisposableDeferredWithTimer<T> {
    const defer = _createDeferTimout<T>(ms, false, options) as DisposableDeferredWithTimer<T>;

    defer[Symbol.dispose] = function() {
        if (defer.timer) {
            clearTimeout(defer.timer);
            defer.timer = void 0;
        }
    };

    return defer;
}

export namespace promiseDeferWithTimeout {
    export type Options = promiseTimeout.Options;
}
