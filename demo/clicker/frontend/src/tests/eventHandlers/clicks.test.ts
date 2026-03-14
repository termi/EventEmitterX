'use strict';

// AI GENERATED CODE. DO NOT TRUST WITHOUT REVIEW. This test suite is generated based on the implementation and may require adjustments to fit the actual codebase and dependencies.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../logic/activeRoundsStore', () => ({
    activeRoundsStore: {
        selectRoundById: vi.fn(),
        makeRoundTapSync: vi.fn(),
    },
}));

vi.mock('../../../../logic/RoundModel', () => ({
    // const enum инлайнится esbuild'ом по-разному, предоставляем значения явно
    RoundModelReadyState: {
        completed: 1,
        started: 2,
        awaiting: 3,
        readyToComplete: 5,
    },
    RoundModel: {
        getById: vi.fn(),
    },
}));

import { activeRoundsStore } from '../../../../logic/activeRoundsStore';
import { RoundModel, RoundModelReadyState } from '../../../../logic/RoundModel';
import {
    onRoundCardSelectClick,
    onSelectedCardClicked,
} from '../../eventHandlers/clicks';

const mockActiveRoundsStore = vi.mocked(activeRoundsStore);
const mockRoundModel = vi.mocked(RoundModel as unknown as { getById: ReturnType<typeof vi.fn> });

/** Создаёт фейковый MouseEvent с data-round-id */
function makeClickEvent(roundId: string | undefined, isTrusted = false) {
    const div = document.createElement('div');

    if (roundId !== undefined) {
        div.dataset.roundId = roundId;
    }

    return {
        currentTarget: div,
        isTrusted,
        target: div,
    } as unknown as React.MouseEvent<HTMLElement>;
}

describe('onRoundCardSelectClick', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('вызывает selectRoundById с правильным id', () => {
        onRoundCardSelectClick(makeClickEvent('42'));

        expect(mockActiveRoundsStore.selectRoundById).toHaveBeenCalledWith(42);
    });

    it('игнорирует элементы без data-round-id', () => {
        onRoundCardSelectClick(makeClickEvent(undefined));

        expect(mockActiveRoundsStore.selectRoundById).not.toHaveBeenCalled();
    });

    it('игнорирует невалидный (нечисловой) id', () => {
        onRoundCardSelectClick(makeClickEvent('not-a-number'));

        expect(mockActiveRoundsStore.selectRoundById).not.toHaveBeenCalled();
    });

    it('игнорирует id = 0 (falsy)', () => {
        onRoundCardSelectClick(makeClickEvent('0'));

        expect(mockActiveRoundsStore.selectRoundById).not.toHaveBeenCalled();
    });
});

describe('onSelectedCardClicked', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('игнорирует ненативные (untrusted) клики — защита от авто-кликов', () => {
        const event = makeClickEvent('1', false);

        onSelectedCardClicked(event);

        expect(mockRoundModel.getById).not.toHaveBeenCalled();
        expect(mockActiveRoundsStore.makeRoundTapSync).not.toHaveBeenCalled();
    });

    it('делает тап по активному раунду при isTrusted=true', () => {
        const roundId = 5;
        const mockModel = {
            readyState: RoundModelReadyState.started,
        };

        mockRoundModel.getById.mockReturnValue(mockModel);

        const event = makeClickEvent(String(roundId), true);

        onSelectedCardClicked(event);

        expect(mockRoundModel.getById).toHaveBeenCalledWith(roundId);
        expect(mockActiveRoundsStore.makeRoundTapSync).toHaveBeenCalledWith(roundId);
    });

    it('не делает тап по завершённому раунду', () => {
        const mockModel = { readyState: RoundModelReadyState.completed };

        mockRoundModel.getById.mockReturnValue(mockModel);

        const event = makeClickEvent('7', true);

        onSelectedCardClicked(event);

        expect(mockActiveRoundsStore.makeRoundTapSync).not.toHaveBeenCalled();
    });

    it('не делает тап по ещё не начавшемуся раунду', () => {
        const mockModel = { readyState: RoundModelReadyState.awaiting };

        mockRoundModel.getById.mockReturnValue(mockModel);

        const event = makeClickEvent('9', true);

        onSelectedCardClicked(event);

        expect(mockActiveRoundsStore.makeRoundTapSync).not.toHaveBeenCalled();
    });

    it('не делает тап если раунд не найден в store', () => {
        mockRoundModel.getById.mockReturnValue(undefined);

        const event = makeClickEvent('99', true);

        onSelectedCardClicked(event);

        expect(mockActiveRoundsStore.makeRoundTapSync).not.toHaveBeenCalled();
    });

    it('не делает тап при невалидном id', () => {
        const event = makeClickEvent('not-a-number', true);

        onSelectedCardClicked(event);

        expect(mockRoundModel.getById).not.toHaveBeenCalled();
    });
});
