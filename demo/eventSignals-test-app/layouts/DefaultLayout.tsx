'use strict';

import * as React from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import NavBar from "../modules/NavBar";
import { LocaleSelector } from "../modules/LocaleSelector";

import { currentLocale$ } from "../state/i18n";

import css from "./DefaultLayout.module.css";

export default function DefaultLayout({ children, pageTitle, pageTitle$ }: {
    children?: React.ReactNode,
    pageTitle?: string,
    pageTitle$?: EventSignal<string>,
}) {
    return <main>
        <header className={css.pageHeader}>
            <div className={css.headerTop}>
                <h1 className={css.pageTitle}>{pageTitle$ || pageTitle || ''}</h1>
                <div className={css.headerActions}>
                    <div className={css.pageHeaderRight}>
                        <currentLocale$.component sFC={LocaleSelector}/>
                    </div>
                </div>
            </div>
            <div className={css.headerBottom}>
                <NavBar/>
            </div>
        </header>
        {children || null}
    </main>;
}
