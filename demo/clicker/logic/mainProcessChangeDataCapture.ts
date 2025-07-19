/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

'use string';

import type { Round } from "@prisma/client";

import { applicationStats } from "../develop/ApplicationStats";
import { EventEmitterX } from "../modules/EventEmitterX/events";
import { isAbortError } from "../modules/common/abortable";
import sseChannels from "../api/SSEChannels";
import { SSEClient } from "../api/SSEClient";
import { isNodeJS, isWebMainThread } from "../utils/runEnv";
import { promiseTimeout } from "../utils/promise";
import apiMethods from "../api/methods";
import { RoundDTO } from "./RoundModel";
import { mainProcessAbortController } from "./mainProcessAbortController";
import { currentUserStore } from "./currentUserStore";

class MainProcessChangeDataCapture extends EventEmitterX<MainProcessChangeDataCapture.Events> {
    constructor() {
        super({
            emitCounter: applicationStats.mainProcessChangeDataCaptureEventCounter,
        });

        this.subscribeToChangesFromOtherRealms();

        const onAnyListenerHook: typeof this._emitWithListenersHook = (eventName, ...args) => {
            if (eventName === 'error') {
                return;
            }

            if (!args[1]) { // check isDetailedEvent
                this._sendEventToOtherRealms(eventName, ...args);
                this._sendDetailedEvent(eventName, ...args);
            }
        };

        this._emitWithListenersHook = onAnyListenerHook;
        this._emitWithNoListenersHook = onAnyListenerHook;

        this.on('error', (error: unknown, prefix?: string) => {
            applicationStats.onError(error as string | Error);
            console.error('MainProcessChangeDataCapture: onerror:', ...[ prefix, error, (error as Error)?.cause ].filter(a => !!a));
        });
    }

    private subscribeToChangesFromOtherRealms() {
        if (isNodeJS) {
            // todo: Тут можно подписаться на канал изменений в Redis, чтобы получать изменения из других нод.
        }
        else if (isWebMainThread) {
            // В главном процессе вкладки браузера, запускаем SSEClient(roundsSSEUpdate) для получения обновлений
            this.openSSEChannelForRoundsUpdate().catch((error) => {
                if (!isAbortError(error)) {
                    console.error(error);
                }
            });
        }
    }

    private _sendEventToOtherRealms: NonNullable<typeof this._emitWithListenersHook> = (eventName, ...args) => {
        if (isNodeJS) {
            // todo: Отправляем на события в Redis.
        }
    };

    private _sendDetailedEvent: NonNullable<typeof this._emitWithListenersHook> = (eventName, ...args) => {
        if (typeof eventName !== 'string' || eventName.includes('#')) {
            return;
        }

        const eventPayload = args[0] as { id?: string | number, roundId?: string | number };
        const itemId = eventPayload.id ?? eventPayload.roundId;

        if (itemId) {
            // @ts-expect-error Что-то не так с Generic Event в моей реализации EventEmitterX: потом нужно разобраться с этим
            this.emit(`${eventName}#${itemId}`, eventPayload, true);
        }
    };

    private _roundsUpdateSSEChannel: SSEClient | undefined;
    private _roundsUpdateSSEChannelPromise: Promise<boolean> | undefined;

    async openSSEChannelForRoundsUpdate(doNotCheckCurrentUser = false) {
        if (this._roundsUpdateSSEChannelPromise) {
            return this._roundsUpdateSSEChannelPromise;
        }

        // Тут асинхронная задержка ОБЯЗАТЕЛЬНА, иначе некоторые зависимые модули не успеют синхронно инициализироваться
        await promiseTimeout(0);

        const { resolve, reject, promise } = Promise.withResolvers<boolean>();

        this._roundsUpdateSSEChannelPromise = promise;

        const sseClient = (this._roundsUpdateSSEChannel ??= sseChannels.roundsSSEUpdate({
            signal: mainProcessAbortController.signal,
        }));

        this._roundsUpdateSSEChannel.on('error', (error: unknown) => {
            this.emit('error', error);
        });
        this._roundsUpdateSSEChannel.on('message', (message) => {
            this.emit(
                message.type as keyof MainProcessChangeDataCapture.Events,
                ...([ message.data ] as Parameters<MainProcessChangeDataCapture.Events[keyof MainProcessChangeDataCapture.Events]>)
            );
        });

        if (!doNotCheckCurrentUser) {
            currentUserStore.signal$.addListener(() => {
                if (currentUserStore.isAuthenticated) {
                    if (!sseClient.isConnected) {
                        sseClient.connect().catch((error) => {
                            this.emit('error', error, 'sseClient.connect():');
                        });
                    }
                }
                else {
                    if (sseClient.isConnected) {
                        sseClient.disconnect();
                    }
                }
            });
        }

        if (doNotCheckCurrentUser || currentUserStore.isAuthenticated) {
            await sseClient.connect().then(() => {
                resolve(true);
            }).catch(reject);
        }
        else {
            resolve(false);
        }

        return promise;
    }
}

namespace MainProcessChangeDataCapture {
    export type Events = {
        'round-updated': (props: Partial<RoundDTO> & { id: Round["id"] }, isDetailedEvent?: boolean) => void,
        [eventName: `round-updated#${number}`]: (props: Partial<RoundDTO> & { id: Round["id"] }, isDetailedEvent?: boolean) => void,
        'round-created': (roundDTO: RoundDTO & { now: number }, isDetailedEvent?: boolean) => void,
        [eventName: `round-created#${number}`]: (roundInfo: RoundDTO, isDetailedEvent?: boolean) => void,
        'round-ended': (roundInfo: RoundDTO, isDetailedEvent?: boolean) => void,
        [eventName: `round-ended#${number}`]: (roundInfo: RoundDTO, isDetailedEvent?: boolean) => void,
        'round-taps': (roundInfo: Awaited<ReturnType<typeof apiMethods.makeRoundTap>>, isDetailedEvent?: boolean) => void,
        [eventName: `round-taps#${number}`]: (roundInfo: Awaited<ReturnType<typeof apiMethods.makeRoundTap>>, isDetailedEvent?: boolean) => void,
    };
}

const mainProcessChangeDataCapture = new MainProcessChangeDataCapture();

export default mainProcessChangeDataCapture;
