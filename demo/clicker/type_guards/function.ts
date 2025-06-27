/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

export function isFunction<T extends ((...args: any[]) => any)=((...args: any[]) => any)>(value: unknown): value is T {
    return typeof value === 'function';
}

export function assertIsFunction<T extends ((...args: any[]) => any)=((...args: any[]) => any)>(value: unknown): asserts value is T {
    if (!isFunction(value)) {
        throw new TypeError('value must be function');
    }
}
