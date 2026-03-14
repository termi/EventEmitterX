/* eslint-disable @typescript-eslint/no-magic-numbers,unicorn/prefer-code-point */
'use strict';

import * as React from "react";
import { useState, useActionState } from "react";

import { mainState } from "../state/AppStates";
import { randomNumber } from "../lib/utils";
import { getFormValuesAsObject } from "../lib/dom";

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

    return (<>
        <div className="-w-user-card">{userFullNameObject$}</div>
        <form style={{ marginTop: '10px' }} action={dispatchAction} data-is-pending={isPending} data-value={value} onSubmit={onSubmit}>
            <fieldset style={{
                display: 'grid',
                gridTemplateColumns: 'max-content',
                gridGap: '5px',
            }}>
                {userFirstName$}
                {userSecondName$}
                <input name="birth-name" type="datetime-local" />
                <input name="file" type="file" />
                <input name="file-multiple" type="file" multiple />
                <button>submit</button>
            </fieldset>
        </form>
        <div data-counter={counter} onClick={() => setCounter(a => a + 1)}>
            This is mapped EventSignal &quot;userFullNameObject$&quot;:&nbsp;
            {mappedSignal$}
        </div>
    </>);
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

    return (<label key={current$.key} className={current$.data.cssClasses} style={current$.data.style}>
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
