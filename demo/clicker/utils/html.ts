'use strict';

import type { FormElementDescription } from "../types/htmlSchema";

import { assertIsPositiveNumber } from "../type_guards/number";
import { localISOString } from "./date";
import { TIMES } from "./times";

export function makeFormElementsList(elements: Record<string, FormElementDescription>): FormElementDescription[] {
    return Object.values(elements).sort((element1, element2) => {
        return element1.order - element2.order;
    });
}

/**
 * @see [Using native `date`/`time` inputs with non UTC timeZone](https://developer.mozilla.org/en-US/play?id=Ewfyn5EGRqObAKbOaR%2BYiM9hIhODY9YLRgKn26uEelRYN3Yaq%2BvdABxw%2BpvWp%2BUSafFgHXMAalObi%2FrL)
 */
export function dateToHTMLInputDateTimeLocalValue(value?: number | string | Date, skipSeconds = false) {
    const isoString = localISOString(value);

    if (skipSeconds) {
        const lastIndex = isoString.lastIndexOf(':');

        if (isoString.endsWith('Z')) {
            // "2025-06-27T00:56:13.573Z" -> "2025-06-27T00:56"
            return isoString.substring(0, lastIndex);
        }

        const nextIndex = isoString.lastIndexOf(':', lastIndex - 1);

        // '2025-06-27T04:10:39.313+03:00' -> '2025-06-27T04:10'
        return isoString.substring(0, nextIndex);
    }

    const lastIndex = isoString.lastIndexOf('.');

    // "2025-06-27T00:56:13.573Z" -> "2025-06-27T00:56:13"
    // '2025-06-27T04:10:39.313+03:00' -> '2025-06-27T04:10:39'
    return isoString.substring(0, lastIndex);
}

export function dateFromHTMLInputDateTimeLocalInput(input: HTMLInputElement) {
    if (input.type !== 'datetime-local') {
        throw new Error('Invalid input element');
    }

    const gtmValue = input.valueAsNumber ?? new Date(input.value).getTime();

    assertIsPositiveNumber(gtmValue);

    const offset = new Date().getTimezoneOffset();
    const offsetInMs = offset * TIMES.MINUTES;

    return gtmValue + offsetInMs;
}
