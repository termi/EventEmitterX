'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDefined = isDefined;
exports.assertIsDefined = assertIsDefined;
exports.isUndefined = isUndefined;
exports.assertIsUndefined = assertIsUndefined;
exports.isUndefinedOrNull = isUndefinedOrNull;
exports.assertIsUndefinedOrNull = assertIsUndefinedOrNull;
exports.isSameType = isSameType;
exports.assertIsSameType = assertIsSameType;
exports.isObject = isObject;
exports.assertIsObject = assertIsObject;
exports.isString = isString;
exports.assertIsString = assertIsString;
exports.isArray = isArray;
exports.assertIsArray = assertIsArray;
exports.isNonEmptyArray = isNonEmptyArray;
exports.assertIsNonEmptyArray = assertIsNonEmptyArray;
const type_guards_utils_cjs_1 = require("./type_guards_utils.cjs");
function isDefined(value, expected) {
    return value != null
        && (expected != null
            ? Array.isArray(expected)
                ? expected.includes(value)
                : expected === value
            : true);
}
function assertIsDefined(value, expected) {
    if (value == null) {
        throw new TypeError(`value should be defined, but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(value)} found`);
    }
    if (expected != null) {
        if (Array.isArray(expected)) {
            if (!expected.includes(value)) {
                const expectedAsString = (0, type_guards_utils_cjs_1.displayValueForTypeGuard)(expected, void 0, {
                    isDisplayType: false,
                    valuePrefix: 'values ',
                });
                throw new TypeError(`value should be defined with one of expected ${expectedAsString},\
 but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(value, void 0, { isDisplayType: false })} found.`);
            }
        }
        else if (expected !== value) {
            throw new TypeError(`value should be defined with expected value ${(0, type_guards_utils_cjs_1.primitiveValueToStringForTypeGuard)(expected)},\
 but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(value, void 0, { isDisplayType: false })} found.`);
        }
    }
}
function isUndefined(value) {
    return value === void 0;
}
function assertIsUndefined(value) {
    if (value !== void 0) {
        throw new TypeError(`value should be undefined, but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(value)} found`);
    }
}
function isUndefinedOrNull(value) {
    return value == null;
}
function assertIsUndefinedOrNull(value) {
    if (value != null) {
        throw new TypeError(`value should be undefined or null, but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(value)} found`);
    }
}
// ----
function isSameType(value, typeFromValue) {
    return typeof value === typeof typeFromValue;
}
function assertIsSameType(value, typeFromValue) {
    if (!isSameType(value, typeFromValue)) {
        throw new TypeError(`value should be typeof "${typeof typeFromValue}", but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(value, void 0, { isDisplayValue: false })} found.`);
    }
}
function isObject(value, typeGuard) {
    if (value === null
        || typeof value !== 'object') {
        return false;
    }
    // if (Array.isArray(value) ||
    if (typeof typeGuard === 'function') {
        return typeGuard(value);
    }
    return true;
}
function assertIsObject(value, typeGuard) {
    const type = typeof value;
    if (value === null
        || type !== 'object') {
        // `value should be non-nullable object. But "null" found.`
        throw new TypeError(`value should be non-nullable object, but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(value, type)} found.`);
    }
    if (typeof typeGuard === 'function') {
        const checkResult = typeGuard(value);
        if (checkResult !== void 0 && !checkResult) {
            throw new TypeError('value should be non-nullable object corresponding of passed type guard.');
        }
    }
}
function isString(value, expected) {
    if (typeof value !== 'string') {
        return false;
    }
    if (typeof expected === 'string') {
        return expected === value;
    }
    if (!!expected && Array.isArray(expected)) {
        return expected.includes(value);
    }
    return true;
}
function assertIsString(value, expected) {
    const type = typeof value;
    if (type !== 'string') {
        throw new TypeError(`value should be typeof "string", but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(value, type)} found`);
    }
    if (typeof expected === 'string') {
        if (expected !== value) {
            throw new TypeError(`value should be typeof "string" with expected value ${(0, type_guards_utils_cjs_1.primitiveValueToStringForTypeGuard)(expected)},\
 but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(value, type, { isDisplayType: false })} found`);
        }
    }
    else if (!!expected && Array.isArray(expected) && !expected.includes(value)) {
        const expectedAsString = (0, type_guards_utils_cjs_1.displayValueForTypeGuard)(expected, void 0, {
            isDisplayType: false,
            isDisplayArray: true,
            valuePrefix: 'values ',
        });
        throw new TypeError(`value should be typeof "string" with one of expected ${expectedAsString},\
 but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(value, type, { isDisplayType: false })} found.`);
    }
}
function isArray(list, param1, param2) {
    if (!Array.isArray(list)) {
        return false;
    }
    const lengthOptions = _isLengthOptions(param2)
        ? param2
        : _isLengthOptions(param1)
            ? param1
            : void 0;
    const typeGuardForEachItem = typeof param1 === 'function'
        ? param1
        : void 0;
    if (lengthOptions != null) {
        const arrayLength = list.length;
        if (typeof lengthOptions === 'number') {
            if (arrayLength !== lengthOptions) {
                return false;
            }
        }
        else {
            const { min, max } = lengthOptions;
            if (min != null && max != null) {
                if (!(arrayLength >= min && arrayLength <= max)) {
                    return false;
                }
            }
            else if (max != null && arrayLength > max) {
                return false;
            }
            else if (min != null && arrayLength < min) {
                return false;
            }
        }
    }
    if (typeGuardForEachItem) {
        for (let i = 0, len = list.length; i < len; i++) {
            if (!typeGuardForEachItem(list[i])) {
                return false;
            }
        }
    }
    return true;
}
function assertIsArray(list, param1, param2) {
    if (!Array.isArray(list)) {
        throw new TypeError(`value should be instanceof "Array", but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(list)} found.`);
    }
    const lengthOptions = _isLengthOptions(param2)
        ? param2
        : _isLengthOptions(param1)
            ? param1
            : void 0;
    const typeGuardForEachItem = typeof param1 === 'function'
        ? param1
        : void 0;
    if (lengthOptions != null) {
        const arrayLength = list.length;
        if (typeof lengthOptions === 'number') {
            if (arrayLength !== lengthOptions) {
                throw new TypeError(`value should be instanceof "Array" with fixed length = ${lengthOptions}, but current length is ${arrayLength}.`);
            }
        }
        else {
            const { min, max } = lengthOptions;
            if (min != null && max != null) {
                if (!(arrayLength >= min && arrayLength <= max)) {
                    throw new TypeError(`value should be instanceof "Array" with length >= ${min} and length <= ${max}, but current length is ${arrayLength}.`);
                }
            }
            else if (max != null && arrayLength > max) {
                throw new TypeError(`value should be instanceof "Array" with length <= ${max}, but current length is ${arrayLength}.`);
            }
            else if (min != null && arrayLength < min) {
                throw new TypeError(`value should be instanceof "Array" with length >= ${min}, but current length is ${arrayLength}.`);
            }
        }
    }
    if (typeGuardForEachItem) {
        for (let i = 0, len = list.length; i < len; i++) {
            /**
             * * if checkResult is `undefined` that `typeGuardForEachItem` is `(item: T | unknown) => asserts item is T`
             * * if checkResult is typeof `boolean` that `typeGuardForEachItem` is `(item: T | unknown) => item is T`
             */
            const checkResult = typeGuardForEachItem(list[i]);
            if (checkResult !== void 0 && !checkResult) {
                throw new TypeError('value should be instanceof "Array" and each item of list should be preferred type.');
            }
        }
    }
}
function _isArrayFullOfHoles(list) {
    const { length } = list;
    if (!length) {
        return false;
    }
    if (!('0' in list)) {
        // first item is a hole
        if (length === 1) {
            return true;
        }
        for (const key in list) {
            if (Object.hasOwn(list, key)) {
                return false;
            }
        }
        return true;
    }
    return false;
}
/**
 * Non-empty array.
 *
 * @see [MDN / Array.isArray]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray}
 */
function isNonEmptyArray(list, typeGuardForEachItem) {
    // eslint-disable-next-line unicorn/explicit-length-check
    if (!Array.isArray(list) || !(list.length > 0)) {
        return false;
    }
    if (typeof typeGuardForEachItem === 'function') {
        for (let i = 0, len = list.length; i < len; i++) {
            if (!typeGuardForEachItem(list[i])) {
                return false;
            }
        }
    }
    else if (_isArrayFullOfHoles(list)) {
        return false;
    }
    return true;
}
/**
 * @see [How to create a non-empty array Type]{@link https://matiashernandez.dev/blog/post/typescript-how-to-create-a-non-empty-array-type}
 */
function assertIsNonEmptyArray(list, typeGuardForEachItem) {
    // eslint-disable-next-line unicorn/explicit-length-check
    if (!Array.isArray(list) || !(list.length > 0)) {
        throw new TypeError(`value should be non-empty instanceof "Array", but ${(0, type_guards_utils_cjs_1.displayValueForTypeGuard)(list)} found.`);
    }
    if (typeof typeGuardForEachItem === 'function') {
        for (let i = 0, len = list.length; i < len; i++) {
            /**
             * * if checkResult is `undefined` that `typeGuardForEachItem` is `(item: T | unknown) => asserts item is T`
             * * if checkResult is typeof `boolean` that `typeGuardForEachItem` is `(item: T | unknown) => item is T`
             */
            const checkResult = typeGuardForEachItem(list[i]);
            if (checkResult !== void 0 && !checkResult) {
                throw new TypeError('value should be instanceof "Array" and each item of list should be preferred type.');
            }
        }
    }
    else if (_isArrayFullOfHoles(list)) {
        throw new TypeError('value should be non-empty instanceof "Array" and not array full of holes.');
    }
}
function _isLengthOptions(value) {
    const type = typeof value;
    return type === 'number'
        || (type === 'object'
            && !!value
            && ('max' in value
                || 'min' in value));
}
