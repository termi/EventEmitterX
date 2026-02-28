'use strict';

import * as React from "react";

import type { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

import NavBar from "../modules/NavBar";
import { LocaleSelector } from "../modules/LocaleSelector";
import { LocaleSelectorModern } from "../modules/LocaleSelectorModern";

import { currentLocale$ } from "../state/i18n";
import { hasCustomizableSelectSupport } from "../lib/supports";

import css from "./DefaultLayout.module.css";

if (hasCustomizableSelectSupport()) {
    currentLocale$.setReactFC(LocaleSelectorModern, { accessKey: 'i' });
}

const DefaultLayout = React.memo(function DefaultLayout({ children, pageTitle, pageTitle$ }: {
    children?: React.ReactNode,
    pageTitle?: string,
    pageTitle$?: EventSignal<string>,
}) {
    return <main>
        <header className={css.pageHeader}>
            <div className={css.headerTop}>
                <h1 className={css.pageTitle}>{pageTitle$ || pageTitle || ''}</h1>
                <div className={css.headerActions}>
                    <currentLocale$.component sDefaultFC={LocaleSelector} />
                </div>
            </div>
            <div className={css.headerBottom}>
                <NavBar/>
            </div>
        </header>
        {children || null}
    </main>;
})

export default DefaultLayout;
