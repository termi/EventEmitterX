export declare function isDefined<T>(value: T | unknown | null | undefined): value is NonNullable<T>;
export declare function isDefined<T extends string, U extends T & string>(value: T | unknown | null | undefined, expectedOneOf: U[]): value is U;
export declare function isDefined<T extends number, U extends T & number>(value: T | unknown | null | undefined, expectedOneOf: U[]): value is U;
export declare function isDefined<T extends {}, U extends T & {}>(value: T | null | undefined, expectedOneOf: U[]): value is U;
export declare function isDefined<T extends string, U extends T & string>(value: T | unknown | null | undefined, expected: U): value is U;
export declare function isDefined<T extends number, U extends T & number>(value: T | unknown | null | undefined, expected: U): value is U;
export declare function isDefined<T extends {}, U extends T & {}>(value: T | null | undefined, expected: U): value is U;
export declare function isDefined<T>(value: T | unknown | null | undefined, expected: T): value is NonNullable<T>;
export declare function assertIsDefined<T>(value: T | null | undefined): asserts value is NonNullable<T>;
export declare function assertIsDefined<T extends string, U extends T & string>(value: T | unknown | null | undefined, expectedOneOf: U[]): asserts value is U;
export declare function assertIsDefined<T extends number, U extends T & number>(value: T | unknown | null | undefined, expectedOneOf: U[]): asserts value is U;
export declare function assertIsDefined<T extends {}, U extends T & {}>(value: T | null | undefined, expectedOneOf: U[]): asserts value is U;
export declare function assertIsDefined<T extends string, U extends T & string>(value: T | unknown | null | undefined, expected: U): asserts value is U;
export declare function assertIsDefined<T extends number, U extends T & number>(value: T | unknown | null | undefined, expected: U): asserts value is U;
export declare function assertIsDefined<T extends {}, U extends T & {}>(value: T | null | undefined, expected: U): asserts value is U;
export declare function assertIsDefined<T>(value: T | unknown | null | undefined, expected: T): asserts value is NonNullable<T>;
export declare function isUndefined(value: unknown | undefined): value is undefined;
export declare function assertIsUndefined(value: unknown | undefined): asserts value is undefined;
export declare function isUndefinedOrNull<T extends {}>(value: T | null | undefined): value is null | undefined;
export declare function assertIsUndefinedOrNull<T extends {}>(value: T | null | undefined): asserts value is null | undefined;
export declare function isSameType<T>(value: T | unknown, typeFromValue: T): value is T;
export declare function assertIsSameType<T>(value: T | unknown, typeFromValue: T): asserts value is T;
export declare function isObject<T extends {}>(value: T | unknown | null | undefined, typeGuard: ((item: NonNullable<T | unknown>) => item is T)): value is T;
export declare function isObject<T extends Record<any, unknown>>(value: T | unknown | null | undefined): value is T;
export declare function isObject<T extends {}>(value: T | unknown | null | undefined): value is T;
export declare function assertIsObject<T extends {}>(value: T | unknown | null | undefined, typeGuard: ((item: NonNullable<T | unknown>) => asserts item is T) | ((item: NonNullable<T | unknown>) => item is T)): asserts value is T;
export declare function assertIsObject<T extends Record<any, unknown>>(value: T | unknown | null | undefined): asserts value is T;
export declare function assertIsObject<T extends {}>(value: T | unknown | null | undefined): asserts value is T;
export declare function isString(value: unknown): value is string;
export declare function isString<T extends string>(value: T | unknown | null | undefined): value is T;
export declare function isString<T extends string, U extends T & string>(value: T | unknown | null | undefined, expectedOneOf: U[]): value is U;
export declare function isString<T extends string, U extends T & string>(value: T | unknown | null | undefined, expected: U): value is U;
export declare function isString<T extends string, U extends T & {}>(value: T | null | undefined, expected: U): asserts value is U;
export declare function isString<T extends string, U extends T & {}>(value: T | null | undefined, expected: U[]): asserts value is U;
export declare function assertIsString<T extends string>(value: T | unknown | null | undefined): asserts value is T;
export declare function assertIsString<T extends string, U extends T & string>(value: T | unknown | null | undefined, expectedOneOf: U[]): asserts value is U;
export declare function assertIsString<T extends string, U extends T & string>(value: T | unknown | null | undefined, expected: U): asserts value is U;
export declare function assertIsString<T extends string, U extends T & {}>(value: T | null | undefined, expected: U): asserts value is U;
export declare function assertIsString<T extends string, U extends T & {}>(value: T | null | undefined, expected: U[]): asserts value is U;
export declare function isArray<T>(list: T[] | unknown, typeGuardForEachItem?: (item: T | unknown) => item is T, fixedLength?: number): list is T[];
export declare function isArray<T>(list: T[] | unknown, typeGuardForEachItem?: (item: T | unknown) => item is T, lengthOptions?: _LengthOptions): list is T[];
export declare function isArray<T>(list: T[] | unknown, fixedLength?: number): list is T[];
export declare function isArray<T>(list: T[] | unknown, lengthOptions?: _LengthOptions): list is T[];
export declare function assertIsArray<T>(list: T[] | unknown, typeGuardForEachItem?: ((item: T | unknown) => asserts item is T) | ((item: T | unknown) => item is T), fixedLength?: number): asserts list is T[];
export declare function assertIsArray<T>(list: T[] | unknown, typeGuardForEachItem?: ((item: T | unknown) => asserts item is T) | ((item: T | unknown) => item is T), lengthOptions?: _LengthOptions): asserts list is T[];
export declare function assertIsArray<T>(list: T[] | unknown, fixedLength?: number): asserts list is T[];
export declare function assertIsArray<T>(list: T[] | unknown, lengthOptions?: _LengthOptions): asserts list is T[];
/**
 * Non-empty array.
 *
 * @see [MDN / Array.isArray]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray}
 */
export declare function isNonEmptyArray<T>(list: T[] | unknown, typeGuardForEachItem?: (item: T | unknown) => item is T): list is T[];
/**
 * @see [How to create a non-empty array Type]{@link https://matiashernandez.dev/blog/post/typescript-how-to-create-a-non-empty-array-type}
 */
export declare function assertIsNonEmptyArray<T>(list: T[] | unknown, typeGuardForEachItem?: ((item: T | unknown) => asserts item is T) | ((item: T | unknown) => item is T)): asserts list is T[];
type _LengthOptions = {
    max: number;
    min?: number;
} | {
    max?: number;
    min: number;
};
export {};
