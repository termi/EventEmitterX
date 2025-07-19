'use strict';

import { displayValueForTypeGuard } from "./type_guards_utils";

function _isArrayFullOfHoles(list: unknown[]) {
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
export function isNonEmptyArray<T>(
    list: T[] | unknown,
    typeGuardForEachItem?: (item: T | unknown) => item is T,
): list is T[] {
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
export function assertIsNonEmptyArray<T>(
    list: T[] | unknown,
    typeGuardForEachItem?: ((item: T | unknown) => asserts item is T) | ((item: T | unknown) => item is T),
): asserts list is T[] {
    if (!Array.isArray(list) || !(list.length > 0)) {
        throw new TypeError(`value should be non-empty instanceof "Array", but ${displayValueForTypeGuard(list)} found.`);
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
