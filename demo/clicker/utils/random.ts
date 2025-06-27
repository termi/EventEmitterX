'use strict';

/** int32, LONG_MAX. C/C++ "long" and "int" max. 2_147_483_647, 2147483648, 0x7FFFFFFF */
const INT32_MAX_VALUE = 2_147_483_647;

export function makeRandomInteger(from = 0, to = INT32_MAX_VALUE) {
    const value = Math.random() * (to - from);

    return Math.floor(from) + Math.floor(value);
}

export function makeRandomString(prefix?: string, suffix?: string, mini?: boolean): string;
export function makeRandomString(prefix?: string, mini?: boolean): string;
export function makeRandomString(mini?: boolean): string;
export function makeRandomString(prefix_or_mini?: boolean | string, suffix_or_mini?: boolean | string, mini?: boolean): string {
    const firstArgIsMini = typeof prefix_or_mini === 'boolean';
    const secondArgIsMini = !firstArgIsMini && typeof suffix_or_mini === 'boolean';
    const prefix = firstArgIsMini ? void 0 : prefix_or_mini;
    const suffix = secondArgIsMini ? void 0 : suffix_or_mini as string;

    if (firstArgIsMini) {
        mini = prefix_or_mini;
    }
    else if (secondArgIsMini) {
        mini = suffix_or_mini;
    }

    return `${prefix || ''}${makeRandomInteger(0, mini ? void 0 : 9e9).toString(36)}${mini ? '' : Date.now().toString(36)}${suffix || ''}`;
}
