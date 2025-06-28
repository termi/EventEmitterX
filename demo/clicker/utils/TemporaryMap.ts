'use strict';

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const MINUTES_5 = MINUTES * 5;

export class TemporaryMap<K, V> extends Map<K, V> {
    private readonly _checkEveryMs = MINUTES_5;
    private readonly _saveMs = MINUTES;
    private readonly _setAtMap = new Map<K, number>();
    private _interval: ReturnType<typeof setInterval> | undefined;
    #signal?: AbortSignal;

    constructor(options?: TemporaryMap.Options) {
        super();

        if (options?.checkEveryMs) {
            this._checkEveryMs = options.checkEveryMs;
        }
        if (options?.saveMs) {
            this._saveMs = options.saveMs;
        }

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

        if (this._isOutdated(this._setAtMap.get(key))) {
            this.delete(key);
            this._setAtMap.delete(key);

            return void 0;
        }

        return value;
    }

    delete(key: K) {
        this._setAtMap.delete(key);

        return super.delete(key);
    }

    clear() {
        super.clear();
        this._setAtMap.clear();
    }

    private _isOutdated(setAt: number | undefined) {
        const now = Date.now();
        const timePassed = now - (setAt ?? now);

        return timePassed > this._saveMs;
    }

    private _checkOutdatedValues = () => {
        const outdatedKeys: K[] = [];

        for (const { 0: key, 1: setAt } of this._setAtMap) {
            if (this._isOutdated(setAt)) {
                outdatedKeys.push(key);
            }
        }

        for (const key of outdatedKeys) {
            this.delete(key);
        }
    };
}

export namespace TemporaryMap {
    export type Options = {
        signal?: AbortSignal,
        checkEveryMs?: number,
        saveMs?: number,
    }
}
