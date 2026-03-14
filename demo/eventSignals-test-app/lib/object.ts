'use strict';

export function shallowEqual(value1: any, value2: any) {
    if (Object.is(value1, value2)) {
        return true;
    }

    if (!value1 || !value2) {
        return false;
    }

    const type = typeof value1;

    if (type !== typeof value2) {
        return false;
    }

    if (type === 'object') {
        const keys = Object.keys(value1).sort();
        const keys2 = Object.keys(value2).sort();

        if (keys.length !== keys2.length) {
            return false;
        }

        for (const key of keys) {
            const value = value1[key];

            if (!Object.is(value, value2[key])) {
                return false;
            }
        }

        return true;
    }

    return false;
}

const getArrayDiff_emptyObject = {
    addedSet: Object.freeze(new Set<any>()),
    addedList: Object.freeze([] as any[]),
    removedSet: Object.freeze(new Set<any>()),
    removedList: Object.freeze([] as any[]),
    isSame: true,
};

Object.freeze(getArrayDiff_emptyObject);

function _makeKeysSetFromIterable<T>(iterable: Iterable<T>) {
    if (Symbol.iterator in iterable) {
        const values = [ ...iterable ];

        if (Array.isArray(values[0])) {
            const keys = values.map(pair => pair[0]);

            return new Set<T>(keys) as Set<T>;
        }

        return new Set<T>(values);
    }

    return new Set<T>(iterable);
}

export function getIterableDiff<T>(from: Iterable<[ T, ...any ]>, to: Iterable<[ T, ...any ]>): getIterableDiff.Result<T>;
export function getIterableDiff<T>(from: Iterable<T>, to: Iterable<T>): getIterableDiff.Result<T>;
export function getIterableDiff<T>(from: Iterable<T>, to: Iterable<T>): getIterableDiff.Result<T> {
    if (from === to) {
        return getArrayDiff_emptyObject satisfies getIterableDiff.Result<T>;
    }

    const fromSet = from instanceof Set ? from as Set<T> : _makeKeysSetFromIterable<T>(from);
    const toSet = to instanceof Set ? to as Set<T> : _makeKeysSetFromIterable<T>(to);

    return {
        get addedSet() {
            return toSet.difference(fromSet);
        },
        get addedList() {
            return [ ...this.addedSet ];
        },
        get removedSet() {
            return fromSet.difference(toSet);
        },
        get removedList() {
            return [ ...this.removedSet ];
        },
        get isSame() {
            return fromSet.size === toSet.size && fromSet.symmetricDifference(toSet).size === 0;
        },
    };
}

export namespace getIterableDiff {
    export type Result<T> = {
        addedSet: Readonly<Set<T>>,
        addedList: Readonly<T[]>,
        removedSet: Readonly<Set<T>>,
        removedList: Readonly<T[]>,
        isSame: boolean,
    };
}

let _hasWeekMapSymbolsSupport: boolean | undefined;

export function checkHasWeekMapSymbolsSupport() {
    if (_hasWeekMapSymbolsSupport !== void 0) {
        return _hasWeekMapSymbolsSupport;
    }

    try {
        const wm = new WeakMap();
        const symbol = Symbol();
        const obj = {};

        wm.set(symbol as unknown as Object, obj);

        return _hasWeekMapSymbolsSupport = wm.get(symbol as unknown as Object) === obj;
    }
    catch {
        return _hasWeekMapSymbolsSupport = false;
    }
}

let _WeakRefSupported: boolean | undefined;

export function checkWeakRefSupported() {
    if (_WeakRefSupported !== void 0) {
        return _WeakRefSupported;
    }

    // check 1
    if (typeof WeakRef === 'undefined'
        // check 2 - detect polyfill
        || WeakRef.prototype[Symbol.toStringTag] !== 'WeakRef'
    ) {
        return _WeakRefSupported = false;
    }

    // check 3 - detect polyfill or incompatible
    try {
        const o = Object.create(null);
        const wr = new WeakRef(o);

        if (wr[Symbol.toStringTag] !== 'WeakRef') {
            return _WeakRefSupported = false;
        }

        if (wr.deref() !== o) {
            return _WeakRefSupported = false;
        }
    }
    catch {
        return _WeakRefSupported = false;
    }

    // check 4 - detect polyfill
    try {
        // This SHOULD throw error:
        //  Chrome/nodejs: TypeError: Method WeakRef.prototype.deref called on incompatible receiver #<WeakRef>
        //  FireFox: `TypeError: Receiver of WeakRef.deref call is not a WeakRef`
        (Object.create(WeakRef.prototype) as WeakRef<any>).deref();

        return _WeakRefSupported = false;
    }
    catch {
        return _WeakRefSupported = true;
    }
}
