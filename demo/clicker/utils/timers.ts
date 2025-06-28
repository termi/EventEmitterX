'use strict';

const _noop = () => {};

export function createAbortSignalTimeout(timeoutMs: number) {
    const ac = new AbortController();
    const { signal } = ac;
    const timer = setTimeout(function() {
        ac.abort();
    }, timeoutMs);
    const cancel = () => {
        // note: В идеале, вызвать у signal какой-то метод на подобии removeAllListeners, однако в EventTarget нет такого метода
        clearTimeout(timer);
    };

    return {
        signal,
        cancel,
        __proto__: null,
    };
}

export function makeIntervalTicker(tickOnEveryMs: number, tickCallback: () => (void | undefined | boolean), options?: {
    signal?: AbortSignal,
}) {
    const clear = function() {
        clearInterval(intervalId);
        intervalId = void 0;
        tickCallback = _noop;
        options?.signal?.removeEventListener('abort', clear);
    }
    let intervalId: ReturnType<typeof setInterval> | undefined = setInterval(() => {
        const canBeeShouldProcess = tickCallback();

        if (canBeeShouldProcess === false) {
            clear();
        }
    }, tickOnEveryMs);

    options?.signal?.addEventListener('abort', clear, { once: true });

    return clear;
}
