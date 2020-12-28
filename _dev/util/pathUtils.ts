'use strict';

/**
 * Important: joinPath('http://10.0.0.1:8080', '/test/') -> 'http://10.0.0.1:8080/test/'
 *
 * В отличие от node path.join, эта функция:
 * 1. Не нормализует разделители. Т.е., разделитель "\" останется нетронутым, а новые разделители будут "/"
 * 2. Не удаляет повторяющиеся разделители в строках parts. Поэтому, эту функцию можно использовать для построения URL'ов
 *
 * @param {...string} parts
 * @returns {string}
 */
export function joinPath(...parts: string[]) {
    let result = '';
    let isFirst = true;

    for (let i = 0, len = parts.length ; i < len ; i++) {
        let part = parts[i];

        if (!part || typeof (part as unknown) !== 'string') {
            if (part === void 0 || part === null) {
                part = '';
            }
            else {
                part = String(part);
            }
        }

        const isResultEndsWithSep = result.endsWith('/');
        const isPartStartsWithSep = part.startsWith('/');

        const delimiter = !isResultEndsWithSep && !isPartStartsWithSep
            ? '/'
            : ''
        ;

        if (isResultEndsWithSep && isPartStartsWithSep) {
            part = part.substring(1);
        }

        result = result + (isFirst ? '' : delimiter) + part;

        isFirst = false;
    }

    return result;
}
