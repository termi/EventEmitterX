'use strict';

import { isWebMainThread } from "../utils/runEnv";

class JWTStorage {
    protected accessToken: string = '';
    protected refreshToken: string = '';

    constructor() {
        this.loadTokensFromExternalStorage();
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
    }

    hasTokens() {
        return Boolean(this.accessToken && this.refreshToken);
    }

    clearTokens() {
        this.setTokens({
            accessToken: '',
            refreshToken: '',
        })
    }

    getAccessToken = () => {
        return this.accessToken;
    }

    getRefreshToken = () => {
        return this.refreshToken;
    }

    loadTokensFromExternalStorage() {
        if (isWebMainThread) {
            this.accessToken = localStorage.getItem('accessToken') || '';
            this.refreshToken = localStorage.getItem('refreshToken') || '';
        }
    }

    saveTokensToExternalStorage() {
        if (isWebMainThread) {
            localStorage.setItem('accessToken', this.accessToken);
            localStorage.setItem('refreshToken', this.refreshToken);
        }
    }
}

export const mainProcessJTWStorage = new JWTStorage();
