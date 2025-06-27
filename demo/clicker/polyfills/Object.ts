'use strict';

import { defineMethodProperty } from "../utils/object";

/**
 * Array length is [a non-negative integer less than `2 ** 32`]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/length#value}
 *
 * * Max Array length is 4294967295 (`(2 ** 32) − 1`)
 * * The highest possible index is 4294967294 (`(2 ** 32) − 2`)
 *
 * `4_294_967_295`
 */
const MAX_ARRAY_LENGTH = 4294967295;

/**
 * @throws RangeError
 * @private
 */
function _ArrayLikeGetLength(arrayLike: unknown[] | { length: number, [key: number]: unknown }) {
    const _length = arrayLike.length;

    if (typeof (_length as unknown) === 'bigint') {
        throw new TypeError('Cannot convert a BigInt value to a number');
    }

    const length = Number(_length);

    if (length > MAX_ARRAY_LENGTH) {
        throw new RangeError(`Invalid array length`);
    }

    return Number.isNaN(length) || length < 0 || typeof (length as unknown) !== 'number'
        ? 0
        : length
    ;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy
// https://github.com/tc39/proposal-array-grouping
if (!Object.groupBy) {
    defineMethodProperty(Object, 'groupBy', function<K extends number | string | symbol, V>(_list: V[], predicate: (value: V, index: number) => K): Record<K, V[]> {
        if (_list === void 0 || _list === null) {
            throw new TypeError('Object.groupBy called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }

        const list = Object(_list);
        const length = _ArrayLikeGetLength(list);
        // eslint-disable-next-line prefer-rest-params
        const thisArg = arguments[1];
        const result = Object.create(null);

        for (let i = 0 ; i < length ; i++) {
            const value = list[i];
            const group = predicate.call(thisArg, value, i);
            let array = result[group];

            if (!array) {
                array = [];
                result[group] = array;
            }

            array.push(value);
        }

        return result;
    });
}
