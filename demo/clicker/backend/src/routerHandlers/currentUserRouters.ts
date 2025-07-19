'use strict';

import { authenticate } from "../auth/authMiddleware";
import { authService } from "../auth/authService";
import { fastifyApp } from "../server/fastifyInit";
import { currentUserInfo } from "../../../api/routers";

export function startCurrentUserRouters(app = fastifyApp) {
    app[currentUserInfo.method]<currentUserInfo.Types>(
        currentUserInfo.url,
        { preHandler: authenticate },
        async (req) => {
            const user = await authService.findUserById(req.user.userId);

            if (!user) {
                return {
                    success: false,
                    error: 'User not found',
                };
            }

            return {
                success: true,
                item: user,
            };
        },
    );
}
