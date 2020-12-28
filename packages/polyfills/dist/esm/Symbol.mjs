'use strict';
// https://github.com/tc39/proposal-symbol-predicates
if (typeof Symbol !== 'undefined') {
    if (typeof Symbol.isRegistered !== 'function') {
        const { keyFor } = Symbol;
        // https://github.com/inspect-js/is-registered-symbol/blob/main/index.js
        Object.defineProperty(Symbol, 'isRegistered', {
            value(sym) {
                return typeof sym === 'symbol'
                    && typeof keyFor.call(Symbol, sym) === 'string';
            },
        });
    }
    if (typeof Symbol.isWellKnown !== 'function') {
        // note: This code SHOULD be called AFTER all Symbol[Symbol()] polyfills!
        const wellKnownSymbols = Object.getOwnPropertyNames(Symbol).reduce((set, key) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore Ignore `TS7053: Element implicitly has an any type because expression of type string can't be used to index type SymbolConstructor
            // No index signature with a parameter of type string was found on type SymbolConstructor`
            const value = Symbol[key];
            if (typeof value === 'symbol') {
                set.add(value);
            }
            return set;
        }, new Set());
        // https://github.com/inspect-js/is-well-known-symbol/blob/main/index.js
        Object.defineProperty(Symbol, 'isWellKnown', {
            value(sym) {
                return typeof sym === 'symbol'
                    && wellKnownSymbols.has(sym);
            },
        });
    }
}
export {};
//# sourceMappingURL=Symbol.js.map