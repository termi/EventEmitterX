'use strict';

import { displayValueForTypeGuard } from "./type_guards_utils";

export function isSymbol(value: symbol | unknown): value is symbol {
    return typeof value === 'symbol';
}

export function assertIsSymbol(value: symbol | unknown): asserts value is symbol {
    const type = typeof value;

    if (type !== 'symbol') {
        throw new TypeError(`value should be typeof "symbol", but ${displayValueForTypeGuard(value, type)} found.`);
    }
}

const _Symbol_isRegistered = Symbol.isRegistered;

export function isRegisteredSymbol(value: symbol | unknown): value is symbol {
    return typeof value === 'symbol' && _Symbol_isRegistered(value);
}

export function assertIsRegisteredSymbol(value: symbol | unknown): asserts value is symbol {
    const type = typeof value;

    if (type !== 'symbol' || !_Symbol_isRegistered(value as symbol)) {
        throw new TypeError(`value should be Symbol created via Symbol.for('key'), but ${displayValueForTypeGuard(value, type)} found.`);
    }
}

const _Symbol_isWellKnown = Symbol.isWellKnown;

export function isWellKnownSymbol(value: symbol | unknown): value is symbol {
    return typeof value === 'symbol' && _Symbol_isWellKnown(value);
}

export function assertIsWellKnownSymbol(value: symbol | unknown): asserts value is symbol {
    const type = typeof value;

    if (type !== 'symbol' || !_Symbol_isWellKnown(value as symbol)) {
        throw new TypeError(`value should be well-known Symbol, but ${displayValueForTypeGuard(value, type)} found.`);
    }
}

export function isUniqueSymbol(value: symbol | unknown): value is symbol {
    return typeof value === 'symbol'
        && !_Symbol_isRegistered(value)
        && !_Symbol_isWellKnown(value)
    ;
}

export function assertIsUniqueSymbol(value: symbol | unknown): asserts value is symbol {
    const type = typeof value;
    const isSymbol = typeof value === 'symbol';
    const isRegistered = isSymbol && _Symbol_isRegistered(value);
    const isWellKnown = !isRegistered && isSymbol && _Symbol_isWellKnown(value);

    if (!isSymbol || isRegistered || isWellKnown) {
        throw new TypeError(`value should be non-well-known and non-registered, unique Symbol, but ${displayValueForTypeGuard(value, type, {
            valuePrefix: isRegistered
                ? 'registered '
                : isWellKnown
                    ? 'well-known '
                    : ''
            ,
        })} found.`);
    }
}
