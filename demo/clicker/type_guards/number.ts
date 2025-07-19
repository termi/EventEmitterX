'use strict';

/** @private */
const _Number_isNaN = Number.isNaN;
/** @private */
const _Number_isFinite = Number.isFinite;
/** @private */
const _Number_NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
/** @private */
const _Number_POSITIVE_INFINITY = Number.POSITIVE_INFINITY;

/**
 * Return `true` if value is **finite** number.
 *
 * Note: Infinity and NaN is disallowed by default.
 */
export function isNumber(value: number | unknown, options?: isNumber.Options): value is number {
    if (typeof value === 'number') {
        const disallowNegative = options?.disallowNegative;
        const disallowPositive = options?.disallowPositive;

        if (((value as number) - (value as number)) !== 0) {// if (Number.isNaN(value) || !Number.isFinite(value)) {
            // Discard Infinity and NaN
            if (_Number_isNaN(value)) {
                return Boolean(options?.allowNaN);
            }
            if (!_Number_isFinite(value)) {
                if (options?.allowInfinity) {
                    if (disallowNegative) {
                        return value !== _Number_NEGATIVE_INFINITY;
                    }
                    if (disallowPositive) {
                        return value !== _Number_POSITIVE_INFINITY;
                    }

                    return true;
                }

                return false;
            }
        }

        if (disallowNegative) {
            if (disallowPositive) {
                return false;
            }

            return value >= 0;
        }
        if (disallowPositive) {
            if (disallowNegative) {
                return false;
            }

            return value <= 0;
        }

        return true;
    }

    return false;
}

export namespace isNumber {
    export type Options = {
        allowNaN?: boolean,
        allowInfinity?: boolean,
        disallowNegative?: boolean,
        disallowPositive?: boolean,
        // todo: min?: number,
        // todo: max?: number,
    };

    export type MinAndMaxOptions = {
        min: number,
        max?: number,
    } | {
        min?: number,
        max: number,
    };
}

export function isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number'
        && value > 0
        && Number.isFinite(value)
    ;
}

export function assertIsPositiveNumber(value: unknown | number): asserts value is number {
    if (!isPositiveNumber(value)) {
        throw new TypeError(`value should be positive finite number, but ${value} found`);
    }
}

/** @private */
function _isNumberInRange(value: number, min = _Number_NEGATIVE_INFINITY, max = _Number_POSITIVE_INFINITY) {
    return value >= min
        && value <= max
    ;
}

export function isNumberInRange(value: number | unknown, min = _Number_NEGATIVE_INFINITY, max = _Number_POSITIVE_INFINITY): value is number {
    return isNumber(value)
        && _isNumberInRange(value, min, max)
    ;
}

export function assertIsNumberInRange(value: number | unknown, min = _Number_NEGATIVE_INFINITY, max = _Number_POSITIVE_INFINITY): asserts value is number {
    if (!isNumberInRange(value, min, max)) {
        throw new TypeError(`value should be type "number" and in range (min = ${min}, max = ${max}).`);
    }
}
