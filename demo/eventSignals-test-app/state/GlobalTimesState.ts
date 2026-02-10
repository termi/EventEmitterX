/* eslint-disable @typescript-eslint/no-magic-numbers */
'use strict';

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';
import hashSum from 'cftools/common/hashSum';
import { throttle } from 'cftools/common/FunctionTools';

import { currentLocale$ } from "./i18n";
import { getCurrentTimeZoneOffset, getLocaleInfo } from "../lib/i18n";

const componentTypeGlobalTimesList = Symbol('GlobalTimes/List');
const componentTypeGlobalTimesCity = Symbol('GlobalTimes/City');

export const mostPopularCities$ = new EventSignal(
    [] as mostPopularCities$.CityDescription$[],
    function(prevMostPopularCitiesList) {
        // Обязательно нужно уничтожить предыдущие сигналы, иначе они будут висеть в памяти процесса бесконечно (будет утечка памяти).
        // todo: Разработать механизм автоматической очистки и/или Weak-подписок.
        for (const cityDescription$ of prevMostPopularCitiesList) {
            cityDescription$.destructor();
        }

        const mostPopularCitiesList = getMostPopularCities(currentLocale$.get());

        return mostPopularCitiesList.map(cityDescription => {
            return _makeCityTime$$(cityDescription);
        });
    }, {
        description: 'mostPopularCities',
        componentType: componentTypeGlobalTimesList,
        data: {
            elementsComponentType: componentTypeGlobalTimesCity,
        },
    }
);

export namespace mostPopularCities$ {
    export type CityDescription$ = ReturnType<typeof _makeCityTime$$>;
}

/**
 * @example Use custom date
 * nowDate$.set(new Date('2025-12-10T00:19:48.581Z').getTime());
 * @example Use system date
 * nowDate$.set(null);
 */
export const nowDate$ = new EventSignal(new Date(), (prevNow, customNow, eventSignal) => {
    return new Date(customNow
        ? (eventSignal.getStateFlags() & EventSignal.StateFlags.wasSourceSetting) !== 0
            ? customNow
            : (prevNow.getTime() + 1000)
        : Date.now()
    );
}, {
    description: 'nowDate',
    initialSourceValue: null as Date | number | null,
    data: {
        reset: () => {
            nowDate$.set(null);
        },
    },
    trigger: {
        type: 'clock',
        ms: 1000,
        timerGroupId: componentTypeGlobalTimesCity,
    },
});

const _dnCacheOnNew = function(locale: string) {
    return Object.assign(new Intl.DisplayNames(locale, _DisplayNames_options), {
        getByRegionCodeSafe(regionCode: string) {
            try {
                return this.of(regionCode.toUpperCase()) as string;
            }
            catch {
                // ignore
            }

            return void 0;
        },
    });
};
const _dnCache = Object.assign(new Map<string, ReturnType<typeof _dnCacheOnNew>>(), {
    getOrNew(key: string) {
        return this.getOrInsertComputed(key, _dnCacheOnNew) as ReturnType<typeof _dnCacheOnNew>;
    },
});
const _DisplayNames_options: Intl.DisplayNamesOptions = Object.freeze(Object.setPrototypeOf({
    type: 'region',
} satisfies Intl.DisplayNamesOptions, null));

function _makeCityTime$$(cityDescription: RawCityDescription) {
    const id = hashSum([
        cityDescription.name,
        cityDescription.locale,
        cityDescription.country,
    ]);
    let timeOfDay: TimeOfDay = 'day';

    const cityTime$ = new EventSignal({} as CityDescription, function(prev, rawCityDescription) {
        const currentLocale = currentLocale$.get();
        const regionNames = _dnCache.getOrNew(currentLocale);
        const nowDate = nowDate$.get();
        const timeInfo = formatLocalTime(rawCityDescription, nowDate);

        timeOfDay = timeInfo.timeOfDay;

        const country = regionNames.getByRegionCodeSafe(rawCityDescription.localeInfo.region) || rawCityDescription.country;
        const cityDescription: CityDescription = {
            id,
            ...rawCityDescription,
            country,
            enable: prev.enable ?? true,
            timeOfDay,
            dayLightSign: timeInfo.dayLightSign,
            date: timeInfo.date,
            time: timeInfo.time,
            timeZoneName: timeInfo.timeZoneName,
            __proto__: null,
        };

        return cityDescription;
    }, {
        description: `cityTime#${cityDescription.name}`,
        initialSourceValue: cityDescription,
        componentType: componentTypeGlobalTimesCity,
        data: {
            initCanvasAnimation: ($canvas: HTMLCanvasElement | null) => {
                if (typeof document === 'undefined' || !$canvas) {
                    return;
                }

                // Удаляем старую анимацию, если существует
                canvasAnimations.get($canvas)?.destructor();

                // Создаем новую анимацию
                const animation = new TimeCanvas($canvas, timeOfDay, {
                    elementsObserverManager,
                });

                canvasAnimations.set($canvas, animation);
                cityTime$.addListener(animation.updateTimeOfDayFromObject);

                return () => {
                    canvasAnimations.delete($canvas);
                    animation.destructor();
                    cityTime$.removeListener(animation.updateTimeOfDayFromObject);
                };
            },
        },
    });

    return cityTime$;
}

const currentTimeZoneOffset = getCurrentTimeZoneOffset();

type TimeOfDay = 'day' | 'evening' | 'morning' | 'night';

type CityDescription = RawCityDescription & {
    id: string,
    enable: boolean,
    timeOfDay: TimeOfDay,
    dayLightSign: string,
    time: string,
    date: string,
    timeZoneName: string,
    __proto__: null,
};

type RawCityDescription = {
    name: string,
    nameLocale?: string,
    country: string,
    timeZone: string,
    timeZoneOffset: number,
    locale: string,
    flag: string,
    isCapital?: boolean,
    isCurrentOffset: boolean,
    localeInfo: ReturnType<typeof getLocaleInfo>,
    h23localTimeFormatOptions: Intl.DateTimeFormatOptions,
    timeFormatOptions: Intl.DateTimeFormatOptions,
    dateFormatOptions: Intl.DateTimeFormatOptions,
};

const _formattersCacheMap = new Map<string, Intl.DateTimeFormat>();

function formatLocalTime(city: RawCityDescription, nowDate = new Date(Date.now())) {
    const {
        locale,
        timeZone,
    } = city;
    // Форматируем время и дату
    const h23localTime = nowDate.toLocaleTimeString(locale, city.h23localTimeFormatOptions);
    const time = nowDate.toLocaleTimeString(locale, city.timeFormatOptions);
    const date = nowDate.toLocaleDateString(locale, city.dateFormatOptions);

    // Получаем смещение часового пояса
    const timeZoneFormatter = _formattersCacheMap.getOrInsertComputed(`${locale}-${timeZone}`, () => {
        return new Intl.DateTimeFormat(locale, {
            timeZone,
            timeZoneName: 'longOffset',
        });
    });
    const timeZoneParts = timeZoneFormatter.formatToParts(nowDate);
    const timeZoneName = timeZoneParts.find(part => part.type === 'timeZoneName')?.value || timeZone;

    // Определяем, день сейчас или ночь
    const currentHour = Number.parseInt(h23localTime.split(':')[0]);
    // Определяем время суток
    const timeOfDay: TimeOfDay = currentHour >= 5 && currentHour < 12 ? 'morning'
        : currentHour >= 12 && currentHour < 17 ? 'day'
        : currentHour >= 17 && currentHour < 22 ? 'evening'
        : 'night'
    ;
    const dayLightSign = timeOfDay === 'morning' ? '🌅'
        : timeOfDay === 'day' ? '☀️'
        : timeOfDay === 'evening' ? '🌇'
        : timeOfDay === 'night' ? '🌙'
        : '🕐'
    ;

    return {
        time,
        date,
        timeOfDay,
        dayLightSign,
        timeZoneName,
        __proto__: null,
    };
}

const minusSign2212 = '\u{2212}';
const re_HoursString = /^([0-2]?\d)$/;
const re_HoursMinutesString = /^([0-2]?\d):([0-5]\d)$/;

function _parseHoursMinutesStringToOffset(timeZoneHoursMinutesString: string) {
    if (!timeZoneHoursMinutesString) {
        return Number.NaN;
    }

    let _string = String(timeZoneHoursMinutesString).trim().toUpperCase();

    if (_string.startsWith('GMT') || _string.startsWith('UTC')) {
        if (_string === 'GMT' || _string === 'UTC') {
            return 0;
        }

        // todo: Есть какая-то разница ТУТ между 'GMT' и 'UTC'?
        _string = _string.substring(3);
    }

    const firstSymbol = _string.at(0);
    const isNegative = firstSymbol === '-' || firstSymbol === minusSign2212;
    const hasPlusSymbol = !isNegative && _string.at(0) === '+';

    if (isNegative || hasPlusSymbol) {
        _string = _string.substring(1);
    }

    const match = _string.match(re_HoursMinutesString) || _string.match(re_HoursString);

    if (match) {
        const hours = Number.parseInt((match[1] as string), 10);
        const minutes = Number.parseInt(match[2] || '0', 10);

        if (_isValidHour(hours) && _isValidMinute(minutes)) {
            return ((hours * 60) + minutes) * (isNegative ? 1 : -1);
        }
    }

    return Number.NaN;
}

const LAST_HOUR_IN_DAY = 23;
const LAST_MINUTE_IN_HOUR = 59;
// const LAST_SECOND_IN_MINUTE = 59;
// const LAST_MS_IN_SECOND = 999;

function _isValidHour(hoursNumber: number | unknown): hoursNumber is Hours {
    return typeof hoursNumber === 'number'
        && hoursNumber >= 0 && hoursNumber <= LAST_HOUR_IN_DAY
    ;
}

function _isValidMinute(minutesNumber: number | unknown): minutesNumber is From_0_To_59 {
    return typeof minutesNumber === 'number'
        && minutesNumber >= 0 && minutesNumber <= LAST_MINUTE_IN_HOUR
    ;
}

type Hours =
    | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
    | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23
;
type From_0_To_59 =
    | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
    | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19
    | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29
    | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39
    | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49
    | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59
    ;

// Список популярных городов с их временными зонами и локалями
function getMostPopularCities(currentLocale: string): RawCityDescription[] {
    const date = new Date();
    const mostPopularCities: RawCityDescription[] = ([
        {
            name: "Токио",
            country: "Япония",
            timeZone: "Asia/Tokyo",
            locale: "ja-JP",
            flag: "🇯🇵",
            isCapital: true,
        },
        {
            name: "Пекин",
            country: "Китай",
            timeZone: "Asia/Shanghai",
            locale: "zh-CN",
            flag: "🇨🇳",
            isCapital: true,
        },
        {
            name: "Сингапур",
            country: "Сингапур",
            timeZone: "Asia/Singapore",
            locale: "en-SG",
            flag: "🇸🇬",
            isCapital: true,
        },
        {
            name: "Москва",
            country: "Россия",
            timeZone: "Europe/Moscow",
            locale: "ru-RU",
            flag: "🇷🇺",
            isCapital: true,
        },
        {
            name: "Дубай",
            country: "ОАЭ",
            timeZone: "Asia/Dubai",
            locale: "ar-AE",
            flag: "🇦🇪",
        },
        {
            name: "Париж",
            country: "Франция",
            timeZone: "Europe/Paris",
            locale: "fr-FR",
            flag: "🇫🇷",
            isCapital: true,
        },
        {
            name: "Лондон",
            country: "Великобритания",
            timeZone: "Europe/London",
            locale: "en-GB",
            flag: "🇬🇧",
            isCapital: true,
        },
        {
            name: "Нью-Йорк",
            country: "США",
            timeZone: "America/New_York",
            locale: "en-US",
            flag: "🇺🇸",
        },
        {
            name: "Лос-Анджелес",
            country: "США",
            timeZone: "America/Los_Angeles",
            locale: "en-US",
            flag: "🇺🇸",
        },
        {
            name: "Торонто",
            country: "Канада",
            timeZone: "America/Toronto",
            locale: "en-CA",
            flag: "🇨🇦",
        },
        {
            name: "Сидней",
            country: "Австралия",
            timeZone: "Australia/Sydney",
            locale: "en-AU",
            flag: "🇦🇺",
        },
        {
            name: "Йоханнесбург",
            country: "ЮАР",
            timeZone: "Africa/Johannesburg",
            locale: "en-ZA",
            flag: "🇿🇦",
        },
        {
            name: "Мумбаи",
            country: "Индия",
            timeZone: "Asia/Kolkata",
            locale: "hi-IN",
            flag: "🇮🇳",
        },
        {
            name: "Сан-Паулу",
            country: "Бразилия",
            timeZone: "America/Sao_Paulo",
            locale: "pt-BR",
            flag: "🇧🇷",
        },
        {
            name: "Мехико",
            country: "Мексика",
            timeZone: "America/Mexico_City",
            locale: "es-MX",
            flag: "🇲🇽",
            isCapital: true,
        },
        {
            name: "Чэнгуань (Лхаса)",
            country: "Китай",
            timeZone: "Asia/Shanghai",
            locale: "bo-CN",
            flag: "",
        },
        {
            name: "",
            country: "",
            timeZone: "",
            locale: "ko-KP",
            flag: "",
        },
    ] as RawCityDescription[]);

    if (!mostPopularCities.some(cityDescription => {
        return cityDescription.locale === currentLocale;
    })) {
        const localeInfo = getLocaleInfo(currentLocale, true);
        const timeZone = localeInfo.defaultTimezone;
        const cityDescription = {
            name: localeInfo.capital,
            nameLocale: localeInfo.capitalOriginateLocale,
            country: '',
            timeZone,
            locale: currentLocale,
            flag: localeInfo.flag,
            isCapital: true,
            localeInfo,
        } as RawCityDescription;

        mostPopularCities.push(cityDescription);
    }

    for (const cityDescription of mostPopularCities) {
        const localeInfo = getLocaleInfo(cityDescription.locale, true);

        cityDescription.localeInfo = localeInfo;

        if (!cityDescription.name) {
            cityDescription.name = localeInfo.capital;
            cityDescription.nameLocale = localeInfo.capitalOriginateLocale;
        }

        cityDescription.timeZone ||= localeInfo.defaultTimezone;
        cityDescription.flag ||= localeInfo.flag;
        cityDescription.isCapital ??= cityDescription.name === localeInfo.capital;

        const { timeZone } = cityDescription;
        const f1 = cityDescription.h23localTimeFormatOptions = { timeZone, timeStyle: 'short', hour12: false };
        const f2 = cityDescription.timeFormatOptions = { timeZone, timeStyle: 'medium', numberingSystem: localeInfo.defaultNumberingSystem };
        const f3 = cityDescription.dateFormatOptions = { timeZone, dateStyle: 'full', numberingSystem: localeInfo.defaultNumberingSystem };

        Object.freeze(Object.setPrototypeOf(f1, null));
        Object.freeze(Object.setPrototypeOf(f2, null));
        Object.freeze(Object.setPrototypeOf(f3, null));

        const enUSIimeZoneFormatter = _formattersCacheMap.getOrInsertComputed(`en-US-${timeZone}`, () => {
            return new Intl.DateTimeFormat('en-US', {
                timeZone,
                timeZoneName: 'longOffset',
            });
        });
        const enUSTimeZoneParts = enUSIimeZoneFormatter.formatToParts(date);
        const enUSTimeZoneName = enUSTimeZoneParts.find(part => part.type === 'timeZoneName')?.value;
        const timeZoneOffset = _parseHoursMinutesStringToOffset(enUSTimeZoneName);

        cityDescription.timeZoneOffset = timeZoneOffset;
        cityDescription.isCurrentOffset = timeZoneOffset === currentTimeZoneOffset;
    }

    // Сортируем города по часовому поясу (по UTC смещению)
    return mostPopularCities.sort((a, b) => {
        return b.timeZoneOffset - a.timeZoneOffset;
    });
}

// Canvas анимации для разных времён суток
class TimeCanvas {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    timeOfDay: TimeOfDay;
    particles: {
        x: number,
        y: number,
        size: number,
        speedX: number,
        speedY: number,
        opacity: number,
        __proto__: null,
    }[] = [];
    animationId = 0;
    _resizeObserver: ResizeObserver | null = null;
    _unobserveElement: (() => void) | undefined;
    /** A throttle version of {@link this.resizeCanvas} */
    _resizeCanvas: () => void;
    /*
    _wasFirstDraw = false;
    */
    _isDestroyed = false;

    constructor(canvas: HTMLCanvasElement, timeOfDay: TimeOfDay, options?: {
        elementsObserverManager: HTMLElementsObserverManager,
    }) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.timeOfDay = timeOfDay;
        this._resizeObserver = null;
        this._resizeCanvas = throttle(this.resizeCanvas, 300, this);

        this.init(options?.elementsObserverManager);
    }

    destructor() {
        this._isDestroyed = true;

        this.stopAnimation();

        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
        this._unobserveElement?.();
        this._unobserveElement = void 0;
    }

    [Symbol.dispose] = () => {
        this.destructor();
    };

    init(elementsObserverManager: HTMLElementsObserverManager | undefined) {
        this.resizeCanvas();
        this.createParticles();
        this.startAnimation();

        const { parentElement } = this.canvas;

        if (typeof ResizeObserver !== 'undefined') {
            // Обработчик изменения размера
            const resizeObserver = this._resizeObserver = new ResizeObserver(this._resizeCanvas);

            resizeObserver.observe(parentElement);
        }

        this._unobserveElement = elementsObserverManager?.observeElement(parentElement, this.onVisibilityChanges);
    }

    resizeCanvas() {
        const { canvas } = this;

        const container = canvas.parentElement;

        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    createParticles() {
        const { canvas } = this;

        this.particles = [];

        const particleCount = this.timeOfDay === 'night' ? 100 : 50;

        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.3,
                __proto__: null,
            });
        }
    }

    draw() {
        /*
        this._wasFirstDraw = true;

        */
        const { ctx, canvas, timeOfDay } = this;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Фон в зависимости от времени суток
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);

        switch (timeOfDay) {
            case 'morning':
                gradient.addColorStop(0, 'rgba(100, 200, 255, 0.03)');
                gradient.addColorStop(1, 'rgba(50, 150, 255, 0.03)');

                break;
            case 'day':
                gradient.addColorStop(0, 'rgba(255, 200, 100, 0.05)');
                gradient.addColorStop(1, 'rgba(255, 150, 50, 0.05)');

                break;
            case 'evening':
                gradient.addColorStop(0, 'rgba(255, 100, 150, 0.04)');
                gradient.addColorStop(1, 'rgba(200, 50, 100, 0.04)');

                break;
            case 'night':
                gradient.addColorStop(0, 'rgba(50, 50, 100, 0.05)');
                gradient.addColorStop(1, 'rgba(20, 20, 50, 0.05)');

                break;
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Рисуем частицы
        for (const particle of this.particles) {
            // Обновляем позицию
            particle.x += particle.speedX;
            particle.y += particle.speedY;

            // Отскок от краёв
            if (particle.x < 0 || particle.x > canvas.width) {
                particle.speedX *= -1;
            }
            if (particle.y < 0 || particle.y > canvas.height) {
                particle.speedY *= -1;
            }

            // Цвет частиц в зависимости от времени суток
            let color: string;

            switch (timeOfDay) {
                case 'morning':
                    color = `rgba(100, 200, 255, ${particle.opacity})`;

                    break;
                case 'day':
                    color = `rgba(255, 200, 100, ${particle.opacity})`;

                    break;
                case 'evening':
                    color = `rgba(255, 100, 150, ${particle.opacity})`;

                    break;
                case 'night':
                    color = `rgba(255, 255, 255, ${particle.opacity})`;

                    break;
            }

            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    startAnimation() {
        if (this._isDestroyed) {
            return;
        }

        this.stopAnimation();

        const animate = () => {
            this.draw();
            this.animationId = requestAnimationFrame(animate);
        };

        animate();
    }

    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = 0;
        }
    }

    onVisibilityChanges = (entry: IntersectionObserverEntry) => {
        if (entry.isIntersecting) {
            if (!this.animationId) {
                this.startAnimation();
            }
        }
        else {
            if (this.animationId) {
                this.stopAnimation();
            }
            /*

            if (!this._wasFirstDraw) {
                this.draw();
            }
            */
        }
    };

    updateTimeOfDayFromObject = (obj: { timeOfDay: TimeOfDay }) => {
        this.updateTimeOfDay(obj.timeOfDay);
    };

    updateTimeOfDay(timeOfDay: TimeOfDay) {
        if (this.timeOfDay !== timeOfDay) {
            this.timeOfDay = timeOfDay;
        }
    }
}

// Хранилище canvas анимаций
const canvasAnimations = new Map<HTMLCanvasElement, TimeCanvas>();

type _IntersectionObserver = IntersectionObserver & { elements: Set<Element> };

class HTMLElementsObserverManager {
    observersByRoot = new Map<HTMLElement, _IntersectionObserver>();
    visibilityChanges = new Map<Element, (entry: IntersectionObserverEntry) => void>();

    constructor() {
        //
    }

    destructor() {
        this.disconnectAll();
    }

    [Symbol.dispose] = () => {
        this.destructor();
    };

    observeElement(element: HTMLElement, onVisibilityChanges: (entry: IntersectionObserverEntry) => void, container: HTMLElement | null = null) {
        if (!element || typeof IntersectionObserver === 'undefined') {
            return () => {};
        }

        const root = container || document.documentElement;
        let observer = this.observersByRoot.get(root);

        if (!observer) {
            observer = new IntersectionObserver(
                this.handleCanvasVisibility,
                {
                    root: root === document.documentElement ? void 0 : root,
                    // // Срабатываем при 10% видимости
                    // threshold: 0.1,
                    // // Начинаем заранее для плавности
                    // rootMargin: '50px',

                    // Срабатываем при 90% видимости для очевидности работы
                    threshold: 0.9,
                },
            ) as _IntersectionObserver;
            this.observersByRoot.set(root, observer);

            observer.elements = new Set<Element>();
        }

        this.visibilityChanges.set(element, onVisibilityChanges);
        observer.observe(element);
        observer.elements.add(element);

        // cleanupElement
        return () => {
            this.visibilityChanges.delete(element);
            observer.unobserve(element);
            observer.elements.delete(element);

            if (observer.elements.size === 0) {
                this.cleanupObserver(root, observer);
            }
        };
    }

    handleCanvasVisibility = (entries: IntersectionObserverEntry[]) => {
        const { visibilityChanges } = this;

        for (const entry of entries) {
            visibilityChanges.get(entry.target)?.(entry);
        }
    };

    cleanupObserver(container: HTMLElement, observer: _IntersectionObserver) {
        const { observersByRoot, visibilityChanges } = this;

        observer.disconnect();
        observersByRoot.delete(container);

        if (observer.elements?.size) {
            for (const element of observer.elements) {
                visibilityChanges.delete(element);
            }

            observer.elements.clear();
        }
    }

    // Явная очистка при удалении контейнера
    cleanupContainer(container: HTMLElement) {
        const { observersByRoot } = this;
        const observer = observersByRoot.get(container);

        if (observer) {
            this.cleanupObserver(container, observer);
        }
    }

    // Автоматическая очистка всех
    disconnectAll() {
        const { observersByRoot, visibilityChanges } = this;

        for (const { 1: observer } of observersByRoot) {
            if (observer) {
                observer.disconnect();
                observer.elements?.clear();
            }
        }

        observersByRoot.clear();
        visibilityChanges.clear();
    }
}

const elementsObserverManager = new HTMLElementsObserverManager();

// // При монтировании canvas
// const unobserve = elementsObserverManager.observeElement(canvas, scrollContainer);
//
// // При размонтировании контейнера
// elementsObserverManager.cleanupContainer(scrollContainer);

Object.assign(globalThis, {
    __test__canvasAnimations: canvasAnimations,
    __test__nowTime$: nowDate$,
    __test__elementsObserverManager: elementsObserverManager,
});

// https://www.w3schools.com/charsets/ref_utf_misc_symbols.asp
/*
🕐	128336	1F550	CLOCK FACE ONE OCLOCK
🕑	128337	1F551	CLOCK FACE TWO OCLOCK
🕒	128338	1F552	CLOCK FACE THREE OCLOCK
🕓	128339	1F553	CLOCK FACE FOUR OCLOCK
🕔	128340	1F554	CLOCK FACE FIVE OCLOCK
🕕	128341	1F555	CLOCK FACE SIX OCLOCK
🕖	128342	1F556	CLOCK FACE SEVEN OCLOCK
🕗	128343	1F557	CLOCK FACE EIGHT OCLOCK
🕘	128344	1F558	CLOCK FACE NINE OCLOCK
🕙	128345	1F559	CLOCK FACE TEN OCLOCK
🕚	128346	1F55A	CLOCK FACE ELEVEN OCLOCK
🕛	128347	1F55B	CLOCK FACE TWELVE OCLOCK
🕜	128348	1F55C	CLOCK FACE ONE-THIRTY
🕝	128349	1F55D	CLOCK FACE TWO-THIRTY
🕞	128350	1F55E	CLOCK FACE THREE-THIRTY
🕟	128351	1F55F	CLOCK FACE FOUR-THIRTY
🕠	128352	1F560	CLOCK FACE FIVE-THIRTY
🕡	128353	1F561	CLOCK FACE SIX-THIRTY
🕢	128354	1F562	CLOCK FACE SEVEN-THIRTY
🕣	128355	1F563	CLOCK FACE EIGHT-THIRTY
🕤	128356	1F564	CLOCK FACE NINE-THIRTY
🕥	128357	1F565	CLOCK FACE TEN-THIRTY
🕦	128358	1F566	CLOCK FACE ELEVEN-THIRTY
🕧	128359	1F567	CLOCK FACE TWELVE-THIRTY
*/
