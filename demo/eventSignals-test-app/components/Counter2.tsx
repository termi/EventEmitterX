'use strict';

import * as React from "react";
import { mainState } from "../state/AppStates";

export default function Counter2() {
    console.log('render Counter2');

    return (<>
        <h1>Counter2</h1>
        <h2>Value is: {mainState.$computed2}</h2>
        <div>
            <span>Change Counter1:</span>
            <button onClick={() => mainState.incrementCounter1()}>+</button>
            |
            <button onClick={() => mainState.decrementCounter1()}>-</button>
            <br />
            <span>Change Counter2:</span>
            <button onClick={() => mainState.incrementCounter2()}>+</button>
            |
            <button onClick={() => mainState.decrementCounter2()}>-</button>
        </div>
    </>);
}
