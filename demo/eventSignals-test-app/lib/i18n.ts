'use strict';

import '@termi/eventemitterx/utils/es2025.Intl.d.ts';
import '@termi/eventemitterx/utils/es2023.promise.d.ts';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error `TS2732: Cannot find module ../ static/ data/ capitals. json. Consider using --resolveJsonModule to import module with .json extension.`
import _capitals from '../static/data/capitals.json' assert { type: 'css' };

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
const capitals = _capitals as {
    capitalsList: string[],
    indexByLocale: Record<string, number>,
    indexByISOv2: Record<string, number>,
    timezonePrefixesList: string[],
    capitalTimezonesList: string[],
};

Object.freeze(Object.setPrototypeOf(capitals.indexByLocale, null));
Object.freeze(Object.setPrototypeOf(capitals.indexByISOv2, null));
Object.freeze(Object.setPrototypeOf(capitals, null));

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
            _fetchGoogleTranslateApi_currentRequest = promise.then(() => queuePromise, () => queuePromise);

            try {
                await promise;
            }
            catch {
                // ignore error
            }
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

    // eslint-disable-next-line promise/prefer-await-to-then
    promise.finally(() => {
        // В любом случае (resolve или reject) убираем текущую блокировку очереди.
        // todo: Если произошел reject по причине недоступности API, то некоторое время (5-10 секунд) не нужно больше пробовать совершать запрос к этому домену.
        if (_fetchGoogleTranslateApi_currentRequest === queuePromise) {
            _fetchGoogleTranslateApi_currentRequest = void 0;
        }

        queuePromiseResolve();
    });

    // todo: Тут может быть ошибка типа "TypeError: Failed to fetch". Воспроизводиться в браузере Edge.
    //  Более подробная ошибка из DevTools/Network: `net::ERR_SOCKS_CONNECTION_FAILED`
    //  Сейчас, если это промис падает с ошибкой, то сигнал для этого переводимого текста будет навсегда в состоянии pending
    //  (и будет всегда рендериться через AnimatedText).
    // Выполняем запрос
    const response = await promise;

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

    _saveTimers[locale] ??= setTimeout(_saveLocalStorageLocalizations.bind(null, locale), 15_000);
}

function _saveLocalStorageLocalizations(locale?: string) {
    if (locale != null) {
        if (!locale) {
            // eslint-disable-next-line no-debugger
            debugger;
        }

        if (_saveTimers[locale]) {
            clearTimeout(_saveTimers[locale]);
            delete _saveTimers[locale];
        }

        localStorage.setItem(`i18n.LocalizationStore.${locale}`, JSON.stringify(localStorageLocalizationsByLocaleMap.get(locale)));
    }
    else {
        for (const { 0: locale } of localStorageLocalizationsByLocaleMap) {
            if (!locale) {
                // eslint-disable-next-line no-debugger
                debugger;
            }

            if (_saveTimers[locale]) {
                clearTimeout(_saveTimers[locale]);
                delete _saveTimers[locale];
            }

            localStorage.setItem(`i18n.LocalizationStore.${locale}`, JSON.stringify(localStorageLocalizationsByLocaleMap.get(locale)));
        }
    }
}

if (typeof window !== 'undefined' && 'onbeforeunload' in window) {
    window.addEventListener('beforeunload', _saveLocalStorageLocalizations.bind(null, null));
}

export function getCurrentTimeZoneOffset() {
    return new Date().getTimezoneOffset();
}

export function getCurrentTimeZoneOffsetName(timeZone?: string) {
    const timeZoneFormatter = new Intl.DateTimeFormat(getCurrentLocale(), {
        timeZoneName: 'longOffset',
        timeZone,
    });
    const timeZoneParts = timeZoneFormatter.formatToParts(new Date());

    return timeZoneParts.find(part => part.type === 'timeZoneName')?.value || '';
}

export function getDefaultLocale() {
    return defaultLocale;
}

let _currentLocale: string | undefined;

// Получение текущей локали из localStorage или системной
export function getCurrentLocale() {
    if (_currentLocale) {
        return _currentLocale;
    }

    return _currentLocale = (localStorage.getItem('i18n.preferredLocale') || getSystemLocale());
}

export function setCurrentLocale(newCurrentLocale: string) {
    _currentLocale = newCurrentLocale;
}

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
        case 'bo':
            return 'bo-CN';
        // todo: add more short locale -> long locale
    }

    return locale;
}

const _getLocaleInfo_cache = new Map<string, ReturnType<typeof getLocaleInfo>>();

export function getLocaleInfo(localeCode: string, getExtendedInfo?: false): getLocaleInfo.Result;
export function getLocaleInfo(localeCode: string, getExtendedInfo: true): getLocaleInfo.ExtendedResult;
export function getLocaleInfo(localeCode: string, getExtendedInfo?: boolean): getLocaleInfo.ExtendedResult | getLocaleInfo.Result {
    const cacheKey = `${localeCode}-${getExtendedInfo || false}`;
    const cachedValue = _getLocaleInfo_cache.get(cacheKey);

    if (cachedValue) {
        return cachedValue;
    }

    const isNeedEmptyObject = !localeCode;

    if (isNeedEmptyObject) {
        localeCode = 'en-US';
    }

    const intlLocale = new Intl.Locale(normalizeLocale(localeCode));
    const { language } = intlLocale;
    const region = intlLocale.region || '';
    const textInfo = intlLocale.getTextInfo?.() ?? (intlLocale.textInfo || {
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

    const defaultNumberingSystem = _getLocaleDefaultNumberingSystem(localeCode);
    const numberFormatOptions = new Intl.NumberFormat(localeCode).resolvedOptions();

    numberFormatOptions.numberingSystem = defaultNumberingSystem;

    delete numberFormatOptions.locale;

    const result: getLocaleInfo.Result = {
        locale: localeCode,
        flag,
        language,
        region,
        defaultNumberingSystem,
        textDirection,
        numberFormatOptions,
        __proto__: null,
    };

    if (getExtendedInfo) {
        const _result = result as getLocaleInfo.ExtendedResult;
        const locale = `${result.language}-${result.region}`;
        const index = capitals.indexByLocale[locale];
        const capital = (index != null ? capitals.capitalsList[index] : null) || '';
        let defaultTimezone = (index != null ? capitals.capitalTimezonesList[index] : null) || '';

        defaultTimezone: if (defaultTimezone) {
            if (typeof defaultTimezone === 'number') {
                defaultTimezone = capitals.capitalTimezonesList[defaultTimezone];

                if (!defaultTimezone) {
                    break defaultTimezone;
                }
            }

            const defaultTimezone_pair = defaultTimezone.split('/');
            const timezonePrefixIndex = Number.parseInt(defaultTimezone_pair[0], 10) || 0;

            defaultTimezone = `${capitals.timezonePrefixesList[timezonePrefixIndex]}/${defaultTimezone_pair[1] === '*' ? capital.split(' ').join('_') : defaultTimezone_pair[1]}`;
        }

        _result.capital = capital;
        /**
         * В файле eventSignals-test-app/static/data/capitals.json название столицы сохранено на английском языке,
         *  а по-умолчанию у нас для переводов используется русский.
         */
        _result.capitalOriginateLocale = 'en-US';
        _result.defaultTimezone = defaultTimezone || 'UTC';
    }

    if (isNeedEmptyObject) {
        result.locale = '';
        result.flag = '';
        result.language = '';
        result.region = '';

        const _result = result as getLocaleInfo.ExtendedResult;

        if (_result.capital) {
            _result.capital = '';
        }
    }

    Object.freeze(Object.setPrototypeOf(numberFormatOptions, null));
    Object.freeze(Object.setPrototypeOf(result, null));

    _getLocaleInfo_cache.set(cacheKey, result as getLocaleInfo.ExtendedResult);

    return result;
}

export namespace getLocaleInfo {
    export type Result = {
        locale: string,
        flag: string,
        language: string,
        region: string,
        defaultNumberingSystem: string,
        textDirection: 'ltr' | 'rtl',
        // 'locale' Не нужен в numberFormatOptions, потому что для разных locale может быть объект с одинаковыми
        // значениями в numberFormatOptions. Что можно проверять при перерендере.
        numberFormatOptions: Omit<ConstructorParameters<typeof Intl["NumberFormat"]>[1], 'locale'>,
        __proto__: null,
    };

    export type ExtendedResult = Result & {
        capital: string,
        capitalOriginateLocale?: string,
        defaultTimezone: string,
    };
}

const _displayNamesMap = new Map<string, Intl.DisplayNames>();
const _displayNamesMap_newValue = function(locale: string) {
    return new Intl.DisplayNames(locale, { type: 'language' });
};

export function getLanguageName(languageCode: string, displayLocale: string) {
    const langName = _displayNamesMap
        .getOrInsertComputed(displayLocale, _displayNamesMap_newValue)
        .of(languageCode)
    ;

    if (langName.charCodeAt(0) === 98/*'bo '.charCodeAt(0)*/// eslint-disable-line unicorn/prefer-code-point,@typescript-eslint/no-magic-numbers
        && langName.charCodeAt(1) === 111/*'bo '.charCodeAt(1)*/// eslint-disable-line unicorn/prefer-code-point,@typescript-eslint/no-magic-numbers
        && langName.charCodeAt(2) === 32/*'bo '.charCodeAt(2)*/// eslint-disable-line unicorn/prefer-code-point,@typescript-eslint/no-magic-numbers
    ) {
        return 'Tibetan (China)';
    }

    return langName;
}

/**
 * Warning: This was AI generated! Do not blinded trust this!
 */
const numberingSystemByLocale = {
    // Арабский и родственные
    'ar': 'arab', 'ar-*': 'arab',           // Arabic
    'fa': 'arabext', 'fa-*': 'arabext',     // Persian (Eastern Arabic)
    'ps': 'arabext', 'ps-*': 'arabext',     // Pashto
    'ur': 'arabext', 'ur-*': 'arabext',     // Urdu
    'uz-Arab': 'arabext',                   // Uzbek (Arabic)

    // Тибетский
    'bo': 'tibt', 'bo-*': 'tibt',           // Tibetan
    'dz': 'tibt', 'dz-*': 'tibt',           // Dzongkha

    // Индийские языки (Brahmic scripts)
    'hi': 'deva', 'hi-*': 'deva',           // Hindi (Devanagari)
    'ne': 'deva', 'ne-*': 'deva',           // Nepali
    'mr': 'deva', 'mr-*': 'deva',           // Marathi
    'kok': 'deva', 'kok-*': 'deva',         // Konkani
    'sa': 'deva', 'sa-*': 'deva',           // Sanskrit

    'bn': 'beng', 'bn-*': 'beng',           // Bengali
    'as': 'beng', 'as-*': 'beng',           // Assamese

    'pa': 'guru', 'pa-*': 'guru',           // Punjabi (Gurmukhi)
    'pa-Arab': 'arabext',                   // Punjabi (Shahmukhi)

    'gu': 'gujr', 'gu-*': 'gujr',           // Gujarati

    'or': 'orya', 'or-*': 'orya',           // Odia

    'ta': 'taml', 'ta-*': 'taml',           // Tamil
    'te': 'telu', 'te-*': 'telu',           // Telugu
    'kn': 'knda', 'kn-*': 'knda',           // Kannada
    'ml': 'mlym', 'ml-*': 'mlym',           // Malayalam

    'si': 'sinh', 'si-*': 'sinh',           // Sinhala

    // Юго-Восточная Азия
    'my': 'mymr', 'my-*': 'mymr',           // Myanmar (Burmese)
    'km': 'khmr', 'km-*': 'khmr',           // Khmer
    'lo': 'laoo', 'lo-*': 'laoo',           // Lao
    'th': 'thai', 'th-*': 'thai',           // Thai

    // Восточная Азия
    'zh': 'hanidec', 'zh-*': 'hanidec',     // Chinese (Financial)
    'ja': 'jpan', 'ja-*': 'jpan',           // Japanese
    'ko': 'kore', 'ko-*': 'kore',           // Korean
    'ko-KP': 'kore',                        // Korean (North Korea)

    // Монгольский
    'mn': 'mong', 'mn-*': 'mong',           // Mongolian
    'mn-Mong': 'mong',                      // Mongolian (Traditional)
    'mn-Cyrl': 'cyrl',                      // Mongolian (Cyrillic)

    // Эфиопские языки
    'am': 'ethi', 'am-*': 'ethi',           // Amharic
    'ti': 'ethi', 'ti-*': 'ethi',           // Tigrinya

    // Коптский
    'cop': 'copt', 'cop-*': 'copt',

    // Грузинский
    'ka': 'geor', 'ka-*': 'geor',           // Georgian

    // Армянский
    'hy': 'armn', 'hy-*': 'armn',           // Armenian

    // Греческий
    'el': 'grek', 'el-*': 'grek',           // Greek

    // Иврит и идиш
    'he': 'hebr', 'he-*': 'hebr',           // Hebrew
    'yi': 'hebr', 'yi-*': 'hebr',           // Yiddish

    // Кириллица (для языков, которые могут использовать нелатинские цифры)
    'sr': 'cyrl', 'sr-*': 'cyrl',           // Serbian (Cyrillic)
    'mk': 'cyrl', 'mk-*': 'cyrl',           // Macedonian
    'bg': 'cyrl', 'bg-*': 'cyrl',           // Bulgarian
    'ru': 'cyrl', 'ru-*': 'cyrl',           // Russian
    'uk': 'cyrl', 'uk-*': 'cyrl',           // Ukrainian
    'be': 'cyrl', 'be-*': 'cyrl',           // Belarusian
    'kk': 'cyrl', 'kk-*': 'cyrl',           // Kazakh (Cyrillic)
    'ky': 'cyrl', 'ky-*': 'cyrl',           // Kyrgyz
    'tg': 'cyrl', 'tg-*': 'cyrl',           // Tajik

    // Особые случаи для Центральной Азии
    'ug': 'arabext', 'ug-*': 'arabext',     // Uyghur (Arabic script)

    // Языки с несколькими системами письменности
    'sd': 'arabext', 'sd-*': 'arabext',     // Sindhi (Arabic)
    'sd-Deva': 'deva',                      // Sindhi (Devanagari)

    'ks': 'arabext', 'ks-*': 'arabext',     // Kashmiri (Arabic)
    'ks-Deva': 'deva',                      // Kashmiri (Devanagari)

    // Африканские языки
    'nqo': 'nkoo', 'nqo-*': 'nkoo',         // N'Ko
    'vai': 'vaii', 'vai-*': 'vaii',         // Vai
    'ff-Adlm': 'adlm',                      // Fulah (Adlam)
    'shi-Tfng': 'tfng',                     // Tachelhit (Tifinagh)

    // Исторические системы
    'peo': 'xpeo',                          // Old Persian
    'egy': 'egyp',                          // Egyptian
    'sux': 'xsux',                          // Sumero-Akkadian
    'akk': 'xsux',                          // Akkadian

    // Современные с несколькими вариантами
    'ckb': 'arabext', 'ckb-*': 'arabext',   // Central Kurdish
    'ku-Arab': 'arabext',                   // Kurdish (Arabic)

    // Bali и родственные
    'ban': 'bali', 'ban-*': 'bali',         // Balinese
    'su': 'sund', 'su-*': 'sund',           // Sundanese
    'jv': 'java', 'jv-*': 'java',           // Javanese
    'mad': 'java', 'mad-*': 'java',         // Madurese

    // Бугийский
    'bug': 'bugi', 'bug-*': 'bugi',

    // Батак
    'bbc': 'batk', 'bbc-*': 'batk',         // Batak Toba
    'btd': 'batk', 'btd-*': 'batk',         // Batak Dairi

    // Редкие системы
    'lep': 'lepc',                          // Lepcha
    'lif': 'limb',                          // Limbu
    'sat': 'olck',                          // Santali
    'saz': 'saur',                          // Saurashtra
    'pra': 'prti',                          // Pahlavi
    'phn': 'phnx',                          // Phoenician
    'arc': 'armi',                          // Imperial Aramaic
    'pal': 'phli',                          // Inscriptional Pahlavi
    'xpr': 'prti',                          // Parthian
    'sog': 'sogo',                          // Sogdian
    'otk': 'orkh',                          // Old Turkic
    'cmg': 'mtei',                          // Classical Mongolian
};
/**
 * Маппинг для языков, которые могут использовать несколько систем.
 *
 * Warning: This was AI generated! Do not blinded trust this!
 */
const numberingSystemByLocale_scriptOverrides = {
    'zh-Hant': 'hanidec',   // Traditional Chinese
    'zh-Hans': 'hanidec',   // Simplified Chinese
    'zh-TW': 'hanidec',
    'zh-HK': 'hanidec',
    'zh-MO': 'hanidec',
    'zh-CN': 'hanidec',
    'zh-SG': 'hanidec',
    'ja-JP': 'jpan',
    'ko-KR': 'kore',
    'mn-MN': 'mong',
    'mn-CN': 'mong',
    'ug-CN': 'arabext',
    'ti-ER': 'ethi',
    'ti-ET': 'ethi',
};
/**
 * Региональные переопределения.
 *
 * Warning: This was AI generated! Do not blinded trust this!
 */
const numberingSystemByLocale_regionOverrides = {
    // Персидские/арабские цифры в определенных регионах
    'AF': 'arabext',    // Afghanistan
    'IR': 'arabext',    // Iran
    'PK': 'arabext',    // Pakistan
    'BD': 'beng',       // Bangladesh
    'NP': 'deva',       // Nepal
    'LK': 'sinh',       // Sri Lanka
    'MM': 'mymr',       // Myanmar
    'KH': 'khmr',       // Cambodia
    'LA': 'laoo',       // Laos
    'TH': 'thai',       // Thailand
    'ET': 'ethi',       // Ethiopia
    'AM': 'armn',       // Armenia
    'GE': 'geor',       // Georgia
    'GR': 'grek',       // Greece
    'IL': 'hebr',       // Israel
    'MN': 'mong',       // Mongolia
    'TJ': 'arabext',    // Tajikistan (Persian influence)
    'UZ': 'cyrl',       // Uzbekistan (Cyrillic)
    'UZ-Arab': 'arabext', // Uzbek (Arabic script)

    // Центральная Азия
    'CN-65': 'arabext', // Xinjiang (Uyghur)
    'CN-54': 'tibt',    // Tibet
    'CN-63': 'tibt',    // Qinghai (Tibetan areas)

    // Индийские штаты с официальными языками
    'IN-TG': 'telu',    // Telangana
    'IN-TN': 'taml',    // Tamil Nadu
    'IN-KA': 'knda',    // Karnataka
    'IN-KL': 'mlym',    // Kerala
    'IN-GJ': 'gujr',    // Gujarat
    'IN-MH': 'deva',    // Maharashtra
    'IN-WB': 'beng',    // West Bengal
    'IN-OR': 'orya',    // Odisha
    'IN-PB': 'guru',    // Punjab
    'IN-AS': 'beng',    // Assam
    'IN-ML': 'beng',    // Meghalaya (mostly, though English dominant)
};

Object.freeze(Object.setPrototypeOf(numberingSystemByLocale, null));
Object.freeze(Object.setPrototypeOf(numberingSystemByLocale_scriptOverrides, null));
Object.freeze(Object.setPrototypeOf(numberingSystemByLocale_regionOverrides, null));

const arabicRegions = new Set([ 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE', 'IQ', 'SY', 'JO', 'LB', 'PS', 'SD', 'MA', 'DZ', 'TN', 'LY', 'MR', 'DJ', 'SO' ]);
const cyrillicRegions = new Set([ 'RU', 'BY', 'UA', 'KZ', 'KG', 'MD', 'RS', 'ME', 'BA', 'MK', 'BG' ]);

function _getLocaleDefaultNumberingSystem(locale: string) {
    if (!locale || typeof locale !== 'string') {
        return 'latn';
    }

    // 1. Проверяем точное совпадение в scriptOverrides
    {
        const forceNumberingSystem = numberingSystemByLocale_scriptOverrides[locale];

        if (forceNumberingSystem) {
            return forceNumberingSystem;
        }
    }

    // 2. Пытаемся получить через Intl.Locale
    try {
        const loc = new Intl.Locale(locale);

        if (loc.numberingSystem) {
            return loc.numberingSystem;
        }
    }
    catch {
        // ignore
    }

    // 3. Проверяем региональные переопределения
    const parts = locale.split('-');

    if (parts.length >= 2) {
        const lang = parts[0];
        const region = parts[1].toUpperCase();

        // Проверяем региональное переопределение для языка-региона
        const langRegion = `${lang}-${region}`;
        const ns_by_langRegion = numberingSystemByLocale_regionOverrides[langRegion];

        if (ns_by_langRegion) {
            return ns_by_langRegion;
        }

        // Проверяем общее региональное переопределение
        const ns_by_region = numberingSystemByLocale_regionOverrides[region];

        if (ns_by_region) {
            return ns_by_region;
        }

        // Проверяем подрегион (например, CN-65 для Синьцзяна)
        if (parts.length >= 3) {
            const subRegion = `${region}-${parts[2]}`;
            const ns_by_subRegion = numberingSystemByLocale_regionOverrides[subRegion];

            if (ns_by_subRegion) {
                return ns_by_subRegion;
            }
        }
    }

    // 4. Ищем точное совпадение локали
    const default_ns_by_locale = numberingSystemByLocale[locale];

    if (default_ns_by_locale) {
        return default_ns_by_locale;
    }

    // 5. Ищем по языку с wildcard
    const lang = locale.split('-')[0];
    const wildcardKey = `${lang}-*`;
    const default_ns_by_langWildcardKey = numberingSystemByLocale[wildcardKey];

    if (default_ns_by_langWildcardKey) {
        return default_ns_by_langWildcardKey;
    }

    // 6. Ищем только по языку
    const default_ns_by_lang = numberingSystemByLocale[lang];

    if (default_ns_by_lang) {
        return default_ns_by_lang;
    }

    // 7. Проверяем script-тег в локали
    const scriptMatch = locale.match(/-([A-Z][a-z]{3})/);

    if (scriptMatch) {
        const script = scriptMatch[1];
        const scriptKey = `${lang}-${script}`;
        const default_ns_by_scriptKey = numberingSystemByLocale[scriptKey];

        if (default_ns_by_scriptKey) {
            return default_ns_by_scriptKey;
        }
    }

    // 8. Фолбэк на основе региона
    if (parts.length >= 2) {
        const region = parts[1].toUpperCase();

        // Регионы, где часто используются арабские цифры
        if (arabicRegions.has(region)) {
            return 'arab';
        }

        // Регионы с кириллицей
        if (cyrillicRegions.has(region)) {
            return 'cyrl';
        }
    }

    return 'latn'; // стандартная система по умолчанию
}
