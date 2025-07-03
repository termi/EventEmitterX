'use strict';

import ms from "ms";

import { TIMES } from "../../../utils/times";

export const DEFAULT_cooldownSec = (Number(process.env.COOLDOWN_DURATION) || 30);
export const DEFAULT_cooldown = (Number(process.env.COOLDOWN_DURATION) || 30) * TIMES.SECONDS;
export const DEFAULT_roundDuration = (Number(process.env.ROUND_DURATION) || 60) * TIMES.SECONDS;
export const DEFAULT_HTTP_PORT = String(process.env.HTTP_PORT || 'default');

export const JWT_SECRET = process.env.JWT_SECRET || '0cb3ce53-1ec6-46d5-8737-2b5bb74fda28';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
export const JWT_REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d';

/**
 * `accessToken` expires in milliseconds.
 */
export const jwtExpiresInMs = ms(JWT_EXPIRES_IN as ms.StringValue);
