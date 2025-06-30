'use strict';

import { TIMES } from "../../../utils/times";

export const DEFAULT_cooldownSec = (Number(process.env.COOLDOWN_DURATION) || 30);
export const DEFAULT_cooldown = (Number(process.env.COOLDOWN_DURATION) || 30) * TIMES.SECONDS;
export const DEFAULT_roundDuration = (Number(process.env.ROUND_DURATION) || 60) * TIMES.SECONDS;
