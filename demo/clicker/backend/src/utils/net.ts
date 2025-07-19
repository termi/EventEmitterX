'use strict';

import net from "node:net";

import { TIMES } from "../../../utils/times";
import { makeDeferredWithTimeout } from "../../../utils/promise";

const localhost = '127.0.0.1';

/**
 * @throws `Error('TIMEOUT')`
 */
export async function getFreePort(basePort = 3001, { step = 1, maxTryCount = 500 } = {} as { step?: number, maxTryCount?: number }) {
    return _getFreePort(basePort, step, maxTryCount, 0);
}

const _checkingPortInProgressMap = new Map<number, Promise<boolean>>();

function _setInMapForDisposableStack<M extends Map<unknown, unknown>>(map: M, key: Parameters<M["set"]>[0], value: Parameters<M["set"]>[1]) {
    map.set(key, value);

    return {
        [Symbol.dispose]() {
            map.delete(key);
        },
        __proto__: null as null,
    };
}

/**
 * todo: Проблема в том, что данная функция не может проверить порты, которые заняты процессом PJSIP
 * https://stackoverflow.com/a/29872303
 * Дополнил его ещё server.write внутри server.on('listening'), иначе не детектилось, когда порт занят
 *  другим (неактивным) пользователем Windows.
 *
 * @throws `Error('TIMEOUT')`
 */
export async function checkPortInUse(port: number) {
    const existedPromise = _checkingPortInProgressMap.get(port);

    if (existedPromise) {
        return existedPromise;
    }

    using deferred = makeDeferredWithTimeout<boolean>(TIMES.MINUTES);
    const { resolve, promise } = deferred;
    // noinspection JSUnusedLocalSymbols
    using _ = _setInMapForDisposableStack(_checkingPortInProgressMap, port, promise);// eslint-disable-line @typescript-eslint/no-unused-vars

    const server = net.createServer(function(socket) {
        socket.write('Echo server\r\n');
        socket.pipe(socket);
    });

    server.listen(port, localhost, function() {
        server.close();
        resolve(false);
    });

    server.once('error', function() {
        server.close();
        resolve(true);
    });

    // should be `await promise` to prevent early disposing of deferred
    return await promise;
}

/**
 * Если значение `false`, значит была вызвана функция {@link unlockPortInUse} до того, как функция {@link lockPortInUse}
 *  успела завершиться. В этом случае, нужно отменить действие {@link lockPortInUse} - т.е. открыть этот порт.
 */
const serversByPort: Record<number, net.Server | false> = Object.create(null);

/**
 * Функция разблокирует принудительно заблокированный порт
 * @returns - `true` == порт ранее был заблокирован, а теперь разблокирован
 */
export function unlockPortInUse(port: number) {
    const existedServer = serversByPort[port];

    if (existedServer) {
        const { resolve, promise } = Promise.withResolvers<true>();

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        existedServer.close((_error) => {
            existedServer.removeAllListeners();
            // _error will be ignored
            resolve(true);
        });

        delete serversByPort[port];

        return promise;
    }
    else if (_checkingPortInProgressMap.has(port)) {
        serversByPort[port] = false;
    }

    return Promise.resolve(false);
}

/**
 * Функция принудительно заблокирует порт
 *
 * @returns - был ли занят порт.
 * @throws `Error('TIMEOUT')`
 */
export async function lockPortInUse(port: number) {
    if (await checkPortInUse(port)) {
        return true;
    }

    const existedServer = serversByPort[port];

    if (existedServer === false) {
        /**
         * Функция {@link checkPortInUse} выполнялась слишком долго. Уже был вызван {@link unlockPortInUse}.
         * Ничего не делаем, выходим.
         */
        delete serversByPort[port];

        return false;
    }

    if (existedServer) {
        existedServer.close();
        existedServer.removeAllListeners();

        delete serversByPort[port];
    }

    using deferred = makeDeferredWithTimeout<boolean>(TIMES.MINUTES);
    const { resolve, promise } = deferred;

    const server = net.createServer(function(socket) {
        socket.write('Echo server\r\n');
        socket.pipe(socket);
    });

    serversByPort[port] = server;

    server.listen(port, localhost, function() {
        resolve(true);
    });

    server.on('error', function(err) {
        console.error('PortLockServer default error:', err);

        resolve(false);
    });
    server.on('data', function(data) {
        console.log('PortLockServer default data:', data);
    });

    // should be `await promise` to prevent early disposing of deferred
    return await promise;
}

/**
 * @private
 * @throws `Error('TIMEOUT')`
 */
async function _getFreePort(basePort = 3000, step = 1, maxTryCount = 500, currentTry = 0) {
    if (currentTry++ > maxTryCount) {
        throw new Error(`Can't find open port`);
    }

    let portInUse: boolean;

    try {
        portInUse = await checkPortInUse(basePort);
    }
    catch /* (error) */ {
        // console.error('portInUse error', err);
        portInUse = true;
    }

    if (portInUse) {
        return _getFreePort(basePort + 1, step, maxTryCount, currentTry);
    }

    return basePort;
}
