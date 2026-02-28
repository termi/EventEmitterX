'use strict';

import type * as React from "react";

import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

import { routersList, routerEmptyObject } from './routers.prebuild';

export type NavigationRouter = {
    key: string,
    position: number,
    pageTitle: string,
    srcPath: string,
    routerPath: string,
    importPath: string,
    subItems?: NavigationRouter[],
    menuHidden?: boolean,
    metadata?: {
        menuItemTitle: string,
        menuItemTitle$: EventSignal<string>,
        pageTitle: string,
        darkUnicodeIcon?: string,
        unicodeIcon?: string,
        darkStaticIconSrc?: string,
        staticIconSrc?: string,
    },
    Component: React.FC,
    Layout?: React.FC,
};

export const currentNavigatorPage$ = new EventSignal(routerEmptyObject, {
    description: 'currentNavigatorPage',
    data: {
        routersList,
    },
});

(globalThis as unknown as { __test__currentNavigatorPage$: typeof currentNavigatorPage$}).__test__currentNavigatorPage$ = currentNavigatorPage$;
