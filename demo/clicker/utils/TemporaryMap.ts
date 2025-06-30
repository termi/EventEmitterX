'use strict';

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const MINUTES_5 = MINUTES * 5;

export class TemporaryMap<K, V extends { [Symbol.dispose]?: () => void }> extends Map<K, V> {
    private readonly _checkEveryMs = MINUTES_5;
    private readonly _saveMs = MINUTES;
    private readonly _setAtMap = new Map<K, number>();
    private readonly _callDispose: boolean;
    private readonly _shouldProlong: ((item: V, key: K) => boolean) | undefined;
    private readonly _onRemove: ((item: V, key: K) => void) | undefined;
    private _interval: ReturnType<typeof setInterval> | undefined;
    #signal?: AbortSignal;

    constructor(options?: TemporaryMap.Options<K, V>) {
        super();

        if (options?.checkEveryMs) {
            this._checkEveryMs = options.checkEveryMs;
        }
        if (options?.saveMs) {
            this._saveMs = options.saveMs;
        }
        this._callDispose = Boolean(options?.callDispose);
        this._shouldProlong = options?.shouldProlong;
        this._onRemove = options?.onRemove;

        this.#signal = options?.signal;

        if (this.#signal?.aborted) {
            this.destructor();
        }
        else {
            this._interval = setInterval(this._checkOutdatedValues, this._checkEveryMs);

            this.#signal?.addEventListener('abort', this[Symbol.dispose], { once: true });
        }
    }

    destructor() {
        this.clear();
        clearInterval(this._interval);
        this._interval = void 0;
        this.#signal?.removeEventListener('abort', this[Symbol.dispose]);
        this.#signal = void 0;
    }

    [Symbol.dispose] = () => {
        this.destructor();
    }

    set(key: K, value: V) {
        super.set(key, value);

        this._setAtMap.set(key, Date.now());

        return this;
    }

    get(key: K) {
        const value = super.get(key);

        if (value === void 0) {
            return void 0;
        }

        outdated: if (this._isOutdated(this._setAtMap.get(key))) {
            if (this._shouldProlong?.(value, key)) {
                break outdated;
            }

            this.delete(key);
            this._setAtMap.delete(key);

            return void 0;
        }

        this._setAtMap.set(key, Date.now());

        return value;
    }

    delete(key: K) {
        let value: V | undefined;

        if (this._callDispose) {
            value = super.get(key);

            value?.[Symbol.dispose]?.();
        }

        this._setAtMap.delete(key);

        const result = super.delete(key);

        if (this._onRemove) {
            if (value === void 0) {
                value = super.get(key);
            }

            if (value) {
                this._onRemove(value, key)
            }
        }

        return result;
    }

    clear() {
        if (this._callDispose) {
            for (const value of this.values()) {
                value?.[Symbol.dispose]?.();
            }
        }

        super.clear();
        this._setAtMap.clear();
    }

    private _isOutdated(setAt: number | undefined, now = Date.now()) {
        const timePassed = now - (setAt ?? now);

        return timePassed > this._saveMs;
    }

    private _checkOutdatedValues = () => {
        const now = Date.now();
        const outdatedKeys: K[] = [];

        for (const { 0: key, 1: setAt } of this._setAtMap) {
            if (this._isOutdated(setAt, now)) {
                outdatedKeys.push(key);
            }
        }

        const { _shouldProlong } = this;

        for (const key of outdatedKeys) {
            if (_shouldProlong) {
                const value = super.get(key);

                if (value !== void 0 && _shouldProlong(value, key)) {
                    this._setAtMap.set(key, now);

                    continue;
                }
            }

            this.delete(key);
        }
    };
}

export namespace TemporaryMap {
    export type Options<K, V extends { [Symbol.dispose]?: () => void }> = {
        signal?: AbortSignal,
        checkEveryMs?: number,
        saveMs?: number,
        callDispose?: boolean,
        shouldProlong?: (item: V, key: K) => boolean,
        onRemove?: (item: V, key: K) => void,
    }
}
