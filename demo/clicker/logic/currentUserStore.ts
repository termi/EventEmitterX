'use strict';

import type { UserRole } from "@prisma/client";

import { EventSignal } from "../modules/EventEmitterX/EventSignal";
import { EventEmitterX } from "../modules/EventEmitterX/events";
import { mainProcessJTWStorage } from "./mainProcessJTWStorage";
import apiMethods from "../api/methods";
import { makeRandomString } from "../utils/random";
import { makeFormElementsList } from "../utils/html";
import { assertIsNonEmptyString } from "../type_guards/string";
import { FormElementDescription } from "../types/htmlSchema";
import { StoreStatus } from "./consts";
import { promiseTimeout } from "../utils/promise";

const registerElements = {
    email: {
        order: 1,
        id: makeRandomString('::email', '::', true),
        label: 'Email:',
        name: 'email',
        type: 'email',
        autoComplete: 'username',
        // pattern: "[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$",
        placeholder: 'user@example.com',
        title: 'Введите адрес электронной почты (пример: user@example.com)',
        required: true,
    } satisfies FormElementDescription,
    name: {
        order: 2,
        id: makeRandomString('::name', '::', true),
        label: 'Имя:',
        name: 'name',
        type: 'name',
        title: 'Введите своё имя',
        required: true,
    } satisfies FormElementDescription,
    password: {
        order: 3,
        id: makeRandomString('::password', '::', true),
        label: 'Пароль:',
        name: 'password',
        type: 'password',
        autoComplete: 'new-password',
        required: true,
        minLength: 6,
    } satisfies FormElementDescription,
} as const;

const logicElements = {
    email: registerElements.email,
    password: {
        ...registerElements.password,
        autoComplete: 'current-password',
    },
} as const;

const tagCurrentUserStore = 'CurrentUserStore';
const componentType = makeRandomString(tagCurrentUserStore, true);

class CurrentUserStore extends EventEmitterX {
    /**
     * Reactive version of CurrentUserStore.
     */
    public readonly signal$ = new EventSignal(0, {
        data: this,
        componentType,
    });

    private _userId = 0;
    private _userRole: UserRole | undefined = void 0;
    private _status: StoreStatus = StoreStatus.pending;
    private _lastError: string | Error | undefined = void 0;

    constructor() {
        if (new.target.singleton) {
            throw new Error('This class should only has one instance');
        }

        super();

        this.startAuthRoutineSync();

        this.on('error', (error: unknown) => {
            this._lastError = error as string | Error;
            this.status = StoreStatus.error;

            // todo: Перенаправлять в систему нотификаций
            console.error(`${this[Symbol.toStringTag]}:`, error);
        });
    }

    get version() {
        return this.signal$.get();
    }

    get isAdmin() {
        return this._userRole === 'ADMIN';
    }

    get isHiddenTaps() {
        return this._userRole === 'USER_HIDE_TAPS';
    }

    get status() {
        return this._status;
    }

    get userId() {
        return this._userId;
    }

    private set status(newStatus: StoreStatus) {
        this.signal$.set(currentValue => ++currentValue);
        this._status = newStatus;
        this.emit('status', newStatus);
    }

    get lastError() {
        if (this.status !== StoreStatus.error) {
            return;
        }

        return this._lastError;
    }

    get isPending() {
        return this._status === StoreStatus.pending;
    }

    get isAuthenticated() {
        return this._status === StoreStatus.isAuthenticated;
    }

    public register = Object.assign(async (props: Parameters<typeof apiMethods.auth_register>[0], options?: {
        doNotThrowError?: boolean,
    }) => {
        try {
            this.status = StoreStatus.pending;

            assertIsNonEmptyString(props.email);
            assertIsNonEmptyString(props.name);
            assertIsNonEmptyString(props.password);

            const response = await apiMethods.auth_register(props);

            mainProcessJTWStorage.setTokens(response);

            this._userId = response.userId;
            this._userRole = response.userRole;
            this.status = StoreStatus.isAuthenticated;
        }
        catch (error) {
            this.emit('error', error);

            if (!options?.doNotThrowError) {
                throw error;
            }
        }
    }, {
        elements: registerElements,
        elementsList: makeFormElementsList(registerElements),
    })

    public login = Object.assign(async (props: Parameters<typeof apiMethods.auth_login>[0], options?: {
        doNotThrowError?: boolean,
    }) => {
        try {
            this.status = StoreStatus.pending;

            assertIsNonEmptyString(props.email);
            assertIsNonEmptyString(props.password);

            const response = await apiMethods.auth_login(props);

            mainProcessJTWStorage.setTokens(response);

            this._userId = response.userId;
            this._userRole = response.userRole;
            this.status = StoreStatus.isAuthenticated;
        }
        catch (error) {
            this.emit('error', error);

            if (!options?.doNotThrowError) {
                throw error;
            }
        }
    }, {
        elements: logicElements,
        elementsList: makeFormElementsList(logicElements),
    })

    public logout = async () => {
        try {
            const response = await apiMethods.auth_logout({
                refreshToken: mainProcessJTWStorage.getRefreshToken(),
            });

            mainProcessJTWStorage.setTokens(response);

            this._userId = response.userId;
            this._userRole = void 0;
            this.status = StoreStatus.notAuthenticated;
        }
        catch (error) {
            this.emit('error', error);
        }
    }

    private startAuthRoutineSync() {
        if (mainProcessJTWStorage.hasTokens()) {
            // todo: Если ошибка, выставлять `this.status = CurrentUserStatus.pending` и запускать retry несколько раз `this.checkExistedTokens()`
            this.checkExistedTokens().catch(error => {
                this.emit('error', error);
                this.status = StoreStatus.notAuthenticated;
            });
        }
        else {
            this.status = StoreStatus.notAuthenticated;
        }
    }

    private async checkExistedTokens() {
        // Делаем "асинхронный разрыв", чтобы избежать ошибки `ReferenceError: Cannot access 'apiMethods' before initialization`
        await promiseTimeout(0);

        const response = await apiMethods.auth_check(void 0, { returnErrorResult: true });

        if (response.success) {
            this.status = StoreStatus.isAuthenticated;
            this._userRole = response.userRole;
            this._userId = response.userId;
        }
        else {
            this.status = StoreStatus.notAuthenticated;
            this._userRole = void 0;
            this._userId = 0;
        }
    }

    declare [Symbol.toStringTag]: string;
    declare componentType: string;

    static readonly singleton = new CurrentUserStore();
}

CurrentUserStore.prototype[Symbol.toStringTag] = tagCurrentUserStore;
CurrentUserStore.prototype.componentType = componentType;

export const componentTypeForCurrentUserStore = componentType;
export const currentUserStore = CurrentUserStore.singleton;
