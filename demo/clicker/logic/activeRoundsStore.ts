// noinspection JSMismatchedCollectionQueryUpdate

'use strict';

import { Round } from "@prisma/client";

import { EventSignal } from "../modules/EventEmitterX/EventSignal";
import { EventEmitterX } from "../modules/EventEmitterX/events";
import { makeRandomString } from "../utils/random";
import { promiseTimeout } from "../utils/promise";
import { makeFormElementsList, dateToHTMLInputDateTimeLocalValue } from "../utils/html";
import { TIMES } from "../utils/times";
import { SyntheticError } from "../utils/SyntheticError";
import apiMethods from "../api/methods";
import { FormElementDescription } from "../types/htmlSchema";
import { assertIsDefined } from "../type_guards/base";
import { currentUserStore } from "./currentUserStore";
import { RoundDTO, RoundModel, sortRounds } from "./RoundModel";
import { StoreStatus } from "./consts";
import mainProcessChangeDataCapture from "./mainProcessChangeDataCapture";
import { assertIsNonEmptyString } from "../type_guards/string";

const tagCurrentUserStore = 'CurrentUserStore';

export const componentTypeForActiveRoundsStore = makeRandomString(tagCurrentUserStore, true);
export const componentTypeForSelectedRounds = makeRandomString(tagCurrentUserStore, '_selectedRound', true);

let minimalCooldown = TIMES.SECONDS_5;

/**
 * @see {@link ActiveRoundsStore.createNewRound}
 */
const newRoundElements = {
    title: {
        order: 1,
        id: makeRandomString('::title', '::', true),
        label: 'Заголовок:',
        name: 'title',
        type: 'text',
        defaultValue: 'Новый раунд',
        autoFocus: true,
        minLength: 5,
        required: true,
    } satisfies FormElementDescription,
    startedAt: {
        order: 1,
        id: makeRandomString('::startedAt', '::', true),
        label: 'Время начала:',
        name: 'startedAt',
        type: 'datetime-local',
        // todo: использовать компонент Ticker, для того, чтобы обновлять значение в форме, чтобы всегда было значение по-умолчанию не меньше допустимого
        get defaultValue() {
            return dateToHTMLInputDateTimeLocalValue(activeRoundsStore.getNewRoundMinTimestamp());
        },
        // todo: использовать компонент Ticker, для того, чтобы обновлять значение в форме, чтобы всегда было значение min не меньше допустимого
        get min() {
            return dateToHTMLInputDateTimeLocalValue(activeRoundsStore.getNewRoundMinTimestamp());
        },
        get max() {
            return dateToHTMLInputDateTimeLocalValue(Date.now() + TIMES.HOURS_4);
        },
        required: true,
    } satisfies FormElementDescription,
}

const showErrorOnFirstTry = localStorage.getItem('DO_NOT_THROW_ERROR_ON_FIRST_TRY') !== 'true';
let wasErrorOnFirstTry = false;

class ActiveRoundsStore extends EventEmitterX {
    /**
     * Reactive version of CurrentUserStore.
     */
    public readonly signal$ = new EventSignal<Promise<number>, number, typeof this>(0, async (currentValue, newValue) => {
        currentUserStore.signal$.get();

        if (((newValue || 0) & _ActiveRoundsSignalUpdateFlags.withoutLoadingItems) === 0) {
            await this.loadSettings();

            await this.loadActiveRounds().catch((error: unknown) => {
                this.emit('error', error);
                throw error;
            });
        }

        if (showErrorOnFirstTry && !wasErrorOnFirstTry) {
            wasErrorOnFirstTry = true;

            throw _makeFakeError();
        }

        return newValue ?? _newVersionValueWithFlags(currentValue);
    }, {
        data: this,
        componentType: componentTypeForActiveRoundsStore,
    });

    private _status: StoreStatus = StoreStatus.pending;
    private _lastError: string | Error | undefined = void 0;

    constructor() {
        if (new.target.singleton) {
            throw new Error('This class should only has one instance');
        }

        super();

        this.on('error', (error: unknown, prefix?: string) => {
            // todo: Это сейчас не работает как надо.
            //  - Нужно: чтобы вместо списка раундов показывалась ошибка
            //  - Сейчас: при любой ошибке (например при ошибке вызова метода makeRoundTapSync) меняется status и this.signal$ перезапрашивает список раундов
            // this._lastError = error as string | Error;
            // this.status = StoreStatus.error;

            // todo: Перенаправлять в систему нотификаций
            console.error(`${this[Symbol.toStringTag]}:`, ...[ prefix, error, (error as Error)?.cause ].filter(a => !!a));
        });

        mainProcessChangeDataCapture.on(`round-created`, this._addNewRound);
    }

    destructor() {
        this.#ongoingRoundTapsByRoundId.clear();
        if (this.#ongoingRoundTapsTimeout) {
            clearInterval(this.#ongoingRoundTapsTimeout);
            this.#ongoingRoundTapsTimeout = void 0;
        }
    }

    get version() {
        return this.signal$.get();
    }

    get status() {
        return this._status;
    }

    private set status(newStatus: StoreStatus) {
        this.signal$.set(currentValue => _newVersionValueWithFlags(currentValue));
        this._status = newStatus;
        this.emit('status', newStatus);
    }

    // noinspection JSUnusedGlobalSymbols
    get lastError() {
        if (this.status !== StoreStatus.error) {
            return;
        }

        return this._lastError;
    }

    // noinspection JSUnusedGlobalSymbols
    get isPending() {
        return this._status === StoreStatus.pending;
    }

    private _settingsLoaded = false;

    // todo: Вынести в settingsStore
    async loadSettings() {
        if (this._settingsLoaded) {
            return;
        }

        this._settingsLoaded = true;

        const response = await apiMethods.loadSettings();

        if (response.success) {
            minimalCooldown = response.settings?.minimalCooldown ?? minimalCooldown;
        }
    }

    getNewRoundMinTimestamp() {
        return Date.now() + minimalCooldown;
    }

    startLoadingRoutineSync() {
        currentUserStore.signal$.addListener(this._loadingRoutineSync);
    }

    private _loadingRoutineSync = () => {
        this.loadActiveRounds().catch((error: unknown) => {
            this.emit('error', error);
        });
    }

    private _rawRounds: RoundDTO[] = [];
    private _rounds: RoundModel[] = [];

    get activeRounds() {
        return this._rounds;
    }

    async loadActiveRounds() {
        if (currentUserStore.isAuthenticated) {
            const response = await apiMethods.getActiveRounds();

            const serverNow = response.now;
            const existedRoundsIds = new Set(this._rounds.map(roundModel => roundModel.id));

            this._rawRounds = response.items;
            this._rawRounds.sort(sortRounds);
            this._rounds = response.items.map(roundDTO => {
                existedRoundsIds.delete(roundDTO.id);

                return RoundModel.makeById(roundDTO.id, roundDTO, serverNow);
            });
            this._rounds.sort(sortRounds);

            for (const oldRoundId of existedRoundsIds) {
                RoundModel.deleteById(oldRoundId);
            }
        }
        else {
            // todo: На данный момент, нужен "асинхронный разрыв", иначе будет ошибка `Error: Depends on own value`
            //  в EventSignal. Нужно решить этот вопрос в EventSignal.
            await promiseTimeout(0);

            this._rawRounds = [];
            this._rounds = [];
        }
    }

    private _addNewRound = (roundDTO: RoundDTO & { now: number }) => {
        const { id } = roundDTO;
        let round = RoundModel.getById(id);

        if (round) {
            // already has this round
            return round;
        }
        else {
            this._rawRounds.push(roundDTO);
            this._rawRounds.sort(sortRounds);
            this._rounds.push(RoundModel.makeById(roundDTO.id, roundDTO, roundDTO.now));
            this._rounds.sort(sortRounds);

            this.signal$.set(currentValue => _newVersionValueWithFlags(currentValue, _ActiveRoundsSignalUpdateFlags.withoutLoadingItems));

            round = RoundModel.getById(id);

            assertIsDefined(round);

            return round;
        }
    }

    createNewRound = Object.assign(async (props: Parameters<typeof apiMethods.createRound>[0]) => {
        if (currentUserStore.isAuthenticated) {
            assertIsNonEmptyString(props.title);

            const startedAt = props?.startedAt;

            if (startedAt) {
                const startedAtDate = new Date(startedAt);
                const minStatedAtDate = new Date(this.getNewRoundMinTimestamp());

                props.startedAt = Math.max(startedAtDate.getTime(), minStatedAtDate.getTime());
            }

            const response = await apiMethods.createRound(props);

            // console.log('Раунд успешно создан', response);

            const newRound = this._addNewRound(Object.assign(response.item, { now: response.now }));

            activeRoundsStore.selectRoundById(newRound.id);
        }
        else {
            throw new Error('Not Authenticated');
        }
    }, {
        elements: newRoundElements,
        elementsList: makeFormElementsList(newRoundElements),
    })

    private _selectedRound: RoundModel | null = null;

    // noinspection JSUnusedGlobalSymbols
    get selectedRound() {
        return this._selectedRound;
    }

    // todo: Разобраться с типизацией EventSignal и сделать так, а пока - костыль
    // public readonly selectedRound$ = new EventSignal<RoundModel | null, number>(null as (RoundModel | null), (_prev: RoundModel | null, roundId: number | undefined) => {
    //     return (roundId ? RoundModel.getById(roundId) || null : null) as RoundModel | null | void;
    // });
    public readonly selectedRound$ = new EventSignal(0, (prevId, roundId: number | undefined, eventSignal) => {
        const prevRound = prevId ? RoundModel.getById(prevId) : void 0;

        if (prevRound) {
            prevRound.isSelected = false;
        }

        const newSelectedRound = roundId ? RoundModel.getById(roundId) : null;

        if (newSelectedRound) {
            newSelectedRound.isSelected = true;
        }

        eventSignal.data.selectedRound = newSelectedRound;

        return roundId;
    }, {
        data: {
            selectedRound: null as (RoundModel | null),
        },
        componentType: componentTypeForSelectedRounds,
    });

    selectRoundById(id: Round["id"] | 0) {
        this.selectedRound$.set(id);
    }

    #ongoingRoundTapsByRoundId = new Map<Round["id"], number>();
    #ongoingRoundTapsTimeout: ReturnType<typeof setTimeout> | undefined = void 0;
    #ongoingRoundTapsHandler = () => {
        this.#ongoingRoundTapsTimeout = void 0;

        for (const { 0: roundId, 1: count } of this.#ongoingRoundTapsByRoundId) {
            this._makeRoundTapSync(roundId, count);
        }

        this.#ongoingRoundTapsByRoundId.clear();
    }

    private _makeRoundTapSync(roundId: Round["id"], count = 1) {
        apiMethods.makeRoundTap(roundId, { count })
            .then(data => {
                const roundModel = RoundModel.getById(roundId);

                if (roundModel) {
                    roundModel.updateTaps(data);
                }
            })
            .catch(error => {
                this.emit('error', error, 'makeRoundTap:');
            })
        ;
    }

    makeRoundTapSync(roundId: Round["id"], count = 1) {
        const roundModel = RoundModel.getById(roundId);

        if (roundModel) {
            const { timeLeft } = roundModel;

            if (!timeLeft) {
                // Раунд закончился
                // todo: Кидать ошибку, перехватывать её и кидать в систему уведомлений
                return;
            }

            if (timeLeft < TIMES.SECONDS_5) {
                this._makeRoundTapSync(roundId, count);

                return;
            }

            // Локально обновляем значения (обновление с сервера их перезатрёт)
            // note: Если не проверять на currentUserStore.isHiddenTaps, для пользователя Никиты тут будет сначала
            //  инкрементиться числа, а потом обнуляться.
            roundModel.localIncrementTaps(count, currentUserStore.isHiddenTaps);
        }

        const value = this.#ongoingRoundTapsByRoundId.get(roundId);

        this.#ongoingRoundTapsByRoundId.set(roundId, (value || 0) + count);

        if (!this.#ongoingRoundTapsTimeout) {
            this.#ongoingRoundTapsTimeout = setTimeout(this.#ongoingRoundTapsHandler, TIMES.SECONDS * 2);
        }
    }

    // ----

    declare [Symbol.toStringTag]: string;
    declare componentType: string;

    static readonly singleton = new ActiveRoundsStore();
}

ActiveRoundsStore.prototype[Symbol.toStringTag] = tagCurrentUserStore;
ActiveRoundsStore.prototype.componentType = componentTypeForActiveRoundsStore;

const enum _ActiveRoundsSignalUpdateFlags {
    withoutLoadingItems = 1 << 1,
}

function _newVersionValueWithFlags(currentValue: number, flags?: _ActiveRoundsSignalUpdateFlags) {
    const newRawValue = (currentValue >> 8) + 1;

    return (newRawValue << 8) | (flags || 0);
}

function _makeFakeError() {
    return new SyntheticError('Эта ошибка ознакомительная. Нажмите Retry.', {
        cause: {
            error: "Internal Server Error",
            message: "\nInvalid `prismaClient.round.findMany()` invocation in\nD:\\work\\Projects\\tech-task-for-interview\\backend\\src\\routerHandlers\\roundsRouters.ts:64:52\n\n  61 \n  62 await promiseTimeout(2000);\n  63 \n→ 64 const items = await prismaClient.round.findMany({\n       take: 10,\n       where: undefined,\n       include: {\n         taps: {\n           where: {\n             userId: 4\n           },\n           select: {\n             userId: true,\n             count: true,\n             hiddenCount: true\n           }\n         }\n       },\n       orderBy: {\n         startedAt: \"desc\",\n         createdAt: \"desc\"\n       }\n       ~~~~~~~~~~~~~~~~~~~\n     })\n\nArgument `orderBy`: Invalid value provided. Expected RoundOrderByWithRelationInput[], provided Object.",
            statusCode: 500,
        },
    })
}

export const activeRoundsStore = ActiveRoundsStore.singleton;
