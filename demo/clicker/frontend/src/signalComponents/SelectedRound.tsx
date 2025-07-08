'use strict';

import { useEffect } from "react";

import { type RoundModel, RoundModelReadyState } from "../../../logic/RoundModel";
import type { activeRoundsStore } from "../../../logic/activeRoundsStore";

import { currentUserStore } from "../../../logic/currentUserStore";
import { calculatePercent } from "../../../utils/number";

import { onSelectedCardClicked } from "../eventHandlers/clicks";

import Meter from "../components/Meter";
import Ticker from "../components/Ticker";

import './SelectedRound.css';

export default function SelectedRound({ eventSignal }: { eventSignal: typeof activeRoundsStore.selectedRound$ }) {
    const roundModel = eventSignal.data.selectedRound;

    useEffect(() => {
        roundModel?.link();

        return () => {
            roundModel?.unlink();
        };
    }, [ roundModel ]);

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
        <div key={id} data-round-id={id} className="selected-card" data-owner-signal-key={eventSignal.key} data-signal-key={signal$.key}>
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
    const roundDuration = roundModel.endedAt.getTime() - roundModel.startedAt.getTime();
    const {
        isBackward,
        isProgressBackward,
        timestamp,
        timerTitle,
    } = roundModel.timerInfo;
    const $ticker = timestamp ? (
        <Ticker
            className="selected-card-timer__ticker"
            timestamp={timestamp}
            isBackward={isBackward}
        >{(props) => {
            const timeDiff = props.timestamp - props.currentTimestamp;
            const percentValue = calculatePercent(roundDuration, timeDiff);
            const displayValue = percentValue.toFixed(3);
            const value = isProgressBackward ? percentValue : -1 * percentValue;
            const min = isProgressBackward ? 0 : -100;
            const max = isProgressBackward ? 100 : 0;
            const low = isProgressBackward ? 10 : -35;
            const optimum = isProgressBackward ? 60 : -60;
            const high = isProgressBackward ? 35 : -10;

            return (
                <Meter min={min} max={max} low={low} optimum={optimum} high={high} value={value} displayValue={displayValue}
                       className={'selected-card-timer__ticker-progress' + (isProgressBackward ? ' selected-card-timer__ticker-progress--backward' : '')}
                />
            );
        }}</Ticker>
    ) : '';

    return (
        <div className="selected-card-timer">
            <span>{timerTitle}</span>
            {$ticker}
        </div>
    );
}

function SelectedRoundScoreInfo({ eventSignal }: { eventSignal: RoundModel["signal$"] }) {
    const roundModel = eventSignal.data;
    const {
        score,
        userScore,
        winnerUserInfo,
    } = roundModel;
    const {
        id: winnerUserId,
        name: winnerUserName,
    } = winnerUserInfo || {};
    const isCurrentUserIsWinner = winnerUserId === currentUserStore.userId;

    return (<>
        <div className={'selected-card-score-info' + (isCurrentUserIsWinner ? ' selected-card-score-info--you-are-the-winner' : '')}>
            <span className="selected-card-score-info__total">
                Счет всего: {score}
            </span>
            <span className="selected-card-score-info__user">
                Ваш счет: {userScore}
            </span>
        </div>
        {winnerUserInfo ? <div className="selected-card-winner-info" data-winner-userid={winnerUserId}>
            Победитель: {winnerUserName} {winnerUserId === currentUserStore.userId ? '(Вы)' : ''}
        </div> : ''}
    </>);
}

function SelectedRoundClicker({ eventSignal }: { eventSignal: RoundModel["signal$"] }) {
    const roundModel = eventSignal.data;
    const {
        id,
        readyState,
    } = roundModel;

    if (readyState !== RoundModelReadyState.started) {
        return '';
    }

    return (
        <div className="selected-card-clicker" data-round-id={id}
             onClick={onSelectedCardClicked}
        >
            <span>Кликайте сюда</span>
            <pre className="selected-card-clicker__zone">
                ┌───────────────────────────────────────┐<br/>
                │            ░░░░░░░░░░░░░░░            │<br/>
                │          ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░           │<br/>
                │        ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░         │<br/>
                │        ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░         │<br/>
                │      ░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░       │<br/>
                │    ░░▒▒▒▒░░░░▓▓▓▓▓▓▓▓▓▓▓▓░░░░▒▒▒▒░░   │<br/>
                │    ░░▒▒▒▒▒▒▒▒░░░░░░░░░░░░▒▒▒▒▒▒▒▒░░   │<br/>
                │    ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░   │<br/>
                │      ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░     │<br/>
                │        ░░░░░░░░░░░░░░░░░░░░░░░░░░     │<br/>
                └───────────────────────────────────────┘<br/>
            </pre>
        </div>
    );
}
