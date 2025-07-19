'use strict';

import { kRoundModelFriendWinnerUserInfoSet, RoundModel } from "../../../logic/RoundModel";
import mainProcessChangeDataCapture from "../../../logic/mainProcessChangeDataCapture";
import { prismaClient } from "../orm/prismaClient";

const kWasGlobalOnRoundEndHook = Symbol('kWasGlobalOnRoundEndHook');

class RoundsService {
    constructor() {
        RoundModel.registerGlobalOnRoundEndHook(this.globalOnRoundEndHook);

        // todo: Загружать из базы незакрытые раунды и отслеживать их состояние
    }

    globalOnRoundEndHook = (roundModel: RoundModel) => {
        const _roundModel = roundModel as RoundModel & { [kWasGlobalOnRoundEndHook]?: boolean };

        if (_roundModel[kWasGlobalOnRoundEndHook]) {
            return;
        }

        _roundModel[kWasGlobalOnRoundEndHook] = true;

        this.makeRoundEnd(roundModel).catch((error) => {
            mainProcessChangeDataCapture.emit('error', error, 'RoundsService~makeRoundEnd:');
        });
    };

    async makeRoundEnd(roundModel: RoundModel) {
        const roundId = roundModel.id;

        roundModel.completed = true;

        await prismaClient.round.update({
            where: {
                id: roundModel.id,
            },
            data: {
                completed: true,
                endedAt: new Date(),
            },
        });

        const theWinnerUserTap = await prismaClient.roundTaps.findFirst({
            where: {
                roundId,
            },
            orderBy: {
                count: 'desc',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (theWinnerUserTap) {
            roundModel[kRoundModelFriendWinnerUserInfoSet](theWinnerUserTap.user);
        }

        mainProcessChangeDataCapture.emit('round-ended', roundModel.toDTO(true));
    }
}

export const roundsService = new RoundsService();
