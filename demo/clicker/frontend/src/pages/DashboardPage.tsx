'use strict';

import { useEffect, useRef, useState } from "react";

import { activeRoundsStore } from "../../../logic/activeRoundsStore";
import { currentUserStore } from "../../../logic/currentUserStore";
import { handleNewRoundFormSubmit } from "../eventHandlers/forms";
import FormFromSchema from "../components/FormFromSchema";

import './DashboardPage.css';

export default function DashboardPage() {
    /** Чтобы в форме внутри dialog input's получили новые значения (defaultValue, min, max и т.д.), нужно перерендерить dialog */
    const reRenderState = useState(0);
    const $dialogRef = useRef<HTMLDialogElement>(null);
    const { elementsList } = activeRoundsStore.createNewRound;
    const canCreateNewRound = currentUserStore.isAdmin;

    useEffect(() => {
        return handleNewRoundFormSubmit.subscribe(() => {
            $dialogRef.current?.close();
        });
    }, []);

    const $newRoundButton = canCreateNewRound ? (
        <button
            className="add-card-button"
            onClick={() => {
                reRenderState[1](a => ++a);
                $dialogRef.current?.showModal();
            }}
        >
            <span title="Создать новый раунд">+</span>
        </button>
    ) : '';
    const $modalWindow = canCreateNewRound ? (
        <dialog ref={$dialogRef} className="modal-content" closedby="any">
            <h3>Создать новый раунд</h3>

            <FormFromSchema
                onSubmit={handleNewRoundFormSubmit} isResetOnSubmit={true}
                elements={elementsList}
                buttons={[
                    {
                        label: 'Отмена',
                        onClick: (event) => {
                            event.preventDefault();
                            $dialogRef.current?.close();
                        },
                    },
                    {
                        label: 'Создать',
                        type: 'submit',
                        className: 'primary',
                    },
                ]}
                buttonsClassName="modal-actions"
            />
        </dialog>
    ) : '';

    return (
        <div className="page-content">
            <h1 className="page-title">
                <span>Раунды</span>
                {$newRoundButton}
            </h1>
            <p className="page-description"></p>
            {activeRoundsStore.signal$}
            {$modalWindow}
        </div>
    );
}
