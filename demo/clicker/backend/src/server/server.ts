'use strict';

import 'dotenv/config';

import cors from '@fastify/cors';
import freePortAsync from 'freeport-async';
import ms, { StringValue } from "ms";

import '../../../polyfills';

import { initFastifyApp } from "./fastifyInit";
import { mainProcessAbortController } from "../../../logic/mainProcessAbortController";
import { cliArgs } from "../cli/args";
import { startAllRoutersHandling } from "../routerHandlers/routers";
import { startDevRoutersHandling } from "../routerHandlers/devRouters";
import { applicationStats } from "../../../develop/ApplicationStats";
import { assertIsInValidNwtPortsRange } from "../../../type_guards/net";
import { makeRandomInteger } from "../../../utils/random";
import { isIDEDebugger } from "../../../utils/runEnv";
import { createAbortSignalTimeout } from "../../../utils/timers";
import { localISOString } from "../../../utils/date";
import { setDefaultBaseURI } from "../../../api/methods";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const packageJSON = require('../../package.json');

console.log(localISOString(), `Start`, __filename, 'with pid =', process.pid, 'with ppid =', process.ppid, 'with name =', packageJSON.name);

const fastifyApp = initFastifyApp();
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const SECONDS_5 = SECONDS * 5;
const MINUTES_5 = MINUTES * 5;

if (cliArgs.DETECT_ACTIVITY) {
    const { DETECT_ACTIVITY } = cliArgs;
    const checkActivityEveryMs = String(Number(DETECT_ACTIVITY)) === DETECT_ACTIVITY
        // value in ms
        ? Number(DETECT_ACTIVITY)
        // value in time string
        : ms(DETECT_ACTIVITY as StringValue)
    ;

    console.log(localISOString(), `Check activity every`, ms(checkActivityEveryMs), '; and handle "dev_mode_process_exit"');

    if (checkActivityEveryMs) {
        setInterval(() => {
            if (!applicationStats.checkWasRecentRequest()) {
                mainProcessAbortController.abort();
                // Давно не было активности в процессе. Убиваем его, чтобы не висел неактивным.
                // В 99% это нужно только при разработке, при запуске в dev-режиме
                process.exit(0);
            }
        }, checkActivityEveryMs);
    }

    startDevRoutersHandling(fastifyApp, {
        mainProcessAbortController,
    });
}

const DEFAULT_PORT = 3001;

export async function asyncStart(listenPort?: number) {
    startAllRoutersHandling(fastifyApp);

    const HTTP_PORT = String(listenPort ?? (process.env.HTTP_PORT || '3001')).toLowerCase();
    // todo: Определение занятости порта freePortAsync не всегда срабатывает. Поэтому, нужно написать собственную функцию.
    const port = HTTP_PORT === 'default' ? await freePortAsync.freePortAsync(DEFAULT_PORT)
        : HTTP_PORT === 'random' ? await freePortAsync.freePortAsync(DEFAULT_PORT + makeRandomInteger(20, 1000))
        : Number(HTTP_PORT)
    ;

    assertIsInValidNwtPortsRange(port);

    // 5 секунд на старт по-умолчанию
    const startTimeout = isIDEDebugger ? MINUTES_5 : SECONDS_5;

    console.log(localISOString(), `Start listening port`, port, startTimeout);

    const timeoutSignalDescription = createAbortSignalTimeout(startTimeout);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    const signal = AbortSignal.any([
        mainProcessAbortController.signal,
        timeoutSignalDescription.signal,
    ]);

    signal.addEventListener('abort', () => {
        console.log(localISOString(), `Exit process due "abort" event with reason:`, signal.reason);
    });

    await fastifyApp.register(cors, {
        // origin: 'http://localhost',
        // Разрешаем все origins (для разработки)
        origin: '*',
    });

    await fastifyApp.listen({
        port,
        signal,
    });

    timeoutSignalDescription.cancel();

    const origin = `http://localhost:${port}`;

    setDefaultBaseURI(origin);

    // Строка очень важная, она грепается в скиптах запуска приложения для получения порта
    console.log(localISOString(), `Server is running on ${origin}`);

    return {
        fastifyApp,
        mainProcessAbortController,
    };
}

if (require.main?.filename === __filename) {
    // Этот файл запускается отдельно (не через `import/require`)
    asyncStart().catch(error => {
        // fastifyApp.log.error(__filename, 'start(): error:', error);
        console.error(localISOString(), __filename, 'start(): error:', error);
        process.exit(1);
    });
}
