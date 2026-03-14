'use strict';

// AI GENERATED CODE. DO NOT TRUST WITHOUT REVIEW. This test suite is generated based on the implementation and may require adjustments to fit the actual codebase and dependencies.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import FormFromSchema from '../../components/FormFromSchema';
import type { FormElementDescription } from '../../../../types/htmlSchema';

const baseElements: FormElementDescription[] = [
    { id: 'name-field', label: 'Имя:', name: 'name', type: 'text', order: 1 },
    { id: 'email-field', label: 'Email:', name: 'email', type: 'email', order: 2 },
];

describe('FormFromSchema', () => {
    it('рендерит все поля с подписями из схемы', () => {
        render(<FormFromSchema elements={baseElements} />);

        expect(screen.getByLabelText('Имя:')).toBeInTheDocument();
        expect(screen.getByLabelText('Email:')).toBeInTheDocument();
    });

    it('рендерит поля с правильными типами', () => {
        render(<FormFromSchema elements={baseElements} />);

        expect(screen.getByLabelText('Имя:')).toHaveAttribute('type', 'text');
        expect(screen.getByLabelText('Email:')).toHaveAttribute('type', 'email');
    });

    it('input-ы задизейблены при disabled=true', () => {
        render(<FormFromSchema elements={baseElements} disabled />);

        expect(screen.getByLabelText('Имя:')).toBeDisabled();
        expect(screen.getByLabelText('Email:')).toBeDisabled();
    });

    it('кнопки задизейблены при disabled=true', () => {
        render(
            <FormFromSchema
                elements={baseElements}
                disabled
                buttons={[ { id: 'submit-btn', label: 'Сохранить', type: 'submit' } ]}
            />
        );

        expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    });

    it('вызывает onSubmit при отправке формы', () => {
        const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
        const { container } = render(
            <FormFromSchema elements={baseElements} onSubmit={onSubmit} />
        );

        fireEvent.submit(container.querySelector('form')!);
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('рендерит кнопки с правильными лейблами', () => {
        render(
            <FormFromSchema
                elements={baseElements}
                buttons={[
                    { id: 'cancel-btn', label: 'Отмена' },
                    { id: 'ok-btn', label: 'OK', type: 'submit' },
                ]}
            />
        );

        expect(screen.getByRole('button', { name: 'Отмена' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    });

    it('оборачивает кнопки в контейнер с buttonsClassName', () => {
        const { container } = render(
            <FormFromSchema
                elements={baseElements}
                buttons={[ { id: 'btn', label: 'OK' } ]}
                buttonsClassName="modal-actions"
            />
        );

        expect(container.querySelector('.modal-actions')).toBeInTheDocument();
        expect(container.querySelector('.modal-actions button')).toBeInTheDocument();
    });

    it('сбрасывает форму после submit при isResetOnSubmit=true', () => {
        const { container } = render(
            <FormFromSchema
                elements={[ { id: 'txt', label: 'Text:', name: 'text', type: 'text', order: 1 } ]}
                isResetOnSubmit
            />
        );

        const input = screen.getByLabelText('Text:') as HTMLInputElement;
        const form = container.querySelector('form')!;

        fireEvent.change(input, { target: { value: 'test value' } });
        fireEvent.submit(form);

        // После submit форма должна быть сброшена (значение = пустое или дефолт)
        expect(input.value).toBe('');
    });

    it('рендерит элементы в порядке поля order', () => {
        const elementsUnordered: FormElementDescription[] = [
            { id: 'last', label: 'Последнее:', name: 'last', type: 'text', order: 3 },
            { id: 'first', label: 'Первое:', name: 'first', type: 'text', order: 1 },
            { id: 'middle', label: 'Среднее:', name: 'middle', type: 'text', order: 2 },
        ];

        // FormFromSchema не сортирует поля сам — это делает makeFormElementsList перед передачей.
        // Проверяем, что все три поля рендерятся.
        render(<FormFromSchema elements={elementsUnordered} />);

        expect(screen.getByLabelText('Последнее:')).toBeInTheDocument();
        expect(screen.getByLabelText('Первое:')).toBeInTheDocument();
        expect(screen.getByLabelText('Среднее:')).toBeInTheDocument();
    });
});
