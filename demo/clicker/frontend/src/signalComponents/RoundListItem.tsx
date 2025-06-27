'use strict';

import type { RoundModel } from "../../../logic/RoundModel";

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
    } = roundModel;
    const {
        isBackward,
        timestamp,
        timerTitle,
    } = timerInfo;

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
            >
                Счет: {score} Ваш счет: {userScore}
            </div>
        </div>
    );
}
