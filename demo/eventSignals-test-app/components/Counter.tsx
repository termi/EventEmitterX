'use strict';

import type { CSSProperties } from "react";

import * as React from "react";

import { mainState } from "../state/AppStates";

export default function Counter({ eventSignal, style, title = 'Counter' }: {
    eventSignal: typeof mainState.$computed1 | typeof mainState.$computed2,
    style?: CSSProperties,
    title?: string,
}) {
    console.log('render', title);

    return (<div style={style}>
        <h2>{title}</h2>
        <h3>Value is: {eventSignal}</h3>
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
