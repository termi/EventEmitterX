/* eslint-disable @typescript-eslint/no-wrapper-object-types */
'use strict';

export function isObject<T extends Object=Object>(value: unknown): value is T {
    return typeof value === 'object'
        && !!value
    ;
}

export function assertIsObject<T extends Object=Object>(value: unknown): asserts value is T {
    if (!isObject(value)) {
        throw new TypeError(`value should be object, but ${value} of type "${typeof value}" found`);
    }
}
