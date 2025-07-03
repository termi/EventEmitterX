'use strict';

import fastify from 'fastify';
import { FastifySSEPlugin } from "fastify-sse-v2";

import { applicationStats } from "../../../develop/ApplicationStats";
import { stringifyError } from "../../../utils/error";
import { localISOString } from "../../../utils/date";
import { isTest } from "../../../utils/runEnv";

// ReturnType не работает с перегруженными функциями, которой и является fastify.
//  [Typescript: ReturnType of overloaded function](https://stackoverflow.com/questions/52760509/typescript-returntype-of-overloaded-function/52761156#52761156)
//  [Inferred type depends on physical order of method overloads in code #24275](https://github.com/Microsoft/TypeScript/issues/24275#issuecomment-390701982)
//  [Overload gets lost in mapped type with conditional type #29732](https://github.com/microsoft/TypeScript/issues/29732)
// Поэтому мы не можем создавать fastifyApp в initFastifyApp.
// let fastifyApp: ReturnType<typeof fastify>;
export const fastifyApp = fastify();

let _inited = false;
// eslint-disable-next-line
let debug = true;

export function initFastifyApp() {
    if (_inited) {
        return fastifyApp;
    }

    _inited = true;

    fastifyApp.register(FastifySSEPlugin);

    // Fastify natively supports 'application/json' and 'text/plain' content types with a default charset of utf-8.
    // https://fastify.dev/docs/latest/Reference/ContentTypeParser/#body-parser
    // fastifyApp.addContentTypeParser('application/json', { parseAs: 'string' }, function(req, body, done) {
    //     try {
    //         const json = JSON.parse(body as string);
    //         done(null, json);
    //     }
    //     catch (err) {
    //         const error = err as Error & { statusCode: number };
    //
    //         error.statusCode = 400;
    //         done(error, void 0);
    //     }
    // });

    fastifyApp.addHook('preHandler', (_request, reply, done) => {
        reply.header('X-Powered-By', 'Fastify');
        done();
    });

    fastifyApp.addHook('onSend', (request, reply, payload, done) => {
        reply.header('X-Request-ID', request.id);
        reply.header('X-Response-Time', reply.elapsedTime);

        applicationStats.onResponse(request.id);

        done(null, payload);
    });

    // https://fastify.dev/docs/latest/Reference/Hooks/#onrequest
    fastifyApp.addHook('onRequest', (request, _reply, done) => {
        if (debug && !isTest) {
            console.log(localISOString(), 'fastifyApp.onRequest', request.url);
        }

        applicationStats.onRequest(request.id);

        // Some code
        done();
    });

    // https://fastify.dev/docs/latest/Reference/Hooks/#onerror
    fastifyApp.addHook('onError', (request, reply, error, done) => {
        applicationStats.onError(error);

        const errorAsString = stringifyError(error);

        // debug me
        void [
            request,
            reply,
            error,
            errorAsString,
        ];

        // Some code
        done();
    });

    return fastifyApp;
}
