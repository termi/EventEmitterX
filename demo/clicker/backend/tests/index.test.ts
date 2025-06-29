'use strict';

import type * as net from 'node:net';

import { afterAll, beforeAll } from "@jest/globals";
import {
    useDebugTimers,
    // dontUseDebugTimers,
    getDebugTimersInfo,
} from '../../tests_utils/debugTimers';

// note: Если TypeScript будет компилировать файлы в режиме ESModules, тот вызов этой функции произойдёт слишком поздно.
//  Для поддержки ESModules, нужно сделать отдельный файл, который внутри себя будет вызывать эту функцию.
// eslint-disable-next-line react-hooks/rules-of-hooks
useDebugTimers();

import { asyncStart as fastifyAppAsyncStart } from '../src/server/server';
import { applicationStats } from "../../develop/ApplicationStats";
import { TIMES } from "../../utils/times";
import { pathJoin } from "../../utils/path";
import { setDefaultBaseURI, TestApiMethods } from "../../api/methods";
import sseChannels from "../../api/SSEChannels";
import { assertIsNonEmptyArray } from "../../type_guards/array";
import { RoundDTO, scoreFromTapsCount } from "../../logic/RoundModel";
import mainProcessChangeDataCapture from "../../logic/mainProcessChangeDataCapture";
import { mainProcessJTWStorage } from "../../logic/mainProcessJTWStorage";
import { InterceptOutgoingHTTP } from '../../tests_utils/InterceptOutgoingHTTP';

describe('integration tests of backend', function() {
    const httpInterception = new InterceptOutgoingHTTP();
    let mainProcessAbortController: AbortController;
    let fastifyApp: Awaited<ReturnType<typeof fastifyAppAsyncStart>>["fastifyApp"];
    let origin = 'http://localhost:3001';
    let apiMethods: TestApiMethods;

    beforeAll(async () => {
        const fastifyAppDescription = await fastifyAppAsyncStart();

        ({ fastifyApp, mainProcessAbortController } = fastifyAppDescription);

        origin = fastifyApp.listeningOrigin;
        setDefaultBaseURI(origin);
        apiMethods = new TestApiMethods();

        httpInterception.start({
            onConnection(socket: net.Socket): boolean {
                fastifyApp.server.emit('connection', socket);

                return true;
            },
        });
    });

    afterAll(() => {
        httpInterception.destructor();
        mainProcessAbortController.abort('afterAll tests');

        // debug me
        void applicationStats;

        const timers = getDebugTimersInfo();

        // debug me
        void timers;
    });

    describe('api/common', function() {
        it('ping', async function() {
            const response = await fetch(pathJoin(origin, 'ping'));
            const body: { pong: number } = await response.json();

            expect(body.pong).toBeDefined();
        });
    });

    describe('api/round', function() {
        describe('createRound', function() {
            it('admin can create new round', async function() {
                const startedAt = Date.now() + TIMES.MINUTES_5;
                const endedAt = Date.now() + TIMES.MINUTES_10;

                if (!apiMethods.test__adminUser.accessToken) {
                    await apiMethods.test__loginTestUser(true);
                }

                const round = await apiMethods.test__getOrCreateTestRound({
                    startedAt,
                    endedAt,
                }, {
                    alwaysCreateNew: true,
                });

                expect(round.createdAt).toBeDefined();
                expect(new Date(round.startedAt).getTime()).toBe(new Date(startedAt).getTime());
                expect(new Date(round.endedAt).getTime()).toBe(new Date(endedAt).getTime());
            });

            it(`non-admin can't create new round`, async function() {
                if (!apiMethods.test__simpleUser.accessToken) {
                    await apiMethods.test__loginTestUser(false);
                }

                await expect(apiMethods.test__getOrCreateTestRound({}, {
                    fromUser: apiMethods.test__simpleUser,
                    alwaysCreateNew: true,
                }))
                    .rejects
                    .toThrow('Forbidden')
                ;
            });

            it(`can't create new round without "accessToken"`, async function() {
                await expect(apiMethods.test__getOrCreateTestRound({}, {
                    fromUser: {
                        email: 'other@test.ru',
                        name: 'other',
                        password: 'asd',
                        accessToken: '',
                        refreshToken: '',
                    },
                    alwaysCreateNew: true,
                }))
                    .rejects
                    // todo: Должно быть .toThrow('Token missing in "Authorization" header')
                    //  А сейчас или .toThrow('Forbidden')
                    //  или .toThrow('Invalid token')
                    .toThrow()
                ;
            });
        });

        describe('makeRoundTap', function() {
            it('with admin user', async function() {
                if (!apiMethods.test__adminUser.accessToken) {
                    await apiMethods.test__loginTestUser(true);
                }

                const round = await apiMethods.test__getOrCreateTestRound(void 0, {
                    alwaysCreateNew: true,
                });
                const tapCount = 2;

                const body = await apiMethods.makeRoundTap(round.id, {
                    count: tapCount,
                });

                expect(body.success).toBeTruthy();
                expect(body.count).toBe(tapCount);
                expect(body.userCount).toBe(tapCount);
                expect(body.userScore).toBe(tapCount);
                expect(body.roundCount).toBe(tapCount);
                expect(body.roundScore).toBe(tapCount);

                const body2 = await apiMethods.makeRoundTap(round.id, {
                    count: tapCount,
                });

                const newRoundCount2 = body2.roundCount;

                expect(body2.success).toBeTruthy();
                expect(body2.count).toBe(tapCount);
                expect(newRoundCount2).toBe(tapCount * 2);
                expect(body2.userCount).toBe(newRoundCount2);
                expect(body2.userScore).toBe(newRoundCount2);
                expect(body2.roundCount).toBe(newRoundCount2);
                expect(body2.roundScore).toBe(newRoundCount2);

                const bigTapCount = 10;
                const body3 = await apiMethods.makeRoundTap(round.id, {
                    count: bigTapCount,
                });

                const newRoundCount3 = body3.roundCount;
                const newRoundScore3 = scoreFromTapsCount(newRoundCount3);

                expect(body3.success).toBeTruthy();
                expect(body3.count).toBe(bigTapCount);
                expect(newRoundCount3).toBe(newRoundCount2 + bigTapCount);
                expect(body3.userCount).toBe(newRoundCount3);
                expect(body3.userScore).toBe(newRoundScore3);
                expect(body3.roundCount).toBe(newRoundCount3);
                expect(body3.roundScore).toBe(newRoundScore3);

                const hugeTapCount = 60;
                const body4 = await apiMethods.makeRoundTap(round.id, {
                    count: hugeTapCount,
                });

                const newRoundCount4 = body4.roundCount;
                const newRoundScore4 = scoreFromTapsCount(newRoundCount4);

                expect(body4.success).toBeTruthy();
                expect(body4.count).toBe(hugeTapCount);
                expect(newRoundCount4).toBe(newRoundCount3 + hugeTapCount);
                expect(body4.userCount).toBe(newRoundCount4);
                expect(body4.userScore).toBe(newRoundScore4);
                expect(body4.roundCount).toBe(newRoundCount4);
                expect(body4.roundScore).toBe(newRoundScore4);

                const newRoundBody = await apiMethods.getRoundById(round.id);

                expect(newRoundBody.success).toBeTruthy();
                expect(newRoundBody.item.id).toBe(round.id);
                expect(newRoundBody.item.tapsCount).toBe(newRoundCount4);
            });

            it('with Никита user', async function() {
                if (!apiMethods.test__adminUser.accessToken) {
                    await apiMethods.test__loginTestUser(true);
                }

                const round = await apiMethods.test__getOrCreateTestRound();

                if (!apiMethods.test__НикитаUser.accessToken) {
                    await apiMethods.test__loginTestUser(apiMethods.test__НикитаUser);
                }

                apiMethods.test__setDefaultAccessToken(apiMethods.test__НикитаUser.accessToken);

                const tapCount = 2;

                const body = await apiMethods.makeRoundTap(round.id, {
                    count: tapCount,
                });

                expect(body.success).toBeTruthy();
                expect(body.userCount).toBe(0);
                expect(body.userScore).toBe(0);
                expect(body.roundCount).toBeGreaterThan(0)
                expect(body.roundScore).toBe(scoreFromTapsCount(body.roundCount));

                const body2 = await apiMethods.makeRoundTap(round.id, {
                    count: tapCount,
                });

                expect(body2.success).toBeTruthy();
                expect(body2.userCount).toBe(0);
                expect(body2.userScore).toBe(0);
                expect(body2.roundCount).toBeGreaterThan(0)
                expect(body2.roundScore).toBe(scoreFromTapsCount(body2.roundCount));

                const body3 = await apiMethods.getRoundById(round.id);

                expect(body3.success).toBeTruthy();
                expect(body3.item.id).toBe(round.id);
                expect(body3.item.tapsCount).toBeGreaterThan(0);
                expect(scoreFromTapsCount(body3.item.tapsCount)).toBe(scoreFromTapsCount(body2.roundCount));
            });

            it('with concurrency', async function() {
                const {
                    test__adminUser,
                    test__simpleUser,
                } = apiMethods;

                if (!test__adminUser.accessToken) {
                    await apiMethods.test__loginTestUser(test__adminUser);
                }
                if (!test__simpleUser.accessToken) {
                    await apiMethods.test__loginTestUser(test__simpleUser);
                }

                const round = await apiMethods.test__getOrCreateTestRound(void 0, {
                    alwaysCreateNew: true,
                    fromUser: apiMethods.test__adminUser,
                });
                const roundId = round.id;
                const tapCount = 2;

                const { 0: body1, 1: body2 } = await Promise.all([
                    apiMethods.test__makeRoundTapFromUser(roundId, {
                        count: tapCount,
                    }, test__adminUser),
                    apiMethods.test__makeRoundTapFromUser(roundId, {
                        count: tapCount,
                    }, test__simpleUser),
                ]);

                expect(body1.userId).toBe(test__adminUser.id);
                expect(body2.userId).toBe(test__simpleUser.id);

                const { 0: body3, 1: body4 } = await Promise.all([
                    apiMethods.test__makeRoundTapFromUser(roundId, {
                        count: tapCount,
                    }, test__adminUser),
                    apiMethods.test__makeRoundTapFromUser(roundId, {
                        count: tapCount,
                    }, test__simpleUser),
                ]);

                expect(body3.userId).toBe(test__adminUser.id);
                expect(body4.userId).toBe(test__simpleUser.id);

                let maxRoundCount = 0;
                // note: Т.к. Object.groupBy возвращает null-prototype object, можно `for-in` пользоваться без проверки `Object.hasOwn(key)`.
                const groupedResult = Object.groupBy([ body1, body2, body3, body4 ], ({ userId }) => userId);

                for (const key in groupedResult) {
                    let prevUserCount = 0;
                    let prevRoundCount = 0;

                    for (const body of groupedResult[key]) {
                        expect(body.success).toBeTruthy();
                        expect(body.roundId).toBe(roundId);
                        expect(body.count).toBe(tapCount);
                        expect(body.userCount).toBeGreaterThan(prevUserCount);
                        expect(body.roundCount).toBeGreaterThan(prevRoundCount);

                        prevUserCount = body.userCount ?? 0;
                        prevRoundCount = body.roundCount;
                        maxRoundCount = Math.max(maxRoundCount, prevRoundCount);
                    }
                }

                const newRoundBody = await apiMethods.getRoundById(roundId);

                expect(newRoundBody.success).toBeTruthy();
                expect(newRoundBody.item.id).toBe(roundId);
                expect(newRoundBody.item.tapsCount).toBe(maxRoundCount);
            });
        });

        describe('sse: roundsSSEUpdate', function() {
            it('should send round update', async function() {
                if (!apiMethods.test__adminUser.accessToken) {
                    await apiMethods.test__loginTestUser(true);
                }

                const roundsSSEUpdate = sseChannels.roundsSSEUpdate({
                    getJWTToken() {
                        return apiMethods.test__adminUser.accessToken;
                    },
                });
                const incomingMessages: { type: string, data: { id: number } }[] = [];
                const { state$ } = roundsSSEUpdate;

                roundsSSEUpdate.on('message', data => {
                    incomingMessages.push(data as typeof incomingMessages[0]);
                });
                state$.addListener((newValue) => {
                    // debug me
                    void newValue;
                });

                expect(state$.get()).toBe('pending');

                await roundsSSEUpdate.connect();

                const round = await apiMethods.test__getOrCreateTestRound(void 0, {
                    alwaysCreateNew: true,
                });

                assertIsNonEmptyArray(incomingMessages);
                expect(incomingMessages[0].type).toBe('round-created');
                expect(incomingMessages[0].data.id).toBe(round.id);
                expect(state$.get()).toBe('connected');

                roundsSSEUpdate.disconnect();

                expect(state$.get()).toBe('disconnected');
            });

            it('using "mainProcessChangeDataCapture": should send round update', async function() {
                if (!apiMethods.test__adminUser.accessToken) {
                    await apiMethods.test__loginTestUser(true);
                }
                else {
                    mainProcessJTWStorage.setTokens(apiMethods.test__adminUser);
                }

                // noinspection JSPotentiallyInvalidConstructorUsage
                const webLikeMainProcessChangeDataCapture = new (Object.getPrototypeOf(mainProcessChangeDataCapture)).constructor() as typeof mainProcessChangeDataCapture;
                const incomingMessages: { type: string, data: RoundDTO & { now: number } }[] = [];

                // emulate open sse channel on web page
                await webLikeMainProcessChangeDataCapture.openSSEChannelForRoundsUpdate(true);

                const errorHandler = jest.fn(error => {
                    // debug me
                    void error;
                });

                webLikeMainProcessChangeDataCapture.on('error', errorHandler);
                webLikeMainProcessChangeDataCapture.on('round-created', function(payload) {
                    incomingMessages.push({ type: 'round-created', data: payload });
                });

                const round = await apiMethods.test__getOrCreateTestRound(void 0, {
                    alwaysCreateNew: true,
                });

                expect(errorHandler).not.toHaveBeenCalled();
                assertIsNonEmptyArray(incomingMessages);
                expect(incomingMessages[0].type).toBe('round-created');
                expect(incomingMessages[0].data.id).toBe(round.id);
                expect(incomingMessages[0].data.now).toBeDefined();
            });
        });
    });
});
