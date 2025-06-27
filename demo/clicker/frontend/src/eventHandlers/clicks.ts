'use strict';

import React from 'react';

import { activeRoundsStore } from "../../../logic/activeRoundsStore";
import { RoundModel } from "../../../logic/RoundModel";

export const onRoundCardSelectClick: React.MouseEventHandler = function(event) {
    const { currentTarget } = event;
    const roundIdAsString = (currentTarget as HTMLElement).dataset?.roundId;
    const id = Number(roundIdAsString);

    if (id) {
        activeRoundsStore.selectRoundById(id);
    }
}

export const onSelectedCardClicked: React.MouseEventHandler = function(event) {
    if (!event.isTrusted) {
        // Наивная версия защиты от программных авто-кликов
        return;
    }

    const { currentTarget } = event;
    const roundIdAsString = (currentTarget as HTMLElement).dataset?.roundId;
    const id = Number(roundIdAsString);

    if (id) {
        const roundModel = RoundModel.getById(id);

        if (roundModel) {
            const {
                timerStatus,
            } = roundModel;

            if (timerStatus !== 2) {
                // Раунд завершен или ещё не начался
                return;
            }

            activeRoundsStore.makeRoundTapSync(id);
        }
    }
}
