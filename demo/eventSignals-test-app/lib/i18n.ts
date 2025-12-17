'use strict';

const defaultLocale = 'ru-RU';
/**
 * `65`, `0x41`, `'41'`, `'\u{41}'`, `'\u0041'`
 */
const regionBaseCodePoint = "A".codePointAt(0);
/**
 * `127462`, `0x1f1e6`, `'1f1e6'`, `'\u{1f1e6}'`
 */
const unicodeFlagBaseCodePoint = "🇦".codePointAt(0);

let _fetchGoogleTranslateApi_currentRequest: Promise<any> | undefined = void 0;

export async function fetchGoogleTranslateApi(text: string, {
    sourceLanguage = defaultLocale,
    targetLanguage = 'en-US',
    delay,
    queueRequests,
}: {
    sourceLanguage?: string,
    targetLanguage?: string,
    delay?: number,
    queueRequests?: boolean,
}): Promise<{
    ok: boolean,
    error?: string,
    originalText: string,
    translatedText: string,
    detectedSourceLanguage: string,
    targetLanguage: string,
    timestamp: number,
}> {
    // Формируем URL для неофициального Google Translate API
    const url = new URL('https://translate.googleapis.com/translate_a/single');

    // Правильно добавляем параметры с кодированием
    const params = new URLSearchParams({
        client: 'gtx',
        sl: sourceLanguage,
        tl: targetLanguage,
        dt: 't',
        // URLSearchParams автоматически кодирует значение
        q: text,
        ie: 'UTF-8', // eslint-disable-line unicorn/text-encoding-identifier-case
        oe: 'UTF-8', // eslint-disable-line unicorn/text-encoding-identifier-case
    });
    const {
        promise: queuePromise,
        resolve: queuePromiseResolve,
    } = Promise.withResolvers<void>();

    if (queueRequests) {
        if (_fetchGoogleTranslateApi_currentRequest) {
            const promise = _fetchGoogleTranslateApi_currentRequest;

            // eslint-disable-next-line promise/prefer-await-to-then
            _fetchGoogleTranslateApi_currentRequest = promise.then(() => queuePromise);

            await promise;
        }
        else {
            _fetchGoogleTranslateApi_currentRequest = queuePromise;
        }
    }

    const promise = fetch(`${url.origin}${url.pathname}?${params}`, {
        method: 'GET',
        // headers: {
        //     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        //     'Accept': 'application/json',
        //     'Accept-Language': 'en-US,en;q=0.9',
        // },
    });

    if (delay) {
        await new Promise(resolve => {
            setTimeout(resolve, delay);
        });
    }

    // Выполняем запрос
    const response = await promise;

    if (_fetchGoogleTranslateApi_currentRequest === queuePromise) {
        _fetchGoogleTranslateApi_currentRequest = void 0;
    }

    queuePromiseResolve();

    // Проверяем статус ответа
    if (!response.ok) {
        // throw new Error(`HTTP error! status: ${response.status}`);
        return {
            ok: false,
            error: `HTTP error! status: ${response.status}`,
            originalText: text,
            translatedText: '',
            detectedSourceLanguage: '',
            targetLanguage,
            timestamp: Date.now(),
        };
    }

    // Парсим JSON ответ
    const data = await response.json();

    // Извлекаем переведенный текст
    // Структура ответа: [[["перевод", "оригинал", null, null, 1]], null, "язык"]
    let translatedText = '';

    if (Array.isArray(data) && data[0]) {
        // Собираем все части перевода
        for (const item of data[0]) {
            if (item?.[0]) {
                translatedText += item[0];
            }
        }
    }

    // Получаем определенный язык (если есть)
    const detectedLanguage = data[2] || sourceLanguage;

    // Формируем ответ
    return {
        ok: true,
        originalText: text,
        translatedText: translatedText || text,
        detectedSourceLanguage: detectedLanguage,
        targetLanguage,
        timestamp: Date.now(),
    };
}

const localStorageLocalizationsByLocaleMap = Object.assign(new Map<string, Partial<Record<string, string>>>(), {
    newValue(locale: string) {
        const json = localStorage.getItem(`i18n.LocalizationStore.${locale}`);

        if (json) {
            try {
                const _localizationFromLocalStorage = JSON.parse(json);

                return Object.setPrototypeOf(_localizationFromLocalStorage, null);
            }
            catch {
                //
            }
        }

        return Object.create(null);
    },
});

export function getLocalizationFromLocalStorage(text: string, locale = 'en-US'): string | null {
    const _localizationFromLocalStorage = localStorageLocalizationsByLocaleMap.getOrInsertComputed(
        locale,
        localStorageLocalizationsByLocaleMap.newValue
    );

    return _localizationFromLocalStorage[text] ?? null;
}

const _saveTimers = Object.create(null) as Partial<Record<string, ReturnType<typeof setTimeout>>>;

export function saveLocalizationToLocalStorage(text: string, translatedText: string, locale = 'en-US') {
    const _localizationFromLocalStorage = localStorageLocalizationsByLocaleMap.getOrInsertComputed(
        locale,
        localStorageLocalizationsByLocaleMap.newValue
    );

    _localizationFromLocalStorage[text] = translatedText;

    if (_saveTimers[locale]) {
        clearTimeout(_saveTimers[locale]);
        delete _saveTimers[locale];
    }

    _saveTimers[locale] = setTimeout(_saveLocalStorageLocalizations.bind(null, locale), 15000);
}

function _saveLocalStorageLocalizations(locale?: string) {
    if (locale != null) {
        localStorage.setItem(`i18n.LocalizationStore.${locale}`, JSON.stringify(localStorageLocalizationsByLocaleMap.get(locale)));
    }
    else {
        for (const { 0: locale } of localStorageLocalizationsByLocaleMap) {
            if (locale === void 0) {
                // eslint-disable-next-line no-debugger
                debugger;
            }

            localStorage.setItem(`i18n.LocalizationStore.${locale}`, JSON.stringify(localStorageLocalizationsByLocaleMap.get(locale)));
        }
    }
}

if (typeof window !== 'undefined' && 'onbeforeunload' in window) {
    window.addEventListener('beforeunload', _saveLocalStorageLocalizations.bind(null, null));
}

export function getDefaultLocale() {
    return defaultLocale;
}

// Получение текущей локали из localStorage или системной
export function getCurrentLocale() {
    return localStorage.getItem('i18n.preferredLocale') || getSystemLocale();
}

/** A copy of {@link import('cftools/common/IntlTools.ts').getCurrentLocale} */
export function getSystemLocale(): string {
    const FALLBACK_LOCALE = defaultLocale;
    let locale: string | undefined;

    // Важно: сначала определяем выбранную локаль по настройкам из navigator
    //  Это сделано для того, чтобы можно было в настройках браузера поставить локаль, а в ОС оставить другую.
    //  Например: в ОС локаль американская, а в браузере включен русский язык по-умолчанию.
    // Дополнительно, в будущем, отдавать приоритет локали выбранной через выбор языка в WEB-интерфейсе.
    // Для определения текущей локали в браузере, должна быть отдельная функция, которая будет сначала вызывать
    //  Intl.DateTimeFormat().resolvedOptions().locale, а только потом смотреть настройки из navigator.
    if (typeof navigator !== 'undefined') {
        const { userAgent } = navigator;

        // JSDOM UserAgent string is like `Mozilla/5.0 (win32) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/16.5.3`
        if (!String(userAgent).includes(' jsdom/')) {
            // eslint-disable-next-line unicorn/consistent-destructuring
            if (navigator.languages && navigator.languages.length > 0) {
                // eslint-disable-next-line unicorn/consistent-destructuring
                locale = navigator.languages[0];
            }
            else {
                // eslint-disable-next-line unicorn/consistent-destructuring
                locale = navigator["userLanguage"] || navigator.language || navigator["browserLanguage"];
            }
        }
    }

    if (!locale) {
        try {
            locale = Intl.DateTimeFormat().resolvedOptions().locale;

            if (locale === 'und') {
                locale = void 0;
            }
        }
        catch {
            // ignore error
        }
    }

    if (!locale && typeof process !== 'undefined') {
        // It's works but only on linux or mac, not for Windows
        // For Windows - use systeminfo.exe (https://serverfault.com/questions/173630/how-to-get-system-locale-in-windows-7-cmd/173689)
        const { env } = process;

        // [Explain the effects of export LANG, LC_CTYPE, and LC_ALL](https://stackoverflow.com/a/30480596)
        locale = _filterNodeDefaultSystemLocale(env["LC_ALL"]) || _filterNodeDefaultSystemLocale(env["LC_MESSAGES"])
            // In most cases process.env.LANG should work. It will contain ISO 639-1 language code, ISO 3166-1 country code and encoding name.
            // However it can be overriden by different environment variables like LC_ALL, LC_MESSAGES etc.
            || _filterNodeDefaultSystemLocale(env["LANG"]) || _filterNodeDefaultSystemLocale(env["LANGUAGE"])
            // "LC_CTYPE" may exists on Windows
            || (env["WINDIR"] ? _filterNodeDefaultSystemLocale(env["LC_CTYPE"]) : void 0)
        ;
    }

    // if (!locale) {
    //     locale = /** @type {string} */(defaultLocale === void 0 ? FALLBACK_LOCALE : defaultLocale);
    // }

    locale = normalizeLocale(locale);

    // if (defaultLocale === void 0 && locale) {
    //     // default locale should be current browser/node locale
    //     defaultLocale = locale;
    // }

    return locale || FALLBACK_LOCALE;
}

function _filterNodeDefaultSystemLocale(locale: string | undefined) {
    if (!locale) {
        return void 0;
    }

    if (locale === 'C' || locale === 'c') {
        // https://docs.oracle.com/cd/E19253-01/817-2521/overview-1002/index.html
        // C Locale – the Default Locale
        // The C locale, also known as the POSIX locale, is the POSIX system default locale for all POSIX-compliant systems.
        // The Oracle Solaris operating system is a POSIX system. The Single UNIX Specification, Version 3, defines the C locale.
        // Register to read and download the specification at: http://www.unix.org/version3/online.html.
        return void 0;
    }

    return String(locale).trim();
}

// internal call for auto-detect current locale
getCurrentLocale();

/** A copy of {@link import('cftools/common/IntlTools.ts').normalizeLocale} */
export function normalizeLocale(locale: string) {
    locale = String(locale)
        // handle 'en_US.UTF-8' like string to 'en_US'
        .replace(/[.:].*/, '')
        // 'ru_RU' -> 'ru-RU'
        .replace('_', '-')
    ;

    if (locale.split('-').length === 2) {
        return locale;
    }

    switch (locale) {
        case 'ru':
            return 'ru-RU';
        case 'en':
            return 'en-US';
        case 'zh':
            return 'zh-CN';
        case 'ar':
            return 'ar-SA';
        case 'es':
            return 'es-ES';
        case 'pt':
            return 'pt-PT';
        case 'fr':
            return 'fr-FR';
        case 'de':
            return 'de-DE';
        case 'ja':
            return 'ja-JP';
        case 'ko':
            return 'ko-KR';
        case 'it':
            return 'it-IT';
        case 'nl':
            return 'nl-NL';
        case 'pl':
            return 'pl-PL';
        case 'hi':
            return 'hi-IN';
        case 'he':
            return 'he-IL';
        case 'tr':
            return 'tr-TR';
        case 'uk':
            return 'uk-UA';
        // todo: add more short locale -> long locale
    }

    return locale;
}

export function getLocaleInfo(localeCode: string): {
    locale: string,
    flag: string,
    language: string,
    region: string,
    textDirection: 'ltr' | 'rtl',
    __proto__: null,
} {
    const locale = new Intl.Locale(normalizeLocale(localeCode));
    const { language } = locale;
    const region = locale.region || '';
    const textInfo = locale.getTextInfo?.() ?? (locale.textInfo || {
        direction: "ltr",
    });
    const textDirection = textInfo.direction;
    let flag = '';

    if (region) {
        const char0 = region.codePointAt(0);
        const char1 = region.codePointAt(1);
        const position0 = char0 - regionBaseCodePoint;
        const position1 = char1 - regionBaseCodePoint;
        const unicodeFlagCodePoint0 = position0 + unicodeFlagBaseCodePoint;
        const unicodeFlagCodePoint1 = position1 + unicodeFlagBaseCodePoint;

        flag = String.fromCodePoint(unicodeFlagCodePoint0) + String.fromCodePoint(unicodeFlagCodePoint1);
    }

    return {
        locale: localeCode,
        flag,
        language,
        region,
        textDirection,
        __proto__: null,
    };
}

const _displayNamesMap = new Map<string, Intl.DisplayNames>();
const _displayNamesMap_newValue = function(locale: string) {
    return new Intl.DisplayNames([ locale ], { type: 'language' });
};

export function getLanguageName(languageCode: string, displayLocale: string) {
    return _displayNamesMap
        .getOrInsertComputed(displayLocale, _displayNamesMap_newValue)
        .of(languageCode)
    ;
}
