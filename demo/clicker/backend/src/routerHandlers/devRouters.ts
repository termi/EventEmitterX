'use strict';

import { fastifyApp } from "../server/fastifyInit";
import { dev_mode_process_exit } from "../../../api/routers";

export function startDevRoutersHandling(app = fastifyApp, options?: {
    mainProcessAbortController?: AbortController,
}) {
    // Роут для принудительного завершения процесса который запустил текущий backend
    app[dev_mode_process_exit.method]<dev_mode_process_exit.Types>(
        dev_mode_process_exit.url,
        {},
        async (_req, reply) => {
            console.log('Было запрошено завершение процесса. 1');
            options?.mainProcessAbortController?.abort();
            reply.code(200);
            reply.send('dev_mode_process_exit');
            console.log('Было запрошено завершение процесса. 2');

            setTimeout(() => {
                console.log('Было запрошено завершение процесса.');

                // process.ppid - предполагается, что pid процесса, который запустил данный сервер.
                // Убиваем процесс `/tsx/dist/cli.mjs watch src/server.ts`
                process.kill(process.ppid);
                process.exit(0);
            }, 500);
        },
    );
}
