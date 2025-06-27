'use strict';

import type { activeRoundsStore } from "../../../logic/activeRoundsStore";

import './RoundsList.css';

export default function RoundsList({ eventSignal }: { eventSignal: typeof activeRoundsStore.signal$ }) {
    const activeRoundsStore = eventSignal.data;
    const activeRoundsList = activeRoundsStore.activeRounds;
    const selectedRound$ = activeRoundsStore.selectedRound$;

    return (
        <div className="cards-page">
            <div className="cards-list">
                {(activeRoundsList.map(round => round.signal$))}
            </div>

            <div className="selected-card-container">
                {selectedRound$}
            </div>
        </div>
    );
}
