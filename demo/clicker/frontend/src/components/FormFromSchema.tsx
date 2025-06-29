'use strict';

import { useLayoutEffect, useRef } from "react";

import type { FormButtonDescription, FormElementDescription } from "../../../types/htmlSchema";

export default function FormFromSchema(props: {
    onSubmit?: React.FormEventHandler<HTMLFormElement> | undefined,
    /**
     * Если нужно, чтобы при следующем рендеринге input'ы получили новые значения defaultValue, min, max и т.д, нужно
     * вызвать `form.reset()`. Эта настройка добавить в onSubmit вызов `form.reset()`.
     */
    isResetOnSubmit?: boolean,
    disabled?: boolean,
    elements: FormElementDescription[],
    buttons?: FormButtonDescription[],
    buttonsClassName?: string,
} & React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>) {
    const $formRef = useRef<HTMLFormElement>(null);
    const {
        onSubmit,
        isResetOnSubmit,
        elements,
        buttons = [],
        disabled = false,
        buttonsClassName,
        ...otherProps
    } = props;
    let actual_onSubmit = onSubmit;

    if (isResetOnSubmit) {
        const resetOnSubmit = () => {
            $formRef.current?.reset();
        };

        if (actual_onSubmit) {
            const _onSubmit = actual_onSubmit;

            actual_onSubmit = (...args) => {
                _onSubmit(...args);
                resetOnSubmit();
            };
        }
        else {
            actual_onSubmit = resetOnSubmit;
        }
    }

    // todo: Убедится, что вызов form.reset сразу после первого рендера и монтирования ничего не ломает.
    useLayoutEffect(() => {
        // Этот хук исправляет следующую ситуацию: когда form первый раз рисуется, React переносит "value" (defaultValue) из
        //  аттрибутов input в свойство input.value. Тем самым делая это поле больше не обновляемым через изменение аттрибута.
        //  Но нам нужно, чтобы в следующий рендер, если пользователь не менял значение (или после submit, что делает isResetOnSubmit),
        //   новое значение из аттрибута отобразилось в качестве свойства input.value.
        // Этот хук должен отработать только один раз, после монтирования элемента. А при рендерах будет уже работать
        //  логика isResetOnSubmit.
        $formRef.current?.reset();
    }, []);

    return (<form ref={$formRef} onSubmit={actual_onSubmit} aria-disabled={disabled} {...otherProps}>
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
