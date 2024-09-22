'use strict';

import * as React from "react";

import { mainState } from "../state/AppStates";

export default function Counter1() {
    console.log('render Counter1');

    return (<div style={{ width: '200px' }}>
        <h2>Counter1</h2>
        <h3>Value is: {mainState.$computed1}</h3>

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
    </div>);
}
