'use strict';

import * as React from "react";

import type { currentLocale$ } from "../state/i18n";

import { getLanguageName } from "../lib/i18n";

import css from './LocaleSelector.module.css';

export function LocaleSelector({ current$, current$Value }: {
    current$: typeof currentLocale$,
    current$Value: typeof currentLocale$.value,
}) {
    const currentLocale = current$Value;
    const { data } = current$;
    const {
        systemLocale,
        allowedLocales,
    } = data;
    const {
        flag,
    } = data.localInfo;

    return (<div className={css.languageSelector} role="menubar" aria-haspopup="true">
        <div className={css.wLanguage}>
            <LanguageCard
                locale={currentLocale}
                flag={flag}
                currentLocale={currentLocale}
                otherLocale={systemLocale}
                isCurrent={true}
                accessKey="i"
            />
            <div className={css.languageDropdown}>
                {allowedLocales.map(localeInfo => {
                    const { locale, flag } = localeInfo;
                    const isSelected = locale === currentLocale;

                    return <LanguageCard
                        key={locale}
                        locale={locale}
                        onClick={current$.data.onClickLocaleElement}
                        flag={flag}
                        currentLocale={locale}
                        otherLocale={isSelected ? systemLocale : currentLocale}
                        isSelected={isSelected}
                    />;
                })}
            </div>
        </div>
    </div>);
}

function LanguageCard({ locale, onClick, flag, currentLocale, otherLocale, isSelected, isCurrent, accessKey }: {
    locale: string,
    onClick?: typeof currentLocale$.data.onClickLocaleElement,
    flag: string,
    currentLocale: string,
    otherLocale: string,
    isSelected?: boolean,
    isCurrent?: boolean,
    accessKey?: string,
}) {
    return (<button
        role="menuitem"
        data-locale={locale}
        onClick={isSelected ? null : onClick}
        onBlur={onBlurFix}
        className={`${css.language} ${
            isCurrent ? css.languageCurrent : css.languageOption
        } ${
            isSelected ? css.languageOptionSelected : ''
        }`}
        accessKey={accessKey}
    >
        <div className={css.languageFlag}>{flag}</div>
        <div className={css.languageInfo}>
            <div className={css.languageName}>{getLanguageName(locale, currentLocale)}</div>
            <div className={css.languageNameOther}>{getLanguageName(locale, otherLocale)}</div>
        </div>
    </button>);
}

/**
 * Фиксим проблему:
 *  Когда открыто меню и мы переходим в другое окно, элемент теряет фокус и скрывается.
 *  Однако, когда мы возвращаемся в это окно, по клику ЛЮБОЕ место, то кнопка бывшая в фокусе до ухода со страницы на
 *  несколько мс опять получает фокус, а потом сразу же его теряет. Но этого времени достаточно, чтобы запустилась анимация (transition).
 * @param event
 */
function onBlurFix<T>(event: React.FocusEvent<T>) {
    const { currentTarget } = event;

    (currentTarget as unknown as HTMLElement | undefined)?.blur?.();
}
