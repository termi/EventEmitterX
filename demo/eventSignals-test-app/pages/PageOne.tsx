'use strict';

import * as React from "react";

import Counter1 from "../components/Counter1";
import Counter2 from "../components/Counter2";
import NavBar from "../components/NavBar";

import { mainState } from "../state/AppStates";

export default function PageOne() {
    console.log('render PageOne');

    return (<>
        <h1>Page One</h1>
        <NavBar/>
        <div style={{ display: 'flex' }}>
            <Counter1/>
            <Counter2/>
        </div>
        <br />
        {mainState.$jsonPlaceholderUser1}
    </>);
}
