'use strict';

const _has_WeakRef = typeof WeakRef !== 'undefined';
const _noop = () => {};

/*
const _timeoutCleanupFinalizationRegistry = typeof FinalizationRegistry !== 'undefined'
    ? new FinalizationRegistry<WeakRef<ReturnType<typeof setTimeout>>>(function(timeoutWeakRef) {
        const timeout = timeoutWeakRef.deref();

        if (timeout !== void 0) {
            clearTimeout(timeout);
        }
    })
    : { register(){}, unregister(){} } as unknown as FinalizationRegistry<unknown>
;
*/

export function createAbortSignalTimeout(timeoutMs: number, options?: { unref?: boolean }) {
    const unref = !!options?.unref;
    const ac = new AbortController();
    const abortControllerWeakRef = _has_WeakRef
        ? new WeakRef(ac)
        : new _FakeWeakRef(ac) as WeakRef<typeof ac>
    ;
    let timer = setTimeout(function() {
        abortControllerWeakRef.deref()?.abort();
        timer = void 0;
    }, timeoutMs) as ReturnType<typeof setTimeout> | undefined;
    const cancel = function() {
        if (timer) {
            // note: В идеале, вызвать у signal какой-то метод на подобии removeAllListeners, однако в EventTarget нет такого метода
            clearTimeout(timer);
            timer = void 0;
        }
    };

    if (unref && typeof timer === 'object' && !!timer) {
        timer.unref();
    }

    /*
    _timeoutCleanupFinalizationRegistry.register(ac, _has_WeakRef
        ? new WeakRef(timer as NonNullable<typeof timer>)
        : new _FakeWeakRef(timer as NonNullable<typeof timer>)
    );
    */

    return {
        signal: ac.signal,
        cancel,
        [Symbol.dispose]: cancel,
        __proto__: null,
    };
}

export function makeIntervalTicker(tickOnEveryMs: number, tickCallback: () => (void | undefined | boolean), options?: {
    signal?: AbortSignal,
}) {
    const signal = options?.signal;
    const clear = function() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = void 0;
        }

        tickCallback = _noop;
        signal?.removeEventListener('abort', clear);
    };
    let intervalId: ReturnType<typeof setInterval> | undefined = setInterval(() => {
        const canBeeShouldProcess = tickCallback();

        if (canBeeShouldProcess === false) {
            clear();
        }
    }, tickOnEveryMs);

    signal?.addEventListener('abort', clear, { once: true });

    (clear as typeof clear & { [Symbol.dispose]: typeof clear })[Symbol.dispose] = clear;

    return clear as typeof clear & { [Symbol.dispose]: typeof clear };
}

class _FakeWeakRef<T extends WeakKey> implements WeakRef<T> {
    private readonly _value: T;

    constructor(value: T) {
        this._value = value;
    }

    deref(): T | undefined {
        return this._value;
    }

    readonly [Symbol.toStringTag] = 'WeakRef';
}
