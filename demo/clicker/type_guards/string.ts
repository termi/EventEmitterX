'use string';

import { displayValueForTypeGuard, primitiveValueToStringForTypeGuard } from "./type_guards_utils";

// todo: Добавить перегрузку 2го параметра со значением `lengthOptions: _LengthOptions` - чтобы проверять длинну строки.
export function isString(value: unknown): value is string;
export function isString<T extends string>(value: T | unknown | null | undefined): value is T;
export function isString<T extends string, U extends T & string>(value: T | unknown | null | undefined, expectedOneOf: U[]): value is U;
export function isString<T extends string, U extends T & string>(value: T | unknown | null | undefined, expected: U): value is U;
// Warning: Эта перегрузка нужна для того, чтобы работали suggestions
// Warning: this overwrite SHOULD BE without ` | unknown` in "value"
export function isString<T extends string, U extends T & {}>(value: T | null | undefined, expected: U): asserts value is U;
// Warning: Эта перегрузка нужна для того, чтобы работали suggestions
// Warning: this overwrite SHOULD BE without ` | unknown` in "value"
export function isString<T extends string, U extends T & {}>(value: T | null | undefined, expected: U[]): asserts value is U;
export function isString<T extends string>(value: T | unknown | null | undefined, expected?: NonNullable<T> | NonNullable<T>[]): value is T {
    if (typeof value !== 'string') {
        return false;
    }

    if (typeof expected === 'string') {
        return expected === value;
    }

    if (!!expected && Array.isArray(expected)) {
        return expected.includes(value as T);
    }

    return true;
}

export function assertIsString<T extends string>(value: T | unknown | null | undefined): asserts value is T;
export function assertIsString<T extends string, U extends T & string>(value: T | unknown | null | undefined, expectedOneOf: U[]): asserts value is U;
export function assertIsString<T extends string, U extends T & string>(value: T | unknown | null | undefined, expected: U): asserts value is U;
// Warning: Эта перегрузка нужна для того, чтобы работали suggestions
// Warning: this overwrite SHOULD BE without ` | unknown` in "value"
export function assertIsString<T extends string, U extends T & {}>(value: T | null | undefined, expected: U): asserts value is U;
// Warning: Эта перегрузка нужна для того, чтобы работали suggestions
// Warning: this overwrite SHOULD BE without ` | unknown` in "value"
export function assertIsString<T extends string, U extends T & {}>(value: T | null | undefined, expected: U[]): asserts value is U;
export function assertIsString<T extends string>(value: T | unknown | null | undefined, expected?: NonNullable<T> | NonNullable<T>[]): asserts value is T {
    const type = typeof value;

    if (type !== 'string') {
        throw new TypeError(`value should be typeof "string", but ${displayValueForTypeGuard(value, type)} found`);
    }

    if (typeof expected === 'string') {
        if (expected !== value) {
            throw new TypeError(`value should be typeof "string" with expected value ${primitiveValueToStringForTypeGuard(expected)},\
 but ${displayValueForTypeGuard(value, type, { isDisplayType: false })} found`);
        }
    }
    else if (!!expected && Array.isArray(expected) && !expected.includes(value as T)) {
        const expectedAsString = displayValueForTypeGuard(expected, {
            isDisplayType: false,
            isDisplayArray: true,
            valuePrefix: 'values ',
        });

        throw new TypeError(`value should be typeof "string" with one of expected ${expectedAsString},\
 but ${displayValueForTypeGuard(value, type, { isDisplayType: false })} found.`);
    }
}

export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string'
        && value.length > 0
    ;
}

export function assertIsNonEmptyString(value: unknown): asserts value is string {
    if (!isNonEmptyString(value)) {
        throw new TypeError('value should be non-empty string');
    }
}

const RE_isISOString = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(\.\d+)?([+-][0-2]\d:[0-5]\d|Z)/;

/**
 * Is {@link maybeISOString} a ISO_8601 string.
 *
 * @example
 * isISOString(void 0) === false;
 * isISOString(null) === false;
 * isISOString('12.02.2024') === false;
 *
 * isISOString('1970-01-01T00:00:00.000Z') === true;
 * isISOString('2025-04-10T09:20:50.074Z') === true;
 * isISOString('2025-04-10T12:20:50.074+03:00') === true;
 */
export function isISOString(maybeISOString: unknown): maybeISOString is string {
    return typeof maybeISOString === 'string' && RE_isISOString.test(maybeISOString);
}
