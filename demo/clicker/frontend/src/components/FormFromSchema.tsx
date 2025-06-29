'use strict';

import type { FormButtonDescription, FormElementDescription } from "../../../types/htmlSchema";

export default function FormFromSchema(props: {
    onSubmit?: React.FormEventHandler<HTMLFormElement> | undefined,
    disabled?: boolean,
    elements: FormElementDescription[],
    buttons?: FormButtonDescription[],
    buttonsClassName?: string,
} & React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>) {
    const { onSubmit, elements, buttons = [], disabled = false, buttonsClassName, ...otherProps } = props;

    return (<form onSubmit={onSubmit} aria-disabled={disabled} {...otherProps}>
        {(elements.map(elementDescription => {
            const {
                id,
                label,
            } = elementDescription;

            return (<div key={id} className="form-group">
                <label htmlFor={id} className="form-label">{label}</label>
                <input disabled={disabled} {...elementDescription}/>
            </div>)
        }))}

        <div className={buttonsClassName}>
            {buttons.map(buttonDescription => {
                const {
                    name,
                    id = name,
                    label = '',
                } = buttonDescription;
                const key = `${name || ''}-${id}-${label}`;

                // @ts-expect-error todo: Очень странная ошибка от TS нужно разобраться
                return (<button
                    key={key} type={buttonDescription.type || 'button'} disabled={disabled}
                    {...buttonDescription}
                >
                    {label}
                </button>)
            })}
        </div>
    </form>);
}
