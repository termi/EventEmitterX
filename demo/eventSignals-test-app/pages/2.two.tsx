/* eslint-disable @typescript-eslint/no-magic-numbers,unicorn/prefer-code-point */
'use strict';

import * as React from "react";
import { useState } from "react";

import { mainState } from "../state/AppStates";
import { randomNumber } from "../lib/utils";

const {
    userFirstName$,
    userSecondName$,
    userFullNameObject$,
} = mainState;

userFirstName$.setReactFC(SignalInputComponent);
userSecondName$.setReactFC(SignalInputComponent);

const $mappedSignal = userFullNameObject$.map(value => value.fullName.replace(/(\W)/g, function(_, char) {
    return `${char}${String.fromCharCode(776 + randomNumber(1, 30))}`;
}));

export default function PageTwo() {
    console.log('render PageTwo', $mappedSignal);

    const { 0: counter, 1: setCounter } = useState(0);

    return (<>
        <div className="-w-user-card">{userFullNameObject$}</div>
        <form style={{ marginTop: '10px' }}>
            <fieldset style={{
                display: 'grid',
                gridTemplateColumns: 'max-content',
                gridGap: '5px',
            }}>
                {userFirstName$}
                {userSecondName$}
            </fieldset>
        </form>
        <div data-counter={counter} onClick={() => setCounter(a => a + 1)}>
            This is mapped EventSignal &quot;userFullNameObject$&quot;:&nbsp;
            {$mappedSignal}
        </div>
    </>);
}

function SignalInputComponent({ current$ }: { current$: typeof userFirstName$ | typeof userSecondName$ }) {
    return (<label key={current$.key} className={current$.data.cssClasses} style={current$.data.style}>
        <span>{current$.data.title}</span>
        <input value={current$.get()} onChange={current$.data.onChanges} style={{ width: '100%' }}/>
    </label>);
}
