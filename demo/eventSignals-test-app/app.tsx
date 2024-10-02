/* eslint-disable @typescript-eslint/no-magic-numbers */
'use strict';

// https://jsonplaceholder.typicode.com/todos/3

import * as React from 'react';
import { createRoot } from 'react-dom/client';

import 'termi@polyfills';

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import { initNavigation } from "./lib/history_navigation";
import { mainState } from "./state/AppStates";

import PageOne from "./pages/PageOne";
import PageTwo from "./pages/PageTwo";
import PageThree from "./pages/PageThree";
import PageFour from "./pages/PageFour";
import Page404 from "./pages/Page404";
import UserCard from "./components/UserCard";
import SignalAsString1 from "./components/SignalAsString1";
import SignalAsString2 from "./components/SignalAsString2";
import JsonPlaceholderUser from "./components/JsonPlaceholderUser";
import AsyncSpinner from "./components/AsyncSpinner";
import AsyncSpinner2 from "./components/AsyncSpinner2";
import ErrorView from "./components/ErrorView";

globalThis.__React = React;

// Инициализируем EventSignal для работы с React.
EventSignal.initReact({ useSyncExternalStore: React.useSyncExternalStore, createElement: React.createElement, memo: React.memo });

// Регистрируем компонент UserCard для отображения EventSignal с componentType == mainState.userFullNameComponentType.
// Внимание: тут React.memo только для тестирования и демонстрации. ОН НЕ НУЖЕН в вашем коде.
EventSignal.registerReactComponentForComponentType(mainState.userFullNameComponentType, React.memo(UserCard));
// Регистрируем компонент SignalAsString1 для отображения EventSignal с componentType == mainState.stringCounterComponentType.
EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, SignalAsString1, { textColor: 'green' });

{// Только для демонстрации и чтобы можно было в DevTools/console менять вывод для mainState.stringCounterComponentType
    globalThis.__setCounterComponent0 = function() {
        // Убираем React-компонент для отображения EventSignal с componentType == mainState.stringCounterComponentType.
        // Будет выводиться как строка.
        EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, void 0);
    };
    globalThis.__setCounterComponent1 = function() {
        // Регистрируем компонент SignalAsString1 для отображения EventSignal с componentType == mainState.stringCounterComponentType.
        EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, SignalAsString1, { textColor: 'blue' });
    };
    globalThis.__setCounterComponent2 = function() {
        // Регистрируем компонент SignalAsString2 для отображения EventSignal с componentType == mainState.stringCounterComponentType.
        EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, SignalAsString2, { textColor: 'yellow' });
    };
}

{// Демонстрация работы асинхронных сигналов
    EventSignal.registerReactComponentForComponentType(mainState.jsonPlaceholderUserComponentType, JsonPlaceholderUser);
    EventSignal.registerReactComponentForComponentType(mainState.jsonPlaceholderUserComponentType, AsyncSpinner, 'pending');
    EventSignal.registerReactComponentForComponentType(mainState.jsonPlaceholderUserComponentType, ErrorView, 'error');
}

mainState.$counter1.addListener(newValue => {
    (newValue > 9)
        ? EventSignal.registerReactComponentForComponentType(mainState.jsonPlaceholderUserComponentType, AsyncSpinner2, 'pending')
        : EventSignal.registerReactComponentForComponentType(mainState.jsonPlaceholderUserComponentType, AsyncSpinner, 'pending')
    ;
});

mainState.$counter2.addListener(newValue => {
    if (newValue < 0) {
        EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, void 0);
    }
    else if (newValue > 10) {
        if (newValue % 5 === 0) {
            const textColor = randomColor();
            const backgroundColor = randomColor();

            EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, SignalAsString2, { textColor, backgroundColor });
            EventSignal.registerReactComponentForComponentType(mainState.jsonPlaceholderUserComponentType, JsonPlaceholderUser, 'default', { textColor, backgroundColor });
        }
        else {
            EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, SignalAsString2);
            EventSignal.registerReactComponentForComponentType(mainState.jsonPlaceholderUserComponentType, JsonPlaceholderUser);
        }
    }
    else if (newValue > 5) {
        EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, SignalAsString2, { textColor: 'red' });
    }
    else if (newValue >= 0) {
        EventSignal.registerReactComponentForComponentType(mainState.stringCounterComponentType, SignalAsString1, { textColor: 'green' });
    }
});

initNavigation({
    root: createRoot(document.querySelector('#main')),
    routes: [
        { path: '/one',   action() { return <><PageOne /></>; } },
        { path: '/two',   action() { return <><PageTwo /></>; } },
        { path: '/three', action() { return <><PageThree /></>; } },
        { path: '/four',  action() { return <><PageFour /></>; } },
        { path: '(.*)',   action() { return <><Page404 /></>; } },
    ],
    page404: Page404,
});

const randomColor = () => `#${Math.floor(Math.random() * 16_777_215).toString(16)}`;
