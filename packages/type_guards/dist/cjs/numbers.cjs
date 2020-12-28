// noinspection JSUnusedGlobalSymbols
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNumber = isNumber;
exports.assertIsNumber = assertIsNumber;
exports.isNumberLike = isNumberLike;
exports.assertIsNumberLike = assertIsNumberLike;
exports.isInteger = isInteger;
exports.assertIsInteger = assertIsInteger;
exports.isInt8 = isInt8;
exports.assertIsInt8 = assertIsInt8;
exports.isUint8 = isUint8;
exports.assertIsUint8 = assertIsUint8;
exports.isInt16 = isInt16;
exports.assertIsInt16 = assertIsInt16;
exports.isUint16 = isUint16;
exports.assertIsUint16 = assertIsUint16;
exports.isInt24 = isInt24;
exports.assertIsInt24 = assertIsInt24;
exports.isUint24 = isUint24;
exports.assertIsUint24 = assertIsUint24;
exports.isInt32 = isInt32;
exports.assertIsInt32 = assertIsInt32;
exports.isUint32 = isUint32;
exports.assertIsUint32 = assertIsUint32;
exports.isNumberInRange = isNumberInRange;
exports.assertIsNumberInRange = assertIsNumberInRange;
exports.isPositiveNumber = isPositiveNumber;
exports.assertIsPositiveNumber = assertIsPositiveNumber;
exports.isNegativeNumber = isNegativeNumber;
exports.assertIsNegativeNumber = assertIsNegativeNumber;
exports.isEvenNumber = isEvenNumber;
exports.assertIsEvenNumber = assertIsEvenNumber;
exports.isOddNumber = isOddNumber;
exports.assertIsOddNumber = assertIsOddNumber;
exports.isNonZeroNumber = isNonZeroNumber;
exports.assertIsNonZeroNumber = assertIsNonZeroNumber;
exports.isNonNaNNumber = isNonNaNNumber;
exports.assertIsNonNaNNumber = assertIsNonNaNNumber;
exports.isPercentValue = isPercentValue;
exports.assertIsPercentValue = assertIsPercentValue;
exports.isNearbyNumbers = isNearbyNumbers;
exports.isCloseNumbers = isCloseNumbers;
exports.assertIsNearbyNumbers = assertIsNearbyNumbers;
exports.assertIsCloseNumbers = assertIsCloseNumbers;
const type_guards_utils_js_1 = require("./type_guards_utils.cjs");
// 1 byte
/** C "signed char". -0x80 */
const INT8_MIN_VALUE = -128;
/** C "signed char". 0x7f */
const INT8_MAX_VALUE = 127;
/** C "unsigned char". 0xff */
const UINT8_MAX_VALUE = 255;
// 2 bytes
/** SHRT_MIN. C/C++ "short" min. -32_768, -32768, -0x8000 */
const INT16_MIN_VALUE = -32768;
/** SHRT_MAX. C/C++ "short" max. 32_767, 32768, 0x7FFF */
const INT16_MAX_VALUE = 32767;
/** USHRT_MAX. C/C++ "unsigned short" max. 65_535, 65535, 0xFFFF */
const UINT16_MAX_VALUE = 65535;
// 3 bytes
// [A small Int24/Uint24 module, mainly for rgb image data](https://asx.now.sh/docs/doc/Int24.html)
/** -8_388_608, -8388608, -0x800000 */
const INT24_MIN_VALUE = -8388608;
/** 8_388_607, 8388607, 0x7FFFFF */
const INT24_MAX_VALUE = 8388607;
/** 16_777_215, 16777215, 0xFFFFFF */
const UINT24_MAX_VALUE = 16777215;
// 4 bytes
/** LONG_MIN. C/C++ "long" and "int" min. -2_147_483_648, -2147483648, -0x80000000 */
const INT32_MIN_VALUE = -2147483648;
/** LONG_MAX. C/C++ "long" and "int" max. 2_147_483_647, 2147483648, 0x7FFFFFFF */
const INT32_MAX_VALUE = 2147483647;
/** ULONG_MAX. C/C++ "unsigned long" and "unsigned int" max. 4_294_967_295, 4294967295, 0xFFFFFFFF */
const UINT32_MAX_VALUE = 4294967295;
/**  */
const PERCENT_MAX_VALUE = 100;
/** @private */
const _Number_isSafeInteger = Number.isSafeInteger;
/** @private */
const _Number_isNaN = Number.isNaN;
/** @private */
const _Number_isFinite = Number.isFinite;
/**
 * -9_007_199_254_740_991, −9007199254740991, −(2 ** 53 − 1), −(2^53 − 1)
 *
 * @private */
const _Number_MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;
/**
 * 9_007_199_254_740_991, 9007199254740991, (2 ** 53 − 1), (2^53 − 1)
 *
 * @private */
const _Number_MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
/** @private */
const _Number_NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
/** @private */
const _Number_POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
/** @private */
const _is = Object.is;
// ----
//todo: Удалять из error.stack строку с самим вызовом/вызовами type_guard
// const error = new TypeError(`value should be ${_get_assertIsNumber_error(options)}. But ${displayValueForTypeGuard(value)} found.`);
// error.stack = _removeThisFunctionFromStack(error.stack);
// throw error;
// ----
/**
 * Return `true` if value is **finite** number.
 *
 * Note: Infinity and NaN is disallowed by default.
 */
function isNumber(value, options) {
    if (typeof value === 'number') {
        if (options?.disallowZero && value === 0) {
            return false;
        }
        const disallowNegative = options?.disallowNegative;
        const disallowPositive = options?.disallowPositive;
        if ((value - value) !== 0) { // if (Number.isNaN(value) || !Number.isFinite(value)) {
            // Discard Infinity and NaN
            if (_Number_isNaN(value)) {
                return Boolean(options?.allowNaN);
            }
            if (!_Number_isFinite(value)) {
                if (options?.allowInfinity) {
                    if (disallowNegative) {
                        return value !== _Number_NEGATIVE_INFINITY;
                    }
                    if (disallowPositive) {
                        return value !== _Number_POSITIVE_INFINITY;
                    }
                    return true;
                }
                return false;
            }
        }
        if (disallowNegative) {
            if (disallowPositive) {
                return false;
            }
            return value > 0 || _is(value, 0);
        }
        if (disallowPositive) {
            if (disallowNegative) {
                return false;
            }
            return value < 0 || _is(value, -0);
        }
        return true;
    }
    return false;
}
function _get_assertIsNumber_error(options = {}) {
    const { allowNaN, allowInfinity, disallowNegative, disallowPositive, disallowZero, } = options;
    if (disallowNegative && disallowPositive) {
        if (allowNaN) {
            return 'NaN value';
        }
        return 'unknown number (invalid isNumber.Options)';
    }
    const finiteMode = allowInfinity ? '' : 'finite ';
    const mod = disallowNegative
        ? 'positive '
        : disallowPositive
            ? 'negative '
            : '';
    const or = allowNaN
        ? allowInfinity
            ? `, ${mod}Infinity or NaN`
            : ' or NaN'
        : allowInfinity
            ? ` or ${mod}Infinity`
            : '';
    const and = disallowZero
        ? ' and not 0'
        : '';
    return `${mod}${finiteMode}number${or}${and} value`;
}
//todo: add expected overflow
// export function assertIsNumber(value: number | unknown, expected: number): asserts value is number {
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
function assertIsNumber(value, options) {
    const type = typeof value;
    let match = true;
    if (type !== 'number') {
        match = false;
    }
    else if (options?.disallowZero && value === 0) {
        match = false;
    }
    // Discard Infinity and NaN
    else if ((value - value) !== 0) { // if (Number.isNaN(value) || !Number.isFinite(value)) {
        const allowNaN = options?.allowNaN;
        const allowInfinity = options?.allowInfinity;
        const disallowNegative = options?.disallowNegative;
        const disallowPositive = options?.disallowPositive;
        if (allowNaN) {
            if (_Number_isNaN(value)) {
                return;
            }
        }
        allowInfinity_check: if (allowInfinity) {
            if (!_Number_isFinite(value)) {
                if (disallowNegative) {
                    if (disallowPositive || value === _Number_NEGATIVE_INFINITY) {
                        // goto error
                        break allowInfinity_check;
                    }
                }
                else if (disallowPositive) {
                    if (disallowNegative || value === _Number_POSITIVE_INFINITY) {
                        // goto error
                        break allowInfinity_check;
                    }
                }
                return;
            }
        }
        match = false;
    }
    else {
        const numberValue = value;
        const disallowNegative = options?.disallowNegative;
        const disallowPositive = options?.disallowPositive;
        gte_lte_check: {
            if (disallowNegative) {
                if (disallowPositive || (numberValue < 0 || _is(numberValue, -0))) {
                    // goto error
                    break gte_lte_check;
                }
            }
            else if (disallowPositive) {
                if (disallowNegative || (numberValue > 0 || _is(numberValue, 0))) {
                    // goto error
                    break gte_lte_check;
                }
            }
            return;
        }
        match = false;
    }
    if (!match) {
        // 'value should be finite value, typeof "number" and not NaN'
        // 'value should be finite value, typeof "number" and not NaN and not 0'
        // 'value should be typeof "number" and not NaN'
        // 'value should be typeof "number" and not NaN and not 0'
        // 'value should be typeof "number" or NaN'
        // 'value should be typeof "number" or NaN and not 0'
        // 'value should be finite value, typeof "number" or NaN'
        // 'value should be finite value, typeof "number" or NaN and not 0'
        throw new TypeError(`value should be ${_get_assertIsNumber_error(options)}. But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
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
function isNumberLike(value, options) {
    if (options?.disallowZero && value === 0) {
        return false;
    }
    if (isNumber(value, options)) {
        return true;
    }
    const disallowNegative = options?.disallowNegative;
    const disallowPositive = options?.disallowPositive;
    if (typeof value === 'string') {
        const stringValue = value.trim();
        if (stringValue !== '') {
            if (stringValue === 'NaN') {
                return Boolean(options?.allowNaN);
            }
            if (stringValue === 'Infinity' || stringValue === '-Infinity' || stringValue === '+Infinity') {
                if (disallowNegative) {
                    if (disallowPositive) {
                        return false;
                    }
                    return stringValue !== '-Infinity';
                }
                if (disallowPositive) {
                    if (disallowNegative) {
                        return false;
                    }
                    return stringValue === '-Infinity';
                }
                return Boolean(options?.allowInfinity);
            }
            const numberValue = Number(stringValue);
            if (_Number_isFinite(numberValue)) {
                if (disallowNegative) {
                    if (disallowPositive) {
                        return false;
                    }
                    return numberValue > 0 || _is(numberValue, 0);
                }
                if (disallowPositive) {
                    if (disallowNegative) {
                        return false;
                    }
                    return numberValue < 0 || _is(numberValue, -0);
                }
                return true;
            }
        }
    }
    return false;
}
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
function assertIsNumberLike(value, options) {
    const type = typeof value;
    match: if (type === 'number') {
        if (!isNumber(value, options)
            || options?.disallowZero && value === 0) {
            break match;
        }
        return;
    }
    else if (type === 'string') {
        const stringValue = value.trim();
        if (stringValue !== '') {
            if (stringValue === 'NaN') {
                if (options?.allowNaN) {
                    return;
                }
            }
            else if (stringValue === 'Infinity' || stringValue === '-Infinity' || stringValue === '+Infinity') {
                if (options?.allowInfinity) {
                    return;
                }
            }
            if (!isNumber(Number(stringValue), options)) {
                break match;
            }
            return;
        }
    }
    throw new TypeError(`value should be ${_get_assertIsNumber_error(options)} (as string or number). But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
}
// ----
/**
 * This is analog of standard [Number.isSafeInteger]{@link Number.isSafeInteger}.
 *
 * Value should be integer number in range from `-1 * (2 ** 53) + 1` to `2 ** 53 - 1` (from `-9007199254740991` to `9007199254740991`, from `Number.MIN_SAFE_INTEGER` to `Number.MAX_SAFE_INTEGER`).
 * You can narrow down range by using {@link options}.
 */
function isInteger(value, options) {
    const min = options?.min;
    const max = options?.max;
    const hasMinMax = min != null || max != null;
    return typeof value === 'number'
        && _Number_isSafeInteger(value)
        && (!hasMinMax || _isNumberInRange(value, min, max));
}
/**
 * This asserts analog of standard [Number.isSafeInteger]{@link Number.isSafeInteger}.
 *
 * Value should be integer number in range from `-1 * (2 ** 53) + 1` to `2 ** 53 - 1` (from `-9007199254740991` to `9007199254740991`, from `Number.MIN_SAFE_INTEGER` to `Number.MAX_SAFE_INTEGER`).
 * You can narrow down range by using {@link options}.
 */
function assertIsInteger(value, options) {
    if (!isInteger(value, options)) {
        const min = options?.min;
        const max = options?.max;
        const hasMinMax = min != null || max != null;
        if (hasMinMax) {
            const rangeMin = (min != null && min > _Number_MIN_SAFE_INTEGER) ? min : _Number_MIN_SAFE_INTEGER;
            const rangeMax = (max != null && max < _Number_MAX_SAFE_INTEGER) ? max : _Number_MAX_SAFE_INTEGER;
            throw new TypeError(`value should be type "number" and in range (min = ${rangeMin}, max = ${rangeMax}).`);
        }
        throw new TypeError(`value should be type "number" and in range of integer number (min = ${_Number_MIN_SAFE_INTEGER}, max = ${_Number_MAX_SAFE_INTEGER}). But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
// ----
function isInt8(value) {
    return typeof value === 'number'
        && (value > INT8_MIN_VALUE && value <= INT8_MAX_VALUE);
}
function assertIsInt8(value) {
    if (!isInt8(value)) {
        throw new TypeError(`value should be type "number" and in range of int8 (min = ${INT8_MIN_VALUE}, max = ${INT8_MAX_VALUE}). But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
function isUint8(value) {
    return typeof value === 'number'
        && ((value > 0 || _is(value, 0)) && value <= UINT8_MAX_VALUE);
}
function assertIsUint8(value) {
    if (!isUint8(value)) {
        throw new TypeError(`value should be type "number" and in range of int8 (min = ${0}, max = ${UINT8_MAX_VALUE}). But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
// ----
function isInt16(value) {
    return typeof value === 'number'
        && (value > INT16_MIN_VALUE && value <= INT16_MAX_VALUE);
}
function assertIsInt16(value) {
    if (!isInt16(value)) {
        throw new TypeError(`value should be type "number" and in range of int16 (min = ${INT16_MIN_VALUE}, max = ${INT16_MAX_VALUE}). But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
function isUint16(value) {
    return typeof value === 'number'
        && ((value > 0 || _is(value, 0)) && value <= UINT16_MAX_VALUE);
}
function assertIsUint16(value) {
    if (!isUint16(value)) {
        throw new TypeError(`value should be type "number" and in range of int16 (min = ${0}, max = ${UINT16_MAX_VALUE}). But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
// ----
/**
 * @see [(Unsigned) int24 - 24 bit integral datatype]{@link https://stackoverflow.com/questions/2682725/int24-24-bit-integral-datatype}
 * @see [(Unsigned) Int48 and Int24]{@link https://github.com/EsmaeilChitgar/Int48_Int24}
 * @see [(Signed) GSF / .NET Core / Int24]{@link https://github.com/GridProtectionAlliance/gsf/blob/master/Source/Libraries/GSF.Core.Shared/Int24.cs}
 */
function isInt24(value) {
    return typeof value === 'number'
        && (value > INT24_MIN_VALUE && value <= INT24_MAX_VALUE);
}
/**
 * @see [(Unsigned) int24 - 24 bit integral datatype]{@link https://stackoverflow.com/questions/2682725/int24-24-bit-integral-datatype}
 * @see [(Unsigned) Int48 and Int24]{@link https://github.com/EsmaeilChitgar/Int48_Int24}
 * @see [(Signed) GSF / .NET Core / Int24]{@link https://github.com/GridProtectionAlliance/gsf/blob/master/Source/Libraries/GSF.Core.Shared/Int24.cs}
 */
function assertIsInt24(value) {
    if (!isInt24(value)) {
        throw new TypeError(`value should be type "number" and in range of int24 (min = ${INT24_MIN_VALUE}, max = ${INT24_MAX_VALUE}).`);
    }
}
/**
 * @see [24 Bit Unsigned Integer]{@link https://stackoverflow.com/questions/64820375/24-bit-unsigned-integer}
 * @see [(Unsigned) Int48 and Int24]{@link https://github.com/EsmaeilChitgar/Int48_Int24}
 * @see [GSF / .NET Core / UInt24]{@link https://github.com/GridProtectionAlliance/gsf/blob/master/Source/Libraries/GSF.Core.Shared/UInt24.cs}
 */
function isUint24(value) {
    return typeof value === 'number'
        && ((value > 0 || _is(value, 0)) && value <= UINT24_MAX_VALUE);
}
/**
 * @see [24 Bit Unsigned Integer]{@link https://stackoverflow.com/questions/64820375/24-bit-unsigned-integer}
 * @see [(Unsigned) Int48 and Int24]{@link https://github.com/EsmaeilChitgar/Int48_Int24}
 * @see [GSF / .NET Core / UInt24]{@link https://github.com/GridProtectionAlliance/gsf/blob/master/Source/Libraries/GSF.Core.Shared/UInt24.cs}
 */
function assertIsUint24(value) {
    if (!isUint24(value)) {
        throw new TypeError(`value should be type "number" and in range of int24 (min = ${0}, max = ${UINT24_MAX_VALUE}). But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
// ----
function isInt32(value) {
    return typeof value === 'number'
        && (value > INT32_MIN_VALUE && value <= INT32_MAX_VALUE);
}
function assertIsInt32(value) {
    if (!isInt32(value)) {
        throw new TypeError(`value should be type "number" and in range of int32 (min = ${INT32_MIN_VALUE}, max = ${INT32_MAX_VALUE}). But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
function isUint32(value) {
    return typeof value === 'number'
        && ((value > 0 || _is(value, 0)) && value <= UINT32_MAX_VALUE);
}
function assertIsUint32(value) {
    if (!isUint32(value)) {
        throw new TypeError(`value should be type "number" and in range of int32 (min = ${0}, max = ${UINT32_MAX_VALUE}). But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
// ----
/** @private */
function _isNumberInRange(value, min = _Number_NEGATIVE_INFINITY, max = _Number_POSITIVE_INFINITY) {
    return value >= min
        && value <= max;
}
function isNumberInRange(value, min = _Number_NEGATIVE_INFINITY, max = _Number_POSITIVE_INFINITY) {
    return isNumber(value)
        && _isNumberInRange(value, min, max);
}
function assertIsNumberInRange(value, min = _Number_NEGATIVE_INFINITY, max = _Number_POSITIVE_INFINITY) {
    if (!isNumberInRange(value, min, max)) {
        throw new TypeError(`value should be type "number" and in range (min = ${min}, max = ${max}). But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
// ----
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
function isPositiveNumber(value, options) {
    return typeof value === 'number'
        && _Number_isFinite(value)
        && (value > 0
            || !options?.disallowZero && _is(value, 0));
}
/**
 * Assert `value` is positive finite number.
 *
 * Note: Except positive infinity (`+Infinity`).
 *
 * @see {@link isPositiveNumber}
 */
function assertIsPositiveNumber(value, options) {
    if (!isPositiveNumber(value, options)) {
        // 'value should be type "number" and greater or equal than +0'
        // 'value should be type "number" and greater than +0'
        throw new TypeError(`value should be type "number" and greater${options?.disallowZero ? '' : ' or equal'} than +0. But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
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
function isNegativeNumber(value, options) {
    return typeof value === 'number'
        && _Number_isFinite(value)
        && (value < 0
            || !options?.disallowZero && _is(value, -0));
}
/**
 * Assert `value` is negative finite number.
 *
 * @see {@link isNegativeNumber}
 */
function assertIsNegativeNumber(value, options) {
    if (!isNegativeNumber(value, options)) {
        // 'value should be type "number" and lower or equal than -0'
        // 'value should be type "number" and lower than -0'
        throw new TypeError(`value should be type "number" and lower${options?.disallowZero ? '' : ' or equal'} than -0. But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
function isEvenNumber(value) {
    return typeof value === 'number'
        && _Number_isFinite(value)
        && (value & 1) === 0;
}
function assertIsEvenNumber(value) {
    if (!isEvenNumber(value)) {
        throw new TypeError(`value should be type "number" and not NaN and even value, but ${value} found. But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
function isOddNumber(value) {
    return typeof value === 'number'
        && _Number_isFinite(value)
        && (value & 1) === 1;
}
function assertIsOddNumber(value) {
    if (!isOddNumber(value)) {
        throw new TypeError(`value should be type "number" and not NaN and odd value, but ${value} found. But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
function isNonZeroNumber(value) {
    return typeof value === 'number'
        && value !== 0;
}
function assertIsNonZeroNumber(value) {
    if (!isNonZeroNumber(value)) {
        throw new TypeError(`value should be type "number" and not 0.`);
    }
}
function isNonNaNNumber(value) {
    return typeof value === 'number'
        && !_Number_isNaN(value);
}
function assertIsNonNaNNumber(value) {
    if (!isNonNaNNumber(value)) {
        throw new TypeError(`value should be type "number" and not a NaN.`);
    }
}
function isPercentValue(value) {
    return typeof value === 'number'
        && (value >= 0 && value <= PERCENT_MAX_VALUE);
}
function assertIsPercentValue(value) {
    if (!isPercentValue(value)) {
        throw new TypeError(`value should be type "number" and in range of percent value (min = ${0}, max = ${PERCENT_MAX_VALUE}). But ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value)} found.`);
    }
}
/** @deprecated use {@link isCloseNumbers} */
function isNearbyNumbers(number1, number2, maxDifference = 10) {
    return isCloseNumbers(number1, number2, maxDifference);
}
/**
 * @example
 * console.log(isCloseNumbers(0.1 + 0.2, 0.3));// true
 *
 * @see [Python / math.isclose(a, b, *, rel_tol=1e-09, abs_tol=0.0)](https://docs.python.org/3/library/math.html#math.isclose)
 * @see [Python math.isclose() Method](https://www.w3schools.com/python/ref_math_isclose.asp)
 */
function isCloseNumbers(number1, number2, maxDifference = 1e-09) {
    if (!isNumber(number1)) {
        return false;
    }
    if (!isNumber(number2)) {
        return false;
    }
    if (!isPositiveNumber(maxDifference)) {
        return false;
    }
    const diff = number1 - number2;
    return diff < 0
        ? (diff >= -1 * maxDifference)
        : (diff <= maxDifference);
}
/** @deprecated use {@link assertIsCloseNumbers} */
function assertIsNearbyNumbers(number1, number2, maxDifference = 10) {
    assertIsCloseNumbers(number1, number2, maxDifference);
}
/**
 * @example
 * assertIsCloseNumbers(0.1 + 0.2, 0.3);// no throw
 *
 * @see [Python / math.isclose(a, b, *, rel_tol=1e-09, abs_tol=0.0)](https://docs.python.org/3/library/math.html#math.isclose)
 * @see [Python math.isclose() Method](https://www.w3schools.com/python/ref_math_isclose.asp)
 */
function assertIsCloseNumbers(number1, number2, maxDifference = 1e-09) {
    assertIsNumber(number1);
    assertIsNumber(number2);
    assertIsPositiveNumber(maxDifference);
    if (!isCloseNumbers(number1, number2, maxDifference)) {
        const currentDiff = number1 - number2;
        throw new Error(`Numbers ${number1} and ${number2} is not neared (maxDifference=${maxDifference}, currentDiff=${currentDiff}).`);
    }
}
