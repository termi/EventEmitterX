# План интеграции погоды на страницу GlobalTimes

## Обзор

**Цель:** Добавить отображение погоды (температура, код погоды) для каждого города на странице `pages/10.GlobalTimes.tsx`,
используя API Open-Meteo (без API-ключа).

**Оценка сложности:** 🟡 **Средняя** — Умеренные трудозатраты (~2–4 часа). Существующая архитектура (EventSignal,
реактивное состояние, per-city сигналы) хорошо подходит для этой задачи. Основная работа — инфраструктурная
(API-слой, кеширование, маппинг состояния), а не борьба с архитектурой.

---

## Анализ текущего состояния

### Что уже существует

| Файл                                         | Описание                                                                                                                                                                                         |
|----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `lib/weather.ts`                             | Незавершённая заготовка — `getWeatherByCity(city)` с геокодингом + прогноз через Open-Meteo. Помечен `// todo: Файл не доделан`                                                                  |
| `state/GlobalTimesState.ts`                  | Полное управление состоянием городов — `mostPopularCities$` (EventSignal из городских сигналов), `_makeCityTime$$`, `RawCityDescription`, `CityDescription`, canvas-анимации, observer видимости |
| `pages/10.GlobalTimes.tsx`                   | Основной компонент страницы с тремя режимами отображения: список (`GlobalTimesCity`), плитка (тот же компонент), таблица (`GlobalTimesTableRow`)                                                 |
| `_dev/todo/Поиск API для погоды на сайте.md` | Подробное исследование Open-Meteo: лимиты, стратегии кеширования, CORS, rate limiting, варианты прокси                                                                                           |

### Ключевые архитектурные моменты

1. **Каждый город** уже имеет поля `timeZone`, `locale` и `name` в `RawCityDescription`.
2. **Open-Meteo требует координаты** (`latitude`/`longitude`), а не названия городов — но есть API
   геокодинга: `geocoding-api.open-meteo.com/v1/search?name=<city>&count=1`.
3. **Существующий `lib/weather.ts`** уже реализует двухшаговый процесс (геокодинг → прогноз), но не завершён.
4. У городов уже вычисляется `timeZoneOffset` в `getMostPopularCities()`, но **нет** широты/долготы.
5. **`nowDate$` обновляется каждую 1 секунду** (clock trigger) — погода НЕ должна запрашиваться при каждом тике.

---

## План реализации

### Фаза 1: API-слой для погоды (`lib/weather.ts`)

**Оценка трудозатрат:** ~30 мин

Доделать и расширить существующий `lib/weather.ts`:

```typescript
// lib/weather.ts
'use strict';

export type WeatherData = {
    temperature: number;       // °C
    windspeed: number;         // км/ч
    weathercode: number;       // WMO weather code
    is_day: number;            // 0 или 1
    time: string;              // ISO-временная метка замера погоды
};

export type WeatherResult = {
    city: string;
    weather: WeatherData;
    coordinates: { latitude: number; longitude: number };
    fetchedAt: number;         // Date.now() временная метка
};

export type GeocodingResult = {
    latitude: number;
    longitude: number;
    name: string;
    country?: string;
};

const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';

// In-memory кеш для результатов геокодинга (название города → координаты)
const geocodingCache = new Map<string, GeocodingResult>();
// In-memory кеш для результатов погоды (lat,lon → WeatherResult)
const weatherCache = new Map<string, { data: WeatherResult; timestamp: number }>();

const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 минут

export async function geocodeCity(cityName: string): Promise<GeocodingResult | null> {
    const key = cityName.toLowerCase();

    if (geocodingCache.has(key)) {
        return geocodingCache.get(key)!;
    }

    const url = `${GEOCODING_BASE}?name=${encodeURIComponent(cityName)}&count=1&language=en`;
    const response = await fetch(url);

    if (!response.ok) {
        console.warn(`Geocoding failed for "${cityName}": HTTP ${response.status}`);
        return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        return null;
    }

    const result: GeocodingResult = {
        latitude: data.results[0].latitude,
        longitude: data.results[0].longitude,
        name: data.results[0].name,
        country: data.results[0].country,
    };

    geocodingCache.set(key, result);

    return result;
}

export async function fetchWeather(
    latitude: number,
    longitude: number,
    cityName?: string,
): Promise<WeatherResult | null> {
    const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < WEATHER_CACHE_TTL) {
        return cached.data;
    }

    const url = `${FORECAST_BASE}?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;

    try {
        const response = await fetch(url);

        if (response.status === 429) {
            console.warn('Open-Meteo rate limit hit, using cached data if available');
            return cached?.data ?? null;
        }

        if (!response.ok) {
            console.warn(`Weather API error: HTTP ${response.status}`);
            return cached?.data ?? null;
        }

        const data = await response.json();
        const result: WeatherResult = {
            city: cityName ?? `${latitude},${longitude}`,
            weather: data.current_weather,
            coordinates: { latitude, longitude },
            fetchedAt: Date.now(),
        };

        weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });

        return result;
    } catch (error) {
        console.error('Weather fetch error:', error);
        return cached?.data ?? null;
    }
}

export async function getWeatherByCity(cityName: string): Promise<WeatherResult | null> {
    const geo = await geocodeCity(cityName);

    if (!geo) {
        return null;
    }

    return fetchWeather(geo.latitude, geo.longitude, geo.name);
}

/** WMO Weather Interpretation Codes → эмодзи */
export function weatherCodeToEmoji(code: number): string {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 49) return '🌫️';
    if (code <= 59) return '🌧️';
    if (code <= 69) return '🌨️';
    if (code <= 79) return '🌨️';
    if (code <= 84) return '🌧️';
    if (code <= 94) return '⛈️';
    if (code <= 99) return '⛈️';
    return '❓';
}

/** WMO Weather Interpretation Codes → краткое описание (англ.) */
export function weatherCodeToDescription(code: number): string {
    const descriptions: Record<number, string> = {
        0: 'Clear sky',
        1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight showers', 81: 'Moderate showers', 82: 'Heavy showers',
        85: 'Slight snow showers', 86: 'Heavy snow showers',
        95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + heavy hail',
    };

    return descriptions[code] ?? `Code ${code}`;
}
```

---

### Фаза 2: Сигнал состояния погоды (`state/weatherState.ts`)

**Оценка трудозатрат:** ~30 мин

Создать новый EventSignal для управления данными о погоде для всех городов:

```typescript
// state/weatherState.ts
'use strict';

import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';
import { fetchWeather, geocodeCity, type WeatherResult } from '../lib/weather';

// Маппинг: id города → данные о погоде
export const weatherByCity$ = new EventSignal(
    new Map<string, WeatherResult | null>(),
    {
        description: 'weatherByCity$',
    }
);

const WEATHER_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 мин
let weatherUpdateTimer: ReturnType<typeof setInterval> | null = null;

// Название города (англ.) → кеш геокодированных координат
const cityCoordinatesCache = new Map<string, { lat: number; lon: number }>();

/**
 * Запрашивает погоду для списка городов.
 * Вызывается один раз при инициализации, затем каждые 30 минут.
 */
export async function fetchWeatherForCities(cities: { id: string; name: string; nameEnglish?: string }[]) {
    const currentMap = new Map(weatherByCity$.get());
    const promises: Promise<void>[] = [];

    for (const city of cities) {
        const cityName = city.nameEnglish || city.name;

        promises.push(
            (async () => {
                try {
                    let coords = cityCoordinatesCache.get(city.id);

                    if (!coords) {
                        const geo = await geocodeCity(cityName);

                        if (geo) {
                            coords = { lat: geo.latitude, lon: geo.longitude };
                            cityCoordinatesCache.set(city.id, coords);
                        }
                    }

                    if (coords) {
                        const weather = await fetchWeather(coords.lat, coords.lon, cityName);
                        currentMap.set(city.id, weather);
                    }
                } catch (error) {
                    console.warn(`Weather fetch failed for ${cityName}:`, error);
                }
            })()
        );
    }

    await Promise.allSettled(promises);

    weatherByCity$.set(currentMap);
}

export function startWeatherUpdates(getCities: () => { id: string; name: string; nameEnglish?: string }[]) {
    // Первоначальный запрос
    fetchWeatherForCities(getCities());

    // Периодические обновления
    if (weatherUpdateTimer) {
        clearInterval(weatherUpdateTimer);
    }

    weatherUpdateTimer = setInterval(() => {
        fetchWeatherForCities(getCities());
    }, WEATHER_UPDATE_INTERVAL);
}

export function stopWeatherUpdates() {
    if (weatherUpdateTimer) {
        clearInterval(weatherUpdateTimer);
        weatherUpdateTimer = null;
    }
}
```

---

### Фаза 3: Интеграция в GlobalTimesState

**Оценка трудозатрат:** ~20 мин

**Изменения в `state/GlobalTimesState.ts`:**

1. **Добавить поля `latitude`/`longitude`** в `predefinedCitiesList` (захардкодить известные координаты для ~17
2. предопределённых городов, чтобы избежать запросов геокодинга при загрузке):

```typescript
// Пример дополнений записей в predefinedCitiesList:
{
    name: "Токио",
    country: "Япония",
    timeZone: "Asia/Tokyo",
    locale: "ja-JP",
    flag: "🇯🇵",
    isCapital: true,
    latitude: 35.6762,   // ← НОВОЕ
    longitude: 139.6503, // ← НОВОЕ
},
```

> **Зачем хардкодить?** Это позволяет избежать 17 запросов геокодинга при каждой загрузке страницы. API геокодинга
> Open-Meteo имеет ограничения по частоте запросов. Координаты известных городов стабильны.

2. **Расширить тип `RawCityDescription`**:

```typescript
type RawCityDescription = {
    // ...существующие поля...
    latitude?: number;
    longitude?: number;
};
```

3. **Расширить тип `CityDescription`** данными о погоде:

```typescript
type CityDescription = RawCityDescription & {
    // ...существующие поля...
    weather?: {
        temperature: number;
        weathercode: number;
        windspeed: number;
        emoji: string;
    } | null;
};
```

---

### Фаза 4: Изменения UI (`pages/10.GlobalTimes.tsx`)

**Оценка трудозатрат:** ~40 мин

#### 4a. `GlobalTimesCity` — Отображение погоды (режим список/плитка)

Добавить секцию погоды внутри карточки города, между `.timeInfo` и иконкой PiP:

```tsx
{/* Внутри GlobalTimesCity, после div .timeInfo */}
{current$Value.weather && (
    <div className={css.weatherInfo}>
        <span className={css.weatherEmoji}>{current$Value.weather.emoji}</span>
        <span className={css.weatherTemp}>{current$Value.weather.temperature}°C</span>
    </div>
)}
```

#### 4b. `GlobalTimesTableRow` — Добавить колонку погоды (режим таблица)

```tsx
// Добавить в GlobalTimesTable thead:
<th>{i18nString$$('Погода')}</th>

// Добавить в GlobalTimesTableRow:
<td className={css.weatherCell}>
    {current$Value.weather
        ? `${current$Value.weather.emoji} ${current$Value.weather.temperature}°C`
        : '—'
    }
</td>
```

#### 4c. Изменения CSS (`10.GlobalTimes.module.css`)

```css
.weather-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9em;
    color: #555;
    margin-top: 4px;
}

.weather-emoji {
    font-size: 1.2em;
}

.weather-temp {
    font-weight: 600;
    font-size: 1.1em;
}

.weather-cell {
    white-space: nowrap;
    text-align: center;
}
```

---

### Фаза 5: Инициализация и жизненный цикл

**Оценка трудозатрат:** ~20 мин

В `state/GlobalTimesState.ts` или в компоненте страницы запустить начальную загрузку погоды:

```typescript
// Вариант A: В GlobalTimesState.ts (в конце файла)
import { startWeatherUpdates, weatherByCity$ } from './weatherState';

// Запуск обновления погоды после вычисления списка городов
mostPopularCities$.addListener((cityList) => {
    const cities = cityList.map(city$ => {
        const val = city$.get();
        return {
            id: val.id,
            name: val.name,
            nameEnglish: val.name, // Потребуется разрешение английского имени
        };
    });

    startWeatherUpdates(() => cities);
});

// Прослушивание обновлений погоды и распространение на городские сигналы
weatherByCity$.addListener((weatherMap) => {
    for (const city$ of mostPopularCities$.get()) {
        const val = city$.get();
        const weather = weatherMap.get(val.id);

        if (weather && weather !== val.weather) {
            // Вызвать ре-рендер отдельного города
            // Для этого нужен механизм инъекции погоды в городской сигнал
        }
    }
});
```

**Вариант B (Проще):** Инжектировать погоду напрямую в функцию обновления `_makeCityTime$$`, читая из глобального кеша погоды.

---

## Риски и сложности

### 🔴 Критические

#### [🔴] Названия городов на английском для геокодинга

**Файл:** `lib/weather.ts`, строка 4
**Проблема:** `getWeatherByCity` требует английские названия городов для API геокодинга, но `predefinedCitiesList` в
`state/GlobalTimesState.ts` (строки 344–471) хранит названия на русском:

```typescript
{
    name: "Токио",          // На русском, а не "Tokyo"
    country: "Япония",
    timeZone: "Asia/Tokyo",
    ...
},
```

API геокодинга Open-Meteo (`geocoding-api.open-meteo.com/v1/search`) лучше всего работает с английскими или оригинальными
названиями городов. Русские названия вроде «Токио» могут вернуть некорректные результаты или не найти город.

**Рекомендация:** Захардкодить `latitude`/`longitude` для всех предопределённых городов (Фаза 3). Это полностью исключает
геокодинг для 17 известных городов. Геокодинг использовать только для динамически добавляемых городов (например, при
переключении локали на отсутствующую в списке).

---

### 🟠 Предупреждения

#### [🟠] Rate limiting при 17 одновременных запросах

**Проблема:** При загрузке страницы, если все 17 городов запрашивают погоду одновременно — это 17 API-вызовов менее чем
за 1 секунду. Open-Meteo требует минимальный интервал ~1 запрос/секунду.

**Рекомендация:**
- Распределить запросы с небольшой задержкой между каждым (например, 100–200 мс)
- Использовать `Promise.allSettled`, чтобы ошибка одного не блокировала остальные
- Объединить координаты в один Multi-Location API запрос, если поддерживается

```typescript
// Пример распределённых запросов
for (const city of cities) {
    await fetchWeather(city.lat, city.lon);
    await new Promise(r => setTimeout(r, 150)); // задержка 150 мс
}
```

#### [🟠] Обновления погоды vs обновления часов

**Файл:** `state/GlobalTimesState.ts`, строка 65

**Проблема:** `nowDate$` срабатывает каждую 1 секунду (строка 81: `trigger: { type: 'clock', ms: 1000 }`). Городской
сигнал `_makeCityTime$$` зависит от `nowDate$`. Если погода хранится внутри значения городского сигнала, она будет
пересоздаваться каждую секунду, хотя данные о погоде меняются раз в 30 минут.

```typescript
export const nowDate$ = new EventSignal(new Date(), (prevNow, customNow, eventSignal) => {
    // ...срабатывает каждую 1 секунду
}, {
    trigger: {
        type: 'clock',
        ms: 1000,          // ← Это
        timerGroupId: componentTypeGlobalTimesCity,
    },
});
```

**Рекомендация:** Хранить погоду в отдельном сигнале (`weatherByCity$`), который НЕ зависит от `nowDate$`. Компонент
карточки города должен подписываться на оба: `current$` (для времени) и `weatherByCity$` (для погоды), обновляя
отображение погоды только при фактическом изменении данных о погоде.

#### [🟠] Память и сеть на мобильных устройствах

**Проблема:** 17 городов × 2 API-вызова каждый (геокодинг + прогноз) = 34 HTTP-запроса при загрузке. На медленных
мобильных соединениях это может задержать первоначальный рендер.

**Рекомендация:**
- Захардкодить координаты → устраняет 17 запросов геокодинга
- Использовать `navigator.connection?.effectiveType` для пропуска погоды на `2g`/`slow-2g`
- Показывать заглушку/скелетон погоды во время загрузки

---

### 🟡 Предложения

#### [🟡] Локализованные описания погоды

**Проблема:** `weatherCodeToDescription()` возвращает строки только на английском. Приложение поддерживает 14+ локалей.

**Рекомендация:** Использовать существующую систему `i18nString$$()`:
```typescript
const weatherDesc = i18nString$$(weatherCodeToDescription(code));
```

#### [🟡] Динамически добавляемые города (переключение локали)

**Файл:** `state/GlobalTimesState.ts`, строки 478–494

**Проблема:** Когда пользователь переключает локаль, `getMostPopularCities()` может добавить новый город. У этого города
не будет координат и данных о погоде.

**Рекомендация:** Для динамически добавленных городов:
1. Использовать `getLocaleInfo(locale, true).capital` для получения английского названия столицы
2. Вызвать `geocodeCity(capitalName)` для получения координат
3. Затем запросить погоду

#### [🟡] Индикатор устаревания данных о погоде

**Рекомендация:** Показывать, насколько старые данные о погоде (например, «Обновлено 15 мин назад»), используя
`WeatherResult.fetchedAt`. Это помогает пользователям понять, почему данные могут отличаться от их локального приложения погоды.

---

## Сводная таблица

| Фаза      | Что                            | Трудозатраты  | Файлы                                                         |
|-----------|--------------------------------|---------------|---------------------------------------------------------------|
| 1         | API-слой для погоды            | 30 мин        | `lib/weather.ts`                                              |
| 2         | Сигнал состояния погоды        | 30 мин        | `state/weatherState.ts` (новый)                               |
| 3         | Интеграция в GlobalTimesState  | 20 мин        | `state/GlobalTimesState.ts`                                   |
| 4         | UI-компоненты + CSS            | 40 мин        | `pages/10.GlobalTimes.tsx`, `pages/10.GlobalTimes.module.css` |
| 5         | Инициализация и жизненный цикл | 20 мин        | `state/GlobalTimesState.ts` или компонент страницы            |
| **Итого** |                                | **~2.5 часа** |                                                               |

---

## Архитектурное решение: где хранить погоду

**Рекомендуемый подход:** Отдельный сигнал `weatherByCity$` (Вариант B).

**Обоснование:**
1. Погода обновляется каждые 30 мин, время обновляется каждую 1 сек — разные частоты обновления
2. Не засоряет существующий «быстрый путь» обновления городского сигнала редко меняющимися данными о погоде
3. Паттерн `useReducedListener`, уже используемый на странице (строки 188–212 в `10.GlobalTimes.tsx`), показывает, что
   в команде привыкли к избирательной подписке — погода может следовать тому же паттерну
4. Проще добавить состояния загрузки/ошибки для погоды независимо

**Альтернатива:** Встроить погоду в `CityDescription` и полагаться на `areReducedValuesEqual` для предотвращения
ре-рендеров, вызванных погодой, в компонентах отображения только времени. Это проще, но связывает пути обновления.

---

## Открытые вопросы

1. **Запрашивать ли погоду для ВСЕХ городов или только для видимых?** Использование `IntersectionObserver` (уже
   реализован через `HTMLElementsObserverManager` в `GlobalTimesState.ts`) для ленивого запроса погоды только для
   видимых городов может сократить количество API-вызовов.

2. **Стоит ли предвычислить координаты в `capitals.json`?** Статический файл данных уже содержит названия столиц
   и часовые пояса. Добавление lat/lon туда устранило бы весь runtime-геокодинг.

3. **Должны ли динамически добавленные города (из переключения локали) получать погоду?** Или погода только для 17
   предопределённых городов?

---

*Создано: ИИ-анализ существующей кодовой базы*
*Дата: 2026-03-15*
