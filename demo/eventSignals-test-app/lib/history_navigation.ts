'use strict';

import type { createRoot } from 'react-dom/client';

import type { NavigationRouter, currentNavigatorPage$ } from "../state/routing";

type Root = ReturnType<typeof createRoot>;

let isInited = false;

export function initNavigation({
    navigationSignal$,
    root,
    page404,
    Render,
}: {
    navigationSignal$: typeof currentNavigatorPage$,
    root: Root,
    page404?: () => JSX.Element,
    Render: (router: NavigationRouter) => JSX.Element,
}) {
    if (isInited) {
        throw new Error('Already inited');
    }

    isInited = true;

    navigationSignal$.addListener(newValue => {
        document.title = newValue.pageTitle;

        onNewPage(newValue.routerPath);
    });

    const routes = navigationSignal$.data.routersList;
    const page404route = routes.find(routItem => {
        return routItem.routerPath === '(.*)';
    }) ?? ({
        key: '404',
        position: -1,
        routerPath: '(.*)',
        pageTitle: '404',
        importPath: '',
        srcPath: '',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error `TS2322: Type (() => Element) | (() => string) is not assignable to type FC<{}>`
        Component: page404 ?? (() => '404'),
    } satisfies NavigationRouter) as NavigationRouter;

    const onNewPage = (pageUrl = location.pathname) => {
        const pagePair = pageUrl.split('?');
        const pagePath = pagePair[0];

        const newRout = routes.find(routItem => {
            return routItem.routerPath === pagePath;
        }) ?? page404route;
        const currentRout = navigationSignal$.get();

        if (currentRout !== newRout) {
            navigationSignal$.set(newRout);
        }

        root.render(Render(newRout));
    };

    const _history_pushState = history.pushState;
    const _history_replaceState = history.replaceState;

    history.pushState = function(...args) {
        const result = _history_pushState.apply(history, args);

        onNewPage();

        return result;
    };

    history.replaceState = function(...args) {
        const result = _history_replaceState.apply(history, args);

        onNewPage();

        return result;
    };

    window.addEventListener('popstate', () => {
        onNewPage();
    });

    onNewPage();
}
