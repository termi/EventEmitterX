'use strict';

import type { FastifyReply, FastifyRequest } from "fastify";

import { auth_check, auth_login, auth_logout, auth_refresh, auth_register } from "../../../api/routers";
import { stringifyError } from "../../../utils/error";
import { fastifyApp } from "../server/fastifyInit";
import { authService } from "../auth/authService";
import { getAuthorizedResponse, invalidAccessTokensMap } from "../auth/authMiddleware";


export function startAuthRouters(app = fastifyApp) {
    app[auth_register.method]<auth_register.Types>(
        auth_register.url,
        async (req, reply) => {
            try {
                const { email, password, name } = req.body;
                const tokens = await authService.register(email, password, name);

                reply.send({
                    success: true,
                    ...tokens,
                });
            }
            catch (err) {
                reply.status(400).send({
                    success: false,
                    error: stringifyError(err),
                    errorCause: stringifyError((err as Error).cause),
                });
            }
        },
    );

    app[auth_login.method]<auth_login.Types>(
        auth_login.url,
        async (req, reply) => {
            try {
                const { email, password } = req.body;
                const tokens = await authService.login(email, password);

                reply.send({
                    success: true,
                    ...tokens,
                });
            }
            catch (err) {
                reply.status(401).send({
                    success: false,
                    error: stringifyError(err),
                    errorCause: stringifyError((err as Error).cause),
                });
            }
        },
    );

    app[auth_check.method]<auth_check.Types>(
        auth_check.url.split('?')[0],
        async (req, reply) => {
            try {
                const { allowRefresh: _allowRefresh } = req.query;
                const allowRefresh = !!_allowRefresh && _allowRefresh !== 'false';
                const authorizedResponse = getAuthorizedResponse(req);

                if (authorizedResponse.success) {
                    return {
                        success: true,
                        ...authorizedResponse.userInfo,
                    };
                }
                else if (allowRefresh && req.body.refreshToken) {
                    return auth_refreshRouter(req as FastifyRequest<auth_refresh.Types>, reply);
                }
                else {
                    return authorizedResponse;
                }
            }
            catch (err) {
                reply.status(500).send({
                    success: false,
                    error: stringifyError(err),
                    errorCause: stringifyError((err as Error).cause),
                });
            }
        },
    );

    const auth_refreshRouter = async (req: FastifyRequest<auth_refresh.Types>, reply: FastifyReply) => {
        try {
            const { refreshToken } = req.body;
            const tokens = await authService.refreshToken(refreshToken);

            reply.send({
                success: true,
                ...tokens,
            });
        }
        catch (err) {
            reply.status(401).send({
                success: false,
                error: stringifyError(err),
                errorCause: stringifyError((err as Error).cause),
            });
        }
    };

    app[auth_refresh.method]<auth_refresh.Types>(
        auth_refresh.url,
        auth_refreshRouter,
    );

    app[auth_logout.method]<auth_logout.Types>(
        auth_logout.url,
        async (req, reply) => {
            try {
                const accessToken = req.headers.authorization?.split(' ')[1];

                if (accessToken) {
                    invalidAccessTokensMap.set(accessToken, true);
                }

                const { refreshToken } = req.body;

                const response = await authService.logout(refreshToken);

                reply.send({
                    success: true,
                    ...response,
                });
            }
            catch (err) {
                reply.status(401).send({
                    success: false,
                    error: stringifyError(err),
                    errorCause: stringifyError((err as Error).cause),
                });
            }
        },
    );
}
