// noinspection ExceptionCaughtLocallyJS

'use strict';

import { EventEmitterX } from "../modules/EventEmitterX/events";
import { isAbortError } from "../modules/common/abortable";
import { EventSignal } from "../modules/EventEmitterX/EventSignal";
import { mainProcessJTWStorage } from "../logic/mainProcessJTWStorage";
import { request } from "./request";
import { makeRandomString } from "../utils/random";
import { append } from "../utils/object";

const SECONDS = 1000;
const SECONDS_30 = 30 * SECONDS;

const enum SSEClientFlags {
    isManualDisconnect = 1 << 1,
    isConnected = 1 << 2,
    isInReconnection = 1 << 3,
    isDestroyed = 1 << 29,
}

type SSEClientEvents = {
    message: (message: { type: string, data: unknown, id?: string }) => void,
    'system-message': (message: string) => void,
    error: (error: unknown) => void,
    open: () => void,
    ping: (serverTimestamp: number) => void,
    reconnect: () => void,
    disconnect: (isForReconnect?: boolean) => void,
};

const kManualDisconnectedReason = Symbol('kManualDisconnectedReason');
const stringTagName = 'SSEClient';
const componentTypeSSEClient = makeRandomString('SSEClient', true);

export class SSEClient extends EventEmitterX<SSEClientEvents> {
    private _ac: AbortController | undefined;
    private _outerSignal: AbortSignal | undefined;
    private readonly _url: string;
    private readonly _getJWTToken: (() => string) | undefined;
    private readonly maxRetries: number;
    private readonly initialRetryDelay: number;
    private retryCount = 0;
    private _retryTimeout: ReturnType<typeof setTimeout> | undefined;
    private _flags = 0;
    private _lastPingAt = 0;

    constructor(options: SSEClient.Options) {
        super({});

        this._url = options.url || '';
        this._getJWTToken = options.getJWTToken;
        this._outerSignal = options.signal;
        this.maxRetries = options.maxRetries ?? 5;
        this.initialRetryDelay = options.initialRetryDelay ?? SECONDS;

        this._outerSignal?.addEventListener('abort', this[Symbol.dispose], { once: true });

        this.on('error', (error: unknown) => {
            console.error('SSEClient: onerror:', error);
        });
    }

    destructor() {
        this.disconnect();

        this._outerSignal?.removeEventListener('abort', this[Symbol.dispose]);
        this.state$.destructor();

        this._outerSignal = void 0;
        this._flags |= SSEClientFlags.isDestroyed;
    }

    [Symbol.dispose] = () => {
        this.destructor();
    }

    get isDestroyed() {
        return (this._flags & SSEClientFlags.isDestroyed) !== 0;
    }

    get isManualDisconnect() {
        return (this._flags & SSEClientFlags.isManualDisconnect) !== 0;
    }

    get isConnected() {
        return (this._flags & SSEClientFlags.isConnected) !== 0;
    }

    async connect(): Promise<void> {
        this._ac?.abort();
        this._ac = void 0;

        if (this.isDestroyed) {
            throw new Error('SSEClient: instance already destroyed');
        }

        this._flags &= ~SSEClientFlags.isManualDisconnect;
        this.retryCount = 0;

        await this.createConnection(true);
    }

    awaitEvent<K extends keyof SSEClientEvents>(
        eventName: K, options?: { signal?: AbortSignal }): Promise<SSEClientEvents[K]> {
        const signal = options?.signal
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore
            ? AbortSignal.any([
                options.signal,
                this._ac?.signal,
            ].filter(a => !!a))
            : this._ac?.signal
        ;

        return EventEmitterX.once(this, eventName, {
            errorEventName: 'error',
            signal,
        }) as unknown as Promise<SSEClientEvents[K]>;
    }

    state$ = new EventSignal<'pending' | 'connected' | 'disconnected' | 'unknown'>('pending', {
        sourceEmitter: this,
        sourceEvent: [
            'open',
            'reconnect',
            'disconnect',
        ],
        sourceMap(_eventName, eventData: unknown) {
            const eventName = _eventName as keyof SSEClientEvents;

            if (eventName === 'open') {
                return 'connected';
            }
            if (eventName === 'disconnect') {
                const isForReconnect = (eventData as Parameters<SSEClientEvents['disconnect']>[0]);

                return isForReconnect ? 'pending' : 'disconnected';
            }

            return 'unknown';
        },
        componentType: componentTypeSSEClient,
    });

    private async createConnection(canThrowError?: boolean) {
        const handleError = (error: unknown) => {
            this._flags &= ~(SSEClientFlags.isConnected | SSEClientFlags.isInReconnection);

            if (this.isManualDisconnect
                // note: abort reason может быть как самими error, так и error.cause
                || error === kManualDisconnectedReason
                || (error as Error)?.cause === kManualDisconnectedReason
            ) {
                return;
            }

            if (isAbortError(error) || error === kManualDisconnectedReason) {
                if (canThrowError) {
                    throw error;
                }
                else {
                    // Игнорируем AbortError
                }
            }
            else {
                this.emit('error', typeof error === 'object'
                    ? error
                    : new Error('Unknown error occurred', { cause: error })
                );
                this.scheduleReconnect(canThrowError);
            }
        };

        try {
            this._ac?.abort();
            this._ac = new AbortController();

            const token = this._getJWTToken?.() || mainProcessJTWStorage.getAccessToken();

            if (!token) {
                throw new Error('SSEClient: No JWT token available');
            }

            const response = await request(this._url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/event-stream',
                },
                signal: this._ac.signal,
                returnFetchResponse: true,
            });

            if (!response.ok) {
                const contentType = response.headers.get('Content-Type')?.toLowerCase();
                const isJsonResponseBody = contentType === 'application/json';
                const body: object | undefined = isJsonResponseBody
                    ? await response.json().catch(() => void 0)
                    : void 0
                ;

                throw new Error(`SSEClient: HTTP error! status: ${response.status}`, {
                    cause: {
                        ...body,
                        status: response.status,
                        statusText: response.statusText,
                    },
                });
            }

            const reader = response.body?.getReader();

            if (!reader) {
                throw new Error('SSEClient: No readable stream in response');
            }

            this.emit('open');
            // Сброс счетчика при успешном подключении
            this.retryCount = 0;
            this._flags |= SSEClientFlags.isConnected;
            this._flags &= ~SSEClientFlags.isInReconnection;

            this.processStream(reader).catch(handleError);
        }
        catch (error) {
            handleError(error);
        }
    }

    private async processStream(_reader: ReadableStreamDefaultReader<Uint8Array>) {
        using reader = append(_reader, {
            [Symbol.dispose]() {
                reader.releaseLock();
            },
        });
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done || this._ac?.signal.aborted) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const event of events) {
                this.parseEvent(event);
            }
        }

        // Если поток завершился (сервер закрыл соединение)
        if (!this.isManualDisconnect) {
            this._flags &= ~SSEClientFlags.isConnected;
            this.emit('disconnect', true);
            this.scheduleReconnect();
        }
    }

    private parseEvent(eventData: string) {
        let eventName: string | undefined;
        let eventId: string | undefined;
        let data: string | object = '';
        const systemMessages: string[] = [];

        for (const line of eventData.split('\n')) {
            if (line.startsWith('event:')) {
                eventName = line.substring(6).trim();
            }
            else if (line.startsWith('id:')) {
                eventId = line.substring(3).trim();
            }
            else if (line.startsWith('data:')) {
                const newData = line.substring(5).trim();

                if (data || !eventName) {
                    // already has data for event
                    systemMessages.push(newData);
                }
                else {
                    // has eventName and no data
                    if (newData.startsWith('json::')) {
                        data = JSON.parse(newData.substring(6));
                    }
                    else {
                        data = newData;
                    }
                }
            }
        }

        if (eventName === 'reconnect' && data === 'reconnect request') {
            this.emit('reconnect');
            this.reconnect();
            return;
        }

        if (eventName) {
            if (eventName === 'ping') {
                if (typeof data === 'object') {
                    this._onPing((data as { time?: number })?.time || Date.now());
                }
                else if (data.startsWith('{') || data.startsWith('json::')) {
                    const pingData = JSON.parse(data) as { time?: number };

                    this._onPing(pingData.time || Date.now());
                }
                else {
                    this._onPing(Number(data) || Date.now());
                }
            }
            else {
                this.emit('message', { type: eventName, data, id: eventId });
            }
        }

        for (const systemMessage of systemMessages) {
            this.emit('system-message', systemMessage);
        }
    }

    get lastPingAt() {
        return this._lastPingAt;
    }

    private _onPing(serverTimestamp: number) {
        this._lastPingAt = Date.now();
        this.emit('ping', serverTimestamp);
    }

    private scheduleReconnect(canThrowError?: boolean): void {
        if (this.retryCount >= this.maxRetries) {
            this._flags &= ~SSEClientFlags.isInReconnection;

            const error = new Error('Max reconnection attempts reached');

            if (canThrowError) {
                throw error;
            }

            this.emit('error', error);

            return;
        }

        this._flags |= SSEClientFlags.isInReconnection;
        this.retryCount++;

        // Максимальная задержка 30 секунд
        const delay = Math.min(
            this.initialRetryDelay * Math.pow(2, this.retryCount),
            SECONDS_30,
        );

        // console.log(`Reconnecting in ${delay}ms (attempt ${this.retryCount})`);

        if (this._retryTimeout) {
            clearTimeout(this._retryTimeout);
        }

        this._retryTimeout = setTimeout(() => {
            this._retryTimeout = void 0;
            this.reconnect();
        }, delay);
    }

    reconnect(): void {
        if (this._retryTimeout) {
            clearTimeout(this._retryTimeout);
            this._retryTimeout = void 0;
        }

        // note: Тут `.catch(() => {})` исключительно декоративный,
        //  потому что `createConnection(false)` ВСЕГДА должна подавлять ошибки.
        this.createConnection(false).catch(() => {
            //
        });
    }

    disconnect(): void {
        this.emit('disconnect', false);
        this._flags &= ~(SSEClientFlags.isConnected | SSEClientFlags.isInReconnection);
        this._flags |= SSEClientFlags.isManualDisconnect;
        this._ac?.abort(kManualDisconnectedReason);
        this._ac = void 0;

        if (this._retryTimeout) {
            clearTimeout(this._retryTimeout);
            this._retryTimeout = void 0;
        }
    }

    declare [Symbol.toStringTag]: string;

    static componentType = componentTypeSSEClient;
}

SSEClient.prototype[Symbol.toStringTag] = stringTagName;

export namespace SSEClient {
    export type Options = {
        url?: string,
        getJWTToken: () => string,
        signal?: AbortSignal,
        headers?: RequestInit["headers"],
        maxRetries?: number,
        initialRetryDelay?: number,
    };
}
