/* eslint-disable @typescript-eslint/no-magic-numbers,unicorn/prefer-code-point */
'use strict';

import * as React from "react";
import { useState, useActionState } from "react";

import { mainState } from "../state/AppStates";
import { randomNumber } from "../lib/utils";
import { getFormValuesAsObject } from "../lib/dom";
import { i18n$$ } from "../state/i18n";
import css from './examples.module.css';

const {
    userFirstName$,
    userSecondName$,
    userFullNameObject$,
} = mainState;

// todo: Добавить 3й параметр `{ ignoreUpdateReason: 'onChanges' }`
userFirstName$.setReactFC(SignalInputComponent, userFirstName$.data.inputProps);
userSecondName$.setReactFC(SignalInputComponent, { name: userSecondName$.data.inputProps.name });

const mappedSignal$ = userFullNameObject$.map(value => value.fullName.replace(/(\W)/g, function(_, char) {
    return `${char}${String.fromCharCode(776 + randomNumber(1, 30))}`;
}));

const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    // event.preventDefault();

    const $form = event.currentTarget;
    const formObject = getFormValuesAsObject($form);

    console.log('form submit', formObject);
};

export default function PageTwo() {
    const { 0: counter, 1: setCounter } = useState(0);
    const [ value, dispatchAction, isPending ] = useActionState(reducerAction, 1);

    console.log('render PageTwo', value, isPending, mappedSignal$, userSecondName$);

    return (<div className={css.lesson}>
        <header className={css.intro}>
            <span className={css.eyebrow}>EventSignal · Form binding</span>
            <h2>{i18n$$`Форма и живое представление||en-US||:A form with a live preview`}</h2>
            <p>{i18n$$`Измените имя и фамилию: связанный компонент и вычисляемое значение обновятся вместе с полями.||en-US||:Edit the first and last name: the bound component and computed value update with the fields.`}</p>
        </header>
        <div className={css.columns}>
            <section className={css.panel}>
                <h3>{i18n$$`Исходные значения||en-US||:Source values`}</h3>
                <p className={css.note}>{i18n$$`Отправка формы демонстрирует асинхронное действие с задержкой.||en-US||:Submitting the form demonstrates a delayed asynchronous action.`}</p>
                <form action={dispatchAction} data-is-pending={isPending} data-value={value} onSubmit={onSubmit}>
                    <fieldset className={css.form}>
                        <legend className={css.note}>{i18n$$`Данные формы||en-US||:Form data`}</legend>
                        {userFirstName$}
                        {userSecondName$}
                        <label>{i18n$$`Дата и время||en-US||:Date and time`}<input name="birth-name" type="datetime-local" /></label>
                        <label>{i18n$$`Один файл||en-US||:One file`}<input name="file" type="file" /></label>
                        <label>{i18n$$`Несколько файлов||en-US||:Multiple files`}<input name="file-multiple" type="file" multiple /></label>
                        <button className={css.primary} disabled={isPending}>{isPending ? i18n$$`Отправка…||en-US||:Submitting…` : i18n$$`Отправить форму||en-US||:Submit form`}</button>
                    </fieldset>
                </form>
            </section>
            <section className={`${css.panel} ${css.result}`}>
                <h3>{i18n$$`Реактивный результат||en-US||:Reactive output`}</h3>
                <p className={css.note}>{i18n$$`Компонент зарегистрирован по типу сигнала; ниже — преобразованное значение.||en-US||:The component is registered by signal type; the transformed value is shown below.`}</p>
                <div className="-w-user-card">{userFullNameObject$}</div>
                <button type="button" className={css.mapped} data-counter={counter} onClick={() => setCounter(a => a + 1)}>
                    <small>Mapped EventSignal · userFullNameObject$</small>
                    {mappedSignal$}
                </button>
            </section>
        </div>
    </div>);
}

function SignalInputComponent({
    current$,
    name,
    ...props
}: {
    current$: typeof userFirstName$ | typeof userSecondName$,
    current$Value: unknown,
    current$Version: number,
    current$SnapshotVersion: string,
    name?: string,
    // deprecated
    eventSignal?: unknown,
    // deprecated
    snapshotVersion?: unknown,
    // deprecated
    version?: unknown,
}) {
    // Убираем из props те свойства, которые не нужно передавать в input
    const { current$Value, current$Version, current$SnapshotVersion, eventSignal, snapshotVersion, version, ...otherProps } = props;

    return (<label key={current$.key} className={current$.data.cssClasses}>
        <span>{current$.data.title}</span>
        <input defaultValue={current$.get()} onChange={current$.data.onChanges} name={name} style={{ width: '100%' }} {...otherProps} />
    </label>);
}

async function reducerAction(previousState: number, formData: FormData) {
    const formObject = Object.fromEntries(formData.entries());

    console.log(formData, formObject);

    await new Promise(resolve => {
        setTimeout(resolve, 2000);
    });

    return previousState + 1;
}
