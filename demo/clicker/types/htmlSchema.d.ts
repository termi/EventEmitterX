//

export type FormElementDescription = {
    order: number,
    id: string,
    label: string,
    name: string,
    type: string,
    defaultValue?: string,
    min?: string | number,
    max?: string | number,
    pattern?: string,
    placeholder?: string,
    autoComplete?: string,
    title?: string,
    required?: boolean,
    minLength?: number,
}
