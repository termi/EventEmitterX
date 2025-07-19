/* eslint-disable @typescript-eslint/no-empty-object-type */
'use strict';

export function isWindowGlobalObject(global: typeof globalThis | unknown): global is Window {
    const maybeWindow = global as (Window | undefined | {}/* | NodeJS.Global */);

    return !!maybeWindow
        && 'addEventListener' in maybeWindow
        && 'removeEventListener' in maybeWindow
        && 'name' in maybeWindow
    ;
}
