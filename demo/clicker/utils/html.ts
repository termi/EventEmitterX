'use strict';

import type { FormElementDescription } from "../types/htmlSchema";

import { isNumber } from "../type_guards/number";
import { localISOString } from "./date";
import { TIMES } from "./times";

export function makeFormElementsList(elements: Record<string, FormElementDescription>): FormElementDescription[] {
    return Object.values(elements).sort((element1, element2) => {
        return element1.order - element2.order;
    });
}

/**
 * * Use it for input.type: `date`, `time` and `datetime-local`.
 * * Do not use it for input.type == `month` and input.type == `week`!
 *
 * @see [Using native `date`/`time` inputs with non UTC timeZone](https://developer.mozilla.org/en-US/play?id=Ewfyn5EGRqObAKbOaR%2BYiM9hIhODY9YLRgKn26uEelRYN3Yaq%2BvdABxw%2BpvWp%2BUSafFgHXMAalObi%2FrL)
 */
export function dateToHTMLInputDateTimeLocalValue(value?: Date | number | string, options?: {
    skipSeconds?: boolean,
    allowMilliseconds?: boolean,
}) {
    const isoString = localISOString(value);

    if (options?.skipSeconds) {
        const lastIndex = isoString.lastIndexOf(':');

        if (isoString.endsWith('Z')) {
            // "2025-06-27T00:56:13.573Z" -> "2025-06-27T00:56"
            return isoString.substring(0, lastIndex);
        }

        const nextIndex = isoString.lastIndexOf(':', lastIndex - 1);

        // '2025-06-27T04:10:39.313+03:00' -> '2025-06-27T04:10'
        return isoString.substring(0, nextIndex);
    }

    if (options?.allowMilliseconds) {
        if (isoString.endsWith('Z')) {
            // "2025-06-27T00:56:13.573Z" -> "2025-06-27T00:56"
            return isoString.substring(0, isoString.length - 1);
        }

        let lastIndex = isoString.lastIndexOf('+');

        if (lastIndex === -1) {
            lastIndex = isoString.lastIndexOf('-');
        }

        if (lastIndex === -1) {
            // "2025-06-27T00:56:13.573Z" -> "2025-06-27T00:56:13"
            // '2025-06-27T04:10:39.313+03:00' -> '2025-06-27T04:10:39'
            return isoString.substring(0, lastIndex);
        }

        return isoString;
    }

    const lastIndex = isoString.lastIndexOf('.');

    // "2025-06-27T00:56:13.573Z" -> "2025-06-27T00:56:13"
    // '2025-06-27T04:10:39.313+03:00' -> '2025-06-27T04:10:39'
    return isoString.substring(0, lastIndex);
}

/**
 * * `true` - Browser supported. Should support `valueAsDate` property.
 * * `null` - Browser limited supported. Not support `valueAsDate` property.
 */
const dateTimeBasedTypes = {
    __proto__: null,
    "date": true,
    "time": true,
    "week": null,
    "month": null,
    // note: "datetime" is deprecated in favor of "datetime-local"
    "datetime-local": true,
} as const;

export function dateFromHTMLInputDateTimeLocalInput(input: HTMLInputElement, offset = new Date().getTimezoneOffset()) {
    const { type } = input;

    if (!(type in dateTimeBasedTypes)) {
        throw new Error('Invalid input element');
    }

    // note:
    //  1. Can't use `input.valueAsDate?.getTime()` due potential "Throws an "InvalidStateError" DOMException if the control isn't date- or time-based."
    //  2. With `input.type === 'month'` value of `input.valueAsNumber` is month number from '1970-01' (input.value = '2000-01', input.valueAsNumber == 360)
    let gtmValue = /*input.valueAsDate?.getTime()
        ?? */(type !== 'month' ? input.valueAsNumber : void 0)
        ?? (type === 'time'
                ? _parseTimeString(input.value)
                : null
        )
    ;
    const offsetInMs = offset * TIMES.MINUTES;

    if (gtmValue == null) {
        const isISOStringWithTimeZone = input.value.endsWith('Z');

        gtmValue = new Date(input.value).getTime();

        if (!isISOStringWithTimeZone) {
            return gtmValue;
        }
    }

    return gtmValue + offsetInMs;
}

function _parseTimeString(timeString: string) {
    if (!timeString || timeString === '--:--') {
        return Number.NaN;
    }

    const { 0: hoursString, 1: minutesString } = timeString.split(':');
    const hours = Number.parseInt(hoursString || '', 10);
    const minutes = Number.parseInt(minutesString || '', 10);

    return hours * TIMES.HOURS + minutes * TIMES.MINUTES;
}

export function getFormElementValue(
    formElement: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): Date | string[] | boolean | string | undefined {
    if (!formElement) {
        return;
    }

    let formElementValue: Date | string[] | boolean | string | undefined;
    const { tagName } = formElement;
    const dateTimeBasedInputsOffset = new Date().getTimezoneOffset();

    if (tagName === 'INPUT') {
        const { type, value } = formElement;

        if (type === 'radio') {
            if (!(formElement as HTMLInputElement).checked) {
                return;
            }

            formElementValue = value;
        }
        else if (type === 'select') {
            formElementValue = value;
        }
        else if (type in dateTimeBasedTypes) {
            // type === 'time'
            // Default value is '' (or '--:--' on input)
            // type === 'week'
            const timestamp = dateFromHTMLInputDateTimeLocalInput(formElement as HTMLInputElement, dateTimeBasedInputsOffset);

            if (isNumber(timestamp)) {
                formElementValue = new Date(timestamp);
            }
        }
        /* jshint noempty:true*/
        else if (type === 'file' || type === 'image') {
            // TODO::
        }
        /* jshint noempty:false*/
        else if (type === 'checkbox') {
            if ((formElement as HTMLInputElement).indeterminate) {
                return;
            }

            formElementValue = (formElement as HTMLInputElement).checked;
        }
        else if (type !== 'reset' && type !== 'button' && type !== 'submit') {
            // type === 'color'
            // type === 'email'
            // type === 'hidden'
            // type === 'number'
            // type === 'password'
            // type === 'range'
            // type === 'search'
            // type === 'tel'
            // type === 'text'
            // type === 'url'
            formElementValue = value;
        }
    }
    else if (tagName === 'TEXTAREA') {
        formElementValue = (formElement as HTMLTextAreaElement).value;
    }
    else if (tagName === 'SELECT') {
        const { type, value } = formElement;

        if (type === 'select' || type === 'select-one') {
            formElementValue = value;
        }
        else if (type === 'select-multiple') {
            formElementValue = Array.from((formElement as HTMLSelectElement).selectedOptions || [])
                .map(option => option.value)
            ;
        }
    }

    return formElementValue;
}

export function formAsObject<T = Record<string, ReturnType<typeof getFormElementValue>>>(
    element: HTMLFormElement,
    options?: formToObject.Options<T>,
): T;
export function formAsObject<T = Record<string, ReturnType<typeof getFormElementValue>>>(
    element: HTMLFormElement,
    filterFn?: formToObject.Options<T>["filterFn"],
    mapFn?: formToObject.Options<T>["mapFn"],
): T;
export function formAsObject<T = Record<string, ReturnType<typeof getFormElementValue>>>(
    element: HTMLFormElement,
    filterFn_or_options?: formToObject.Options<T> | formToObject.Options<T>["filterFn"],
    _mapFn?: formToObject.Options<T>["mapFn"],
): T {
    const resultObject = Object.create(null) as T;

    if (!element || element.nodeName !== 'FORM') {
        return resultObject;
    }

    if (!element.elements) {
        console.error('Form element has no "elements" collection', element);

        return resultObject;
    }

    const hasOptions = typeof filterFn_or_options === 'object' && !!filterFn_or_options;
    // const ignoreHidden = hasOptions ? filterFn_or_options.i
    const filterFn = hasOptions && filterFn_or_options.filterFn;
    const mapFn = hasOptions ? filterFn_or_options.mapFn : _mapFn;
    const isFilterFn = typeof filterFn === 'function';
    const isMapFn = typeof mapFn === 'function';

    for (let i = 0, array = element.elements, len = array.length ; i < len ; i++) {
        const formElement = array[i] as HTMLInputElement;

        if (formElement) {
            const name = (formElement.name || formElement.id) as keyof T;

            if (!name) {
                continue;
            }

            let formElementValue = getFormElementValue(formElement) as T[keyof T];
            const prevValues = resultObject[name];

            if (formElementValue === void 0) {
                continue;
            }

            if (isFilterFn && !filterFn(name, formElementValue as unknown as T[keyof T], formElement, prevValues)) {
                continue;
            }

            if (isMapFn) {
                const newValue = mapFn(name, formElementValue as unknown as T[keyof T], formElement, prevValues);

                if (newValue === void 0) {
                    continue;
                }

                formElementValue = newValue;
            }

            if (Array.isArray(prevValues)) {
                if (Array.isArray(formElementValue)) {
                    prevValues.push(...formElementValue);
                }
                else {
                    prevValues.push(formElementValue as string);
                }
            }
            else if (prevValues !== void 0) {
                resultObject[name] = [ prevValues, formElementValue ] as T[keyof T];
            }
            else {
                resultObject[name] = formElementValue as T[keyof T];
            }
        }
    }

    return resultObject;
}

export namespace formToObject {
    export type Options<T = Record<string, ReturnType<typeof getFormElementValue>>> = {
        filterFn?: (name: keyof T, value: T[keyof T], htmlElement: HTMLElement, prevValues: T[keyof T]) => boolean,
        mapFn?: (name: keyof T, value: T[keyof T], htmlElement: HTMLElement, prevValues: T[keyof T]) => T[keyof T],
        ignoreHidden?: boolean,
    };
}
