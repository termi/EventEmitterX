'use strict';

import type { activeRoundsStore } from "../../../logic/activeRoundsStore";

import './RoundsList.css';

export default function RoundsList({ eventSignal }: { eventSignal: typeof activeRoundsStore.signal$ }) {
    const activeRoundsStore = eventSignal.data;

    return (
        <div className="cards-page">
            <div className="cards-list">
                {(activeRoundsStore.activeRounds.map(round => round.signal$))}
            </div>

            <div className="selected-card-container">
                {activeRoundsStore.selectedRound$}
            </div>
        </div>
    );
}
