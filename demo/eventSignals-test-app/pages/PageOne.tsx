'use strict';

import * as React from "react";

import Counter1 from "../components/Counter1";
import Counter2 from "../components/Counter2";
import NavBar from "../components/NavBar";

export default function PageOne() {
    console.log('render PageOne');

    return (<>
        <h1>Page One</h1>
        <NavBar/>
        <Counter1/>
        <Counter2/>
    </>);
}
