'use strict';

import { checkHasWeekMapSymbolsSupport, checkWeakRefSupported } from "./object";

const isWeakRefSupported = checkWeakRefSupported();
const hasWeekMapSymbolsSupport = checkHasWeekMapSymbolsSupport();

export class WeakCache<K extends object | symbol, V> {
    private _wm: WeakMap<object, V>;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error TS2344: Type symbol | object does not satisfy the constraint object
    constructor(iterable?: ConstructorParameters<typeof WeakMap<K, V>>[0]) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error Argument of type Iterable<readonly [ object, unknown ]> is not assignable to parameter of type Iterable<readonly [ object, V ]>
        this._wm = new WeakMap<object, V>(iterable);
    }

    set(key: K, value: V) {
        let wrappedValue: any = value;

        if (isWeakRefSupported
            && value
            && (typeof value === 'object'
                || (typeof value === 'symbol'
                    && hasWeekMapSymbolsSupport
                    && !Symbol.isRegistered(value)
                    && !Symbol.isWellKnown(value)
                )
            )
        ) {
            wrappedValue = new WeakRef(value as unknown as object);
        }

        this._wm.set(key as unknown as object, wrappedValue);
    }

    get(key: K) {
        const wrappedValue = this._wm.get(key as unknown as object);

        if (isWeakRefSupported
            && wrappedValue
            && typeof wrappedValue === 'object'
            && wrappedValue instanceof WeakRef
        ) {
            return wrappedValue.deref();
        }

        return wrappedValue;
    }

    delete(key: K) {
        return this._wm.delete(key as unknown as object);
    }

    has(key: K) {
        return this._wm.get(key as unknown as object);
    }

    getOrInsert(key: K, defaultValue: V): V {
        const value = this.get(key);

        if (value !== void 0) {
            return value;
        }

        this.set(key, defaultValue);

        return defaultValue;
    }

    getOrInsertComputed(key: K, computation: (key: K) => V): V {
        const value = this.get(key);

        if (value !== void 0) {
            return value;
        }

        {
            const value = computation(key);

            this.set(key, value);

            return value;
        }
    }

    emplace(key: K, handler: {
        update?: (value: V, key: K, instance: WeakCache<K, V>) => V | undefined,
        insert: (key: K, instance: WeakCache<K, V>) => V,

        [key: string]: unknown,
    }): V;
    emplace(key: K, handler: {
        update?: (value: V, key: K, instance: WeakCache<K, V>) => V | undefined,
        insert: (key: K, instance: WeakCache<K, V>) => V | undefined,

        [key: string]: unknown,
    }): V | undefined;
    emplace(key: K, handler: {
        update?: (value: V, key: K, instance: WeakCache<K, V>) => V | undefined,
        insert?: (key: K, instance: WeakCache<K, V>) => V | undefined,

        [key: string]: unknown,
    }): V | undefined;
    emplace(key: K, handler: {
        update?: (value: V, key: K, instance: WeakCache<K, V>) => V | undefined,
        insert?: (key: K, instance: WeakCache<K, V>) => V | undefined,

        [key: string]: unknown,
    }): V | undefined {
        const value = this.get(key);

        updateExistedValue: if (value !== void 0) {
            if (handler.update !== void 0) {
                const newValue = handler.update(value, key, this);

                if (newValue === void 0) {
                    this.delete(key);

                    break updateExistedValue;
                }
                else if (newValue === value) {
                    // nothing to do
                }
                else {
                    this.set(key, newValue);
                }
            }

            return value;
        }

        if (!handler.insert) {
            return;
        }

        const inserted = handler.insert(key, this);

        if (inserted === void 0) {
            return;
        }

        this.set(key, inserted);

        return inserted;
    }
}
