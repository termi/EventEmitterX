'use strict';

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

import { getJWTInfo } from './authService';
import { assertIsNonEmptyString, assertIsString } from "../../../type_guards/string";
import { assertIsPositiveNumber } from "../../../type_guards/number";
import { assertIsObject } from "../../../type_guards/object";
// import { prismaClient } from '../orm/prismaClient';
import { currentAuthUser } from "../../types/auth";
import { stringifyError } from "../../../utils/error";

const JWT_SECRET = getJWTInfo().JWT_SECRET;

assertIsNonEmptyString(JWT_SECRET);

export function getAuthorizedResponse(req: FastifyRequest) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return {
            success: false,
            status: void 0 as number | undefined,
            error: 'Invalid token',
            errorMessage: 'Token missing in "Authorization" header',
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
