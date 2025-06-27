'use strict';

import type { FormElementDescription } from "../types/htmlSchema";

import { localISOString } from "./date";
import { TIMES } from "./times";

export function makeFormElementsList(elements: Record<string, FormElementDescription>): FormElementDescription[] {
    return Object.values(elements).sort((element1, element2) => {
        return element1.order - element2.order;
    });
}

export function dateToHTMLInputDateTimeLocalValue(value?: number | string | Date) {
    const isoString = localISOString(value);
    const lastIndex = isoString.lastIndexOf(':');

    if (isoString.endsWith('Z')) {
        // "2025-06-27T00:56:56.573Z" -> "2025-06-27T00:56"
        return isoString.substring(0, lastIndex);
    }

    const nextIndex = isoString.lastIndexOf(':', lastIndex - 1);

    // '2025-06-27T04:10:39.313+03:00' -> '2025-06-27T04:10'
    return isoString.substring(0, nextIndex);
}

export function dateFromHTMLInputDateTimeLocalInput(input: HTMLInputElement) {
    if (input.type !== 'datetime-local') {
        throw new Error('Invalid input element');
    }

    const gtmValue = input.valueAsNumber;
    const offset = new Date().getTimezoneOffset();
    const offsetInMs = offset * TIMES.MINUTES;

    return gtmValue + offsetInMs;
}
