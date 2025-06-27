'use strict';

import { fastifyApp } from "../server/fastifyInit";
import { startRoundRouters, startSSERoundRouters } from "./roundsRouters";
import { startAuthRouters } from "./authRouters";
import { startCurrentUserRouters } from "./currentUserRouters";
import { startCommonRoutersHandling } from "./commonRouters";

export function startAllRoutersHandling(app = fastifyApp) {
    startRoundRouters(app);
    startSSERoundRouters(app);
    startAuthRouters(app);
    startCurrentUserRouters(app);
    startCommonRoutersHandling(app);
}
