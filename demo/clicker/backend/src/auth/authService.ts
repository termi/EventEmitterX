'use strict';

import type { StringValue } from "ms";
import type { User, UserRole } from "@prisma/client";

import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from "node:util";

import jwt from 'jsonwebtoken';

import { makeRandomInteger } from "../../../utils/random";
import { promiseTimeout } from "../../../utils/promise";
import { currentAuthUser } from "../../types/auth";
import { isTest } from "../../../utils/runEnv";
import { prismaClient } from "../orm/prismaClient";
import {
    JWT_EXPIRES_IN,
    JWT_REFRESH_TOKEN_EXPIRES_IN,
    JWT_SECRET,
} from "../common/env";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;

    return {
        passwordHash: buf.toString("hex"),
        passwordSalt: salt,

        __proto__: null as null,
    };
}

/**
 * see [Password hashing in nodejs using built-in `crypto` / ANSWER](https://stackoverflow.com/a/67038052/1587897)
 */
async function comparePassword(
    passwordHash: string,
    passwordSalt: string,
    suppliedPassword: string,
): Promise<boolean> {
    // we need to pass buffer values to timingSafeEqual
    const hashedPasswordBuf = Buffer.from(passwordHash, "hex");
    // we hash the new sign-in password
    const suppliedPasswordBuf = (await scryptAsync(suppliedPassword, passwordSalt, 64)) as Buffer;

    // compare the new supplied password with the stored hashed password
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

export const authService = {
    async register(email: string, password: string, name: string) {
        const existingUser = await prismaClient.user.findUnique({ where: { email } });

        if (existingUser) {
            if (!isTest) {
                // Naive anti-brute-force
                await promiseTimeout(makeRandomInteger(200, 250));
            }

            throw new Error('User already exists');
        }

        const {
            passwordHash,
            passwordSalt,
        } = await hashPassword(password);

        const role: UserRole = (name === 'admin' || name === 'test_admin')
            ? 'ADMIN'
            : name.toLowerCase() === 'никита'
                ? 'USER_HIDE_TAPS'
                : 'USER'
        ;

        const user = await prismaClient.user.create({
            data: { email, name, passwordHash, passwordSalt, role },
        });

        // todo: if origin=='localhost'
        await promiseTimeout(500);

        return this.generateTokens(user);
    },

    async login(email: string, password: string) {
        const user = await prismaClient.user.findUnique({ where: { email } });

        if (!user) {
            if (!isTest) {
                // Naive anti-brute-force
                await promiseTimeout(makeRandomInteger(20, 100));
            }

            throw new Error('User not found');
        }

        const isPasswordValid = await comparePassword(user.passwordHash, user.passwordSalt, password);

        if (!isPasswordValid) {
            if (!isTest) {
                // Naive anti-brute-force
                await promiseTimeout(makeRandomInteger(300, 600));
            }

            throw new Error('Invalid password');
        }

        // todo: if origin=='localhost'
        await promiseTimeout(500);

        return this.generateTokens(user);
    },

    async logout(refreshToken: string) {
        try {
            const payload = jwt.verify(refreshToken, JWT_SECRET) as currentAuthUser.UserPayload;

            await prismaClient.user.update({
                where: { id: payload.userId, refreshToken },
                data: { refreshToken: '' },
            });

            // todo: if origin=='localhost'
            await promiseTimeout(500);

            return {
                userId: payload.userId,
                userRole: payload.userRole,
                accessToken: '',
                refreshToken: '',
            } as const;
        }
        catch (err) {
            throw new Error('Invalid refresh token', {
                cause: err,
            });
        }
    },

    async refreshToken(refreshToken: string) {
        try {
            const payload = jwt.verify(refreshToken, JWT_SECRET) as { userId: number };
            const user = await prismaClient.user.findUnique({
                where: { id: payload.userId, refreshToken },
            });

            if (!user) {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error('Invalid refresh token');
            }

            return this.generateTokens(user);
        }
        catch (err) {
            throw new Error('Invalid refresh token', {
                cause: err,
            });
        }
    },

    async generateTokens(user: User) {
        const { id: userId, name, email } = user;
        const userRole = user.role;
        const userPayload: currentAuthUser.UserPayload = { userId, userRole, userName: name, userEmail: email };
        const accessToken = jwt.sign(userPayload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN as StringValue,
        });
        const refreshToken = jwt.sign(userPayload, JWT_SECRET, {
            expiresIn: JWT_REFRESH_TOKEN_EXPIRES_IN as StringValue,
        });

        await prismaClient.user.update({
            where: { id: userId },
            data: { refreshToken },
        });

        return {
            ...userPayload,
            accessToken,
            refreshToken,
        };
    },

    async validateUser(userId: number) {
        return prismaClient.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, role: true },
        });
    },

    async findUserById(userId: number) {
        return prismaClient.user.findUnique({
            where: { id: userId },
        });
    },
};

export function getJWTInfo() {
    return {
        JWT_SECRET,
        JWT_EXPIRES_IN,
        JWT_REFRESH_TOKEN_EXPIRES_IN,
    };
}
