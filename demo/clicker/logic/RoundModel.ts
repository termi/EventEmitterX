'use strict';

import type { Round, RoundTaps } from "@prisma/client";

import { EventSignal } from "../modules/EventEmitterX/EventSignal";
import { TemporaryMap } from "../utils/TemporaryMap";
import { makeRandomString } from "../utils/random";
import { TIMES } from "../utils/times";
import { MakeOptional, ReplaceDateWithString } from "../types/generics";
import apiMethods from "../api/methods";
import { mainProcessAbortController } from "./mainProcessAbortController";
import mainProcessChangeDataCapture from "./mainProcessChangeDataCapture";
import { currentUserStore } from "./currentUserStore";

type WinnerUserInfo = {
    id: number,
    name: string,
}

export type RoundWinnerUserInfo = {
    winnerUser?: WinnerUserInfo | null,
};

export type RoundWithTaps = Round & RoundWinnerUserInfo & {
    taps?: {
        userId: RoundTaps["userId"],
        count: RoundTaps["count"],
        hiddenCount: RoundTaps["hiddenCount"],
    }[],
};

export type RoundDTO = ReplaceDateWithString<
    Omit<
        MakeOptional<RoundWithTaps, 'tapsCount' | 'hiddenTapsCount'>,
        'token' | 'createdAt' | 'authorId'
    >
> & RoundWinnerUserInfo;

export const enum RoundModelReadyState {
    completed = 1,
    started = 2,
    awaiting = 3,
    readyToComplete = 4,
}

const tagRoundModel = 'RoundModel';

export const componentTypeForRoundModel = makeRandomString(tagRoundModel, true);
export const kRoundModelFriendWinnerUserInfoSet = Symbol('kRoundModelFriendWinnerUserInfoSet');

export class RoundModel {
    /**
     * Reactive version of CurrentUserStore.
     */
    public readonly signal$ = new EventSignal(0, {
        data: this,
        componentType: componentTypeForRoundModel,
    });

    public id: Round["id"];
    public title: Round["title"];
    public description: Round["description"];
    public startedAt: Round["startedAt"];
    public endedAt: Round["endedAt"];
    public cooldownSec: Round["cooldownSec"];
    public flags: Round["flags"];
    public tapsCount: Round["tapsCount"];
    public userTapsCount: number;
    public hiddenTapsCount: Round["hiddenTapsCount"];
    public userHiddenTapsCount: number;
    public completed: Round["completed"];
    protected readonly updatedKeys = [
        'title',
        'description',
        'flags',
        'tapsCount',
        'hiddenTapsCount',
        'completed',
    ] as const;

    private _selected = false;
    private _wasRoundTaps: boolean = false;
    private _usersInfo: (Map<number, MinimalRoundInfo_UserInfo> & {
        make(): MinimalRoundInfo_UserInfo,
    }) | undefined;
    private _winnerUserInfo: WinnerUserInfo | null = null;

    constructor(roundDTO: RoundDTO | RoundWithTaps, now = Date.now()) {
        this.id = roundDTO.id;
        this.title = roundDTO.title;
        this.description = roundDTO.description;
        this.startedAt = new Date(roundDTO.startedAt);
        this.endedAt = new Date(roundDTO.endedAt);
        this.cooldownSec = roundDTO.cooldownSec;
        this.flags = roundDTO.flags;
        this.completed = roundDTO.completed || calculateIsRoundCompleted(roundDTO, now);

        const { taps } = roundDTO;
        const userTaps = taps?.find(tap => tap.userId === currentUserStore.userId);

        this._wasRoundTaps = Array.isArray(taps) && taps.length > 0;
        this.tapsCount = roundDTO.tapsCount ?? 0;
        this.userTapsCount = userTaps?.count ?? 0;
        this.hiddenTapsCount = roundDTO.hiddenTapsCount ?? 0;
        this.userHiddenTapsCount = userTaps?.hiddenCount ?? 0;
        this._winnerUserInfo = roundDTO.winnerUser || null;
    }

    destructor() {
        this.signal$.destructor();
        this._usersInfo?.clear();
        mainProcessChangeDataCapture.removeListener(`round-updated#${this.id}`, this.updateFromDTO);
        mainProcessChangeDataCapture.removeListener(`round-ended#${this.id}`, this.updateFromDTO);
        mainProcessChangeDataCapture.removeListener(`round-taps#${this.id}`, this.updateTaps);
    }

    [Symbol.dispose]() {
        this.destructor();
    }

    get score() {
        return scoreFromTapsCount(this.tapsCount);
    }

    get userScore() {
        return scoreFromTapsCount(this.userTapsCount);
    }

    get isActive() {
        return this.timeLeft !== 0;
    }

    get timeLeft() {
        if (this.completed) {
            return 0;
        }

        const now = Date.now();
        const endedAt = this.endedAt.getTime();
        const startedAt = this.startedAt.getTime();

        if (startedAt < now && now < endedAt) {
            return endedAt - now;
        }

        return 0;
    }

    private _prevReadyState: RoundModelReadyState = RoundModelReadyState.awaiting;

    getReadyState(now = Date.now()): RoundModelReadyState {
        const endedAtTimestamp = this.endedAt.getTime();

        if (this.completed || endedAtTimestamp <= now) {
            return this._prevReadyState = RoundModelReadyState.completed;
        }

        const startedAtTimestamp = this.startedAt.getTime();

        if (startedAtTimestamp < now) {
            return this._prevReadyState = RoundModelReadyState.started;
        }

        /*const startedAtTimestampMinusCooldown = startedAtTimestamp - (this.cooldownSec * TIMES.SECONDS);

        if (startedAtTimestampMinusCooldown > now) */{
            return this._prevReadyState = RoundModelReadyState.awaiting;
        }
    }

    get readyState(): RoundModelReadyState {
        return this.getReadyState();
    }

    get timerInfo() {
        const { readyState } = this;

        if (readyState === RoundModelReadyState.completed || readyState === RoundModelReadyState.readyToComplete) {
            return {
                timerTitle: 'Раунд завершен',
                isBackward: true,
                timestamp: 0,
            };
        }

        if (readyState === RoundModelReadyState.started) {
            return {
                timerTitle: 'Раунд закончится через',
                isBackward: true,
                timestamp: this.endedAt.getTime(),
            };
        }

        /*const startedAtTimestampMinusCooldown = startedAtTimestamp - (this.cooldownSec * TIMES.SECONDS);

        if (startedAtTimestampMinusCooldown > now) */{
            return {
                timerTitle: 'Раунд начнется через',
                isBackward: true,
                timestamp: this.startedAt.getTime(),
            };
        }
    }

    get isSelected() {
        return this._selected;
    }

    set isSelected(selected: boolean) {
        this._onSelectedChanges(selected ? this.id : 0);
    }

    private _onSelectedChanges = (id: Round["id"] | 0) => {
        // noinspection UnnecessaryLocalVariableJS
        const selected = this.id === id;

        // if (selected) {
        //     mainLocalEventBus.on('--local-round-selected', this._onSelectedChanges);
        // }
        // else {
        //     mainLocalEventBus.removeListener('--local-round-selected', this._onSelectedChanges);
        // }

        this._selected = selected;
        this.signal$.set(currentValue => ++currentValue);
    }

    get wasRoundTaps() {
        return this._wasRoundTaps;
    }

    set wasRoundTaps(wasRoundTaps) {
        this._wasRoundTaps = wasRoundTaps;
    }

    get usersInfo() {
        return this._usersInfo ??= (Object.assign(new Map<number, MinimalRoundInfo_UserInfo>(), {
            make: makeMinimalRoundInfoUserInfoItem,
        }));
    }

    get winnerUserInfo() {
        return this._winnerUserInfo;
    }

    readonly [kRoundModelFriendWinnerUserInfoSet] = (winnerUserInfo: WinnerUserInfo) => {
        this._winnerUserInfo = winnerUserInfo;
    }

    checkReadyState(now = Date.now()) {
        if (this.completed) {
            return RoundModelReadyState.completed;
        }

        const prev_timerStatus = this._prevReadyState;
        const readyState = this.getReadyState(now);
        const readyToComplete = readyState === RoundModelReadyState.readyToComplete;

        if (readyToComplete) {
            this.completed = true;
            this.signal$.set(currentValue => ++currentValue);
        }
        else {
            const { readyState } = this;

            if (prev_timerStatus !== readyState) {
                this.signal$.set(currentValue => ++currentValue);
            }
        }

        return readyState;
    }

    localIncrementTaps(increment: number, isHiddenTaps: boolean) {
        if (isHiddenTaps) {
            this.hiddenTapsCount += increment;
            this.userHiddenTapsCount += increment;
        }
        else {
            this.tapsCount += increment;
            this.userTapsCount += increment;
        }

        this.signal$.set(currentValue => ++currentValue);
    }

    updateTaps = (data: Awaited<ReturnType<typeof apiMethods.makeRoundTap>>) => {
        this._wasRoundTaps = true;

        if (data.roundCount && data.roundCount > this.tapsCount) {
            this.tapsCount = data.roundCount;
        }
        if (data.roundHiddenTapsCount && data.roundHiddenTapsCount > this.hiddenTapsCount) {
            this.hiddenTapsCount = data.roundHiddenTapsCount;
        }

        if (data.userCount && data.userCount > this.userTapsCount) {
            this.userTapsCount = data.userCount;
        }
        if (data.userHiddenCount && data.userHiddenCount > this.userHiddenTapsCount) {
            this.userHiddenTapsCount = data.userHiddenCount;
        }

        this.signal$.set(currentValue => ++currentValue);
    }

    private updateFromDTO = (roundDTO: Partial<RoundDTO | Round>) => {
        let hasChanges = false;

        for (const key of this.updatedKeys) {
            const value = roundDTO[key];

            if (value != null) {
                const currentValue = this[key];

                if (currentValue !== value) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
                    // @ts-ignore ignore `TS2322: Type string | number | boolean is not assignable to type never`
                    this[key] = value;

                    hasChanges = true;
                }
            }
        }

        // todo: Может один winnerUser поменяться на другой?
        if ('winnerUser' in roundDTO && !this._winnerUserInfo) {
            const winnerUserInfo = roundDTO.winnerUser;

            if (winnerUserInfo) {
                Object.freeze(winnerUserInfo);
                this._winnerUserInfo = winnerUserInfo;

                hasChanges = true;
            }
        }

        if (hasChanges) {
            this.signal$.set(currentValue => ++currentValue);
        }
    }

    toDTO(noCounts = false): RoundDTO {
        const dto: RoundDTO = {
            id: this.id,
            title: this.title,
            description: this.description,
            completed: this.completed,
            startedAt: this.startedAt.toISOString(),
            endedAt: this.endedAt.toISOString(),
            cooldownSec: this.cooldownSec,
            flags: this.flags,
            winnerUser: this._winnerUserInfo || null,
        };

        if (!noCounts) {
            dto.tapsCount = this.tapsCount;
            dto.hiddenTapsCount = this.hiddenTapsCount;
        }

        return dto;
    }

    private static globalOnRoundEndHook: ((roundModel: RoundModel) => void) | undefined;

    static registerGlobalOnRoundEndHook(globalOnRoundEndHook: typeof this.globalOnRoundEndHook) {
        this.globalOnRoundEndHook = globalOnRoundEndHook;
    }

    static instancesRoundModelById = new TemporaryMap<Round["id"], RoundModel>({
        signal: mainProcessAbortController.signal,
        callDispose: true,
    });

    static getById(id: Round["id"]) {
        return this.instancesRoundModelById.get(id) || null;
    }

    static makeById(id: Round["id"], roundDTO: RoundDTO | RoundWithTaps, now = Date.now()) {
        let instance = this.getById(id);

        if (instance) {
            instance.updateFromDTO(roundDTO);

            return instance;
        }

        instance = new RoundModel(roundDTO, now);

        this.instancesRoundModelById.set(id, instance);

        mainProcessChangeDataCapture.on(`round-updated#${id}`, instance.updateFromDTO);
        mainProcessChangeDataCapture.on(`round-ended#${id}`, instance.updateFromDTO);
        mainProcessChangeDataCapture.on(`round-taps#${id}`, instance.updateTaps);

        return instance;
    }

    static interval: ReturnType<typeof setInterval> | undefined;

    static {
        this.interval = setInterval(() => {
            const now = Date.now();

            for (const { 1: roundModel } of this.instancesRoundModelById) {
                const readyState = roundModel.checkReadyState(now);

                if (readyState === RoundModelReadyState.readyToComplete || readyState === RoundModelReadyState.completed) {
                    this.globalOnRoundEndHook?.(roundModel);
                }
            }
        }, TIMES.SECONDS);

        mainProcessAbortController.signal.addEventListener('abort', () => {
            clearInterval(this.interval);
            this.interval = void 0;
        }, { once: true });
    }

    declare [Symbol.toStringTag]: string;
    declare componentType: string;
}

RoundModel.prototype[Symbol.toStringTag] = tagRoundModel;
RoundModel.prototype.componentType = componentTypeForRoundModel;

export function scoreFromTapsCount(tapsCount: number) {
    if (!tapsCount || tapsCount < 0) {
        return 0;
    }

    return tapsCount + Math.floor((tapsCount - 1) / 10);
}

export function calculateIsRoundCompleted(round: Round | RoundModel | RoundDTO, now = Date.now()) {
    return new Date(round.endedAt).getTime() <= now;
}

export function sortRounds(round1: RoundDTO | Round | RoundModel, round2: RoundDTO | Round | RoundModel) {
    const endedAt1 = round1.endedAt;
    const endedAt2 = round2.endedAt;

    return new Date(endedAt2).getTime() - new Date(endedAt1).getTime();
}

export type MinimalRoundInfo_UserInfo = {
    wasTaps: boolean,
    __proto__?: null,
};

export function makeMinimalRoundInfoUserInfoItem(): MinimalRoundInfo_UserInfo {
    return {
        wasTaps: false,
        __proto__: null,
    };
}
