'use strict';

// AI GENERATED CODE. DO NOT TRUST WITHOUT REVIEW. This test suite is generated based on the implementation and may require adjustments to fit the actual codebase and dependencies.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../hooks/useAuth', () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from '../../hooks/useAuth';
import AppLayout from '../../layouts/AppLayout';

const mockUseAuth = vi.mocked(useAuth);

const createAuthMock = (overrides: Partial<ReturnType<typeof useAuth>> = {}) => ({
    isAuthenticated: true,
    isPending: false,
    lastError: undefined,
    userId: 1,
    userName: 'Test User',
    isAdmin: false,
    logout: vi.fn(),
    signal$: { subscribe: vi.fn(() => vi.fn()), get: vi.fn(() => 0) },
    ...overrides,
} as unknown as ReturnType<typeof useAuth>);

describe('AppLayout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('рендерит навигационные ссылки когда пользователь авторизован', () => {
        mockUseAuth.mockReturnValue(createAuthMock());

        render(
            <MemoryRouter>
                <AppLayout />
            </MemoryRouter>
        );

        expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    });

    it('ссылки имеют правильные href', () => {
        mockUseAuth.mockReturnValue(createAuthMock());

        render(
            <MemoryRouter>
                <AppLayout />
            </MemoryRouter>
        );

        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
        expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    });

    it('кнопка выхода вызывает logout', () => {
        const logoutMock = vi.fn();

        mockUseAuth.mockReturnValue(createAuthMock({ logout: logoutMock }));

        render(
            <MemoryRouter>
                <AppLayout />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: /logout/i }));
        expect(logoutMock).toHaveBeenCalledTimes(1);
    });

    it('переключает тему кнопкой dark mode', () => {
        mockUseAuth.mockReturnValue(createAuthMock());

        render(
            <MemoryRouter>
                <AppLayout />
            </MemoryRouter>
        );

        // Кнопка переключения темы всегда присутствует
        const toggleButton = screen.getByRole('button', { name: /switch to (dark|light) mode/i });
        const initialLabel = toggleButton.getAttribute('aria-label')!;

        fireEvent.click(toggleButton);

        // После клика aria-label должен поменяться на противоположный
        const expectedLabel = initialLabel === 'Switch to dark mode'
            ? 'Switch to light mode'
            : 'Switch to dark mode';

        expect(screen.getByRole('button', { name: expectedLabel })).toBeInTheDocument();
    });

    it('не рендерит навигацию когда пользователь не авторизован', () => {
        mockUseAuth.mockReturnValue(createAuthMock({ isAuthenticated: false }));

        render(
            <MemoryRouter>
                <AppLayout />
            </MemoryRouter>
        );

        expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    });
});
