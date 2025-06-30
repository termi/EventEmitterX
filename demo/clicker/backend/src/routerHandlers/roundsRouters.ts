'use strict';

import type { Round } from "@prisma/client";

import { requestsIdempotentMap } from "../utils/idempotentCache";
import { fastifyApp } from "../server/fastifyInit";
import { prismaClient } from "../orm/prismaClient";
import { authenticate } from "../auth/authMiddleware";
import { authService } from "../auth/authService";
import { createRound, getRound, makeRoundTap, rounds, roundsSSEUpdate } from "../../../api/routers";
import { assertOneOfType } from "../../../type_guards/base";
import { assertIsNumberInRange, assertIsPositiveNumber, isPositiveNumber } from "../../../type_guards/number";
import { isISOString } from "../../../type_guards/string";
import { ReplaceDateWithString } from "../../../types/generics";
import mainProcessChangeDataCapture from "../../../logic/mainProcessChangeDataCapture";
import { EventEmitterX } from "../../../modules/EventEmitterX/events";
import { makeIntervalTicker } from "../../../utils/timers";
import { TIMES } from "../../../utils/times";
import { promiseTimeout } from "../../../utils/promise";
import { isTest } from "../../../utils/runEnv";
import { isAbortError } from "../../../modules/common/abortable";
import {
    RoundDTO,
    RoundModel,
    RoundModelReadyState,
    scoreFromTapsCount,
} from "../../../logic/RoundModel";
import { mainProcessAbortController } from "../../../logic/mainProcessAbortController";
import { roundsService } from "../services/roundsService";
import { DEFAULT_cooldownSec, DEFAULT_roundDuration } from "../common/env";

/** Хранилище закешированных и неизменяемых данных пользователя. Для быстрого доступа.  */
const usersInfoMap = new Map<number, {
    id: number,
    isHideTaps: boolean,
    // inactive: boolean,
}>();

mainProcessChangeDataCapture.on('round-ended', roundDTO => {
    // Если получили сообщение из другого Realm
    if (!RoundModel.getById(roundDTO.id)) {
        RoundModel.makeById(roundDTO.id, roundDTO);
    }
});

export function startRoundRouters(app = fastifyApp) {
    app[rounds.method]<rounds.Types>(
        rounds.url.split('?')[0],
        { preHandler: authenticate },
            async (req) => {
            const userId = req.user.userId;
            const { isActive: _isActive } = req.query;
            const isActive = !!_isActive && _isActive !== 'false';
            const limit = Math.min(req.body?.limit ?? 10, 100);

            await promiseTimeout(2000);

            const items = await prismaClient.round.findMany({
                take: limit,
                where: isActive ? {
                    completed: false,
                    endedAt: {
                        lt: new Date(),
                    },
                } : void 0,
                include: {
                    taps: {
                        where: {
                            userId,
                        },
                        select: {
                            userId: true,
                            count: true,
                            hiddenCount: true,
                        },
                    },
                },
                orderBy: {
                    startedAt: 'desc',
                    // [Order by Multiple Fields #2884](https://github.com/prisma/prisma/discussions/2884#discussioncomment-31791)
                    // >  Unfortunately this is currently only possible via prisma.queryRaw. There is still an open request for this here that you can follow.
                    // createdAt: 'desc',
                },
            });

            return {
                success: true,
                limit,
                now: Date.now(),
                items: items as unknown as ReplaceDateWithString<Round>[],
            } as const;
        }
    );

    app[createRound.method]<createRound.Types>(
        createRound.url,
        { preHandler: authenticate },
        async function(req, reply) {
            const userRole = req.user.userRole as string;

            if (!createRound.roles.includes(userRole)) {
                reply.status(403);

                return {
                    success: false,
                    error: 'Forbidden',
                } as const;
            }

            const user = await authService.validateUser(req.user.userId);

            if (!user) {
                reply.status(404);

                return {
                    success: false,
                    error: 'Invalid auth',
                } as const;
            }

            const now = Date.now();
            const idempotentId = String(req.headers["X-Idempotent-Id"] || '');
            const alreadyHandledResult = idempotentId && requestsIdempotentMap.get(idempotentId) || void 0;

            if (alreadyHandledResult) {
                const newTask = alreadyHandledResult as NonNullable<Awaited<ReturnType<typeof prismaClient.round.create>>>;

                return {
                    success: true,
                    now,
                    item: newTask,
                } as const;
            }

            const { startedAt } = req.body;
            let { endedAt } = req.body;

            assertOneOfType(startedAt, [ isPositiveNumber, isISOString ]);

            const startedAtDate = new Date(startedAt);

            if (!endedAt) {
                endedAt = startedAtDate.getTime() + DEFAULT_roundDuration
            }

            assertOneOfType(endedAt, [ isPositiveNumber, isISOString ]);

            const newRound = await prismaClient.round.create({
                data: {
                    ...req.body,
                    cooldownSec: req.body.cooldownSec ?? DEFAULT_cooldownSec,
                    startedAt: startedAtDate,
                    endedAt: new Date(endedAt),
                    flags: 0,
                    author: { connect: user },
                },
            });

            const roundModel = RoundModel.makeById(newRound.id, newRound);

            mainProcessChangeDataCapture.emit('round-created', {
                ...roundModel.toDTO(),
                now,
            });

            if (idempotentId) {
                requestsIdempotentMap.set(idempotentId, newRound);
            }

            return {
                success: true,
                now,
                item: newRound,
            } as const;
        }
    );

    app[getRound.method]<getRound.Types>(
        getRound.url,
        { preHandler: authenticate },
        async (req, reply) => {
            const userId = req.user.userId;
            const roundId = Number(req.params.id);

            assertIsPositiveNumber(roundId);

            const round = await prismaClient.round.findUnique({
                where: {
                    id: roundId,
                },
                include: {
                    taps: {
                        where: {
                            userId,
                        },
                        select: {
                            userId: true,
                            count: true,
                            hiddenCount: true,
                        },
                    },
                },
            });

            if (!round) {
                reply.status(404).send({
                    success: false,
                    error: `No round found with id=${roundId}`,
                });

                return;
            }

            return {
                success: true,
                now: Date.now(),
                item: round,
            };
        }
    );

    app[makeRoundTap.method]<makeRoundTap.Types>(
        makeRoundTap.url,
        { preHandler: authenticate },
        async function(req, reply) {
            const userId = req.user.userId;

            assertIsPositiveNumber(userId);

            let userInfo = usersInfoMap.get(userId);

            if (!userInfo) {
                const user = await authService.validateUser(userId);

                if (!user) {
                    throw new Error('User not found');
                }

                userInfo = {
                    id: userId,
                    isHideTaps: user.role === 'USER_HIDE_TAPS',
                };
            }

            const idempotentId = String(req.headers["X-Idempotent-Id"] || '');
            const alreadyHandledResult = idempotentId && requestsIdempotentMap.get(idempotentId) || void 0;

            if (alreadyHandledResult) {
                return alreadyHandledResult as makeRoundTap.Types["Reply"];
            }

            let now = Date.now();
            const { timestamp, count } = req.body;

            assertIsPositiveNumber(timestamp);
            assertIsNumberInRange(count, 1, 100);

            const timeDiff = now - timestamp;

            if (timeDiff > TIMES.MINUTES || timeDiff < 0) {
                // Слишком большая разница во времени
                reply.status(500).send({
                    success: false,
                    error: timeDiff < 0 ? `local timestamp is invalid` : `local timestamp too big`,
                });

                return;
            }

            const roundId = Number(req.params.id);

            assertIsPositiveNumber(roundId);

            let roundModel = RoundModel.getById(roundId);

            if (!roundModel) {
                const round = await prismaClient.round.findUnique({
                    where: {
                        id: roundId,
                    },
                    include: {
                        taps: {
                            where: {
                                userId,
                            },
                            select: {
                                userId: true,
                                count: true,
                                hiddenCount: true,
                            },
                        },
                    },
                });

                if (!round) {
                    reply.status(404).send({
                        success: false,
                        error: `No round found with id=${roundId}`,
                    });

                    return;
                }

                roundModel = RoundModel.makeById(round.id, round);
                now = Date.now();
            }

            const roundReadeState = roundModel.getReadyState(now);

            // проверяется, что раунд активен(текущее время в диапазоне от даты старта до даты завершения раунда)
            if (roundModel.completed || roundReadeState !== RoundModelReadyState.started) {
                // todo: Написать рутину, которая будет следить за открытыми раундами и закрывать их когда подходит время
                if (!roundModel.completed && roundReadeState === RoundModelReadyState.readyToComplete) {
                    roundModel.completed = true;
                    roundModel.usersInfo?.clear();

                    roundsService.makeRoundEnd(roundModel).catch(error => {
                        mainProcessChangeDataCapture.emit('error', error);
                    });
                }

                reply.status(404).send({
                    success: false,
                    error: (
                        roundReadeState === RoundModelReadyState.readyToComplete
                        || roundReadeState === RoundModelReadyState.completed
                    )
                        ? `Round (id=${roundId}) already completed`
                        : `Round (id=${roundId}) not started yet`
                    ,
                });

                return;
            }

            const currentTapIsNotHidden = !userInfo.isHideTaps;
            const roundInfoForThisUser = roundModel.usersInfo
                .getOrInsertComputed(userId, roundModel.usersInfo.make)
            ;
            const wasRoundTapsByThisUser = roundModel.wasRoundTaps
                && roundInfoForThisUser.wasTaps
            ;

            if (!wasRoundTapsByThisUser) {
                roundModel.wasRoundTaps = true;
                roundInfoForThisUser.wasTaps = true;
            }

            // noinspection CommaExpressionJS
            /**
             * увеличивается счетчик тапов и очков игрока в данном раунде.
             *
             * Чисто теоретически, update должен быть "легче" и быстрее чем upsert.
             */
            const upsert_or_update = wasRoundTapsByThisUser
                ? prismaClient.roundTaps.update({
                    where: {
                        userId_roundId: {
                            userId,
                            roundId,
                        },
                    },
                    data: currentTapIsNotHidden ? {
                        count: {
                            increment: count,
                        },
                    } : {
                        hiddenCount: {
                            increment: count,
                        },
                    },
                })
                // Запоминаем, что делали upsert этого раунда. А значит, что следующие действия могут быть только update.
                : ((roundModel.wasRoundTaps = true), prismaClient.roundTaps.upsert({
                    where: {
                        userId_roundId: {
                            userId,
                            roundId,
                        },
                    },
                    create: currentTapIsNotHidden ? {
                        count,
                        userId,
                        roundId,
                    } : {
                        hiddenCount: count,
                        userId,
                        roundId,
                    },
                    update: currentTapIsNotHidden ? {
                        count: {
                            increment: count,
                        },
                    } : {
                        hiddenCount: {
                            increment: count,
                        },
                    },
                }))
            ;

            const transactionResult = await prismaClient.$transaction([
                upsert_or_update,
                // Увеличивается общий счет очков в раунде.
                // Счет считается из count, поэтому просто инкрементируем его.
                prismaClient.round.update({
                    where: {
                        id: roundId,
                    },
                    data: {
                        tapsCount: {
                            increment: count,
                        },
                    },
                }),
                // Сохраняем историю тапов.
                // 1. Историю можно использовать для расследований подозрительной активности пользователей.
                // 2. Для оптимизации производительности, историю можно отключить.
                // 3. Для сохранения места на диске, можно настроить удаление старых записей истории.
                prismaClient.roundTapsHistory.create({
                    data: {
                        isHidden: !currentTapIsNotHidden,
                        count,
                        userId,
                        roundId,
                    },
                    select: {
                        id: true,
                    },
                }),
            ]);

            const updatedUserRoundTaps = transactionResult[0];
            const updatedRound = transactionResult[1];
            const userCount = updatedUserRoundTaps.count;
            const userHiddenCount = updatedUserRoundTaps.hiddenCount;
            const userScore = scoreFromTapsCount(userCount);
            const roundCount = updatedRound.tapsCount;
            const roundHiddenTapsCount = updatedRound.hiddenTapsCount;
            const roundScore = scoreFromTapsCount(roundCount);

            const result: makeRoundTap.Types["Reply"] = {
                success: true,
                roundId,
                userId,
                count,
                userCount,
                userHiddenCount,
                userScore,
                roundCount,
                roundHiddenTapsCount,
                roundScore,
            };

            if (idempotentId) {
                // todo: Т.к. запросов на Tap будет ОЧЕНЬ много, не эфективно сохранять информацию по всем этим запросам
                //  в памяти. Нужно придумать другое решение.
                requestsIdempotentMap.set(idempotentId, result);
            }

            {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { userId, userCount, userHiddenCount, userScore, ...otherResult } = result;

                mainProcessChangeDataCapture.emit('round-taps', otherResult);
            }

            return result;
        }
    );

// Роут для обновления
//     app.put<{ Params: { id: string }, Body: { completed: boolean } }>('/rounds/:id', { preHandler: authenticate }, async (req) => {
//         const idempotentId = String(req.headers["X-Idempotent-Id"] || '');
//         const { id } = req.params;
//         const { completed } = req.body;
//
//         const alreadyHandledResult = idempotentId && requestsIdempotentMap.get(idempotentId) || void 0;
//
//         if (alreadyHandledResult) {
//             return alreadyHandledResult as ReturnType<typeof prismaClient.task.update>;
//         }
//
//         const result = await prismaClient.task.update({
//             where: { id: Number(id) },
//             data: { completed },
//         });
//
//         if (idempotentId) {
//             requestsIdempotentMap.set(idempotentId, result);
//         }
//
//         return result;
//     });
//
//     app.delete<{ Params: { id: string } }>('/rounds/:id', { preHandler: authenticate }, async (req) => {
//         const { id } = req.params;
//
//         return prismaClient.task.delete({
//             where: { id: Number(id) },
//         });
//     });
}

type SSEEvent = {
    event: 'round-created' | 'round-taps' | 'round-ended',
    data: `json::${string}`,
    roundId?: number,
};

export function startSSERoundRouters(app = fastifyApp) {
    app.get<roundsSSEUpdate.Types>(
        roundsSSEUpdate.url.split('?')[0],
        { preHandler: authenticate },
        async (request, reply) => {
            const { forceDelays } = request.query;
            const useDelaysAndBatching = !isTest || Boolean(forceDelays);
            const ac = new AbortController();
            const { signal } = ac;
            const sendWaitingQueue: SSEEvent[] = [];
            const sendWaitingQueueIndexes = new Map<string, number>();
            const abortCallback = () => {
                const reason = mainProcessAbortController.signal.aborted && mainProcessAbortController.signal.reason || null

                mainProcessAbortController.signal.removeEventListener('abort', abortCallback);

                if (autoCloseTimeout) {
                    clearTimeout(autoCloseTimeout);
                    autoCloseTimeout = void 0;
                }

                reply.sse({
                    event: 'system',
                    data: `json::${JSON.stringify({ type: 'reconnection' })}`,
                });

                // Сгенерируется `AbortError('The operation was aborted', { cause: 'Need reconnection' });`
                ac.abort(reason ?? 'Need reconnection');

                reply.sseContext.source.end();
            };
            // Каждые N минут рвём соединение (клиент сам установит новое)
            let autoCloseTimeout: ReturnType<typeof setTimeout> | undefined = setTimeout(abortCallback, TIMES.MINUTES_5);
            const pingAndSendFromWaitingQueue = () => {
                if (sendWaitingQueue.length) {
                    for (const event of sendWaitingQueue) {
                        reply.sse(event);
                    }

                    sendWaitingQueue.length = 0;
                    sendWaitingQueueIndexes.clear();
                }
                else {
                    reply.sse({
                        event: 'ping',
                        data: `json::${JSON.stringify({ time: Date.now() })}`,
                    });
                }
            };
            const batchLimit = 10;
            let currentBatch = 0;
            let prevSendTime = Date.now();
            const sendSSEEvent = !useDelaysAndBatching
                ? (event: SSEEvent) => {
                    reply.sse(event);
                }
                : (event: SSEEvent) => {
                    if (event.event === 'round-ended') {
                        //todo:
                        // const key = event.roundId ? `round-taps#${event.roundId}` : void 0;
                        // const existedIndex = key ? sendWaitingQueueIndexes.get(key) : void 0;
                        // if (existedIndex !== void 0) {
                        //     const roundTapsEvent = sendWaitingQueue[existedIndex];
                        //     if (roundTapsEvent) {
                        //         const {
                        //             roundCount,
                        //             roundHiddenTapsCount,
                        //         } = roundTapsEvent.data;
                        //         event.data.roundCount = roundCount;
                        //         event.data.roundHiddenTapsCount = roundHiddenTapsCount;
                        //     }
                        // }

                        reply.sse(event);

                        return;
                    }

                    const now = Date.now();
                    const timePassed = now - prevSendTime;

                    prevSendTime = now;

                    if (timePassed < TIMES.MILLISECONDS * 100 && currentBatch++ < batchLimit) {
                        reply.sse(event);
                    }
                    else if (timePassed > TIMES.SECONDS * 2) {
                        reply.sse(event);
                    }
                    else {
                        const key = event.roundId ? `${event.event}#${event.roundId}` : void 0;
                        const existedIndex = key ? sendWaitingQueueIndexes.get(key) : void 0;

                        if (existedIndex !== void 0) {
                            sendWaitingQueue[existedIndex] = event;
                        }
                        else {
                            const index = sendWaitingQueue.push(event) - 1;

                            if (key) {
                                sendWaitingQueueIndexes.set(key, index);
                            }
                        }
                    }
                }
            ;

            // Если клиент разорвал соединение
            request.socket.on("close", () => {
                mainProcessAbortController.signal.removeEventListener('abort', abortCallback);

                if (autoCloseTimeout) {
                    clearTimeout(autoCloseTimeout);
                    autoCloseTimeout = void 0;
                }

                // Сгенерируется `AbortError('The operation was aborted', { cause: 'Closing connection' });`
                ac.abort('Closing connection');
            });

            mainProcessAbortController.signal.addEventListener('abort', abortCallback);
            pingAndSendFromWaitingQueue();

            makeIntervalTicker(TIMES.SECONDS_5, pingAndSendFromWaitingQueue, {
                signal,
            });

            reply.sse({
                event: 'system',
                data: `json::${JSON.stringify({ type: 'options', useDelaysAndBatching })}`,
            });

            if (useDelaysAndBatching) {
                // Добавляем задержку, чтобы не отправлять данные сразу
                await promiseTimeout(TIMES.SECONDS);
            }

            // Подписываемся на канал "создание новых Round"
            (async function() {
                // note: К сожалению, тут затипизировать args событий я не смог и `event: unknown`.
                for await (const event of EventEmitterX.on(mainProcessChangeDataCapture, 'round-created', {
                    signal,
                })) {
                    const minimalRoundInfo = event[0] as RoundDTO;

                    sendSSEEvent({
                        event: 'round-created',
                        data: `json::${JSON.stringify(minimalRoundInfo)}`,
                        roundId: minimalRoundInfo.id,
                    });
                }
            })().catch(error => {
                if (isAbortError(error)) {
                    return;
                }

                throw error;
            }).then(result => {
                // debug me
                void result;
            });

            // Подписываемся на канал "завершение Round"
            (async function() {
                // note: К сожалению, тут затипизировать args событий я не смог и `event: unknown`.
                for await (const event of EventEmitterX.on(mainProcessChangeDataCapture, 'round-ended', {
                    signal,
                })) {
                    const roundInfo = event[0] as RoundDTO;

                    sendSSEEvent({
                        event: 'round-ended',
                        data: `json::${JSON.stringify(roundInfo)}`,
                        roundId: roundInfo.id,
                    });
                }
            })().catch(error => {
                if (isAbortError(error)) {
                    return;
                }

                throw error;
            }).then(result => {
                // debug me
                void result;
            });

            // Подписываемся на канал "тапанье Round"
            (async function() {
                // note: К сожалению, тут затипизировать args событий я не смог и `event: unknown`.
                for await (const event of EventEmitterX.on(mainProcessChangeDataCapture, 'round-taps', {
                    signal,
                })) {
                    const roundInfo = event[0] as (RoundDTO & { roundId?: number });

                    sendSSEEvent({
                        event: 'round-taps',
                        data: `json::${JSON.stringify(roundInfo)}`,
                        roundId: roundInfo.id || roundInfo.roundId,
                    });
                }
            })().catch(error => {
                if (isAbortError(error)) {
                    return;
                }

                throw error;
            }).then(result => {
                // debug me
                void result;
            });

            // reply.sse(
            //     (async function* source() {
            //         for (let i = 0; i < 10; i++) {
            //             await promiseTimeout(2000);
            //             yield {
            //                 id: String(i),
            //                 name: 'testMessage',
            //                 data: `json::${JSON.stringify({ text: 'some data' })}`,
            //             };
            //         }
            //     })()
            // );
        }
    );
}
