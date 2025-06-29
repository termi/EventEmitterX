//

import type React from "react";

export type FormElementDescription = {
    order: number,
    id: string,
    label: string,
    name: string,
    type: string,
    autoFocus?: boolean,
    defaultValue?: string,
    min?: string | number,
    max?: string | number,
    pattern?: string,
    placeholder?: string,
    autoComplete?: string,
    title?: string,
    required?: boolean,
    minLength?: number,
    className?: string,
}

export type FormButtonDescription = {
    id?: string,
    label: string,
    name?: string,
    type?: 'button' | 'submit',
    className?: string,
    onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined,
} & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
