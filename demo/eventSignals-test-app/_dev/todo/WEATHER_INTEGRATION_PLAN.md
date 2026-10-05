# Weather Integration Plan for GlobalTimes Page

## Overview

**Goal:** Add weather display (temperature, weather code) for each city on the `pages/10.GlobalTimes.tsx` page using the
Open-Meteo API (no API key required).

**Complexity Assessment:** 🟡 **Medium** — Moderate effort (~2–4 hours). The existing architecture (EventSignal, reactive
state, per-city signals) is well-suited for this. Most of the work is infrastructure (API layer, caching, state mapping)
rather than fighting the architecture.

---

## Current State Analysis

### What already exists

| File                                         | Description                                                                                                                                                                        |
|----------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `lib/weather.ts`                             | Incomplete stub — `getWeatherByCity(city)` with geocoding + forecast via Open-Meteo. Marked `// todo: Файл не доделан`                                                             |
| `state/GlobalTimesState.ts`                  | Full city state management — `mostPopularCities$` (EventSignal of city signals), `_makeCityTime$$`, `RawCityDescription`, `CityDescription`, canvas animation, visibility observer |
| `pages/10.GlobalTimes.tsx`                   | Main page component with three views: list (`GlobalTimesCity`), grid (same), table (`GlobalTimesTableRow`)                                                                         |
| `_dev/todo/Поиск API для погоды на сайте.md` | Thorough research on Open-Meteo: limits, caching strategies, CORS, rate limiting, proxy options                                                                                    |

### Key Architectural Points

1. **Each city** already has `timeZone`, `locale`, and `name` fields in `RawCityDescription`.
2. **Open-Meteo needs coordinates** (`latitude`/`longitude`), not city names — but there's a geocoding
   API: `geocoding-api.open-meteo.com/v1/search?name=<city>&count=1`.
3. **Existing `lib/weather.ts`** already implements the two-step flow (geocode → forecast) but is unfinished.
4. Cities already have `timeZoneOffset` computed in `getMostPopularCities()`, but **not** latitude/longitude.
5. **`nowDate$` updates every 1 second** (clock trigger) — weather must NOT fetch on every tick.

---

## Implementation Plan

### Phase 1: Weather API Layer (`lib/weather.ts`)

**Estimated effort:** ~30 min

Finish and extend the existing `lib/weather.ts`:

```typescript
// lib/weather.ts
'use strict';

export type WeatherData = {
    temperature: number;       // °C
    windspeed: number;         // km/h
    weathercode: number;       // WMO weather code
    is_day: number;            // 0 or 1
    time: string;              // ISO timestamp of the weather reading
};

export type WeatherResult = {
    city: string;
    weather: WeatherData;
    coordinates: { latitude: number; longitude: number };
    fetchedAt: number;         // Date.now() timestamp
};

export type GeocodingResult = {
    latitude: number;
    longitude: number;
    name: string;
    country?: string;
};

const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';

// In-memory cache for geocoding results (city name → coordinates)
const geocodingCache = new Map<string, GeocodingResult>();
// In-memory cache for weather results (lat,lon → WeatherResult)
const weatherCache = new Map<string, { data: WeatherResult; timestamp: number }>();

const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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

/** WMO Weather Interpretation Codes → emoji */
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

/** WMO Weather Interpretation Codes → short description (English) */
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

### Phase 2: Weather State Signal (`state/weatherState.ts`)

**Estimated effort:** ~30 min

Create a new EventSignal that manages weather data for all cities:

```typescript
// state/weatherState.ts
'use strict';

import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';
import { fetchWeather, geocodeCity, type WeatherResult } from '../lib/weather';

// Maps city id → weather data
export const weatherByCity$ = new EventSignal(
    new Map<string, WeatherResult | null>(),
    {
        description: 'weatherByCity$',
    }
);

const WEATHER_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 min
let weatherUpdateTimer: ReturnType<typeof setInterval> | null = null;

// City name (English) → geocoded coordinates cache
const cityCoordinatesCache = new Map<string, { lat: number; lon: number }>();

/**
 * Fetches weather for a list of cities.
 * Called once on init and then every 30 minutes.
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
    // Initial fetch
    fetchWeatherForCities(getCities());

    // Periodic updates
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

### Phase 3: Integrate into GlobalTimesState

**Estimated effort:** ~20 min

**Changes to `state/GlobalTimesState.ts`:**

1. **Add `latitude`/`longitude` fields** to `predefinedCitiesList` (hardcode known coordinates for the ~17 predefine
   cities to avoid geocoding requests at startup):

```typescript
// Example additions to predefinedCitiesList entries:
{
    name: "Токио",
    country: "Япония",
    timeZone: "Asia/Tokyo",
    locale: "ja-JP",
    flag: "🇯🇵",
    isCapital: true,
    latitude: 35.6762,   // ← NEW
    longitude: 139.6503, // ← NEW
},
```

> **Why hardcode?** This avoids 17 geocoding requests on every page load. Open-Meteo geocoding API has rate limits.
> Coordinates for well-known cities are stable.

2. **Extend `RawCityDescription` type**:

```typescript
type RawCityDescription = {
    // ...existing fields...
    latitude?: number;
    longitude?: number;
};
```

3. **Extend `CityDescription` type** with weather:

```typescript
type CityDescription = RawCityDescription & {
    // ...existing fields...
    weather?: {
        temperature: number;
        weathercode: number;
        windspeed: number;
        emoji: string;
    } | null;
};
```

---

### Phase 4: UI Changes (`pages/10.GlobalTimes.tsx`)

**Estimated effort:** ~40 min

#### 4a. `GlobalTimesCity` — Add Weather Display (list/grid view)

Add a weather section inside the city card, between `.timeInfo` and the PiP icon:

```tsx
{/* Inside GlobalTimesCity, after .timeInfo div */}
{current$Value.weather && (
    <div className={css.weatherInfo}>
        <span className={css.weatherEmoji}>{current$Value.weather.emoji}</span>
        <span className={css.weatherTemp}>{current$Value.weather.temperature}°C</span>
    </div>
)}
```

#### 4b. `GlobalTimesTableRow` — Add Weather Column (table view)

```tsx
// Add to GlobalTimesTable thead:
<th>{i18nString$$('Погода')}</th>

// Add to GlobalTimesTableRow:
<td className={css.weatherCell}>
    {current$Value.weather
        ? `${current$Value.weather.emoji} ${current$Value.weather.temperature}°C`
        : '—'
    }
</td>
```

#### 4c. CSS Changes (`10.GlobalTimes.module.css`)

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

### Phase 5: Initialization & Lifecycle

**Estimated effort:** ~20 min

In `state/GlobalTimesState.ts` or in the page component, trigger the initial weather fetch:

```typescript
// Option A: In GlobalTimesState.ts (bottom of file)
import { startWeatherUpdates, weatherByCity$ } from './weatherState';

// Start weather updates after city list is computed
mostPopularCities$.addListener((cityList) => {
    const cities = cityList.map(city$ => {
        const val = city$.get();
        return {
            id: val.id,
            name: val.name,
            nameEnglish: val.name, // Will need English name resolution
        };
    });

    startWeatherUpdates(() => cities);
});

// Listen for weather updates and propagate to city signals
weatherByCity$.addListener((weatherMap) => {
    for (const city$ of mostPopularCities$.get()) {
        const val = city$.get();
        const weather = weatherMap.get(val.id);

        if (weather && weather !== val.weather) {
            // Trigger a re-render of individual city
            // This needs a mechanism to inject weather into the city signal
        }
    }
});
```

**Option B (Simpler):** Inject weather directly into `_makeCityTime$$`'s update function, reading from a global weather cache.

---

## Risks & Challenges

### 🔴 Critical

#### [🔴] English City Names for Geocoding

**File:** `lib/weather.ts`, line 4
**Problem:** `getWeatherByCity` requires English city names for the geocoding API, but `predefinedCitiesList`
in `state/GlobalTimesState.ts` (lines 344–471) stores city names in Russian:

```typescript
{
    name: "Токио",          // Russian, not "Tokyo"
    country: "Япония",
    timeZone: "Asia/Tokyo",
    ...
},
```

The Open-Meteo geocoding API (`geocoding-api.open-meteo.com/v1/search`) works best with English or local-script city names.
Russian names like "Токио" may return incorrect or no results.

**Recommendation:** Hardcode `latitude`/`longitude` for all predefined cities (Phase 3). This eliminates geocoding entirely
for the 17 known cities. Only use geocoding for dynamically-added cities (e.g., when user switches locale to one not in the list).

---

### 🟠 Warning

#### [🟠] Rate Limiting with 17 Concurrent Requests

**Problem:** On page load, if all 17 cities request weather simultaneously, that's 17 API calls in <1 second.
Open-Meteo enforces ~1 request/second minimum interval.

**Recommendation:**
- Stagger requests with a small delay between each (e.g., 100–200ms)
- Use `Promise.allSettled` to avoid one failure blocking all
- Batch coordinates into a single Multi-Location API call if supported

```typescript
// Staggered fetch example
for (const city of cities) {
    await fetchWeather(city.lat, city.lon);
    await new Promise(r => setTimeout(r, 150)); // 150ms delay
}
```

#### [🟠] Weather Updates vs Clock Updates

**File:** `state/GlobalTimesState.ts`, line 65

**Problem:** `nowDate$` triggers every 1 second (line 81: `trigger: { type: 'clock', ms: 1000 }`). The city
signal `_makeCityTime$$` depends on `nowDate$`. If weather is stored inside the city signal value, it will be re-created
every second even though weather data changes every 30 minutes.

```typescript
export const nowDate$ = new EventSignal(new Date(), (prevNow, customNow, eventSignal) => {
    // ...triggers every 1 second
}, {
    trigger: {
        type: 'clock',
        ms: 1000,          // ← This
        timerGroupId: componentTypeGlobalTimesCity,
    },
});
```

**Recommendation:** Store weather in a separate signal (`weatherByCity$`) that does NOT depend on `nowDate$`. The city
card component should subscribe to both `current$` (for time) and `weatherByCity$` (for weather), updating weather display
only when weather data actually changes.

#### [🟠] Memory & Network on Mobile

**Problem:** 17 cities × 2 API calls each (geocoding + forecast) = 34 HTTP requests on load. On slow mobile connections
this could delay initial render.

**Recommendation:**
- Hardcode coordinates → eliminates 17 geocoding requests
- Use `navigator.connection?.effectiveType` to skip weather on `2g`/`slow-2g`
- Show weather placeholder/skeleton while loading

---

### 🟡 Suggestion

#### [🟡] Localized Weather Descriptions

**Problem:** `weatherCodeToDescription()` returns English-only strings. The app supports 14+ locales.

**Recommendation:** Use the existing `i18nString$$()` system:
```typescript
const weatherDesc = i18nString$$(weatherCodeToDescription(code));
```

#### [🟡] Dynamically Added Cities (Locale Switch)

**File:** `state/GlobalTimesState.ts`, lines 478–494

**Problem:** When the user switches locale, `getMostPopularCities()` may add a new city. This city won't have coordinates
or weather data.

**Recommendation:** For dynamically added cities:
1. Use `getLocaleInfo(locale, true).capital` to get English capital name
2. Call `geocodeCity(capitalName)` to get coordinates
3. Then fetch weather

#### [🟡] Weather Data Staleness Indicator

**Recommendation:** Show how old the weather data is (e.g., "Updated 15 min ago") using `WeatherResult.fetchedAt`.
This helps users understand why data might differ from their local weather app.

---

## Summary Table

| Phase     | What                            | Effort         | Files                                                         |
|-----------|---------------------------------|----------------|---------------------------------------------------------------|
| 1         | Weather API layer               | 30 min         | `lib/weather.ts`                                              |
| 2         | Weather state signal            | 30 min         | `state/weatherState.ts` (new)                                 |
| 3         | Integrate into GlobalTimesState | 20 min         | `state/GlobalTimesState.ts`                                   |
| 4         | UI components + CSS             | 40 min         | `pages/10.GlobalTimes.tsx`, `pages/10.GlobalTimes.module.css` |
| 5         | Init & lifecycle                | 20 min         | `state/GlobalTimesState.ts` or page component                 |
| **Total** |                                 | **~2.5 hours** |                                                               |

---

## Architecture Decision: Where to Store Weather

**Recommended approach:** Separate `weatherByCity$` signal (Option B).

**Reasons:**
1. Weather updates every 30 min, time updates every 1 sec — different update frequencies
2. Avoids polluting the existing city signal's fast update path with rarely-changing weather data
3. The `useReducedListener` pattern already used in the page (lines 188–212 of `10.GlobalTimes.tsx`) shows the team is
   comfortable with selective listening — weather can follow the same pattern
4. Easier to add loading/error states for weather independently

**Alternative:** Embed weather into `CityDescription` and rely on `areReducedValuesEqual` to prevent weather-triggered
re-renders in time-only components. This is simpler but couples the update paths.

---

## Open Questions

1. **Should weather be fetched for ALL cities or only visible ones?** Using `IntersectionObserver` (already implemented
   via `HTMLElementsObserverManager` in `GlobalTimesState.ts`) to lazily fetch weather for only visible cities could reduce API calls.

2. **Should we precompute coordinates in `capitals.json`?** The static data file already has capital names and timezones.
   Adding lat/lon there would eliminate all runtime geocoding.

3. **Should dynamically added cities (from locale switch) get weather?** Or is weather only for the predefined 17 cities?

---

*Created by: AI analysis of existing codebase*
*Date: 2026-03-15*
