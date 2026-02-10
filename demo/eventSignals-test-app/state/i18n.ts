'use strict';

// noinspection ES6UnusedImports
import {} from 'cftools/ts_types/index';
import type { MouseEventHandler, ChangeEventHandler } from "react";

import { EventSignal, isEventSignal } from '~/modules/EventEmitterEx/EventSignal';
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
    description: 'currentLocale$',
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
        onChangeLocaleSelect: ((event) => {
            const { currentTarget } = event;

            if (currentTarget) {
                const locale = (currentTarget as HTMLSelectElement).value;

                if (locale) {
                    currentLocale$.set(locale);
                }
            }
        }) as ChangeEventHandler,
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

const i18nNumberCache = new Map<number, ReturnType<typeof _create_i18nNumber$$>>();
const i18nStringCache = new Map<string, ReturnType<typeof _create_i18nString$$>>();
const translations = Object.assign(new Map() as Map<string, Map<string, string>>, {
    createValue() {
        return new Map<string, string>();
    },
});

_fillDefaultTranslation();

// const numberFormatOptions$ = new EventSignal(null as ReturnType<typeof getLocaleInfo>["numberFormatOptions"], function() {
//     const currentLocale = currentLocale$.get();
//     const localeInfo = getLocaleInfo(currentLocale);
//
//     return localeInfo.numberFormatOptions;
// });

/**
 * @see [@internationalized/number - The NumberParser class can be used perform locale-aware parsing of numbers from Unicode strings, as well as validation of partial user input.](https://www.npmjs.com/package/@internationalized/number)
 * @see [React Aria / How we internationalized our number field](https://react-aria.adobe.com/blog/how-we-internationalized-our-numberfield)
 */
export const i18nNumber = Object.assign(function i18nNumber(num: number) {
    const currentLocale = currentLocale$.get();
    const localeInfo = getLocaleInfo(currentLocale);

    return (num ?? 0).toLocaleString(currentLocale, localeInfo.numberFormatOptions);
}, {
    /**
     * <u>Hook</u> to subscribe on current locale [numberFormatOptions]{@link NumberFormatOptions} changes.
     *
     * **Only for using inside React components!**
     */
    use() {
        // return numberFormatOptions$.use();
        return currentLocale$.use(currentLocale => {
            return getLocaleInfo(currentLocale).numberFormatOptions;
        });
    },
});

export function i18nNumber$$(num: number) {
    return i18nNumberCache.getOrInsertComputed(num, _create_i18nNumber$$);
}

function _create_i18nNumber$$(num: number) {
    return new EventSignal('', _i18nNumber$$_computation, {
        initialSourceValue: num ?? 0,
    });
}

function _i18nNumber$$_computation(_: string, sourceValue: number) {
    const currentLocale = currentLocale$.get();
    const localeInfo = getLocaleInfo(currentLocale);

    return sourceValue.toLocaleString(currentLocale, localeInfo.numberFormatOptions);
}

export function i18n<T>(template: TemplateStringsArray, ...values: T[]) {
    if (template.length === 1 && values.length === 0) {
        return i18nString(template[0]);
    }

    const result = _i18n_computation<T>('', { template, values, __proto__: null });

    // _i18nString$_computation МОЖЕТ (несмотря на типизацию) вернуть Promise.
    // Но нам нельзя тут возвращать Promise, поэтому возвращаем исходное значение.
    // Если возвращать Promise, то это будет провоцировать React Suspense механизм.
    if (typeof (result as unknown) === 'object' && typeof (result as unknown as Promise<string>).then === 'function') { // eslint-disable-line promise/prefer-await-to-then
        return (result as unknown as Promise<string> & { "pendingValue": string })["pendingValue"]
            ?? fulfillTranslationTemplate(template.reduce((string, val, index) => {
                return `${string}${val}@{${index}}`;
            }, ''), values)
        ;
    }

    return result;
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

export const i18nString = Object.assign(function i18nString(string: string) {
    const result = _i18nString$_computation('', string);

    // _i18nString$_computation МОЖЕТ (несмотря на типизацию) вернуть Promise.
    // Но нам нельзя тут возвращать Promise, поэтому возвращаем исходное значение.
    // Если возвращать Promise, то это будет провоцировать React Suspense механизм.
    if (typeof (result as unknown) === 'object' && typeof (result as unknown as Promise<string>).then === 'function') { // eslint-disable-line promise/prefer-await-to-then
        return (result as unknown as Promise<string> & { "pendingValue": string })["pendingValue"] ?? string;
    }

    return result;
}, {
    /**
     * <u>Hook</u> to subscribe on current locale changes.
     *
     * **Only for using inside `React` components!**
     */
    use: currentLocale$.use,
});

export function i18nString$$(string: string) {
    return i18nStringCache.getOrInsertComputed(string, _create_i18nString$$);
}

function _create_i18n$$<T>(template: TemplateStringsArray, values: T[]) {
    return new EventSignal('', _i18n_computation, {
        description: 'i18n.template',
        initialSourceValue: { template, values, __proto__: null },
        componentType: i18n_componentType,
        __proto__: null,
    });
}

function fulfillTranslationTemplate<T>(translation: string, values: T[]) {
    return translation.replace(/@{(\d+)}/g, function(_match, indexString: string) {
        const i = Number.parseInt(indexString, 10);

        return String(values[i] ?? '');
    });
}

function _i18n_computation<T>(prevValue: string, sourceValue: { template: TemplateStringsArray, values: T[], __proto__: null }, eventSignal?: EventSignal<string, { template: TemplateStringsArray, values: T[], __proto__: null }>) {
    const currentLocale = currentLocale$.get();
    const isDefaultLocale = currentLocale === defaultLocale;
    const translationsMap = translations.getOrInsertComputed(currentLocale, translations.createValue);
    const { template, values } = sourceValue;
    // const isNeedToLoadTranslation = currentLocale !== defaultLocale;

    let templateString = '';

    for (let i = 0, len = template.length - 1 ; i < len ; i++) {
        templateString += `${template[i]}@{${i}}`;
    }

    if (template.length > 1) {
        templateString += template.at(-1);
    }

    const translation = translationsMap.get(templateString);

    if (translation) {
        return fulfillTranslationTemplate(translation, values);
    }

    if (isDefaultLocale) {
        let result = '';

        for (let i = 0, len = template.length ; i < len ; i++) {
            const templatePart = template[i];

            result += templatePart + (String(values[i] ?? ''));
        }

        return result;
    }

    const result = _getOrLoadI18NTranslate('', templateString, true);

    // eslint-disable-next-line promise/prefer-await-to-then
    if (typeof (result as unknown) === 'object' && typeof (result as unknown as Promise<string>).then === 'function') {
        /** Если мы в данный момент находимся в EventSignal computation, то на это новое значение текущий сигнал уже будет подписан и временный сигнал не нужен. */
        const temporaryEventSignal = isEventSignal(eventSignal)
            ? null
            : new EventSignal(false, { description: 'i18n.-temporary-' })
        ;

        // Подписываем текущий сигнал на этот временный сигнал
        temporaryEventSignal?.get();

        // eslint-disable-next-line promise/prefer-await-to-then
        const promise = (result as unknown as Promise<string>).then(result => {
            // todo: Детектировать ситуацию циклических запросов, когда изменение этого сигнала ведёт к пересчитыванию
            //  сигнала в котором перевод запрашивался, это ведёт к тому, что мы опять запустим логику запроса перевода
            //  и если его не будет в кеше `translations.get(currentLocale)` (translationsMap) то исполнение кода опять
            //  вернётся к созданию temporaryEventSignal и переходу опять на эту строку, что опять запустил цикл по новому.
            //  В итоге, этот цикл будет бесконечно выполняться.
            temporaryEventSignal?.set(true);
            temporaryEventSignal?.destructor();

            return fulfillTranslationTemplate(result, values);
        }) as Promise<string> & { "pendingValue": string };

        promise["pendingValue"] = prevValue || fulfillTranslationTemplate(templateString, values);

        return promise as unknown as string;
    }

    return fulfillTranslationTemplate((result as string), values);
}

function _create_i18nString$$(string: string) {
    return new EventSignal(string, _i18nString$_computation, {
        __proto__: null,
        description: 'i18n.string',
        initialSourceValue: string,
        componentType: i18n_componentType,
        // data: {
        //     // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        //     delay: string === '...Загрузка' ? 30_000 : 0,
        // },
    });
}

const _promiseCacheMap = new Map<string, Promise<string>>();

function _i18nString$_computation(prevValue: string, sourceValue: string, eventSignal?: EventSignal<string, string, { delay: number } | undefined>) {
    return _getOrLoadI18NTranslate(prevValue, sourceValue, eventSignal);
}

function _getOrLoadI18NTranslate(prevValue: string, sourceValue: string, eventSignal?: EventSignal<string, string, { delay: number } | undefined> | true) {
    if (!sourceValue) {
        return '';
    }

    let textForTranslation = sourceValue;
    let sourceValueLocale = defaultLocale;
    const currentLocale = currentLocale$.get();
    const translationsMap = translations.getOrInsertComputed(currentLocale, translations.createValue);
    // const isNeedToLoadTranslation = currentLocale !== defaultLocale;

    const allowAsync = eventSignal === true || isEventSignal(eventSignal, true);
    const allowTemporarySignal = allowAsync && eventSignal !== true;
    const translation = translationsMap.get(sourceValue);
    let promise: Promise<string> | undefined;

    translation: if (!translation) {
        /**
         * @example
         'Крестики-Нолики PRO||<en-US>||:Tic tac toe PRO||es-ES||:Tres en raya PRO'.split(/\|\|(<?\w{2}-\w{2}>?)\|\|:/g);
         ['Крестики-Нолики PRO', '<en-US>', 'Tic tac toe PRO', 'es-ES', 'Tres en raya PRO']
         */
        const preTranslatedValues = sourceValue.split(/\|\|(<?\w{2}-\w{2}>?)\|\|:/g);

        if (preTranslatedValues.length > 2) {
            const stringInDefaultLanguage = preTranslatedValues.shift();

            if (stringInDefaultLanguage) {
                textForTranslation = stringInDefaultLanguage;
            }
            else {
                // В этом случае, изначальная строка может быть не на языке по-умолчанию (например, русском ru-RU),
                //  а на английском (en-US) и эту строку нужно перевести на язык по-умолчанию.
                sourceValueLocale = preTranslatedValues.shift();
                textForTranslation = preTranslatedValues.shift();
            }

            for (let i = 0, len = preTranslatedValues.length ; i < len ; i += 2) {
                const _locale = preTranslatedValues[i];
                const translatedValue = preTranslatedValues[i + 1];

                if (!_locale || translatedValue == null) {
                    continue;
                }

                const isSelectedLocaleForTranslation = _locale.startsWith('<') && _locale.endsWith('>');
                const locale = isSelectedLocaleForTranslation ? _locale.substring(1, _locale.length - 1) : _locale;
                const isCurrentLocale = locale === currentLocale;

                translations.getOrInsertComputed(locale, translations.createValue)
                    .set(sourceValue, translatedValue)
                ;

                if (isSelectedLocaleForTranslation || isCurrentLocale) {
                    translations.getOrInsertComputed(sourceValueLocale, translations.createValue)
                        .set(sourceValue, textForTranslation)
                    ;

                    sourceValueLocale = locale;
                    textForTranslation = translatedValue;

                    if (isCurrentLocale) {
                        break;
                    }
                }
            }
        }

        if (currentLocale === sourceValueLocale) {
            if (!allowAsync) {
                return textForTranslation;
            }

            promise = new Promise<string>(resolve => {
                setTimeout(() => {
                    resolve(textForTranslation);
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
                const onErrorFetchTranslation = (translatedText: string | undefined) => {
                    // todo: Сейчас ошибка скрывается, но на самом деле она должна показываться: сигнал должен переходить
                    //  в состояние error и должен отрендериваться компонент который отвечает за error-рендеринг переводимого текста.
                    // note: ОБЯЗАТЕЛЬНО нужно сохранить хоть какое-то значение в translationsMap, иначе будут
                    //  бесконечные циклические запросы перевода. Пример:
                    // ```
                    // const computed1$ = new EventSignal('', (_prev, sourceValue, eventSignal) => {
                    //     // Используем функцию `i18n`, внутри которой создаётся временный сигнал
                    //     // Когда fetch завершается с ошибкой временный сигнал изменяет значение на true,
                    //     //  данный computation срабатывает ещё раз, проверяет перевод в кеше, не обнаруживает его,
                    //     //  делает запрос на перевод и временный сигнал и так по кругу, до бесконечности.
                    //     return i18n`Значение = ${counter1$.get()}`;
                    // }
                    // ```
                    translatedText ||= textForTranslation;

                    translationsMap.set(sourceValue, translatedText);
                    resolve(translatedText);
                };

                fetchGoogleTranslateApi(textForTranslation, {
                    sourceLanguage: sourceValueLocale,
                    targetLanguage: currentLocale,
                    delay: 500,
                    queueRequests: true,
                })
                    // eslint-disable-next-line promise/prefer-await-to-then
                    .then(async (result) => {
                        if (isEventSignal<EventSignal<string, string, { delay: number }>>(eventSignal)
                            && eventSignal.data?.delay
                        ) {
                            await new Promise(resolve => {
                                setTimeout(resolve, eventSignal.data.delay);
                            });

                            console.log('_getOrLoadI18NTranslate on timeout', eventSignal.data.delay);
                        }

                        const { translatedText } = result;

                        if (result.ok) {
                            resolve(translatedText);
                            translationsMap.set(sourceValue, translatedText);
                            saveLocalizationToLocalStorage(sourceValue, translatedText, currentLocale);
                        }
                        else {
                            onErrorFetchTranslation(translatedText);
                        }

                        _promiseCacheMap.delete(sourceValue);
                        // eslint-disable-next-line promise/prefer-await-to-callbacks
                    }, error => {
                        console.error(error);

                        _promiseCacheMap.delete(sourceValue);

                        onErrorFetchTranslation('');
                    })
                ;
            });
        });

        break translation;
    }

    if (allowAsync) {
        if (promise) {
            if (textForTranslation !== sourceValue) {
                promise["pendingValue"] = textForTranslation;
            }

            if (allowTemporarySignal) {
                // todo: Добавлять description только в DEV-режиме
                /** Если мы в данный момент находимся в EventSignal computation, то на этот новый сигнал текущий сигнал будет подписан. */
                const temporaryEventSignal = new EventSignal(false, { description: 'i18n.-temporary-' });

                void promise.then(() => { // eslint-disable-line promise/prefer-await-to-then
                    // todo: Детектировать ситуацию циклических запросов, когда изменение этого сигнала ведёт к пересчитыванию
                    //  сигнала в котором перевод запрашивался, это ведёт к тому, что мы опять запустим логику запроса перевода
                    //  и если его не будет в кеше `translations.get(currentLocale)` (translationsMap) то исполнение кода опять
                    //  вернётся к созданию temporaryEventSignal и переходу опять на эту строку, что опять запустил цикл по новому.
                    //  В итоге, этот цикл будет бесконечно выполняться.
                    temporaryEventSignal.set(true);
                    temporaryEventSignal.destructor();
                }, () => {
                    // ignore any error
                });
            }

            return promise as unknown as string;
        }
    }

    return translation ?? (prevValue || textForTranslation);
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
        'ko-KP',
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
