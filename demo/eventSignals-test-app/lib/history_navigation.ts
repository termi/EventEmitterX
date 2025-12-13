'use strict';

import type { createRoot } from 'react-dom/client';

type Root = ReturnType<typeof createRoot>;
type Route = { path: string, action(): JSX.Element };

let isInited = false;

export function initNavigation({
    root,
    routes,
    page404,
}: {
    root: Root,
    routes: Route[],
    page404?: () => JSX.Element,
}) {
    if (isInited) {
        throw new Error('Already inited');
    }

    isInited = true;

    const page404route = routes.find(routItem => {
        return routItem.path === '(.*)';
    }) ?? { path: '(.*)', action: page404 ?? (() => '404') };

    const onNewPage = (pageUrl = location.pathname) => {
        const pagePair = pageUrl.split('?');
        const pagePath = pagePair[0];

        const routItem = routes.find(routItem => {
            return routItem.path === pagePath;
        }) ?? page404route;

        root.render(routItem.action());
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
