// noinspection JSXDomNesting

'use strict';

import * as React from "react";

import type { currentLocale$ } from "../state/i18n";

import { getLanguageName } from "../lib/i18n";

import css from './LocaleSelectorModern.module.css';

export function LocaleSelectorModern({ eventSignal, accessKey }: { eventSignal: typeof currentLocale$, accessKey?: string }) {
    const currentLocale = eventSignal.get();
    const { data } = eventSignal;
    const {
        systemLocale,
        allowedLocales,
    } = data;

    return (<div className={css.languageSelectorModern} data-current-locale={currentLocale}>
        <select name="currentLocale" accessKey={accessKey} value={currentLocale} onChange={eventSignal.data.onChangeLocaleSelect}>
            <button>
                <selectedcontent></selectedcontent>
            </button>
            {allowedLocales.map(localeInfo => {
                const { locale, textDirection: direction } = localeInfo;

                return (<option key={locale} value={locale} style={{ direction }}>
                    <div className={`${css.language} ${locale === systemLocale ? css.languageSystem : ''}`}>
                        <div className={css.languageFlag}>{localeInfo.flag}</div>
                        <div className={css.languageInfo}>
                            <div className={css.languageName}>{getLanguageName(locale, locale)}</div>
                            <div className={css.languageNameOther}>{getLanguageName(locale, locale === currentLocale ? systemLocale : currentLocale)}</div>
                        </div>
                    </div>
                </option>);
            })}
        </select>
    </div>);
}

declare global {
    namespace JSX {
        interface IntrinsicElements {
            selectedcontent: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
        }
    }
}
