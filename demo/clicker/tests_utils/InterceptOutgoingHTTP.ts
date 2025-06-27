'use strict';

import type { Socket } from "node:net";
import type { IncomingMessage, ServerResponse } from "node:http";

import type {
    BypassableSocket,
    SocketOptions,
    Callback,
    Event,
    HttpCallback,
    SocketConnectCallback,
    SocketConnectionCallback,
} from 'mitm';

import Mitm from 'mitm';

import { EventEmitter } from "node:events";
import { assertIsPositiveNumber } from "../type_guards/number";
import { assertIsString } from "../type_guards/string";

const kInterceptOutgoingHTTP_onConnect = Symbol('kInterceptOutgoingHTTP_onConnect');
const kInterceptOutgoingHTTP_onConnection = Symbol('kInterceptOutgoingHTTP_onConnection');
const kInterceptOutgoingHTTP_onRequest = Symbol('kInterceptOutgoingHTTP_onRequest');

let idCounter = 0;

const allInterceptOutgoingHTTPInstances = new Set<InterceptOutgoingHTTP>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtendedWithSymbol<T> = T & Record<symbol, any>;

/**
 * HTTP Man In The Middle (MITM) Wrapper.
 *
 * Based on [mitm](https://github.com/moll/node-mitm) to intercept and mock outgoing network TCP and HTTP connections.
 *
 * @see [HTTP MITM Proxy]{@link https://github.com/joeferner/node-http-mitm-proxy} for http(s) and WebSocket.
 * @see [HTTP/HTTPS man in the middle proxy server]{@link https://github.com/produck/mitm} for http(s) and WebSocket.
 * @see [How to use a MITM Proxy with any node app]{@link https://gist.github.com/ndom91/320ec3c1c8f0b059819c6a2c193d51ce}
 * @see [mitmproxy (Python)]{@link https://github.com/mitmproxy/mitmproxy}
 * @see [Mockttp]{@link https://github.com/httptoolkit/mockttp}
 */
export class InterceptOutgoingHTTP extends EventEmitter {
    // noinspection JSUnusedLocalSymbols
    public readonly id = ++idCounter;
    private _ready = false;
    private _destroyed = false;
    private _matchers: InterceptOutgoingHTTP.InterceptionMatcher[] = [];
    private _onConnect: NonNullable<InterceptOutgoingHTTP.StartOptions["onConnect"]> = function() {// eslint-disable-line class-methods-use-this
        return true;
    };
    private _onConnection: NonNullable<InterceptOutgoingHTTP.StartOptions["onConnection"]> = function() {// eslint-disable-line class-methods-use-this
        return true;
    };
    private _onRequest: NonNullable<InterceptOutgoingHTTP.StartOptions["onRequest"]> = function() {// eslint-disable-line class-methods-use-this
        //
    };

    connectCounter = 0;
    connectionCounter = 0;
    requestsCounter = 0;

    constructor(props?: InterceptOutgoingHTTP.ConstructorOptions) {
        super(/*props*/);

        if (props?.matcher) {
            this._matchers.push(props.matcher);
        }

        allInterceptOutgoingHTTPInstances.add(this);
    }

    destructor() {
        this._destroyed = true;

        this.stop();

        // super.destructor();
    }

    [Symbol.dispose]() {
        this.destructor();
    }

    get ready() {
        return this._ready;
    }

    startIntercepting() {
        _getMitmSingletonInstance(this);
    }

    start(options: InterceptOutgoingHTTP.StartOptions) {
        const {
            onConnect,
            onConnection,
            onRequest,
        } = options;

        if (!onConnection && !onRequest) {
            throw new TypeError('MITM: onConnection or onRequest should be passed.');
        }

        if (onConnect) {
            this._onConnect = onConnect;
        }

        if (onConnection) {
            this._onConnection = onConnection;
        }

        if (onRequest) {
            this._onRequest = onRequest;
        }

        this.resume();
    }

    stop() {
        this._ready = false;

        _interceptOutgoingHTTPsLinkedToMitm.delete(this);

        if (_interceptOutgoingHTTPsLinkedToMitm.size === 0) {
            _destroyMitmSingletonInstance();
        }
    }

    pause() {
        this._ready = false;
    }

    resume() {
        if (this._destroyed) {
            throw new Error(`MITM: Can't resume destroyed InterceptOutgoingHTTP`);
        }

        this.startIntercepting();

        this._ready = true;

        _checkMitmSingletonInstanceAwaitedSockets();
    }

    checkMatched(options: SocketOptions) {
        const { _matchers } = this;

        if (_matchers.length === 0) {
            return {
                matched: true,
                exclusive: false,
            };
        }

        /**
         * На самом деле, сюда приходит немного другие данные нежели те, что описаны в типе {@link SocketOptions}.
         * По крайней мере, для случая, когда мы перехватываем запрос от node-fetch.
         */
        const optionsFromFetch = options as InterceptOutgoingHTTP.SocketOptionsFromFetch;
        const { protocol, host, port: _port, pathname, method } = optionsFromFetch;
        const port = Number(_port);

        assertIsPositiveNumber(port);

        // todo: Возможно, концепция exclusive вообще не верна. Разве нужно давать разным InterceptOutgoingHTTP обрабатывать
        //  один и тот же запрос? Скорее всего, нужно ассоциировать запрос с первым InterceptOutgoingHTTP для которого
        //  положительно выполнился checkMatched.
        let exclusive = false;

        const matched = _matchers.some(filter => {
            const {
                isExclusive: filter_isExclusive,
                protocol: filter_protocol,
                host: filter_host,
                port: filter_port,
                pathname: filter_pathname,
                method: filter_method,
            } = filter;
            const matched = _matchValueIfExists(protocol, filter_protocol)
                && _matchValueIfExists(host, filter_host)
                && _matchValueIfExists(port, filter_port)
                && _matchValueIfExists(pathname, filter_pathname)
                && _matchValueIfExists(method, filter_method)
            ;

            if (matched && filter_isExclusive) {
                exclusive = true;
            }

            return matched;
        });

        return {
            matched,
            exclusive,
        };
    }

    addMatcher(matcher: InterceptOutgoingHTTP.InterceptionMatcher) {
        if (matcher.port !== void 0) {
            assertIsPositiveNumber(matcher.port);
        }

        if (matcher.host !== void 0) {
            assertIsString(matcher.host);
        }

        this._matchers.push(matcher);
    }

    [kInterceptOutgoingHTTP_onConnect](client: BypassableSocket, options: SocketOptions) {
        this.connectCounter++;

        return this._onConnect(client, options);
    }

    [kInterceptOutgoingHTTP_onConnection](socket: Socket) {
        this.connectionCounter++;

        // socket.server.timeout
        // socket.server.keepAliveTimeout
        // socket.server.headersTimeout
        return this._onConnection(socket);
    }

    [kInterceptOutgoingHTTP_onRequest](request: IncomingMessage, response: ServerResponse) {
        this.requestsCounter++;

        // request.socket[Symbol(timeout)]
        // request.client[Symbol(timeout)]
        this._onRequest(request, response);
    }

    static stopAllInterceptions() {
        for (const interception of allInterceptOutgoingHTTPInstances) {
            interception.destructor();
        }
    }
}

export namespace InterceptOutgoingHTTP {
    export type ConstructorOptions = /*EventEmitter.ConstructorOptions & */{
        matcher?: InterceptionMatcher,
    };

    export type StartOptions = {
        onConnect?(client: BypassableSocket, options: SocketOptions): boolean,
        onConnection?(socket: Socket): boolean,
        onRequest?(request: IncomingMessage, response: ServerResponse): void,
    };

    export type InterceptionMatcher = {
        isExclusive?: boolean,
        protocol?: RegExp | string | ((value: string) => boolean),
        host?: RegExp | string | ((value: string) => boolean),
        port?: RegExp | number | ((value: number) => boolean),
        pathname?: RegExp | string | ((value: string) => boolean),
        method?: RegExp | string | ((value: string) => boolean),
    };

    export type SocketOptionsFromFetch = SocketOptions & {
        protocol: 'http:' | 'https:',
        port: string,
        pathname: string,
        /** [HTTP request methods]{@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods} */
        method: 'CONNECT' | 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'TRACE',
    };
}

function _matchValueIfExists<T=unknown>(passedValue: T | undefined, expected: RegExp | T | ((expectedValue: T) => boolean) | undefined): boolean {
    if (expected === void 0) {
        // no expected value is existing, so no need to check
        return true;
    }

    if (passedValue === void 0) {
        // expected value is existed, but passed value not
        return false;
    }

    if (typeof expected === 'function') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error ignore `TS2349: This expression is not callable.`
        return Boolean(expected(passedValue));
    }

    if (expected instanceof RegExp) {
        return expected.test(String(passedValue));
    }

    return expected === passedValue;
}

type MitmClass = Mitm.Mitm & {
    new(): MitmClass,
    enable(): void,
    removeListener(event: Event, callback: Callback): void,
    removeListener(event: "connect", callback: SocketConnectCallback): void,
    removeListener(event: "connection", callback: SocketConnectionCallback): void,
    removeListener(event: "request", callback: HttpCallback): void,
};

const kSocketWasEvents = Symbol('kSocketWasEvents');
const kSocketMatchedInterceptOutgoingHTTP = Symbol('kSocketMatchedInterceptOutgoingHTTP');
const kSocketOptions = Symbol('kSocketOptions');
let _mitm: MitmClass | undefined;
const _interceptOutgoingHTTPsLinkedToMitm = new Set<InterceptOutgoingHTTP>();
let _awaited_awaitedInterceptOutgoingHTTPsList: Socket[] = [];

/**
 * "connect" event first
 */
function _mitmOnConnect(_clientSocket: BypassableSocket, options: SocketOptions) {
    const clientSocket = _clientSocket as ExtendedWithSymbol<typeof _clientSocket>;
    let isAllBypassed = true;

    // console.log('_mitmOnConnect');

    clientSocket[kSocketOptions] = options;
    (clientSocket[kSocketWasEvents] ??= {}).connect = true;

    for (const interceptOutgoingHTTP of _interceptOutgoingHTTPsLinkedToMitm) {
        const matchedInfo = interceptOutgoingHTTP.checkMatched(options);

        if (interceptOutgoingHTTP.ready
            && matchedInfo.matched
        ) {
            const onConnectResult = interceptOutgoingHTTP[kInterceptOutgoingHTTP_onConnect](clientSocket, options);

            if (// Данный interceptOutgoingHTTP отклонил этот clientSocket
                (onConnectResult as unknown) === false
                // Этот clientSocket не будет обрабатываться ни одним из interceptOutgoingHTTP (был вызван clientSocket.bypass())
                || (clientSocket as typeof clientSocket & { bypassed?: boolean })["bypassed"]
                // Этот clientSocket будет обрабатываться эксклюзивно данным interceptOutgoingHTTP
                //  (todo: Возможно, это лишняя логика эксклюзивности)
                || matchedInfo.exclusive
            ) {
                return;
            }

            isAllBypassed = false;
        }
    }

    if (isAllBypassed) {
        clientSocket.bypass();
    }
}

/**
 * "connection" event second
 */
function _mitmOnConnection(_serverSocket: Socket, options: SocketOptions) {
    const serverSocket = _serverSocket as ExtendedWithSymbol<typeof _serverSocket>;

    // console.log('_mitmOnConnection');

    serverSocket[kSocketOptions] = options;
    (serverSocket[kSocketWasEvents] ??= {}).connection = true;

    for (const interceptOutgoingHTTP of _interceptOutgoingHTTPsLinkedToMitm) {
        if (interceptOutgoingHTTP.ready
            && interceptOutgoingHTTP.checkMatched(options).matched
            && interceptOutgoingHTTP[kInterceptOutgoingHTTP_onConnection](serverSocket)
        ) {
            // Этот clientSocket будет обрабатываться эксклюзивно данным interceptOutgoingHTTP.
            // Флаг `interceptOutgoingHTTP.checkMatched(options).exclusive` в данном случае игнорируется, т.к.
            //  мы определились с тем, кто будет обрабатывать это соединение внутри `interceptOutgoingHTTP[kInterceptOutgoingHTTP_onConnection](serverSocket)`.
            serverSocket[kSocketMatchedInterceptOutgoingHTTP] = interceptOutgoingHTTP;

            return;
        }
    }

    _awaited_awaitedInterceptOutgoingHTTPsList.push(serverSocket);
}

/**
 * "request" event
 */
function _mitmOnRequest(request: IncomingMessage, response: ServerResponse) {
    const clientSocket = request.socket as ExtendedWithSymbol<typeof request.socket>;
    const fetchMock = clientSocket[kSocketMatchedInterceptOutgoingHTTP] as InterceptOutgoingHTTP;

    // console.log('_mitmOnRequest');

    if (!fetchMock) {
        throw new TypeError(`MITM: onrequest: Undefined instance of InterceptOutgoingHTTP for Socket. 'request' event before 'connection' event? ${JSON.stringify(clientSocket[kSocketWasEvents] ?? {})}`);
    }

    if (!fetchMock.ready) {
        throw new TypeError(`MITM: onrequest: Instance of InterceptOutgoingHTTP is not ready.`);
    }

    fetchMock[kInterceptOutgoingHTTP_onRequest](request, response);
}

function _getMitmSingletonInstance(fetchMock: InterceptOutgoingHTTP) {
    _interceptOutgoingHTTPsLinkedToMitm.add(fetchMock);

    if (_mitm) {
        return _mitm;
    }

    _mitm = new (Mitm as unknown as MitmClass)();

    _mitm.on('connect', _mitmOnConnect);
    _mitm.on('connection', _mitmOnConnection);
    _mitm.on('request', _mitmOnRequest);

    _mitm.enable();

    return _mitm;
}

function _checkMitmSingletonInstanceAwaitedSockets() {
    if (_awaited_awaitedInterceptOutgoingHTTPsList.length === 0) {
        return;
    }

    const current_awaited_awaitedInterceptOutgoingHTTPsList = _awaited_awaitedInterceptOutgoingHTTPsList;

    _awaited_awaitedInterceptOutgoingHTTPsList = [];

    for (let i = 0, len = current_awaited_awaitedInterceptOutgoingHTTPsList.length ; i < len ; i++) {
        const serverSocket = current_awaited_awaitedInterceptOutgoingHTTPsList[i] as ExtendedWithSymbol<NonNullable<typeof current_awaited_awaitedInterceptOutgoingHTTPsList[0]>>;

        // Внутри serverSocket будет помещён в новый _awaited_awaitedInterceptOutgoingHTTPsList, при необходимости
        _mitmOnConnection(serverSocket, serverSocket[kSocketOptions]);
    }
}

function _destroyMitmSingletonInstance() {
    if (!_mitm) {
        return;
    }

    _mitm.removeListener('connect', _mitmOnConnect);
    _mitm.removeListener('connection', _mitmOnConnection);
    _mitm.removeListener('request', _mitmOnRequest);

    _mitm.disable();
    _mitm = void 0;

    // todo: Закрывать с ошибкой все Socket в _awaitedSocketsPool
}
