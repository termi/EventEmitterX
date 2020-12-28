import '@repo/polyfills/Symbol.js';
/**
 * Return `true` if value is **finite** number.
 *
 * Note: Infinity and NaN is disallowed by default.
 */
export declare function isNumber(value: number | unknown, options?: isNumber.Options): value is number;
export declare namespace isNumber {
    type Options = {
        allowNaN?: boolean;
        allowInfinity?: boolean;
        disallowNegative?: boolean;
        disallowPositive?: boolean;
        disallowZero?: boolean;
    };
    type MinAndMaxOptions = {
        min: number;
        max?: number;
    } | {
        min?: number;
        max: number;
    };
}
/**
 * Assert that `value` should be **finite** number.
 *
 * Note: Infinity and NaN is disallowed by default.
 *
 * @throws 'value should be finite number value.'
 * @throws 'value should be number value.'
 * @throws 'value should be finite number or NaN value.'
 * @throws 'value should be number or NaN value.'
 */
export declare function assertIsNumber(value: number | unknown, options?: isNumber.Options): asserts value is number;
/**
 * Check if `value` is valid value for `Number` constructor.
 *
 * @example
 * const value = getSomeValue();
 *
 * if (isNumberLike(value)) {
 *     const number = Number(value);
 * }
 *
 * @see [is-number]{@link https://github.com/jonschlinkert/is-number}
 */
export declare function isNumberLike(value: number | string | unknown, options?: isNumber.Options): value is number | string;
/**
 * Assert if `value` is valid value for `Number` constructor.
 *
 * @example
 * const value = getSomeValue();
 *
 * assertIsNumberLike(value);
 *
 * const number = Number(value);
 *
 * @see [is-number]{@link https://github.com/jonschlinkert/is-number}
 * @throws 'value should be finite number value (as string or number).'
 * @throws 'value should be number value (as string or number).'
 * @throws 'value should be finite number or NaN value (as string or number).'
 * @throws 'value should be number or NaN value (as string or number).'
 */
export declare function assertIsNumberLike(value: number | string | unknown, options?: isNumber.Options): asserts value is number | string;
/**
 * This is analog of standard [Number.isSafeInteger]{@link Number.isSafeInteger}.
 *
 * Value should be integer number in range from `-1 * (2 ** 53) + 1` to `2 ** 53 - 1` (from `-9007199254740991` to `9007199254740991`, from `Number.MIN_SAFE_INTEGER` to `Number.MAX_SAFE_INTEGER`).
 * You can narrow down range by using {@link options}.
 */
export declare function isInteger(value: number | unknown, options?: isInteger.Options): value is number;
/**
 * This asserts analog of standard [Number.isSafeInteger]{@link Number.isSafeInteger}.
 *
 * Value should be integer number in range from `-1 * (2 ** 53) + 1` to `2 ** 53 - 1` (from `-9007199254740991` to `9007199254740991`, from `Number.MIN_SAFE_INTEGER` to `Number.MAX_SAFE_INTEGER`).
 * You can narrow down range by using {@link options}.
 */
export declare function assertIsInteger(value: number | unknown, options?: isInteger.Options): asserts value is number;
export declare namespace isInteger {
    type Options = {
        /** A value in range from `-((2 ** 53) - 1)` to `((2 ** 53) - 1)` (from `-9007199254740991` to `9007199254740991`). */
        min?: number;
        /** A value in range from `-((2 ** 53) - 1)` to `((2 ** 53) - 1)` (from `-9007199254740991` to `9007199254740991`). */
        max?: number;
    };
}
export declare function isInt8(value: number | unknown): value is number;
export declare function assertIsInt8(value: number | unknown): asserts value is number;
export declare function isUint8(value: number | unknown): value is number;
export declare function assertIsUint8(value: number | unknown): asserts value is number;
export declare function isInt16(value: number | unknown): value is number;
export declare function assertIsInt16(value: number | unknown): asserts value is number;
export declare function isUint16(value: number | unknown): value is number;
export declare function assertIsUint16(value: number | unknown): asserts value is number;
/**
 * @see [(Unsigned) int24 - 24 bit integral datatype]{@link https://stackoverflow.com/questions/2682725/int24-24-bit-integral-datatype}
 * @see [(Unsigned) Int48 and Int24]{@link https://github.com/EsmaeilChitgar/Int48_Int24}
 * @see [(Signed) GSF / .NET Core / Int24]{@link https://github.com/GridProtectionAlliance/gsf/blob/master/Source/Libraries/GSF.Core.Shared/Int24.cs}
 */
export declare function isInt24(value: number | unknown): value is number;
/**
 * @see [(Unsigned) int24 - 24 bit integral datatype]{@link https://stackoverflow.com/questions/2682725/int24-24-bit-integral-datatype}
 * @see [(Unsigned) Int48 and Int24]{@link https://github.com/EsmaeilChitgar/Int48_Int24}
 * @see [(Signed) GSF / .NET Core / Int24]{@link https://github.com/GridProtectionAlliance/gsf/blob/master/Source/Libraries/GSF.Core.Shared/Int24.cs}
 */
export declare function assertIsInt24(value: number | unknown): asserts value is number;
/**
 * @see [24 Bit Unsigned Integer]{@link https://stackoverflow.com/questions/64820375/24-bit-unsigned-integer}
 * @see [(Unsigned) Int48 and Int24]{@link https://github.com/EsmaeilChitgar/Int48_Int24}
 * @see [GSF / .NET Core / UInt24]{@link https://github.com/GridProtectionAlliance/gsf/blob/master/Source/Libraries/GSF.Core.Shared/UInt24.cs}
 */
export declare function isUint24(value: number | unknown): value is number;
/**
 * @see [24 Bit Unsigned Integer]{@link https://stackoverflow.com/questions/64820375/24-bit-unsigned-integer}
 * @see [(Unsigned) Int48 and Int24]{@link https://github.com/EsmaeilChitgar/Int48_Int24}
 * @see [GSF / .NET Core / UInt24]{@link https://github.com/GridProtectionAlliance/gsf/blob/master/Source/Libraries/GSF.Core.Shared/UInt24.cs}
 */
export declare function assertIsUint24(value: number | unknown): asserts value is number;
export declare function isInt32(value: number | unknown): value is number;
export declare function assertIsInt32(value: number | unknown): asserts value is number;
export declare function isUint32(value: number | unknown): value is number;
export declare function assertIsUint32(value: number | unknown): asserts value is number;
export declare function isNumberInRange(value: number | unknown, min?: number, max?: number): value is number;
export declare function assertIsNumberInRange(value: number | unknown, min?: number, max?: number): asserts value is number;
/**
 * `value` is positive finite number.
 *
 * @example
 * isPositiveNumber(null) === false
 * isPositiveNumber(NaN) === false
 * isPositiveNumber(Infinity) === false
 * isPositiveNumber(-1) === false
 *
 * @see {@link assertIsPositiveNumber}
 */
export declare function isPositiveNumber(value: number | unknown, options?: isPositiveNumber.Options): value is number;
export declare namespace isPositiveNumber {
    type Options = Pick<isNumber.Options, 'disallowZero'>;
}
/**
 * Assert `value` is positive finite number.
 *
 * Note: Except positive infinity (`+Infinity`).
 *
 * @see {@link isPositiveNumber}
 */
export declare function assertIsPositiveNumber(value: number | unknown, options?: isPositiveNumber.Options): asserts value is number;
/**
 * `value` is negative finite number.
 *
 * @example
 * isPositiveNumber(null) === false
 * isPositiveNumber(NaN) === false
 * isPositiveNumber(-Infinity) === false
 * isPositiveNumber(1) === false
 *
 * @see {@link assertIsNegativeNumber}
 */
export declare function isNegativeNumber(value: number | unknown, options?: isPositiveNumber.Options): value is number;
/**
 * Assert `value` is negative finite number.
 *
 * @see {@link isNegativeNumber}
 */
export declare function assertIsNegativeNumber(value: number | unknown, options?: isPositiveNumber.Options): asserts value is number;
export declare function isEvenNumber(value: number | unknown): value is number;
export declare function assertIsEvenNumber(value: number | unknown): asserts value is number;
export declare function isOddNumber(value: number | unknown): value is number;
export declare function assertIsOddNumber(value: number | unknown): asserts value is number;
export declare function isNonZeroNumber(value: number | unknown): value is number;
export declare function assertIsNonZeroNumber(value: number | unknown): asserts value is number;
export declare function isNonNaNNumber(value: number | unknown): value is number;
export declare function assertIsNonNaNNumber(value: number | unknown): asserts value is number;
export declare function isPercentValue(value: number | unknown): value is number;
export declare function assertIsPercentValue(value: number | unknown): asserts value is number;
/** @deprecated use {@link isCloseNumbers} */
export declare function isNearbyNumbers(number1: number | unknown, number2: number | unknown, maxDifference?: number): number1 is number;
/**
 * @example
 * console.log(isCloseNumbers(0.1 + 0.2, 0.3));// true
 *
 * @see [Python / math.isclose(a, b, *, rel_tol=1e-09, abs_tol=0.0)](https://docs.python.org/3/library/math.html#math.isclose)
 * @see [Python math.isclose() Method](https://www.w3schools.com/python/ref_math_isclose.asp)
 */
export declare function isCloseNumbers(number1: number | unknown, number2: number | unknown, maxDifference?: number): number1 is number;
/** @deprecated use {@link assertIsCloseNumbers} */
export declare function assertIsNearbyNumbers(number1: number | unknown, number2: number | unknown, maxDifference?: number): void;
/**
 * @example
 * assertIsCloseNumbers(0.1 + 0.2, 0.3);// no throw
 *
 * @see [Python / math.isclose(a, b, *, rel_tol=1e-09, abs_tol=0.0)](https://docs.python.org/3/library/math.html#math.isclose)
 * @see [Python math.isclose() Method](https://www.w3schools.com/python/ref_math_isclose.asp)
 */
export declare function assertIsCloseNumbers(number1: number | unknown, number2: number | unknown, maxDifference?: number): asserts number1 is number;
