'use strict';

import type React from "react";

import mainProcessChangeDataCapture from "../../../logic/mainProcessChangeDataCapture";
import { activeRoundsStore } from "../../../logic/activeRoundsStore";
import { currentUserStore } from "../../../logic/currentUserStore";
import { formAsObject } from "../../../utils/html";

export const handleNewRoundFormSubmit = Object.assign(function(event: React.FormEvent) {
    event.preventDefault();
    handleNewRoundFormSubmit.trigger();

    activeRoundsStore.createNewRound(
        formAsObject<Parameters<typeof activeRoundsStore.createNewRound>[0]>(
            event.currentTarget as HTMLFormElement
        )
    )
        .catch(error => {
            // todo: Выводить в панели нотификации
            mainProcessChangeDataCapture.emit('error', error, 'handleNewRoundFormSubmit:activeRoundsStore.createNewRound:');
        })
    ;
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
    const method = isRegistration ? register : login;
    const params = formAsObject<Parameters<typeof method>[0]>(targetForm);

    method(params as Parameters<typeof register>[0]).catch(error => {
        // todo: Выводить в систему нотификации
        mainProcessChangeDataCapture.emit('error', error, (isRegistration
            ? 'handleAuthFormSubmit:currentUserStore.register:'
            : 'handleAuthFormSubmit:currentUserStore.login:'
        ));
    });
};
