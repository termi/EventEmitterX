'use strict';

import { isWebMainThread } from "../utils/runEnv";
import { isWindowGlobalObject } from "../utils/global";
import { EventEmitterX } from "../modules/EventEmitterX/events";

class JWTStorage extends EventEmitterX<{
    'tokens': () => void,
}> {
    protected accessToken: string = '';
    protected refreshToken: string = '';
    readonly localStorageKey = 'JWT.accessTokens';

    constructor() {
        super();

        this.loadTokensFromExternalStorage();
        this.subscribeToOtherTabsAuth();

        if (isWebMainThread) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
        }
    }

    setTokens({
        accessToken,
        refreshToken,
    }: {
        accessToken: string,
        refreshToken: string,
    }) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;

        this.saveTokensToExternalStorage();
    }

    getTokens = () => {
        return {
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            __proto__: null,
        };
    };

    hasTokens() {
        return Boolean(this.accessToken && this.refreshToken);
    }

    clearTokens() {
        this.setTokens({
            accessToken: '',
            refreshToken: '',
        });
    }

    getAccessToken = () => {
        return this.accessToken;
    };

    getRefreshToken = () => {
        return this.refreshToken;
    };

    private _parseAndSetTokensJSON(tokensJSON: string) {
        if (tokensJSON) {
            try {
                const tokens = JSON.parse(tokensJSON) as {
                    accessToken: string,
                    refreshToken: string,
                };

                if (this.accessToken === tokens.accessToken
                    && this.refreshToken === tokens.refreshToken
                ) {
                    return true;
                }

                this.accessToken = tokens.accessToken || '';
                this.refreshToken = tokens.refreshToken || '';

                this.emit('tokens');

                return true;
            }
            catch (error) {
                console.warn(error);
            }
        }

        this.accessToken = '';
        this.refreshToken = '';

        this.emit('tokens');

        return false;
    }

    loadTokensFromExternalStorage() {
        if (isWebMainThread) {
            this._parseAndSetTokensJSON(localStorage.getItem(this.localStorageKey) || '');
        }
    }

    saveTokensToExternalStorage() {
        if (isWebMainThread) {
            localStorage.setItem(this.localStorageKey, JSON.stringify(this.getTokens()));
        }
    }

    private subscribeToOtherTabsAuth() {
        if (isWindowGlobalObject(globalThis)) {
            globalThis.addEventListener('storage', (event: StorageEvent) => {
                if (event.key === mainProcessJTWStorage.localStorageKey) {
                    this._parseAndSetTokensJSON(event.newValue || '');
                }
            });
        }
    }
}

export const mainProcessJTWStorage = new JWTStorage();
