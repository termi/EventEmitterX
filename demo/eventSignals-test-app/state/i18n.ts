'use strict';

// noinspection ES6UnusedImports
import {} from 'cftools/ts_types/index';
import type { MouseEventHandler } from "react";

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';
import {
    getDefaultLocale,
    getCurrentLocale,
    setCurrentLocale,
    getSystemLocale,
    getLocaleInfo,
    normalizeLocale,
    getLocalizationFromLocalStorage,
    fetchGoogleTranslateApi,
    saveLocalizationToLocalStorage,
} from "../lib/i18n";

const defaultLocale = getDefaultLocale();
const systemLocale = getSystemLocale();
const currentLocale = getCurrentLocale();

export const currentLocale$ = new EventSignal(currentLocale, (prevValue, newLocale, currentLocale$) => {
    newLocale = normalizeLocale(newLocale ?? prevValue);

    currentLocale$.data.localInfo = getLocaleInfo(newLocale);

    localStorage.setItem('i18n.preferredLocale', newLocale);
    setCurrentLocale(newLocale);

    return newLocale;
}, {
    componentType: Symbol('currentLocale$'),
    data: {
        localInfo: getLocaleInfo(currentLocale),
        defaultLocale,
        systemLocale,
        allowedLocales: _getAllowedLocalesList(),
        onClickLocaleElement: ((event) => {
            const { currentTarget } = event;

            if (currentTarget) {
                // eslint-disable-next-line unicorn/prefer-dom-node-dataset
                const locale = (currentTarget as HTMLElement).getAttribute?.('data-locale');

                if (locale) {
                    currentLocale$.set(locale);
                }
            }
        }) as MouseEventHandler,
    },
});

if (typeof document !== 'undefined') {
    currentLocale$.addListener(newValue => {
        if (newValue) {
            const {
                language,
                textDirection,
            } = currentLocale$.data.localInfo;

            document.documentElement.lang = language;
            document.dir = textDirection;
        }
    });
}

export const i18n_componentType = Symbol('i18n');

EventSignal.registerReactComponentForComponentType(i18n_componentType, function I18NLoading() {
    return i18nString$$('...Загрузка');
}, 'pending');

const i18nStringCache = new Map<string, EventSignal<string, any>>();
const translations = Object.assign(new Map() as Map<string, Map<string, string>>, {
    createValue() {
        return new Map<string, string>();
    },
});

_fillDefaultTranslation();

export function i18n<T>(template: TemplateStringsArray, ...values: T[]) {
    if (template.length === 1 && values.length === 0) {
        return i18nString(template[0]);
    }

    return _i18n_computation<T>('', { template, values, __proto__: null });
}

export function i18n$$<T>(template: TemplateStringsArray, ...values: T[]) {
    if (template.length === 1 && values.length === 0) {
        return i18nString$$(template[0]);
    }

    return _create_i18n$$(template, values);
    // todo: Нельзя кешировать только по ключу `template.join('')`, а кешировать по полной строке - бессмысленно, тк вариантов может быть бесконечное количество/
    /*return i18nStringCache.getOrInsertComputed(template.join(''), () => {
        return _create_i18n$$(template, values);
    });
    */
}

export function i18nString(string: string) {
    return _i18nString$_computation('', string);
}

export function i18nString$$(string: string) {
    return i18nStringCache.getOrInsertComputed(string, _create_i18nString$$);
}

function _create_i18n$$<T>(template: TemplateStringsArray, values: T[]) {
    return new EventSignal('', _i18n_computation, {
        initialSourceValue: { template, values, __proto__: null },
        componentType: i18n_componentType,
        __proto__: null,
    });
}

function _i18n_computation<T>(_v: string, sourceValue: { template: TemplateStringsArray, values: T[], __proto__: null }, eventSignal?: EventSignal<string, { template: TemplateStringsArray, values: T[], __proto__: null }>) {
    const currentLocale = currentLocale$.get();
    const isDefaultLocale = currentLocale === defaultLocale;
    const translationsMap = translations.getOrInsertComputed(currentLocale, translations.createValue);
    const { template, values } = sourceValue;
    // const isNeedToLoadTranslation = currentLocale !== defaultLocale;
    const fulfillTranslationTemplate = (translation: string) => {
        return translation.replace(/@{(\d+)}/g, function(_match, indexString) {
            const i = indexString | 0;

            return String(values[i] ?? '');
        });
    };

    let templateString = '';

    for (let i = 0, len = template.length - 1 ; i < len ; i++) {
        templateString += `${template[i]}@{${i}}`;
    }

    if (template.length > 1) {
        templateString += template.at(-1);
    }

    const translation = translationsMap.get(templateString);

    if (translation) {
        return fulfillTranslationTemplate(translation);
    }

    if (isDefaultLocale) {
        let result = '';

        for (let i = 0, len = template.length ; i < len ; i++) {
            const templatePart = template[i];

            result += templatePart + (String(values[i] ?? ''));
        }

        return result;
    }

    const result = _i18nString$_computation('', templateString, true);

    // eslint-disable-next-line promise/prefer-await-to-then
    if (typeof (result as unknown) === 'object' && typeof (result as unknown as Promise<string>).then === 'function') {
        /** Если мы в данный момент находимся в EventSignal computation, то на этот новый сигнал текущий сигнал будет подписан. */
        const temporaryEventSignal = eventSignal ? null : new EventSignal(false);

        // eslint-disable-next-line promise/prefer-await-to-then
        return (result as unknown as Promise<string>).then(result => {
            temporaryEventSignal?.set(true);
            temporaryEventSignal?.destructor();

            return fulfillTranslationTemplate(result);
        }) as unknown as string;
    }

    return fulfillTranslationTemplate(result);
}

/*
function _i18n_computation<T>(_v: string, sourceValue: { template: TemplateStringsArray, values: T[], __proto__: null }, eventSignal?: EventSignal<any>) {
    const currentLocale = currentLocale$.get();
    const isDefaultLocale = currentLocale === defaultLocale;
    const translationsMap = translations.getOrInsertComputed(currentLocale, translations.createValue);
    const { template, values } = sourceValue;
    // const isNeedToLoadTranslation = currentLocale !== defaultLocale;
    const translationStrings: string[] = [];
    let promise: Promise<void> | undefined;

    for (let i = 0, len = template.length ; i < len ; i++) {
        const string = template[i];
        const translation = translationsMap.get(string);

        if (translation) {
            translationStrings[i] = translation;
        }
        else if (isDefaultLocale) {
            translationStrings[i] = string;
        }
        else {
            promise = (promise || Promise.resolve()).then(async () => {// eslint-disable-line promise/prefer-await-to-then
                translationStrings[i] = await (_i18nString$_computation('', string, true) as unknown as Promise<string>);
            }, error => {// eslint-disable-line promise/prefer-await-to-callbacks
                console.error(error);
            });
        }
    }

    if (promise) {
        /!** Если мы в данный момент находимся в EventSignal computation, то на этот новый сиглан текущий сиглан будет подписан. *!/
        const temporaryEventSignal = eventSignal ? null : new EventSignal(false);

        return promise.then(() => {// eslint-disable-line promise/prefer-await-to-then
            temporaryEventSignal?.set(true);
            temporaryEventSignal?.destructor();

            let result = '';

            for (let i = 0, len = translationStrings.length ; i < len ; i++) {
                const translation = translationStrings[i];

                result += (translation ?? template[i]) + (String(values[i] ?? ''));
            }

            return result;
        }, error => {// eslint-disable-line promise/prefer-await-to-callbacks
            console.error(error);
        }) as unknown as string;
    }

    let result = '';

    for (let i = 0, len = translationStrings.length ; i < len ; i++) {
        const translation = translationStrings[i];

        result += (translation ?? template[i]) + (String(values[i] ?? ''));
    }

    return result;
}*/

function _create_i18nString$$(string: string) {
    return new EventSignal(string, _i18nString$_computation, {
        initialSourceValue: string,
        componentType: i18n_componentType,
        __proto__: null,
    });
}

const _promiseCacheMap = new Map<string, Promise<string>>();

function _i18nString$_computation(_v: string, sourceValue: string, eventSignal?: EventSignal<any> | true) {
    if (!sourceValue) {
        return '';
    }

    const currentLocale = currentLocale$.get();
    const translationsMap = translations.getOrInsertComputed(currentLocale, translations.createValue);
    // const isNeedToLoadTranslation = currentLocale !== defaultLocale;

    const allowAsync = eventSignal === true || (!!eventSignal && eventSignal instanceof EventSignal);
    const allowTemporarySignal = allowAsync && eventSignal !== true;
    const translation = translationsMap.get(sourceValue);
    let promise: Promise<string> | undefined;

    translation: if (!translation) {
        if (currentLocale === defaultLocale) {
            if (!allowAsync) {
                return sourceValue;
            }

            promise = new Promise<string>(resolve => {
                setTimeout(() => {
                    resolve(sourceValue);
                }, 1500);
            });

            break translation;
        }

        const translationFromLocalStorage = getLocalizationFromLocalStorage(sourceValue, currentLocale);

        if (translationFromLocalStorage !== null) {
            translationsMap.set(sourceValue, translationFromLocalStorage);

            return translationFromLocalStorage;
        }

        promise = _promiseCacheMap.getOrInsertComputed(sourceValue, () => {
            return new Promise<string>(resolve => {
                fetchGoogleTranslateApi(sourceValue, {
                    targetLanguage: currentLocale,
                    delay: 500,
                    queueRequests: true,
                })
                    // eslint-disable-next-line promise/prefer-await-to-then
                    .then(result => {
                        const { translatedText } = result;

                        resolve(translatedText);

                        if (result.ok) {
                            translationsMap.set(sourceValue, translatedText);
                            saveLocalizationToLocalStorage(sourceValue, translatedText, currentLocale);
                        }

                        _promiseCacheMap.delete(sourceValue);
                        // eslint-disable-next-line promise/prefer-await-to-callbacks
                    }, error => {
                        console.error(error);

                        resolve(sourceValue);
                    })
                ;
            });
        });

        break translation;
    }

    if (allowAsync) {
        if (promise) {
            if (allowTemporarySignal) {
                /** Если мы в данный момент находимся в EventSignal computation, то на этот новый сиглан текущий сиглан будет подписан. */
                const temporaryEventSignal = new EventSignal(false);

                void promise.then(() => { // eslint-disable-line promise/prefer-await-to-then
                    temporaryEventSignal.set(true);
                    temporaryEventSignal.destructor();
                });
            }

            return promise as unknown as string;
        }
    }

    return translation ?? sourceValue;
}

function _getAllowedLocalesList() {
    return [
        'ru',
        'en',
        'de',
        'fr',
        'es',
        'zh-CN',
        'bo-CN',
        'zh-Hant-TW',
        'ja',
        'ar',
        'pt',
        'it',
        'he',
        'uk',
    ].map(locale => getLocaleInfo(normalizeLocale(locale)));
}

function _fillDefaultTranslation() {
    const locale_en_US = translations.getOrInsertComputed('en-US', translations.createValue);

    locale_en_US.set('Значение = ', 'Value is ');
    locale_en_US.set('Счетчик ', 'Counter ');
    locale_en_US.set('Сумма значений', 'Counters sum');
    locale_en_US.set('Уменьшить', 'Decrease');
    locale_en_US.set('Сбросить', 'Reset');
    locale_en_US.set('Увеличить', 'Increase');
    locale_en_US.set('Следующий пользователь', 'Next user');

    locale_en_US.set('Лос-Анджелес', 'Los Angeles');
    locale_en_US.set('Нью-Йорк', 'New York');

    locale_en_US.set('Мировое время', 'World Time');

    locale_en_US.set('Список', 'List');
    locale_en_US.set('Плитка', 'Grid');
    locale_en_US.set('Таблица', 'Table');
}

(globalThis as unknown as Record<string, any>).__test__currentLocale$ = currentLocale$;
