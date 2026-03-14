/* eslint-disable unicorn/prevent-abbreviations */
'use strict';

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

/**
 * An alternative of {@link Element.prototype.closest} but with `stopElement` parameter.
 *
 * This method traverses the [`Element`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Element} and its parents
 *  (heading toward the document root) until it finds a node that matches the provided selector string or reached `stopElement`.
 *  Will return itself or the matching ancestor. If no such element exists, it returns null.
 *
 * @param element - element to start traversing from.
 * @param selector - css selector.
 * @param stopElement - element or it's selector to end traversing.
 * @returns - `closestElement` is the [`Element`]{@link https://developer.mozilla.org/en-US/docs/Web/API/Element} which
 *  is the closest ancestor of the selected element. It may be null.
 *
 * @see [MDN / Element.closest()]{@link https://developer.mozilla.org/en-US/docs/Web/API/Element/closest}
 */
export function closestElement(element: Element, selector: string, stopElement?: Element | string | null) {
    if (!element || selector == null) {
        return null;
    }

    if (!selector) {
        throw new SyntaxError(`'${selector}' is not a valid selector`);
    }

    if (!stopElement) {
        return element.closest(selector);
    }

    let currentElement: Element | null = element;

    const isStopElementSelector = typeof stopElement === 'string';

    while (currentElement !== null) {
        if (currentElement.matches(selector)) {
            return currentElement;
        }

        if (stopElement) {
            if (isStopElementSelector) {
                if (currentElement.matches(stopElement)) {
                    break;
                }
            }
            else {
                if (currentElement === stopElement) {
                    break;
                }
            }
        }

        currentElement = currentElement.parentElement;
    }

    return null;
}

export function getFormValuesAsObject<T = Record<string, ReturnType<typeof getFormElementValue>>>(
    element: HTMLFormElement,
    options?: getFormValuesAsObject.Options<T>,
): T;
export function getFormValuesAsObject<T = Record<string, ReturnType<typeof getFormElementValue>>>(
    element: HTMLFormElement,
    filterFn?: getFormValuesAsObject.Options<T>["filterFn"],
    mapFn?: getFormValuesAsObject.Options<T>["mapFn"],
): T;
export function getFormValuesAsObject<T = Record<string, ReturnType<typeof getFormElementValue>>>(
    element: HTMLFormElement,
    filterFn_or_options?: getFormValuesAsObject.Options<T> | getFormValuesAsObject.Options<T>["filterFn"],
    _mapFn?: getFormValuesAsObject.Options<T>["mapFn"],
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

export namespace getFormValuesAsObject {
    export type Options<T = Record<string, ReturnType<typeof getFormElementValue>>> = {
        filterFn?: (name: keyof T, value: T[keyof T], htmlElement: HTMLElement, prevValues: T[keyof T]) => boolean,
        mapFn?: (name: keyof T, value: T[keyof T], htmlElement: HTMLElement, prevValues: T[keyof T]) => T[keyof T],
        ignoreHidden?: boolean,
    };
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

Object.freeze(dateTimeBasedTypes);

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
    const offsetInMs = offset * MINUTES;

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

    return (hours * HOURS) + (minutes * MINUTES);
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

            if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
                formElementValue = new Date(timestamp);
            }
        }
        else if (type === 'file') {
            // note: Object with file's is not `JSON.stringify` compatible
            const { files } = (formElement as HTMLInputElement);

            if ((formElement as HTMLInputElement).multiple) {
                if (files) {
                    checkFiles: if (files.length > 0) {
                        if (files.length === 1) {
                            const file = files[0];

                            if (!(file?.name && file.size > 0)) {
                                break checkFiles;
                            }
                        }

                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                        // @ts-ignore `TS2322: Type FileList is not assignable to type string | boolean | Date | string[] | undefined`
                        formElementValue = files;
                    }
                }
                else if (Array.isArray(value)) {
                    formElementValue = value;
                }
                else {
                    formElementValue = [ value ];
                }
            }
            else if (files) {
                const file = files[0];

                if (file?.name && file.size > 0) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                    // @ts-ignore `TS2322: Type File is not assignable to type string | boolean | Date | string[] | undefined`
                    formElementValue = file;
                }
            }
            else if (value) {
                formElementValue = value;
            }
        }
        else if (type === 'checkbox') {
            if ((formElement as HTMLInputElement).indeterminate) {
                return;
            }

            formElementValue = (formElement as HTMLInputElement).checked;
        }
        // note: `input type=image` is just a button with image
        else if (type !== 'reset' && type !== 'button' && type !== 'submit' && type !== 'image') {
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
