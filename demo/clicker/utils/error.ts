'use strict';

import { checkIsPropertyEditable, redefineProperty } from "./object";

export function stringifyError(error: unknown, useStringAndErrorOnly?: boolean): string;
export function stringifyError(error: null | undefined): '';
export function stringifyError(error: string | Error | null | undefined | unknown, useStringAndErrorOnly?: boolean) {
    if (!error) {
        return '';
    }

    if (typeof error === 'string') {
        return error;
    }

    if (Error.isError(error)) {
        return error.message || String(error || '');
    }

    if (useStringAndErrorOnly) {
        return '';
    }

    return JSON.stringify(error);
}

export type ErrorDTO = {
    message: string,
    className: string,
    stack: string,
    code?: string | number,
}

export function errorToDTO(error: Error | unknown): ErrorDTO {
    if (!(error instanceof Error)) {
        return {
            message: stringifyError(error),
            stack: '',
            className: '',
        };
    }

    const {
        message,
        stack = '',
        code,
    } = error as Error & { code?: string | number };
    const className = error.constructor?.name || '';

    return {
        message,
        className,
        stack,
        code,
    };
}

// note: Почему-то из файла types/global.d.ts не работает
declare global {
    interface ObjectConstructor {
        keys<T extends object>(o: T): (keyof T)[];
        keys(o: object): string[];
    }
}

export function errorFromDTO(errorDTO: ErrorDTO) {
    if (!checkErrorStackIsEditable()) {
        return _syntheticCreateError(errorDTO);
    }

    // todo: use errorDTO.className to setup right prototype
    const error = new Error('-placeholder-');

    for (const key of Object.keys(errorDTO)) {
        const value = errorDTO[key];

        if (value !== void 0) {
            redefineProperty(error, key, { value });
        }
    }
}

function _syntheticCreateError(errorDTO: ErrorDTO) {
    const { className, ...error } = errorDTO;

    // todo: use className to setup right prototype
    void className;
    Object.setPrototypeOf(error, Error.prototype);

    return error as unknown as Error;
}

let _errorStackIsEditable: boolean | undefined;

/**
 * При использовании Sentry или других Error-Immutable библиотек, свойства инстанса error нельзя отредактировать.
 */
export function checkErrorStackIsEditable() {
    if (_errorStackIsEditable !== void 0) {
        return _errorStackIsEditable;
    }

    const error = new Error('-checkIsReadonlyError-');

    return _errorStackIsEditable = checkIsPropertyEditable(error, 'stack');
}
