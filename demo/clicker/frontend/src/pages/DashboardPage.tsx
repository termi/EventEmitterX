'use strict';

import React, { useState } from "react";

import { activeRoundsStore } from "../../../logic/activeRoundsStore";
import { currentUserStore } from "../../../logic/currentUserStore";
import { dateFromHTMLInputDateTimeLocalInput } from "../../../utils/html";

import './DashboardPage.css';

export default function DashboardPage() {
    const [ isModalOpen, setIsModalOpen ] = useState(false);
    const elementsList = isModalOpen ? activeRoundsStore.createNewRound.elementsList : [];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const targetForm = e.currentTarget as HTMLFormElement;
        const title = (targetForm.elements.namedItem(activeRoundsStore.createNewRound.elements.title.name) as HTMLInputElement).value;
        const startedAt = dateFromHTMLInputDateTimeLocalInput(
            targetForm.elements.namedItem(activeRoundsStore.createNewRound.elements.startedAt.name
            ) as HTMLInputElement);

        activeRoundsStore.createNewRound({
            title,
            startedAt,
        }).catch(error => {
            // todo: Выводить в панели нотификации
            console.error(error);
        });

        setIsModalOpen(false);
    };

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

                        <form onSubmit={handleSubmit}>
                            {(elementsList.map(elementDescription => {
                                const {
                                    id,
                                    label,
                                } = elementDescription;

                                return (<div key={id} className="form-group">
                                    <label htmlFor={id} className="form-label">{label}</label>
                                    <input {...elementDescription}/>
                                </div>)
                            }))}

                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsModalOpen(false)}>
                                    Отмена
                                </button>
                                <button type="submit" className="primary">
                                    Создать
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
