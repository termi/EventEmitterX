'use strict';

import { defineMethodProperty } from "../utils/object";

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy
// https://github.com/tc39/proposal-array-grouping
// https://tc39.es/ecma262/#sec-object.groupby
if (!Object.groupBy) {
    defineMethodProperty(Object, 'groupBy', function<K extends number | string | symbol, V>(iterable: IterableIterator<V> | V[], predicate: (value: V, index: number) => K): Record<K, V[]> {
        if (iterable === void 0 || iterable === null) {
            throw new TypeError('Object.groupBy called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }

        let index = 0;
        const result = Object.create(null) as Record<K, V[]>;

        for (const value of iterable) {
            (result[predicate(value, index++)] ??= []).push(value);
        }

        return result;
    });
}
