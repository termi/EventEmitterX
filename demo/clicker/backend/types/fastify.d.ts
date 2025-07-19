//
// noinspection ES6UnusedImports Эти импорты тут НУЖНЫ!
import type { FastifyRequest, FastifyReply } from 'fastify';// eslint-disable-line @typescript-eslint/no-unused-vars

import type { currentAuthUser } from "./auth";

declare module 'fastify' {
    interface FastifyRequest {
        user: currentAuthUser.UserPayload;
    }
}
