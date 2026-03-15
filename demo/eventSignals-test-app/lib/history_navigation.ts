'use strict';

import type { JSX } from "react";
import type { createRoot } from 'react-dom/client';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { NavigationRouter, currentNavigatorPage$ } from "../state/routing";

type Root = ReturnType<typeof createRoot>;

let isInited = false;
const defaultUnicodeIcon = 'Ⓢ';

export const applicationRoot = (function(applicationLoadingInitialPathname) {
    let result = applicationLoadingInitialPathname;

    if (result === '/') {
        result = '';
    }

    if (result && !result.endsWith('/')) {
        result = result.split('/').slice(0, -1).join('/') + '/';
    }

    return result;
})(globalThis.location?.pathname || '');

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

            const {
                pageTitle,
                metadata,
            } = newRout;
            const {
                pageTitle: metadata_pageTitle,
                darkUnicodeIcon,
                unicodeIcon: _unicodeIcon,
                darkStaticIconSrc,
                staticIconSrc: _staticIconSrc,
            } = metadata || {};
            const $favIconLink = document.getElementById('link_favicon') as HTMLLinkElement | null; // eslint-disable-line unicorn/prefer-query-selector

            if ($favIconLink) {
                if (darkUnicodeIcon || _unicodeIcon || darkStaticIconSrc || _staticIconSrc) {
                    const isDarkMode = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
                    const unicodeIcon = (isDarkMode ? darkUnicodeIcon : null) ?? _unicodeIcon;
                    const staticIconSrc = (isDarkMode ? darkStaticIconSrc : null) ?? _staticIconSrc;

                    if (staticIconSrc) {
                        $favIconLink.href = staticIconSrc;
                    }
                    else {
                        $favIconLink.href = unicodeIconToDataUrl(unicodeIcon);
                    }
                }
                else {
                    $favIconLink.href = unicodeIconToDataUrl(defaultUnicodeIcon);
                }
            }

            document.title = metadata_pageTitle || pageTitle;
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

let canvas: HTMLCanvasElement | undefined;
let canvasContext: CanvasRenderingContext2D | undefined;
const ICON_SIZE = 64;
const CANVAS_GAP = ICON_SIZE / 4;
const dataUrlCanvasCache: Record<string, string> = Object.create(null);

function unicodeIconToDataUrl(unicodeIcon: string) {
    const dataUrl = dataUrlCanvasCache[unicodeIcon];

    if (dataUrl) {
        return dataUrl;
    }

    if (unicodeIcon.length > 6) {
        // Support only emoji up to 6 chars.
        unicodeIcon = unicodeIcon.substring(0, 6);
    }

    canvas ??= document.createElement("canvas");

    canvas.height = ICON_SIZE + CANVAS_GAP;
    canvas.width = ICON_SIZE + CANVAS_GAP;

    canvasContext ??= canvas.getContext("2d");

    canvasContext.font = `${ICON_SIZE}px monospace, serif`;
    canvasContext.fillText(unicodeIcon, 0, ICON_SIZE);

    return dataUrlCanvasCache[unicodeIcon] = canvas.toDataURL();
}
