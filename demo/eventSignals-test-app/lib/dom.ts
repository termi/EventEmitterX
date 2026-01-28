'use strict';

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
