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
    page404: () => JSX.Element,
}) {
    if (isInited) {
        throw new Error('Already inited');
    }

    isInited = true;

    const onNewPage = (pageUrl = location.pathname) => {
        const routItem = routes.find(routItem => {
            return pageUrl.startsWith(routItem.path);
        }) ?? { path: '(.*)', action: page404 };

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
