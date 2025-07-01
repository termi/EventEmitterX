'use strict';

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import type { RoundModel } from "../../../logic/RoundModel";

import { currentUserStore } from "../../../logic/currentUserStore";
import { calculatePercent } from "../../../utils/number";

import { onRoundCardSelectClick } from "../eventHandlers/clicks";
import Meter from "../components/Meter";
import Ticker from "../components/Ticker";

import './RoundListItem.css';

export default function RoundsListItem({ eventSignal }: { eventSignal: RoundModel["signal$"] }) {
    const roundModel = eventSignal.data;
    const {
        id,
        isActive,
        isSelected,
        title,
        description,
        timerInfo,
        tapsCount,
        userTapsCount,
        hiddenTapsCount,
        userHiddenTapsCount,
        score,
        userScore,
        winnerUserInfo,
    } = roundModel;
    const roundDuration = roundModel.endedAt.getTime() - roundModel.startedAt.getTime();
    const {
        isBackward,
        isProgressBackward,
        timestamp,
        timerTitle,
    } = timerInfo;
    const isCurrentUserIsWinner = winnerUserInfo?.id === currentUserStore.userId;
    const $progressContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        roundModel.link();

        return () => {
            roundModel.unlink();
        };
    }, [ roundModel ]);

    return (
        <div data-round-id={id} data-id-destroyed={eventSignal.isDestroyed}
             onClick={onRoundCardSelectClick}
             className={`
                card ${isSelected ? ' card--selected' : ''}
                round-model ${isActive ? ' round-model--active' : ''}
             `}
        >
            <h3 className="card-title">{title}</h3>
            {description && (
                <p className="card-description">{description}</p>
            )}
            <span>{timerTitle}</span>
            <div className="card-time">{timestamp
                ? <Ticker
                    timestamp={timestamp}
                    isBackward={isBackward}
                >{(props) => {
                    if (!$progressContainerRef.current) {
                        return '';
                    }

                    const timeDiff = props.timestamp - props.currentTimestamp;
                    const percentValue = calculatePercent(roundDuration, timeDiff);
                    const displayValue = percentValue.toFixed(3);
                    const value = isProgressBackward ? percentValue : -1 * percentValue;
                    const min = isProgressBackward ? 0 : -100;
                    const max = isProgressBackward ? 100 : 0;
                    const low = isProgressBackward ? 10 : -35;
                    const optimum = isProgressBackward ? 60 : -60;
                    const high = isProgressBackward ? 35 : -10;

                    return createPortal(<Meter min={min} max={max} low={low} optimum={optimum} high={high} value={value} displayValue={displayValue} />, $progressContainerRef.current)
                }}</Ticker>
                : ''}
            </div>
            <div data-taps-count={tapsCount} data-user-taps-count={userTapsCount}
                 data-hidden-taps-count={hiddenTapsCount} data-user-hidden-taps-count={userHiddenTapsCount}
                 className={'card-score-info' + (isCurrentUserIsWinner ? ' card-score-info--you-are-the-winner' : '')}
            >
                <span className="card-score-info__total">Счет всего: {score}</span>
                <span className="card-score-info__user">Ваш счет: {userScore}</span>
            </div>
            <div className="card__progress-container" ref={$progressContainerRef}></div>
        </div>
    );
}
