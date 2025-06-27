'use strict';

import type { Round } from "@prisma/client";

import type { ReplaceDateWithString } from "../types/generics";

import { isTest, isNodeJS } from "../utils/runEnv";
import { createRoute, createRouteWithQuery, pathJoin } from "../utils/path";
import { TIMES } from "../utils/times";
import { append } from "../utils/object";
import { stringifyError } from "../utils/error";
import { assertIsNonEmptyString } from "../type_guards/string";
import { assertIsPositiveNumber } from "../type_guards/number";
import {
    auth_check,
    auth_login, auth_logout,
    auth_refresh,
    auth_register,
    createRound,
    getRound,
    makeRoundTap,
    rounds,
} from "./routers";
import { assertIsObject } from "../type_guards/object";
import { mainProcessJTWStorage } from "../logic/mainProcessJTWStorage";
import { request } from "./request";
import { calculateIsRoundCompleted } from "../logic/RoundModel";

type UserDescription = {
    id?: number,
    email: string,
    name: string,
    password: string,
    accessToken: string,
    refreshToken: string,
};

/**
 * Defaults:
 * * NodeJS: 'http://localhost:3001/'
 * * WEB: '/'
 */
let defaultBaseURI = isNodeJS ? 'http://localhost:3001/' : '/';

export function getDefaultBaseURI() {
    return defaultBaseURI;
}

export function setDefaultBaseURI(newBaseURI: string) {
    defaultBaseURI = newBaseURI;
}

type ExcluteSuccessFalseResult<T> = T extends { success: false } ? never : T;

export class ApiMethods {
    readonly defaultBaseURI: string | undefined;
    private _prevBaseURI: string | undefined;
    private _prevOrigin: string | undefined;
    private readonly getCurrentUserAccessToken: () => string;

    constructor(options?: ApiMethods.Options) {
        this.defaultBaseURI = options?.baseURI;
        this.getCurrentUserAccessToken = options?.getCurrentUserAccessToken || mainProcessJTWStorage.getAccessToken;
    }

    protected _getCurrentUserAccessToken() {
        return this.getCurrentUserAccessToken();
    }

    get baseURI() {
        return this.defaultBaseURI ?? getDefaultBaseURI();
    }

    get origin() {
        const { baseURI } = this;

        if (this._prevBaseURI === baseURI && this._prevOrigin !== void 0) {
            return this._prevOrigin;
        }

        this._prevBaseURI = baseURI;

        if (!baseURI || baseURI === '/') {
            return (this._prevOrigin = '');
        }

        return (this._prevOrigin = new URL(baseURI).origin);
    }

    async auth_register(props: auth_register.Types["Body"]) {
        const response = await fetch(pathJoin(this.origin, auth_register.url), {
            method: auth_register.method,
            body: JSON.stringify(props),
            headers: {
                'Content-Type': 'application/json',
            } as const satisfies auth_register.Types["Headers"],
        });
        const body: auth_register.Types["Reply"] = await response.json();

        if (!body.success) {
            throw new Error(body.error);
        }

        return body;
    }

    async auth_login(props: auth_login.Types["Body"]) {
        const response = await fetch(pathJoin(this.origin, auth_login.url), {
            method: auth_login.method,
            body: JSON.stringify(props),
            headers: {
                'Content-Type': 'application/json',
            } as const satisfies auth_login.Types["Headers"],
        });

        const body: auth_login.Types["Reply"] = await response.json();

        if (!body.success) {
            throw new Error(body.error);
        }

        return body;
    }

    async auth_check(props?: Partial<auth_check.Types["Querystring"]>, options?: {
        returnErrorResult: false,
    }): Promise<ExcluteSuccessFalseResult<auth_check.Types["Reply"]>>;
    async auth_check(props: Partial<auth_check.Types["Querystring"]> | undefined, options: {
        returnErrorResult: true,
    }): Promise<auth_check.Types["Reply"]>;
    async auth_check(props?: Partial<auth_check.Types["Querystring"]>, options?: {
        returnErrorResult?: boolean,
    }) {
        const allowRefresh = String(props?.allowRefresh ?? true);
        const _allowRefresh = !!allowRefresh && allowRefresh !== 'false';
        const response = await fetch(createRouteWithQuery(this.origin, auth_check.url, {
            allowRefresh,
        }), {
            method: auth_check.method,
            body: _allowRefresh ? JSON.stringify({
                refreshToken: mainProcessJTWStorage.getRefreshToken(),
            } as const satisfies auth_refresh.Types["Body"]) : void 0,
            headers: {
                'Authorization': `Bearer ${this._getCurrentUserAccessToken()}`,
                'Content-Type': "application/json",
            } as const satisfies auth_check.Types["Headers"],
        });

        const body: auth_check.Types["Reply"] = await response.json();

        if (options?.returnErrorResult) {
            return body;
        }

        if (!body.success) {
            throw new Error(body.error);
        }

        return body;
    }

    async auth_logout(props: auth_logout.Types["Body"]) {
        const response = await fetch(pathJoin(this.origin, auth_logout.url), {
            method: auth_logout.method,
            body: JSON.stringify(props),
            headers: {
                'Content-Type': "application/json",
            } as const satisfies auth_logout.Types["Headers"],
        });

        const body: auth_logout.Types["Reply"] = await response.json();

        if (!body.success) {
            throw new Error(body.error);
        }

        return body;
    }

    #getActiveRoundsPromise: ReturnType<typeof this._getActiveRounds> | undefined;

    async getActiveRounds() {
        try {
            let promise = this.#getActiveRoundsPromise;

            if (!promise) {
                promise = this._getActiveRounds();
            }

            this.#getActiveRoundsPromise = promise;

            const response = await promise;

            this.#getActiveRoundsPromise = void 0;

            const { data } = response;

            if (!data?.success) {
                throw new Error(data?.error);
            }

            for (const round of data.items) {
                round.completed = calculateIsRoundCompleted(round, data.now);
            }

            return data;
        }
        finally {
            this.#getActiveRoundsPromise = void 0;
        }
    }

    private async _getActiveRounds() {
        return request<rounds.Types["Reply"]>(createRouteWithQuery(this.origin, rounds.url, {
            isActive: 'true',
        }), {
            method: rounds.method,
        });
    }

    async getRoundById(id: Round["id"]) {
        assertIsPositiveNumber(id);

        const response = await request<getRound.Types["Reply"]>(createRoute(this.origin, getRound.url, { id }), {
            method: getRound.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this._getCurrentUserAccessToken()}`,
            } as const satisfies getRound.Types["Headers"],
        });

        const { data } = response;

        if (!data?.success) {
            throw new Error(data?.error);
        }

        const round = data.item;

        round.completed = calculateIsRoundCompleted(round, data.now);

        return data;
    }

    async createRound(props: createRound.Types["Body"], requestOptions?: {
        doNotUpdateToken?: boolean,
    }) {
        assertIsNonEmptyString(props.title);
        assertIsPositiveNumber(props.startedAt);

        if (props.endedAt != null) {
            assertIsPositiveNumber(props.endedAt);
        }

        const response = await request<ReplaceDateWithString<createRound.Types["Reply"]>>(pathJoin(this.origin, createRound.url), {
            method: createRound.method,
            body: JSON.stringify(props),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this._getCurrentUserAccessToken()}`,
                'X-Idempotent-Id': crypto.randomUUID(),
            } as const satisfies createRound.Types["Headers"],
            ...requestOptions,
        });

        const { data } = response;

        if (!data?.success) {
            throw new Error(data?.error);
        }

        const round = data.item;

        round.completed = calculateIsRoundCompleted(round, data.now);

        return data;
    }

    async makeRoundTap(roundId: number, props?: Partial<makeRoundTap.Types["Body"]>) {
        const response = await request<makeRoundTap.Types["Reply"]>(
            createRoute(this.origin, makeRoundTap.url, { id: roundId }),
            {
                method: makeRoundTap.method,
                body: JSON.stringify({
                    timestamp: props?.timestamp || Date.now(),
                    count: props?.count ?? 1,
                } as const satisfies makeRoundTap.Types["Body"]),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._getCurrentUserAccessToken()}`,
                    'X-Idempotent-Id': crypto.randomUUID(),
                } as const satisfies makeRoundTap.Types["Headers"],
            }
        );

        if (!response.data?.success) {
            throw new Error(response.data?.error);
        }

        return response.data;
    }
}

export namespace ApiMethods {
    export type Options = {
        baseURI?: string,
        getCurrentUserAccessToken?: () => string,
    }
}

/**
 * !!! Only for Testings. Do not use it in production.
 */
export class TestApiMethods extends ApiMethods {
    readonly test__adminUser: UserDescription = {
        email: 'test_admin@test.ru',
        name: 'test_admin',
        password: 'test_admin_password',
        accessToken: '',
        refreshToken: '',
    };
    readonly test__simpleUser: UserDescription = {
        email: 'test@test.ru',
        name: 'test_user',
        password: 'test_password',
        accessToken: '',
        refreshToken: '',
    };
    readonly test__НикитаUser: UserDescription = {
        email: 'Никита@test.ru',
        name: 'Никита',
        password: 'Никита_password',
        accessToken: '',
        refreshToken: '',
    };
    private test__round: ReplaceDateWithString<Round> | null = null;
    private _defaultAccessToken = '';

    constructor(options?: ApiMethods.Options) {
        super(options);

        if (!isTest) {
            throw new Error('Unreachable');
        }
    }

    protected override _getCurrentUserAccessToken() {
        return this._defaultAccessToken || super._getCurrentUserAccessToken();
    }

    test__setDefaultAccessToken(defaultAccessToken?: string) {
        return this._defaultAccessToken = String(defaultAccessToken || '');
    }

    async test__registerTestUser(testUser: UserDescription): Promise<UserDescription>;
    async test__registerTestUser(isAdmin: boolean): Promise<UserDescription>;
    async test__registerTestUser(testUser_or_isAdmin?: boolean | UserDescription): Promise<UserDescription> {
        const testUser = typeof testUser_or_isAdmin === 'boolean'
            ? testUser_or_isAdmin
                ? this.test__adminUser
                : this.test__simpleUser
            : testUser_or_isAdmin
        ;

        assertIsObject(testUser);

        const body = await this.auth_register({
            email: testUser.email,
            name: testUser.name,
            password: testUser.password,
        });

        testUser.id = body.userId;
        testUser.accessToken = body.accessToken;
        testUser.refreshToken = body.refreshToken;

        return testUser;
    }

    async test__loginTestUser(testUser: UserDescription): Promise<UserDescription>;
    async test__loginTestUser(isAdmin: boolean): Promise<UserDescription>;
    async test__loginTestUser(testUser_or_isAdmin?: boolean | UserDescription): Promise<UserDescription> {
        const testUser = typeof testUser_or_isAdmin === 'boolean'
            ? testUser_or_isAdmin
                ? this.test__adminUser
                : this.test__simpleUser
            : testUser_or_isAdmin
        ;

        assertIsObject(testUser);

        try {
            return await this.test__registerTestUser(testUser);
        }
        catch (error) {
            const errorMessage = stringifyError(error);

            if (!errorMessage.startsWith('User already exists')) {
                throw error;
            }
        }

        const body = await this.auth_login({
            email: testUser.email,
            password: testUser.password,
        });

        testUser.id = body.userId;
        testUser.accessToken = body.accessToken;
        testUser.refreshToken = body.refreshToken;

        mainProcessJTWStorage.setTokens(body);

        return testUser;
    }

    async test__getOrCreateTestRound (
        props?: Partial<createRound.Types["Body"]>,
        options?: {
            alwaysCreateNew?: boolean,
            fromUser?: UserDescription,
        }
    ) {
        if (!isTest) {
            throw new Error('Unreachable');
        }

        const alwaysCreateNew = options?.alwaysCreateNew ?? false;
        const fromUser = options?.fromUser ?? this.test__adminUser;

        if (fromUser) {
            this.test__setDefaultAccessToken(fromUser.accessToken);
        }

        if (this.test__round && !alwaysCreateNew) {
            return this.test__round;
        }

        const body = await this.createRound(append(props, {
            title: 'test round',
            startedAt: Date.now(),
            endedAt: (Date.now() + TIMES.MINUTES_5),
        }), {
            doNotUpdateToken: true,
        });

        return this.test__round = body.item;
    }

    async test__makeRoundTapFromUser(
        roundId: number,
        props: Partial<makeRoundTap.Types["Body"]>,
        fromUser: UserDescription
    ) {
        this.test__setDefaultAccessToken(fromUser.accessToken);

        return this.makeRoundTap(roundId, props);
    }
}

const apiMethods = new ApiMethods();

export default apiMethods;
