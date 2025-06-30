'use strict';

import type React from "react";

import mainProcessChangeDataCapture from "../../../logic/mainProcessChangeDataCapture";
import { activeRoundsStore } from "../../../logic/activeRoundsStore";
import { currentUserStore } from "../../../logic/currentUserStore";
import { dateFromHTMLInputDateTimeLocalInput } from "../../../utils/html";

export const handleNewRoundFormSubmit = Object.assign(function(event: React.FormEvent) {
    event.preventDefault();
    handleNewRoundFormSubmit.trigger();

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
        mainProcessChangeDataCapture.emit('error', error, 'handleNewRoundFormSubmit:activeRoundsStore.createNewRound:');
    });
}, {
    _s: [] as (() => void)[],
    trigger() {
        this._s.forEach(callback => callback());
    },
    subscribe(callback: () => void) {
        this._s.push(callback);

        return this.ubSubscribe.bind(this, callback);
    },
    ubSubscribe(callback: () => void) {
        const index = this._s.indexOf(callback);

        if (index !== -1) {
            this._s.splice(index, 1);
        }
    },
    clear() {
        this._s.length = 0;
    },
});

export const handleAuthFormSubmit = (event: React.FormEvent) => {
    const { login, register } = currentUserStore;

    event.preventDefault();

    const targetForm = event.currentTarget as HTMLFormElement;
    const isRegistration = targetForm.dataset.isRegistration === 'true';
    const email = (targetForm.elements.namedItem(login.elements.email.name) as HTMLInputElement).value;
    const password = (targetForm.elements.namedItem(login.elements.password.name) as HTMLInputElement).value;
    const name = isRegistration
        ? (targetForm.elements.namedItem(register.elements.name.name) as HTMLInputElement).value
        : ''
    ;

    (isRegistration
        ? register({
            email,
            name,
            password,
        }, { doNotThrowError: true })
        : login({
            email,
            password,
        }, { doNotThrowError: true })
    ).catch(error => {
        // todo: Выводить в систему нотификации
        mainProcessChangeDataCapture.emit('error', error, (isRegistration
            ? 'handleAuthFormSubmit:currentUserStore.register:'
            : 'handleAuthFormSubmit:currentUserStore.login:'
        ));
    });
};
