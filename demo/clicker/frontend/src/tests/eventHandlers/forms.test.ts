'use strict';

// AI GENERATED CODE. DO NOT TRUST WITHOUT REVIEW. This test suite is generated based on the implementation and may require adjustments to fit the actual codebase and dependencies.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock поднимается в начало файла автоматически (hoisting)
vi.mock('../../../../logic/mainProcessChangeDataCapture', () => ({
    "default": { emit: vi.fn(), on: vi.fn() },
}));

vi.mock('../../../../logic/activeRoundsStore', () => ({
    activeRoundsStore: {
        createNewRound: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../../../logic/currentUserStore', () => ({
    currentUserStore: {
        login: vi.fn().mockResolvedValue(undefined),
        register: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../../../utils/html', () => ({
    formAsObject: vi.fn(() => ({ email: 'test@example.com', password: 'secret' })),
}));

import { handleNewRoundFormSubmit, handleAuthFormSubmit } from '../../eventHandlers/forms';
import { currentUserStore } from '../../../../logic/currentUserStore';

// ─── handleNewRoundFormSubmit ────────────────────────────────────────────────

describe('handleNewRoundFormSubmit — механизм подписки', () => {
    beforeEach(() => {
        // Сбрасываем все подписки перед каждым тестом
        handleNewRoundFormSubmit.clear();
    });

    it('subscribe добавляет callback', () => {
        const cb = vi.fn();

        handleNewRoundFormSubmit.subscribe(cb);
        handleNewRoundFormSubmit.trigger();

        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('trigger вызывает все зарегистрированные callbacks', () => {
        const cb1 = vi.fn();
        const cb2 = vi.fn();
        const cb3 = vi.fn();

        handleNewRoundFormSubmit.subscribe(cb1);
        handleNewRoundFormSubmit.subscribe(cb2);
        handleNewRoundFormSubmit.subscribe(cb3);

        handleNewRoundFormSubmit.trigger();

        expect(cb1).toHaveBeenCalledTimes(1);
        expect(cb2).toHaveBeenCalledTimes(1);
        expect(cb3).toHaveBeenCalledTimes(1);
    });

    it('subscribe возвращает функцию отписки', () => {
        const cb = vi.fn();
        const unsubscribe = handleNewRoundFormSubmit.subscribe(cb);

        unsubscribe();
        handleNewRoundFormSubmit.trigger();

        expect(cb).not.toHaveBeenCalled();
    });

    it('ubSubscribe удаляет конкретный callback', () => {
        const cb1 = vi.fn();
        const cb2 = vi.fn();

        handleNewRoundFormSubmit.subscribe(cb1);
        handleNewRoundFormSubmit.subscribe(cb2);
        handleNewRoundFormSubmit.ubSubscribe(cb1);

        handleNewRoundFormSubmit.trigger();

        expect(cb1).not.toHaveBeenCalled();
        expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('clear удаляет все callbacks', () => {
        const cb1 = vi.fn();
        const cb2 = vi.fn();

        handleNewRoundFormSubmit.subscribe(cb1);
        handleNewRoundFormSubmit.subscribe(cb2);
        handleNewRoundFormSubmit.clear();

        handleNewRoundFormSubmit.trigger();

        expect(cb1).not.toHaveBeenCalled();
        expect(cb2).not.toHaveBeenCalled();
    });

    it('trigger без подписчиков не выбрасывает ошибку', () => {
        expect(() => handleNewRoundFormSubmit.trigger()).not.toThrow();
    });
});

// ─── handleAuthFormSubmit ────────────────────────────────────────────────────

describe('handleAuthFormSubmit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    function makeFormEvent(isRegistration: boolean) {
        const form = document.createElement('form');

        form.dataset.isRegistration = String(isRegistration);

        return {
            preventDefault: vi.fn(),
            currentTarget: form,
        } as unknown as React.FormEvent;
    }

    it('вызывает event.preventDefault()', () => {
        const event = makeFormEvent(false);

        handleAuthFormSubmit(event);

        expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('вызывает login когда isRegistration=false', () => {
        const event = makeFormEvent(false);

        handleAuthFormSubmit(event);

        expect(vi.mocked(currentUserStore).login).toHaveBeenCalledTimes(1);
        expect(vi.mocked(currentUserStore).register).not.toHaveBeenCalled();
    });

    it('вызывает register когда isRegistration=true', () => {
        const event = makeFormEvent(true);

        handleAuthFormSubmit(event);

        expect(vi.mocked(currentUserStore).register).toHaveBeenCalledTimes(1);
        expect(vi.mocked(currentUserStore).login).not.toHaveBeenCalled();
    });
});
