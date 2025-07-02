'use strict';

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

import { assertIsNonEmptyString, assertIsString } from "../../../type_guards/string";
import { assertIsPositiveNumber } from "../../../type_guards/number";
import { assertIsObject } from "../../../type_guards/object";
// import { prismaClient } from '../orm/prismaClient';
import { currentAuthUser } from "../../types/auth";
import { stringifyError } from "../../../utils/error";
import { TemporaryMap } from "../../../utils/TemporaryMap";
import { TIMES } from "../../../utils/times";
import { jwtExpiresInMs } from "../common/env";
import { getJWTInfo } from './authService';

const JWT_SECRET = getJWTInfo().JWT_SECRET;

assertIsNonEmptyString(JWT_SECRET);

// todo: Подписываться на канал в Redis который сообщает об logout произошедших в другой ноде
export const invalidAccessTokensMap = new TemporaryMap<string, true>({
    checkEveryMs: TIMES.HOURS,
    saveMs: jwtExpiresInMs,
});

export function getAuthorizedResponse(req: FastifyRequest) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || invalidAccessTokensMap.has(token)) {
        return {
            success: false,
            status: void 0 as number | undefined,
            error: 'Invalid token',
            errorMessage: !token
                ? 'Token missing in "Authorization" header'
                : 'Invalid token in "Authorization" header'
            ,
        } as const;
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as currentAuthUser.UserPayload;

        assertIsObject(payload);
        assertIsPositiveNumber(payload.userId);
        assertIsString(payload.userName);
        assertIsString(payload.userEmail);

        // const user = await prismaClient.user.findUnique({
        //     where: { id: payload.userId },
        // });
        //
        // if (!user?.isActive) {
        //     // noinspection ExceptionCaughtLocallyJS
        //     throw new Error('Invalid user');
        // }

        return {
            success: true,
            userInfo: payload,
        } as const;
    }
    catch (err) {
        return {
            success: false,
            status: void 0 as number | undefined,
            error: 'Invalid token',
            errorMessage: stringifyError(err),
        } as const;
    }
}

export function authenticate(
    req: FastifyRequest,
    reply: FastifyReply,
    done: () => void,
) {
    const authorizedResponse = getAuthorizedResponse(req);

    if (authorizedResponse.success) {
        req.user = authorizedResponse.userInfo;
        done();
    }
    else {
        return reply.status(authorizedResponse.status || 401)
            .send(authorizedResponse)
        ;
    }
}
