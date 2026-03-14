'use strict';

// AI GENERATED CODE. DO NOT TRUST WITHOUT REVIEW. This test suite is generated based on the implementation and may require adjustments to fit the actual codebase and dependencies.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Мокируем хук useAuth — явная фабрика, чтобы не загружать реальный модуль и его тяжёлые зависимости
vi.mock('../../hooks/useAuth', () => ({
    useAuth: vi.fn(),
}));

// Мокируем eventHandlers чтобы избежать загрузки зависимостей stores
vi.mock('../../eventHandlers/forms', () => ({
    handleAuthFormSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
}));

import { useAuth } from '../../hooks/useAuth';
import AuthForm from '../../components/AuthForm';

const mockUseAuth = vi.mocked(useAuth);

/** Минимальный mock возвращаемого значения useAuth */
const createAuthMock = (overrides: Partial<ReturnType<typeof useAuth>> = {}) => ({
    isAuthenticated: false,
    isPending: false,
    lastError: undefined as string | Error | undefined,
    userId: 0,
    userName: '',
    isAdmin: false,
    isHiddenTaps: false,
    login: Object.assign(vi.fn(), { elementsList: [
        { id: 'email', label: 'Email:', name: 'email', type: 'email', order: 1 },
        { id: 'password', label: 'Пароль:', name: 'password', type: 'password', order: 2 },
    ] }),
    register: Object.assign(vi.fn(), { elementsList: [
        { id: 'email', label: 'Email:', name: 'email', type: 'email', order: 1 },
        { id: 'name', label: 'Имя:', name: 'name', type: 'text', order: 2 },
        { id: 'password', label: 'Пароль:', name: 'password', type: 'password', order: 3 },
    ] }),
    logout: vi.fn(),
    signal$: { subscribe: vi.fn(() => vi.fn()), get: vi.fn(() => 0) },
    ...overrides,
} as unknown as ReturnType<typeof useAuth>);

const renderAuthForm = (overrides: Partial<ReturnType<typeof useAuth>> = {}) => {
    mockUseAuth.mockReturnValue(createAuthMock(overrides));

    return render(
        <MemoryRouter>
            <AuthForm />
        </MemoryRouter>
    );
};

describe('AuthForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('по умолчанию показывает форму входа с заголовком Login', () => {
        renderAuthForm();

        expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('показывает поля email и пароль в режиме Login', () => {
        renderAuthForm();

        expect(screen.getByLabelText('Email:')).toBeInTheDocument();
        expect(screen.getByLabelText('Пароль:')).toBeInTheDocument();
    });

    it('переключается на форму регистрации по клику на кнопку', () => {
        renderAuthForm();

        fireEvent.click(screen.getByText('Регистрация'));

        expect(screen.getByText('Register')).toBeInTheDocument();
    });

    it('форма регистрации показывает поле Имя', () => {
        renderAuthForm();

        fireEvent.click(screen.getByText('Регистрация'));

        expect(screen.getByLabelText('Имя:')).toBeInTheDocument();
    });

    it('переключается обратно на Login из режима регистрации', () => {
        renderAuthForm();

        fireEvent.click(screen.getByText('Регистрация'));
        expect(screen.getByText('Register')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Войти'));
        expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('показывает сообщение об ошибке при наличии lastError', () => {
        renderAuthForm({ lastError: 'Неверный пароль' });

        expect(screen.getByText('Неверный пароль')).toBeInTheDocument();
    });

    it('показывает объект Error как строку через stringifyError', () => {
        renderAuthForm({ lastError: new Error('Нет соединения') });

        expect(screen.getByText('Нет соединения')).toBeInTheDocument();
    });

    it('дизейблит поля и кнопку при isPending=true', () => {
        renderAuthForm({ isPending: true });

        const inputs = screen.getAllByRole('textbox');

        inputs.forEach((input) => {
            expect(input).toBeDisabled();
        });
        expect(screen.getByRole('button', { name: /в процессе/i })).toBeDisabled();
    });

    it('редиректит на / когда isAuthenticated=true', () => {
        mockUseAuth.mockReturnValue(createAuthMock({ isAuthenticated: true }));

        render(
            <MemoryRouter initialEntries={[ '/auth' ]}>
                <AuthForm />
            </MemoryRouter>
        );

        // Navigate заменяет форму — нет заголовка Login/Register
        expect(screen.queryByText('Login')).not.toBeInTheDocument();
        expect(screen.queryByText('Register')).not.toBeInTheDocument();
    });
});
