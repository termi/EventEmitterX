'use strict';

import type { Round, RoundTaps } from "@prisma/client";

import { EventSignal } from "../modules/EventEmitterX/EventSignal";
import { TemporaryMap } from "../utils/TemporaryMap";
import { makeRandomString } from "../utils/random";
import { TIMES } from "../utils/times";
import { ReplaceDateWithString } from "../types/generics";
import apiMethods from "../api/methods";
import { mainProcessAbortController } from "./mainProcessAbortController";
import mainProcessChangeDataCapture from "./mainProcessChangeDataCapture";
import { currentUserStore } from "./currentUserStore";

export type RoundDTO = ReplaceDateWithString<Round> & {
    taps?: {
        userId: RoundTaps["userId"],
        count: RoundTaps["count"],
        hiddenCount: RoundTaps["hiddenCount"],
    }[],
};

const tagRoundModel = 'RoundModel';

export const componentTypeForRoundModel = makeRandomString(tagRoundModel, true);

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

    constructor(roundDTO: RoundDTO, now = Date.now()) {
        this.id = roundDTO.id;
        this.title = roundDTO.title;
        this.description = roundDTO.description;
        this.startedAt = new Date(roundDTO.startedAt);
        this.endedAt = new Date(roundDTO.endedAt);
        this.cooldownSec = roundDTO.cooldownSec;
        this.flags = roundDTO.flags;
        this.completed = roundDTO.completed || calculateIsRoundCompleted(roundDTO, now);

        this.tapsCount = roundDTO.tapsCount;

        const { taps } = roundDTO;
        const userTaps = taps?.find(tap => tap.userId === currentUserStore.userId);

        this.userTapsCount = userTaps?.count ?? 0;
        this.hiddenTapsCount = roundDTO.hiddenTapsCount;
        this.userHiddenTapsCount = userTaps?.hiddenCount ?? 0;
    }

    destructor() {
        this.signal$.destructor();
        mainProcessChangeDataCapture.removeListener(`round-updated#${this.id}`, this.updateFromDTO);
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

    private _timerStatus: 1 | 2 | 3 = 1;

    get timerStatus() {
        const now = Date.now();
        const endedAtTimestamp = this.endedAt.getTime();

        if (this.completed || endedAtTimestamp <= now) {
            return this._timerStatus = 1;
        }

        const startedAtTimestamp = this.startedAt.getTime();

        if (startedAtTimestamp < now) {
            return this._timerStatus = 2;
        }

        /*const startedAtTimestampMinusCooldown = startedAtTimestamp - (this.cooldownSec * TIMES.SECONDS);

        if (startedAtTimestampMinusCooldown > now) */{
            return this._timerStatus = 3;
        }
    }

    get timerInfo() {
        const { timerStatus } = this;

        if (timerStatus === 1) {
            return {
                timerTitle: 'Раунд завершен',
                isBackward: true,
                timestamp: 0,
            };
        }

        if (timerStatus === 2) {
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

    checkTimerStatus(now = Date.now()) {
        if (this.completed) {
            return;
        }

        const completed = calculateIsRoundCompleted(this, now);

        if (completed) {
            this.completed = completed;
            this.signal$.set(currentValue => ++currentValue);
        }
        else {
            const prev_timerStatus = this._timerStatus;
            const { timerStatus } = this;

            if (prev_timerStatus !== timerStatus) {
                this.signal$.set(currentValue => ++currentValue);
            }
        }
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
        this.tapsCount = data.roundCount;
        this.hiddenTapsCount = data.roundHiddenTapsCount;

        if (data.userCount) {
            this.userTapsCount = data.userCount;
        }
        if (data.userHiddenCount) {
            this.userHiddenTapsCount = data.userHiddenCount;
        }

        this.signal$.set(currentValue => ++currentValue);
    }

    private updateFromDTO = (roundDTO: Partial<RoundDTO>) => {
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

        if (hasChanges) {
            this.signal$.set(currentValue => ++currentValue);
        }
    }

    static instancesRoundModelById = new Map<number, RoundModel>;

    static getById(id: Round["id"]) {
        return this.instancesRoundModelById.get(id) || null;
    }

    static makeById(id: Round["id"], roundDTO: RoundDTO, now = Date.now()) {
        let instance = this.getById(id);

        if (instance) {
            instance.updateFromDTO(roundDTO);

            return instance;
        }

        instance = new RoundModel(roundDTO, now);

        this.instancesRoundModelById.set(id, instance);

        mainProcessChangeDataCapture.on(`round-updated#${id}`, instance.updateFromDTO);
        mainProcessChangeDataCapture.on(`round-taps#${id}`, instance.updateTaps);

        return instance;
    }

    static interval: ReturnType<typeof setInterval> | undefined;

    static {
        this.interval = setInterval(() => {
            const now = Date.now();

            for (const { 1: roundModel } of this.instancesRoundModelById) {
                roundModel.checkTimerStatus(now);
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
export type MinimalRoundInfo = {
    id: number,
    startedAt: number,
    endedAt: number,
    cooldownSec: number,
    wasRoundTaps?: boolean,
    completed?: boolean,
    usersInfo?: Map<number, MinimalRoundInfo_UserInfo>,
    __proto__?: null,
};

export function makeMinimalRoundInfoUserInfoItem(): MinimalRoundInfo_UserInfo {
    return {
        wasTaps: false,
        __proto__: null,
    };
}

export const localSavedRoundInfo = new TemporaryMap<Round["id"], MinimalRoundInfo>({
    signal: mainProcessAbortController.signal,
});
