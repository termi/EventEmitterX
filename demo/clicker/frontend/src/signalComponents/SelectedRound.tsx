'use strict';

import type { RoundModel } from "../../../logic/RoundModel";
import type { activeRoundsStore } from "../../../logic/activeRoundsStore";

import { onSelectedCardClicked } from "../eventHandlers/clicks";

import Ticker from "../components/Ticker";

import './SelectedRound.css';

export default function SelectedRound({ eventSignal }: { eventSignal: typeof activeRoundsStore.selectedRound$ }) {
    const roundModel = eventSignal.data.selectedRound;

    if (!roundModel) {
        return (
            <div className="no-card-selected">
                <p>Выберите карточку из списка</p>
            </div>
        );
    }

    const {
        id,
        title,
        description,
        signal$,
    } = roundModel;

    return (
        <div key={id} className="selected-card" data-round-id={id}>
            <div className="selected-card-content">
                <h2 className="selected-card-title">{title}</h2>
                {description && (
                    <p className="selected-card-description">{description}</p>
                )}
                <signal$.component sFC={SelectedRoundTimerInfo}/>
                <signal$.component sFC={SelectedRoundScoreInfo}/>
                <div className="selected-card-time">
                    Дата начала: {roundModel.startedAt.toLocaleString()}
                </div>
                <div className="selected-card-time">
                    Дата окончания: {roundModel.endedAt.toLocaleString()}
                </div>
                <signal$.component sFC={SelectedRoundClicker}/>
            </div>
        </div>
    );
}

function SelectedRoundTimerInfo({ eventSignal }: { eventSignal: RoundModel["signal$"] }) {
    const roundModel = eventSignal.data;
    const {
        isBackward,
        timestamp,
        timerTitle,
    } = roundModel.timerInfo;

    return (
        <div className="selected-card-timer">
            <span>{timerTitle}</span>
            {timestamp ? <Ticker
                className="selected-card-timer__ticker"
                timestamp={timestamp}
                isBackward={isBackward}
            /> : ''}
        </div>
    );
}

function SelectedRoundScoreInfo({ eventSignal }: { eventSignal: RoundModel["signal$"] }) {
    const roundModel = eventSignal.data;
    const {
        score,
        userScore,
    } = roundModel;

    return (
        <div className="selected-card-score-info">
            <span className="selected-card-score-info__total">
                Счет всего: {score}
            </span>
            <span className="selected-card-score-info__user">
                Ваш счет: {userScore}
            </span>
        </div>
    );
}

function SelectedRoundClicker({ eventSignal }: { eventSignal: RoundModel["signal$"] }) {
    const roundModel = eventSignal.data;
    const {
        id,
        timerStatus,
    } = roundModel;

    if (timerStatus !== 2) {
        return '';
    }

    return (
        <div className="selected-card-clicker" data-round-id={id}
             onClick={onSelectedCardClicked}>
            Кликайте сюда
        </div>
    );
}
