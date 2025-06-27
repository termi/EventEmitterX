'use strict';

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
