'use strict';

import * as React from "react";

import Counter from "../components/Counter";
import NavBar from "../components/NavBar";

import { mainState } from "../state/AppStates";

export default function PageOne() {
    console.log('render PageOne');

    return (<>
        <h1>Page One</h1>
        <NavBar/>
        <div style={{ display: 'flex' }}>
            <mainState.$computed1.component sFC={Counter} title="Counter1"/>
            <Counter eventSignal={mainState.$computed2} title="Counter2"/>
            {mainState.$computed2}
        </div>
        <br />
        {mainState.$jsonPlaceholderUser1}
        <br />
        <button onClick={() => {
            return mainState.$jsonPlaceholderUser1.set((_, currentUserId) => {
                return ++currentUserId;
            });
        }}>get next user</button>
    </>);
}
