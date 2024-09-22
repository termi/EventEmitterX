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
        <br />
        {/* На данный момент внопка снизу не работает как надо из-за фундаментальной стратегии применённой к EventSignal: computation не знает, кто инициализоровал изменения: set() или одна из зависимостей. */}
        {/*<button onClick={() => mainState.$jsonPlaceholderUser1.set(currentUserId => ++currentUserId)}>get next user</button>*/}
    </>);
}
