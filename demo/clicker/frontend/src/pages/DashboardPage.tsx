'use strict';

import { useEffect, useState } from "react";

import { activeRoundsStore } from "../../../logic/activeRoundsStore";
import { currentUserStore } from "../../../logic/currentUserStore";
import { handleNewRoundFormSubmit } from "../eventHandlers/forms";
import FormFromSchema from "../components/FormFromSchema";

import './DashboardPage.css';

export default function DashboardPage() {
    const [ isModalOpen, setIsModalOpen ] = useState(false);
    const elementsList = activeRoundsStore.createNewRound.elementsList;

    useEffect(() => {
        return handleNewRoundFormSubmit.subscribe(() => {
            setIsModalOpen(false);
        });
    }, []);

    return (
        <div className="page-content">
            <h1 className="page-title">
                <span>Раунды</span>
                {currentUserStore.isAdmin ? (<button
                    className="add-card-button"
                    onClick={() => setIsModalOpen(true)}
                >
                    <span title="Создать новый раунд">+</span>
                </button>) : ''}
            </h1>
            <p className="page-description"></p>
            {activeRoundsStore.signal$}
            {/* Модальное окно */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Создать новый раунд</h3>

                        <FormFromSchema
                            onSubmit={handleNewRoundFormSubmit}
                            elements={elementsList}
                            buttons={[
                                {
                                    label: 'Отмена',
                                    onClick: (event) => {
                                        event.preventDefault();
                                        setIsModalOpen(false);
                                    },
                                },
                                {
                                    label: 'Создать',
                                    type: 'submit',
                                    className: 'primary',
                                },
                            ]}
                            buttonsClassName={"modal-actions"}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
