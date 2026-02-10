/* eslint-disable @typescript-eslint/no-magic-numbers */
'use strict';

// https://jsonplaceholder.typicode.com/todos/3

import * as React from 'react';
import { Suspense } from "react";
import { createPortal } from "react-dom";
import * as ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import 'termi@polyfills';

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import './lib/polyfills/emojis';
import { initNavigation } from "./lib/history_navigation";
import { randomColor } from "./lib/utils";
import { mainState } from "./state/AppStates";
import { pipPopupWindow$ } from "./state/pipWindowState";
import { i18nString$$, i18n_componentType } from "./state/i18n";
import { currentNavigatorPage$ } from './state/routing';

import SignalAsString1 from "./$components/SignalAsString1";
import SignalAsString2 from "./$components/SignalAsString2";
import AsyncSpinner from "./$components/AsyncSpinner";
import AsyncSpinner2 from "./$components/AsyncSpinner2";
import ErrorView, { ErrorViewSimple } from "./$components/ErrorView";
import AnimatedText from "./$components/AnimatedText";
import UserCard from "./modules/UserCard";
import JsonPlaceholderUser from "./modules/JsonPlaceholderUser";
import DefaultLayout from "./layouts/DefaultLayout";

if (import.meta.env?.DEV) {
    // eslint-disable-next-line promise/prefer-await-to-then
    import('./lib/dev/css-hot-reload-client').then(module => {
        module.setupCSSHotReload();
        // eslint-disable-next-line promise/prefer-await-to-then,promise/prefer-await-to-callbacks
    }).catch(error => {
        console.warn('Failed to load CSS hot reload:', error);
    });

    Object.assign(globalThis as unknown as {
        __React: typeof React,
        __ReactDOM: typeof ReactDOM,
    }, {
        __React: React,
        __ReactDOM: ReactDOM,
    });
}

if (import.meta.hot) {
    import.meta.hot.on('vite:beforeUpdate', () => {
        console.log('Компоненты обновляются...');
    });
}

// Инициализируем EventSignal для работы с React.
EventSignal.initReact(React, ErrorBoundary);

EventSignal.registerReactComponentForComponentType(i18n_componentType, AnimatedText, 'pending');
EventSignal.registerReactComponentForComponentType(i18n_componentType, () => '⚠️ i18n error', 'error-boundary');

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

mainState.counter1$.addListener(newValue => {
    (newValue > 9)
        ? EventSignal.registerReactComponentForComponentType(mainState.jsonPlaceholderUserComponentType, AsyncSpinner2, 'pending')
        : EventSignal.registerReactComponentForComponentType(mainState.jsonPlaceholderUserComponentType, AsyncSpinner, 'pending')
    ;
});

mainState.counter2$.addListener(newValue => {
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

const pipPopupContainer = createRoot(document.querySelector('#pipPopupContainer'), {
    onRecoverableError(error) {
        console.error('onRecoverableError: #pipPopupContainer', error);
    },
});

pipPopupContainer.render(<pipPopupWindow$.component sFC={function({ current$Value }: { current$Value: typeof pipPopupWindow$.value }) {
    const { component: Component, componentProps, window } = current$Value;

    if (!Component || !window?.document?.body) {
        return null;
    }

    return createPortal(<Component {...componentProps} />, window.document.body);
}} />);

initNavigation({
    navigationSignal$: currentNavigatorPage$,
    root: createRoot(document.querySelector('#main'), {
        onRecoverableError(error) {
            console.error('onRecoverableError: #main:', error);
        },
    }),
    Render: (router) => {
        const {
            metadata,
            Component,
            Layout = DefaultLayout,
        } = router;
        const pageTitle$ = metadata?.menuItemTitle$/* || router.pageTitle$*/;
        const pageTitle = metadata?.menuItemTitle || router.pageTitle;

        // noinspection RequiredAttributes
        return <Layout pageTitle={pageTitle} pageTitle$={pageTitle$}>
            <Suspense fallback={i18nString$$('...Загрузка')}>
                <ErrorBoundary FallbackComponent={ErrorViewSimple} resetKeys={[ router.key ]}>
                    <Component />
                </ErrorBoundary>
            </Suspense>
        </Layout>;
    },
});
