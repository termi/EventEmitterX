'use strict';

// AI GENERATED CODE. DO NOT TRUST WITHOUT REVIEW. This test suite is generated based on the implementation and may require adjustments to fit the actual codebase and dependencies.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Мокируем currentUserStore до загрузки хука
vi.mock('../../../../logic/currentUserStore', () => {
    const mockSignal = {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        subscribe: vi.fn((_cb: () => void) => {
            // Возвращаем функцию отписки
            return () => {};
        }),
        get: vi.fn(() => 0),
    };

    return {
        currentUserStore: {
            signal$: mockSignal,
            isAuthenticated: false,
            isPending: false,
            lastError: undefined,
            userId: 0,
            userName: '',
            isAdmin: false,
            isHiddenTaps: false,
            login: Object.assign(vi.fn(), { elementsList: [] }),
            register: Object.assign(vi.fn(), { elementsList: [] }),
            logout: vi.fn(),
        },
    };
});

import { useAuth } from '../../hooks/useAuth';
import { currentUserStore } from '../../../../logic/currentUserStore';

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('возвращает объект currentUserStore', () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current).toBe(currentUserStore);
    });

    it('возвращает isAuthenticated из store', () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current.isAuthenticated).toBe(false);
    });

    it('возвращает userId из store', () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current.userId).toBe(0);
    });

    it('вызывает signal$.get при рендере (через useSyncExternalStore)', () => {
        renderHook(() => useAuth());

        expect(currentUserStore.signal$.get).toHaveBeenCalled();
    });

    it('вызывает signal$.subscribe при монтировании (через useSyncExternalStore)', () => {
        const { unmount } = renderHook(() => useAuth());

        expect(currentUserStore.signal$.subscribe).toHaveBeenCalled();

        unmount();
    });
});
