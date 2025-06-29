'use strict';

import type React from "react";

import { activeRoundsStore } from "../../../logic/activeRoundsStore";
import { dateFromHTMLInputDateTimeLocalInput } from "../../../utils/html";

export const handleNewRoundFormSubmit = Object.assign(function(event: React.FormEvent) {
    event.preventDefault();
    handleNewRoundFormSubmit.emit();

    const targetForm = event.currentTarget as HTMLFormElement;
    const title = (targetForm.elements.namedItem(activeRoundsStore.createNewRound.elements.title.name) as HTMLInputElement).value;
    const startedAt = dateFromHTMLInputDateTimeLocalInput(
        targetForm.elements.namedItem(activeRoundsStore.createNewRound.elements.startedAt.name,
        ) as HTMLInputElement);

    activeRoundsStore.createNewRound({
        title,
        startedAt,
    }).catch(error => {
        // todo: Выводить в панели нотификации
        console.error(error);
    });
}, {
    subscriptions: [] as (() => void)[],
    emit() {
        this.subscriptions.forEach(callback => callback());
    },
    subscribe(callback: () => void) {
        this.subscriptions.push(callback);

        return this.ubSubscribe.bind(this, callback);
    },
    ubSubscribe(callback: () => void) {
        const index = this.subscriptions.indexOf(callback);

        if (index !== -1) {
            this.subscriptions.splice(index, 1);
        }
    },
    clear() {
        this.subscriptions.length = 0;
    },
});
