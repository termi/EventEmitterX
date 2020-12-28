import '@repo/polyfills/Symbol.js';
export declare function isSymbol(value: symbol | unknown): value is symbol;
export declare function assertIsSymbol(value: symbol | unknown): asserts value is symbol;
export declare function isRegisteredSymbol(value: symbol | unknown): value is symbol;
export declare function assertIsRegisteredSymbol(value: symbol | unknown): asserts value is symbol;
export declare function isWellKnownSymbol(value: symbol | unknown): value is symbol;
export declare function assertIsWellKnownSymbol(value: symbol | unknown): asserts value is symbol;
export declare function isUniqueSymbol(value: symbol | unknown): value is symbol;
export declare function assertIsUniqueSymbol(value: symbol | unknown): asserts value is symbol;
