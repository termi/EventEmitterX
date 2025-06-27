'use strict';

import type { FastifyRequest, FastifyReply } from 'fastify';

import { TemporaryMap } from "../../../utils/TemporaryMap";
import { mainProcessAbortController } from "../../../logic/mainProcessAbortController";

export const requestsIdempotentMap = new TemporaryMap<string, unknown>({
    signal: mainProcessAbortController.signal,
});

export function isIdempotentRequest(request: FastifyRequest) {
    return !!request.headers["X-Idempotent-Id"];
}

export function getIdempotentRequestResponse(request: FastifyRequest, reply: FastifyReply, payload: unknown) {
    const idempotentId = String(request.headers["X-Idempotent-Id"] || '');

    if (!idempotentId || reply.statusCode !== 200) {
        return;
    }

    requestsIdempotentMap.set(idempotentId, payload);
}


export function setIdempotentRequestResponse(request: FastifyRequest, reply: FastifyReply, payload: unknown) {
    const idempotentId = String(request.headers["X-Idempotent-Id"] || '');

    if (!idempotentId || reply.statusCode !== 200) {
        return;
    }

    requestsIdempotentMap.set(idempotentId, payload);
}
