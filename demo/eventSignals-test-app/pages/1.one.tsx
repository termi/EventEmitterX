'use strict';

import * as React from "react";

import Counter from "../modules/Counter";
import NavBar from "../modules/NavBar";

import { mainState } from "../state/AppStates";

import { menuItemTitle$ } from './1.one.metadata';

export default function PageOne() {
    console.log('render PageOne');

    return (<>
        <h1>{menuItemTitle$}</h1>
        <NavBar/>
        <div style={{ display: 'flex' }}>
            <mainState.computed1$.component sFC={Counter} title="Counter1"/>
            <Counter eventSignal={mainState.computed2$} title="Counter2"/>
            {mainState.computed2$}
        </div>
        <br />
        {mainState.jsonPlaceholderUser1$}
        <br />
        <button onClick={() => {
            return mainState.jsonPlaceholderUser1$.set((_, currentUserId) => {
                return ++currentUserId;
            });
        }}>get next user</button>
    </>);
}
