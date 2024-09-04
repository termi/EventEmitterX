'use strict';

// https://jsonplaceholder.typicode.com/todos/3

import * as React from 'react';
import { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';

import 'termi@polyfills';

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import { initNavigation } from "./lib/history_navigation";
import { mainState } from "./state/AppStates";

import PageOne from "./pages/PageOne";
import PageTwo from "./pages/PageTwo";
import Page404 from "./pages/Page404";
import UserCard from "./components/UserCard";
import SignalAsString1 from "./components/SignalAsString1";
import SignalAsString2 from "./components/SignalAsString2";

globalThis.__React = React;

EventSignal.initReact({ useSyncExternalStore, createElement: React.createElement, memo: React.memo });
EventSignal.registerReactComponentForComponentType(mainState.userFullNameComponentType, React.memo(UserCard));

globalThis.__setCounterComponent0 = function() {
    EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, void 0);
};
globalThis.__setCounterComponent1 = function() {
    EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, SignalAsString1);
};
globalThis.__setCounterComponent2 = function() {
    EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, SignalAsString2);
};

globalThis.__setCounterComponent1();

initNavigation({
    root: createRoot(document.querySelector('#main')),
    routes: [
        { path: '/one', action() { return <><PageOne /></>; } },
        { path: '/two', action() { return <><PageTwo /></>; } },
        { path: '(.*)', action() { return <><Page404 /></>; } },
    ],
    page404: Page404,
});
