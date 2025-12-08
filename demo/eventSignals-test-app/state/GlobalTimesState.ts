/* eslint-disable @typescript-eslint/no-magic-numbers */
'use strict';

import { EventSignal } from '~/modules/EventEmitterEx/EventSignal';
import hashSum from 'cftools/common/hashSum';
import { throttle } from 'cftools/common/FunctionTools';

const componentTypeGlobalTimesList = Symbol('GlobalTimes/List');
const componentTypeGlobalTimesCity = Symbol('GlobalTimes/City');

export const mostPopularCities$ = new EventSignal(
    [] as mostPopularCities$.CityDescriptionEventSignal[],
    function(_prev, mostPopularCitiesList) {
        return mostPopularCitiesList.map(cityDescription => {
            return _makeCityTimeSignal(cityDescription);
        });
    }, {
        initialSourceValue: getMostPopularCities(),
        componentType: componentTypeGlobalTimesList,
        data: {
            elementsComponentType: componentTypeGlobalTimesCity,
        },
    }
);

export namespace mostPopularCities$ {
    export type CityDescriptionEventSignal = ReturnType<typeof _makeCityTimeSignal>;
}

function _makeCityTimeSignal(cityDescription: RawCityDescription) {
    const id = hashSum([
        cityDescription.name,
        cityDescription.locale,
        cityDescription.country,
    ]);
    let timeOfDay: TimeOfDay = 'day';

    return new EventSignal({} as CityDescription, function(prev, rawCityDescription) {
        const timeInfo = formatLocalTime(rawCityDescription);

        timeOfDay = timeInfo.timeOfDay;

        const cityDescription: CityDescription = {
            id,
            ...rawCityDescription,
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
        initialSourceValue: cityDescription,
        componentType: componentTypeGlobalTimesCity,
        trigger: {
            type: 'clock',
            ms: 1000,
            timerGroupId: componentTypeGlobalTimesCity,
        },
        data: {
            initCanvasAnimation: ($canvas: HTMLCanvasElement | null) => {
                if (typeof document === 'undefined' || !$canvas) {
                    return;
                }

                // Удаляем старую анимацию, если существует
                if (canvasAnimations.has($canvas)) {
                    canvasAnimations.get($canvas).destroy();
                }

                // Создаем новую анимацию
                const animation = new TimeCanvas($canvas, timeOfDay);

                canvasAnimations.set($canvas, animation);
            },
            cancelCanvasAnimation: ($canvas: HTMLCanvasElement | null) => {
                if ($canvas) {
                    canvasAnimations.get($canvas)?.destroy();
                    canvasAnimations.delete($canvas);
                }
            },
        },
    });
}

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
    country: string,
    timeZone: string,
    locale: string,
    flag: string,
};

function formatLocalTime(city: RawCityDescription, nowDate = new Date()) {
    // const timeFormatter = new Intl.DateTimeFormat(city.locale, {
    //     timeZone: city.timeZone,
    //     // hour: '2-digit',
    //     // minute: '2-digit',
    //     // second: '2-digit',
    //     // hour12: false,
    // });
    // timeFormatter.format(nowDate);
    // const dateFormatter = new Intl.DateTimeFormat(city.locale, {
    //     timeZone: city.timeZone,
    //     // weekday: 'long',
    //     // year: 'numeric',
    //     // month: 'long',
    //     // day: 'numeric',
    // });
    // dateFormatter.format(nowDate);

    // Форматируем время и дату
    const h23localTime = nowDate.toLocaleTimeString(city.locale, { timeZone: city.timeZone, timeStyle: 'short', hour12: false });
    const time = nowDate.toLocaleTimeString(city.locale, { timeZone: city.timeZone, timeStyle: 'medium' });
    const date = nowDate.toLocaleDateString(city.locale, { timeZone: city.timeZone, dateStyle: 'full' });

    // Получаем смещение часового пояса
    const timeZoneFormatter = new Intl.DateTimeFormat(city.locale, {
        timeZone: city.timeZone,
        timeZoneName: 'longOffset',
    });

    const timeZoneParts = timeZoneFormatter.formatToParts(nowDate);
    const timeZoneName = timeZoneParts.find(part => part.type === 'timeZoneName')?.value || city.timeZone;

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
        formatted: `${time}`,
        __proto__: null,
    };
}

// Список популярных городов с их временными зонами и локалями
function getMostPopularCities(): RawCityDescription[] {
    const date = new Date();
    const regionNames = new Intl.DisplayNames(void 0, { type: 'region' });

    return [
        {
            name: "Токио",
            country: "Япония",
            timeZone: "Asia/Tokyo",
            locale: "ja-JP",
            flag: "🇯🇵",
        },
        {
            name: "Пекин",
            country: "Китай",
            timeZone: "Asia/Shanghai",
            locale: "zh-CN",
            flag: "🇨🇳",
        },
        {
            name: "Сингапур",
            country: "Сингапур",
            timeZone: "Asia/Singapore",
            locale: "en-SG",
            flag: "🇸🇬",
        },
        {
            name: "Москва",
            country: "Россия",
            timeZone: "Europe/Moscow",
            locale: "ru-RU",
            flag: "🇷🇺",
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
        },
        {
            name: "Лондон",
            country: "Великобритания",
            timeZone: "Europe/London",
            locale: "en-GB",
            flag: "🇬🇧",
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
        },
        // Сортируем города по часовому поясу (по UTC смещению)
    ].sort((a, b) => {
        const timeA = date.toLocaleString('en-US', { timeZone: a.timeZone });
        const timeB = date.toLocaleString('en-US', { timeZone: b.timeZone });

        return new Date(timeA).getTime() - new Date(timeB).getTime();
    }).map(city => {
        const {
            timeZone,
        } = city;
        const countryCode = timeZone.split('-')[1];

        try {
            city.country = regionNames.of(countryCode.toUpperCase());
        }
        catch {
            // ignore
        }

        return city;
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
    resizeObserver: ResizeObserver | null;
    _resizeCanvas: () => void;

    constructor(canvas: HTMLCanvasElement, timeOfDay: TimeOfDay) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.timeOfDay = timeOfDay;
        this.resizeObserver = null;
        this._resizeCanvas = throttle(this.resizeCanvas, 300, this);

        this.init();
    }

    init() {
        this.resizeCanvas();
        this.createParticles();
        this.startAnimation();

        // Обработчик изменения размера
        this.resizeObserver = new ResizeObserver(this._resizeCanvas);
        this.resizeObserver.observe(this.canvas.parentElement);
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
        const { ctx, canvas, timeOfDay } = this;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Фон в зависимости от времени суток
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);

        switch (timeOfDay) {
            case 'morning':
                gradient.addColorStop(0, 'rgba(255, 200, 100, 0.05)');
                gradient.addColorStop(1, 'rgba(255, 150, 50, 0.05)');

                break;
            case 'day':
                gradient.addColorStop(0, 'rgba(100, 200, 255, 0.03)');
                gradient.addColorStop(1, 'rgba(50, 150, 255, 0.03)');

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
                    color = `rgba(255, 200, 100, ${particle.opacity})`;

                    break;
                case 'day':
                    color = `rgba(100, 200, 255, ${particle.opacity})`;

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
        const animate = () => {
            this.draw();
            this.animationId = requestAnimationFrame(animate);
        };

        animate();
    }

    updateTimeOfDay(timeOfDay: TimeOfDay) {
        if (this.timeOfDay !== timeOfDay) {
            this.timeOfDay = timeOfDay;
            this.createParticles();
        }
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = 0;
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }
}

// Хранилище canvas анимаций
const canvasAnimations = new Map<HTMLCanvasElement, TimeCanvas>();

(globalThis as unknown as Record<string, any>).__test__canvasAnimations = canvasAnimations;
