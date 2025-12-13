'use strict';

import type {} from 'cftools/ts_types/index';

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

const defaultLocale = 'ru-RU';
const translations = Object.assign(new Map() as Map<string, Map<string, string>>, {
    createValue() {
        return new Map<string, string>();
    },
});

_fillDefaultTranslation();

export const currentLocale$ = new EventSignal(defaultLocale);

export const i18n_componentType = Symbol('i18n');

EventSignal.registerReactComponentForComponentType(i18n_componentType, function I18NLoading() {
    return '...loading';
}, 'pending');

export function i18n$$<T>(template: TemplateStringsArray, ...values: T[]) {
    if (template.length === 1 && values.length === 0) {
        return i18nString$$(template[0]);
    }

    return new EventSignal('', _i18n_computation, {
        initialSourceValue: { template, values, __proto__: null },
        componentType: i18n_componentType,
        __proto__: null,
    });
}

const i18nStringCache = new Map<string, EventSignal<string, string>>();

export function i18nString$$(string: string) {
    return i18nStringCache.getOrInsertComputed(string, _create_i18nString$$);
}

function _create_i18nString$$(string: string) {
    return new EventSignal(string, _i18nString$_computation, {
        initialSourceValue: string,
        componentType: i18n_componentType,
        __proto__: null,
    });
}

function _i18n_computation<T>(_v: string, sourceValue: { template: TemplateStringsArray, values: T[], __proto__: null }) {
    const currentLocale = currentLocale$.get();
    const translationsMap = translations.getOrInsertComputed(currentLocale, translations.createValue);
    const { template, values } = sourceValue;
    // const isNeedToLoadTranslation = currentLocale !== defaultLocale;
    let result = '';

    for (let i = 0, len = template.length ; i < len ; i++) {
        const string = template[i];
        const translation = translationsMap.get(string);

        result += (translation ?? string) + (String(values[i] || ''));
    }

    return result;
}

function _i18nString$_computation(_v: string, sourceValue: string) {
    const currentLocale = currentLocale$.get();
    const translationsMap = translations.getOrInsertComputed(currentLocale, translations.createValue);
    // const isNeedToLoadTranslation = currentLocale !== defaultLocale;

    const translation = translationsMap.get(sourceValue);

    if (!translation) {
        return new Promise<string>(resolve => {
            setTimeout(() => {
                resolve(sourceValue);
            }, 1500);
        }) as unknown as string;
    }

    return translation;
}

function _fillDefaultTranslation() {
    const locale = translations.getOrInsertComputed('en-US', translations.createValue);

    locale.set('Лос-Анджелес', 'Los Angeles');
    locale.set('Нью-Йорк', 'New York');

    locale.set('Мировое время', 'World Time');

    locale.set('Список', 'List');
    locale.set('Плитка', 'Grid');
    locale.set('Таблица', 'Table');
}

(globalThis as unknown as Record<string, any>).__test__currentLocale$ = currentLocale$;
