'use strict';

// AI GENERATED CODE. DO NOT TRUST WITHOUT REVIEW. This test suite is generated based on the implementation and may require adjustments to fit the actual codebase and dependencies.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import Meter from '../../components/Meter';

describe('Meter', () => {
    it('отображает элемент <meter> с правильным value', () => {
        const { container } = render(<Meter value={50} />);
        const meter = container.querySelector('meter');

        expect(meter).toBeInTheDocument();
        expect(meter).toHaveAttribute('value', '50');
    });

    it('применяет атрибуты min и max', () => {
        const { container } = render(<Meter value={75} min={0} max={100} />);
        const meter = container.querySelector('meter');

        expect(meter).toHaveAttribute('min', '0');
        expect(meter).toHaveAttribute('max', '100');
    });

    it('применяет атрибуты low, high, optimum', () => {
        const { container } = render(<Meter value={60} low={25} high={75} optimum={50} />);
        const meter = container.querySelector('meter');

        expect(meter).toHaveAttribute('low', '25');
        expect(meter).toHaveAttribute('high', '75');
        expect(meter).toHaveAttribute('optimum', '50');
    });

    it('применяет пользовательский className', () => {
        const { container } = render(<Meter value={30} className="progress-bar" />);
        const meter = container.querySelector('meter');

        expect(meter).toHaveClass('progress-bar');
    });

    it('отображает текстовый контент через displayValue по умолчанию', () => {
        render(<Meter value={42} />);

        expect(screen.getByText('42%')).toBeInTheDocument();
    });

    it('отображает пользовательский displayValue', () => {
        render(<Meter value={42} displayValue="42.00" />);

        expect(screen.getByText('42.00%')).toBeInTheDocument();
    });

    it('отображает 0 без ошибок', () => {
        const { container } = render(<Meter value={0} />);

        expect(container.querySelector('meter')).toHaveAttribute('value', '0');
    });
});
