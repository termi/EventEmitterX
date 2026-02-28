/* eslint-disable @typescript-eslint/no-magic-numbers */
'use strict';

// Based on https://github.com/bevacqua/hash-sum
// More / Inspirations:
/*// Hash function from https://stackoverflow.com/a/52171480/3872976 (https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js)
function getHash(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
*/

export function hashSumInteger(o: any, options?: hashSum.Options) {
    return _hashSumNumber(o, options);
}

export function hashSumBase36(o: any, options?: hashSum.Options) {
    return _hashSumNumber(o, options).toString(36).padStart(7, '0');
}

/**
 * @param o - any value
 * @param options
 */
export function hashSum(o: any, options?: hashSum.Options) {
    return _hashSumNumber(o, options).toString(16).padStart(8, '0');
}

export namespace hashSum {
    export type Options = {
        /** ignore undefined values in objects */
        ignoreUndefinedValues?: boolean,
        ignoreKeysInTopObject?: string[],
        /**
         * Ignore non-POJO (non-"Plain Old JavaScript Object"). POJO is objects with `__proto__` == `Object.prototype` or `null`.
         *
         * Except: Date, Array, Function.
         */
        ignoreNonPOJO?: boolean,
    };
}

export default hashSum;

type _SeenSet = Set<object>;

const _fold__flags__isTopObject = 1 << 0;
/**
 * @see {@link hashSum.Options.ignoreUndefinedValues}
 */
const _fold__flags__ignoreUndefinedValues = 1 << 1;
/**
 * @see {@link hashSum.Options.ignoreNonPOJO}
 * @see {@link _isPOJO}
 */
const _fold__flags__ignoreNonPOJOChild = 1 << 2;

export function foldPrimitiveValue(salt: number, value: bigint | boolean | number | string, options = 0 as foldPrimitiveValue.Options) {
    const type = typeof value;
    const stringTag = _Object_toString.call(value);
    let hash = salt || 0;

    if ((options & foldPrimitiveValue.Options.ignoreType) === 0) {
        if (hash === 0) {
            if (stringTag === '[object Number]') {
                if (type === 'number') {
                    hash = 4_032_261_286;
                }
                else {
                    hash = _fold(2_830_567_780, type);
                }
            }
            else if (stringTag === '[object String]') {
                if (type === 'string') {
                    hash = 3_148_254_198;
                }
                else {
                    hash = _fold(2_593_054_964, type);
                }
            }
            else if (stringTag === '[object BigInt]') {
                if (type === 'bigint') {
                    hash = 616_664_338;
                }
                else {
                    hash = _fold(469_746_824, type);
                }
            }
            else if (stringTag === '[object Boolean]') {
                if (type === 'boolean') {
                    hash = 1_313_792_926;
                }
                else {
                    hash = _fold(2_653_184_330, type);
                }
            }
            else {
                hash = _fold(_fold(hash, stringTag), type);
            }
        }
        else {
            hash = _fold(_fold(hash, stringTag), type);
        }
    }

    if ((options & foldPrimitiveValue.Options.doNotNormalize) !== 0) {
        return _foldRaw(hash, String(value));
    }

    return _fold(hash, String(value));
}

export namespace foldPrimitiveValue {
    export const enum Options {
        doNotNormalize = 1 << 0,
        ignoreType = 1 << 1,
    }
}

export function foldPrimitiveValues(values: (bigint | boolean | number | string)[], salt = 0) {
    if (!Array.isArray(values) || values.length === 0) {
        // the result of `hashSumInteger('')`
        return 3_148_254_198;
    }

    let hash = foldPrimitiveValue(salt || 0, values[0] as NonNullable<typeof values[0]>, foldPrimitiveValue.Options.doNotNormalize);
    let prev_type = typeof values[0];
    let prev_stringTag = _Object_toString.call(values[0]);

    for (let i = 1, len = values.length ; i < len ; i++) {
        const type = typeof values[0];
        const stringTag = _Object_toString.call(values[0]);
        let options = foldPrimitiveValue.Options.doNotNormalize;

        if (stringTag === prev_stringTag && type === prev_type) {
            options |= foldPrimitiveValue.Options.ignoreType;
        }
        else {
            prev_type = type;
            prev_stringTag = stringTag;
        }

        hash = foldPrimitiveValue(hash, values[i] as NonNullable<typeof values[0]>, options);
    }

    return hash < 0 ? hash * -2 : hash;
}

/** @private */
function _foldRaw(hash: number, text: string) {
    if (text.length === 0) {
        return hash;
    }

    for (let i = 0, len = text.length ; i < len ; i++) {
        // eslint-disable-next-line unicorn/prefer-code-point
        const chr = text.charCodeAt(i);

        // eslint-disable-next-line unicorn/prefer-math-trunc
        hash = (((hash << 5) - hash) + chr) | 0;
    }

    return hash;
}

/** @private */
function _fold(hash: number, text: string) {
    if (text.length === 0) {
        return hash;
    }

    for (let i = 0, len = text.length ; i < len ; i++) {
        // eslint-disable-next-line unicorn/prefer-code-point
        const chr = text.charCodeAt(i);

        // eslint-disable-next-line unicorn/prefer-math-trunc
        hash = (((hash << 5) - hash) + chr) | 0;
    }

    return hash < 0 ? hash * -2 : hash;
}

/** @private */
function _foldObject(hash: number, o: Record<string, unknown>, options: _foldValue.Options): number | undefined {
    const { flags: optionsFlags } = options;
    const isTopObject = optionsFlags & _fold__flags__isTopObject;

    if (isTopObject) {
        options.flags &= ~_fold__flags__isTopObject;
    }

    if ((optionsFlags & _fold__flags__ignoreNonPOJOChild)
        && !isTopObject
        && !_isPOJO(o)
        && !(o instanceof Date || Array.isArray(o))
    ) {
        // then value ignored, return 0
        return 0;
    }

    const { ignoreTopKeysSet } = options;

    if (ignoreTopKeysSet) {
        delete options.ignoreTopKeysSet;
    }

    return Object.keys(o).sort().reduce<number>(function foldKey(hash: number, key: string) {
        if (ignoreTopKeysSet?.has(key)) {
            return hash;
        }

        let value: unknown;

        try {
            value = o[key];
        }
        catch (err) {
            // eslint-disable-next-line prefer-template
            return _fold(hash, '[valueOf exception]' + _errMessage(err));
        }

        if ((optionsFlags & _fold__flags__ignoreUndefinedValues) && value === void 0) {
            return hash;
        }

        return _foldValue(hash, value, key, options);
    }, hash);
}

const _Object_toString = Object.prototype.toString;

/** @private */
function _foldValue(input: number, value: any, key: string, options: _foldValue.Options): number {
    const hash = _fold(_fold(_fold(input, key), _Object_toString.call(value)), typeof value);

    if (value === null) {
        return _fold(hash, 'null');
    }

    if (value === undefined) {
        return _fold(hash, 'undefined');
    }

    if (typeof value === 'object' || typeof value === 'function') {
        const { seen } = options;

        if (seen.has(value)) {
            // eslint-disable-next-line prefer-template
            return _fold(hash, '[Circular]' + key);
        }

        seen.add(value);

        const objHash = _foldObject(hash, value, options);

        if (objHash === 0) {
            // value was ignored
            return hash;
        }

        if (objHash) {
            if (!('valueOf' in value) || typeof value.valueOf !== 'function') {
                return objHash;
            }

            try {
                return _fold(objHash, String(value.valueOf()));
            }
            catch (err) {
                // eslint-disable-next-line prefer-template
                return _fold(objHash, '[valueOf exception]' + _errMessage(err));
            }
        }
    }

    return _fold(hash, value.toString());
}

namespace _foldValue {
    export type Options = {
        ignoreTopKeysSet?: Set<string>,
        flags: number,
        seen: _SeenSet,
        __proto__: null,
    };
}

/** @private */
function _errMessage(err: Error|any) {
    if (err) {
        if (typeof err === 'object') {
            return ((err as Error).stack || (err as Error).message) || String(err);
        }

        return String(err);
    }

    return String(err || '') || '';
}

/** @private */
function _hashSumNumber(o: any, options?: hashSum.Options) {
    const ignoreKeysInTopObject = options?.ignoreKeysInTopObject;
    const typeOfTopValue = typeof o;
    const seen: _SeenSet = new Set();
    const _foldOptions: _foldValue.Options = {
        ignoreTopKeysSet: ignoreKeysInTopObject ? new Set(ignoreKeysInTopObject) : void 0,
        flags: 0
            | (options?.ignoreUndefinedValues ? _fold__flags__ignoreUndefinedValues : 0)
            | (options?.ignoreNonPOJO ? _fold__flags__ignoreNonPOJOChild : 0)
            | (typeOfTopValue === 'object' || typeOfTopValue === 'function' ? _fold__flags__isTopObject : 0)
        ,
        seen,
        __proto__: null,
    };

    const result = _foldValue(0, o, '', _foldOptions);

    seen.clear();

    return result;
}

const _Object_prototype = Object.prototype;

/**
 * @link [What is a Plain Old JavaScript Object (POJO)?]{@link https://masteringjs.io/tutorials/fundamentals/pojo}
 */
function _isPOJO(maybeObject: Object | unknown) {
    if (typeof maybeObject !== 'object' || !maybeObject) {
        return false;
    }

    const proto = Object.getPrototypeOf(maybeObject);

    return proto === _Object_prototype || proto === null;
}
