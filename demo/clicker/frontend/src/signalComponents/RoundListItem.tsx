'use strict';

import type { RoundModel } from "../../../logic/RoundModel";

import { currentUserStore } from "../../../logic/currentUserStore";

import { onRoundCardSelectClick } from "../eventHandlers/clicks";
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
    const {
        isBackward,
        timestamp,
        timerTitle,
    } = timerInfo;
    const isCurrentUserIsWinner = winnerUserInfo?.id === currentUserStore.userId;

    return (
        <div data-round-id={id}
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
            <div className="card-time">
                {timestamp ? <Ticker
                    timestamp={timestamp}
                    isBackward={isBackward}
                /> : ''}
            </div>
            <div data-taps-count={tapsCount} data-user-taps-count={userTapsCount}
                 data-hidden-taps-count={hiddenTapsCount} data-user-hidden-taps-count={userHiddenTapsCount}
                 className={'card-score-info' + (isCurrentUserIsWinner ? ' card-score-info--you-are-the-winner' : '')}
            >
                <span className="card-score-info__total">Счет: {score}</span>
                <span className="card-score-info__user">Ваш счет: {userScore}</span>
            </div>
        </div>
    );
}
