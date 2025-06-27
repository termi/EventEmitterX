'use strict';

'use strict';

import { isNodeJS } from "../utils/runEnv";
import { isFunction } from "../type_guards/function";

// https://github.com/es-shims/Error.isError/blob/main/implementation.js
polyfillErrorIsError: if (!isFunction(Error.isError)) {
    if (isNodeJS) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore Ignore in WEB-build
        const _module = typeof module === 'object' && isFunction(module?.require) ? module : void 0;

        if (_module) {
            try {
                const nodeJS_isNativeError: ((object: unknown) => object is Error) | undefined = _module.require.call(_module, 'node:util/types').isNativeError;

                if (nodeJS_isNativeError) {
                    // node 10+
                    Error.isError = nodeJS_isNativeError;
                }

                break polyfillErrorIsError;
            }
            catch {
                // ignore `Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:util/types`
            }
        }
    }

    const $Error = Error;
    const $structuredClone = typeof structuredClone === 'function'
        ? (structuredClone as unknown as { isPolyfill?: boolean }).isPolyfill
            ? null
            : String(structuredClone) === 'function structuredClone() { [native code] }'
                ? structuredClone
                : null
        : null
    ;
    /**
     * @see [MDN / DOMError (deprecated)]{@link https://developer.mozilla.org/en-US/docs/Web/API/DOMError}
     */
    const $DOMError = $structuredClone
        ? null
        : (globalThis as unknown as { DOMError: typeof Error }).DOMError
    ;
    const stackGetter = $structuredClone
        ? null
        : $Error.prototype
            ? Object.getOwnPropertyDescriptor($Error.prototype, 'stack')?.get
            : null
    ;
    const $toString = Object.prototype.toString;
    const hasToStringTag = typeof Symbol !== 'undefined'
        && typeof (Symbol.toStringTag as unknown) === 'symbol'
    ;

    Error.isError = function isError(arg: Error | unknown): arg is Error {
        if (!arg || (typeof arg !== 'object' && typeof arg !== 'function')) {
            return false;
        }

        if ($structuredClone) {
            try {
                return $structuredClone(arg) instanceof $Error;
            }
            catch {
                return false;
            }
        }

        if (!hasToStringTag || !(Symbol.toStringTag in arg)) {
            const str = $toString.call(arg);

            return str === '[object Error]' // errors
                || str === '[object DOMException]' // browsers
                || str === '[object DOMError]' // browsers, deprecated
                || str === '[object Exception]' // sentry
            ;
        }

        // Firefox
        if (stackGetter) {
            try {
                stackGetter.call(arg);

                return true;
            }
            catch {
                return false;
            }
        }

        if ($DOMError && arg instanceof $DOMError) {
            // Edge 80
            return true;
        }

        // fallback for envs with toStringTag but without structuredClone
        return arg instanceof Error;
    };
}

