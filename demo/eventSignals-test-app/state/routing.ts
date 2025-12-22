'use strict';

import type * as React from "react";

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import { routersList, router404 } from './routers.prebuild';

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
    },
    Component: React.FC,
    Layout?: React.FC,
};

export const currentNavigatorPage$ = new EventSignal(router404, {
    data: {
        routersList,
    },
});

(globalThis as unknown as { __test__currentNavigatorPage$: typeof currentNavigatorPage$}).__test__currentNavigatorPage$ = currentNavigatorPage$;
