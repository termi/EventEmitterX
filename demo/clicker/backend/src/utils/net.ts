'use strict';

import net from "node:net";

import { TIMES } from "../../../utils/times";

const localhost = '127.0.0.1';

export const getFreePort = Object.assign(async function getFreePort(defaultPort = 3000, basePort = 3001, step = 1, maxTryCount = 500) {
    return detectPortInUse(defaultPort).catch(err => {
        console.error('portInUse error', err);

        return true;
    }).then(inUse => {
        if (inUse) {
            return _getFreePort(basePort, step, maxTryCount);
        }
        else {
            return defaultPort;
        }
    });
}, {
    detectPortInUse,
    unlockPortInUse,
    lockPortInUse,
})

/**
 * todo: Проблема в том, что данная функция не может проверить порты, которые заняты процессом PJSIP
 * https://stackoverflow.com/a/29872303
 * Дополнил его ещё server.write внутри server.on('listening'), иначе не детектилось, когда порт занят
 *  другим (неактивным) пользователем Windows.
 */
async function detectPortInUse(port: number): Promise<boolean> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    return new Promise<boolean>((resolve, reject) => {
        timeout = setTimeout(() => {
            reject('TIMEOUT');
        }, TIMES.MINUTES);

        const server = net.createServer(function(socket) {
            socket.write('Echo server\r\n');
            socket.pipe(socket);
        });

        server.listen(port, localhost);

        server.on('error', function() {
            resolve(true);
        });
        server.on('listening', function() {
            server.close();
            resolve(false);
        });
    }).then(portInUse => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = void 0;
        }

        return portInUse;
    }).catch(err => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = void 0;
        }

        throw err;
    });
}

const serversByPort: Record<number, net.Server> = Object.create(null);

/**
 * Функция разблокирует принудительно заблокированный порт
 * @param {number} port
 * @returns - `true` == порт был заблокирован
 */
function unlockPortInUse(port: number) {
    const existedServer = serversByPort[port];

    if (existedServer) {
        existedServer.close();
        existedServer.removeAllListeners();

        delete serversByPort[port];

        return Promise.resolve(true);
    }

    return Promise.resolve(false);
}

/**
 * Функция принудительно заблокирует порт
 */
async function lockPortInUse(port: number) {
    return detectPortInUse(port).then(inUse => {
        if (!inUse) {
            const existedServer = serversByPort[port];

            if (existedServer) {
                existedServer.close();
                existedServer.removeAllListeners();

                delete serversByPort[port];
            }

            return new Promise(resolve => {
                const server = net.createServer(function(socket) {
                    socket.write('Echo server\r\n');
                    socket.pipe(socket);
                });

                serversByPort[port] = server;

                server.listen(port, localhost);

                server.on('error', function(err) {
                    console.error('PortLockServer default error:', err);

                    resolve(false);
                });
                server.on('data', function(data) {
                    console.log('PortLockServer default data:', data);
                });
                server.on('listening', function() {
                    resolve(true);
                });
            });
        }

        return true;
    })
}

/**
 * @private
 */
async function _getFreePort(basePort = 3000, step = 1, maxTryCount = 500, currentTry = 0): Promise<number> {
    currentTry++;

    if (currentTry > maxTryCount) {
        return Promise.reject(`Can't find open port`);
    }

    return detectPortInUse(basePort).catch(err => {
        console.error('portInUse error', err);

        return true;
    }).then((portInUse) => {
        if (portInUse) {
            return _getFreePort(basePort + 1, step, maxTryCount, currentTry);
        }

        return basePort;
    });
}
