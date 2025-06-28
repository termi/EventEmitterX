/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-empty-object-type */
'use strict';

import { displayValueForTypeGuard, primitiveValueToStringForTypeGuard } from "./type_guards_utils";

type TypeGuard<T> = (value: unknown) => value is T;
// Вспомогательный тип для извлечения типа из type guard
type ExtractTypeFromGuard<T> = T extends ((value: unknown) => value is infer U) ? U : never;

export function assertOneOfType<T extends Array<TypeGuard<any>>>(
    value: unknown,
    typeGuards: T,
): asserts value is ExtractTypeFromGuard<T[number]> {
    if (!typeGuards.some(guard => guard(value))) {
        throw new Error(`Value "${value}" does not match any of the expected types`);
    }
}


// Warning: this overwrite SHOULD BE without ` | unknown` in "value"
export function assertIsDefined<T>(value: T | null | undefined): asserts value is NonNullable<T>;
// Warning: this overwrite SHOULD BE without ` | unknown` in "value"
export function assertIsDefined<T extends {}, U extends T & {}>(value: T | null | undefined, expectedOneOf: U[]): asserts value is U;
// Warning: this overwrite SHOULD BE without ` | unknown` in "value"
export function assertIsDefined<T extends {}, U extends T & {}>(value: T | null | undefined, expected: U): asserts value is U;

export function assertIsDefined<T>(value: T | unknown | null | undefined, expected: T): asserts value is NonNullable<T>;
export function assertIsDefined<T extends {}>(value: T | null | undefined, expected?: NonNullable<T> | NonNullable<T>[]): asserts value is NonNullable<T> {
    if (value == null) {
        throw new TypeError(`value should be defined, but ${displayValueForTypeGuard(value)} found`);
    }

    if (expected != null) {
        if (Array.isArray(expected)) {
            if (!expected.includes(value as NonNullable<T>)) {
                const expectedAsString = displayValueForTypeGuard(expected, {
                    isDisplayType: false,
                    valuePrefix: 'values ',
                });

                throw new TypeError(`value should be defined with one of expected ${expectedAsString},\
 but ${displayValueForTypeGuard(value, { isDisplayType: false })} found.`);
            }
        }
        else if (expected !== value) {
            throw new TypeError(`value should be defined with expected value ${primitiveValueToStringForTypeGuard(expected)},\
 but ${displayValueForTypeGuard(value, { isDisplayType: false })} found.`);
        }
    }
}
