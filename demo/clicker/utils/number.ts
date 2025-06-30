'use strict';

/**
 * @example```
 calcPercent(100, 15) === 15;
 calcPercent(200, 30) === 15;
 ```
 */
export function calculatePercent(fromValue: number, value: number) {
    if (!value || !fromValue) {
        return 0;
    }

    const result = (value / fromValue) * 100;

    if (!result) {// 0, null, undefined, NaN, etc
        return 0;
    }

    return result;
}
