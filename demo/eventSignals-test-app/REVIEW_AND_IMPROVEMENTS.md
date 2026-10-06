---
iso date: "2026-10-06T16:12:30.907Z"
timestamp: 1791303150907
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "demo, review"
---

# EventSignal laboratory: review and improvements

[Russian version](REVIEW_AND_IMPROVEMENTS_RU.md) · [Shared recommendations](../RECOMMENDATIONS.md).

## Purpose and assessment

This app can become a useful interactive guide to writable/computed signals, async computation, component registration,
shared state and lifecycle. Its examples already react correctly in the exercised happy paths, but they need a
consistent entry point, explicit teaching scenarios and a unified presentation before serving as a consumer-facing
showcase.

Review context: `dev` / `b943225`, 2026-10-06; Node 26.8.1, existing dependencies, Vite 5.4.8, React 19.2.4. Started on
`http://127.0.0.1:5181`. Findings marked “static review” were inferred from source rather than reproduced as runtime
failures.

## Functionality checked

| Scenario                      | Result                            | Evidence / limits                                                                                                                                                                                                                                           |
|-------------------------------|-----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Entry `/` and navigation      | Needs correction                  | Entry shows 404; all six menu destinations load after lazy import.                                                                                                                                                                                          |
| Counters `/one`               | Works, with an initial user error | Increment updates the derived text, direct numeric display and sum to 1. User ID 0 visibly fails.                                                                                                                                                           |
| Form `/two`                   | Works                             | Changing first name to Demo and submitting updates the registered user component and mapped output. File inputs were not exercised.                                                                                                                         |
| Async search `/three`         | Responds                          | Loading transitions, empty result for “love” and a populated “Let It Be” result were observed. This is a local simulated dataset, not an external search service; race/cancellation coverage is still needed.                                               |
| Widgets `/four`               | Works for add/clear               | Batch IDs appear, Clear removes them and becomes disabled. Correct resource disposal was not measured.                                                                                                                                                      |
| Tic-tac-toe                   | Works for the initial variant     | First move changes turn to O; returning to game start clears the square. Other variants, full win/draw and history branching were not exhaustively checked.                                                                                                 |
| GlobalTimes                   | Works for list/table              | Cities and localized times appear; ticking and table selection work. No live weather was displayed.                                                                                                                                                         |
| Direct Vite production bundle | Pass                              | 128 modules transformed. Seven public SVG references produce unresolved-at-build warnings; assets exist in `public/`, so these warnings alone are not proof of missing runtime assets. Check URLs in production preview and under a nested deployment base. |

Locale switching and Picture-in-Picture permission/fallback flows were not fully tested. No source code was changed in
this review.

## Findings and recommendations

### 1. 🟠 Warning — The entry URL opens 404

**File:** `demo/eventSignals-test-app/lib/history_navigation.ts`, lines 62–68.

**Problem:** Observed at `/`: the first screen says “404 - Not found”. Generated page routes have names such as `/one`;
none handles `/`. A visitor has to discover navigation before seeing a working example.

```typescript
const newRout = routes.find(routItem => {
    return routItem.routerPath === pagePath;
}) ?? page404route;
```

**Recommendation:** Add a dedicated overview route at `/`, with cards describing each example and the EventSignal
capability it demonstrates. A redirect to `/one` is a smaller acceptable first step. Keep genuine unknown URLs on 404.
Acceptance: direct entry, refresh and browser Back work at both `/` and a deep link.

### 2. 🟠 Warning — The normal counter example starts with an error

**File:** `demo/eventSignals-test-app/state/AppStates.ts`, lines 301–308, 336.

**Problem:** The counter starts at zero and also supplies the user ID, so the first request uses `id=0` and visibly
fails. Advancing the counter beyond the fixture IDs is also allowed. Deliberate failure exists at ID 9 (lines 314–315),
but the UI does not distinguish a teaching scenario from ordinary loading.

```typescript
const response = await fetch(`https://jsonplaceholder.typicode.com/users?id=${newUserid}`, {
    signal: abortController.signal,
});
// ...
if (!newUserDTO) {
    throw new Error(`User not found with userId=${newUserid}`);
}
// ...
const jsonPlaceholderUser1$ = Object.assign(temp = makePlaceholderUserEventSignal(-1, counter1$), {
```

**Recommendation:** Give user selection its own signal with a valid initial ID; let the counter demonstrate arithmetic
independently. Add an explicit scenario selector: success, slow response, empty response, failure and cancellation.
Supply local fixtures as the default and make the live API an optional mode. Show Retry and the request state.
Acceptance: the default example loads successfully offline; failures occur only when selected.

### 3. 🟠 Warning — Cached signals need an ownership and disposal policy

**File:** `demo/eventSignals-test-app/state/AppStates.ts`, lines 245–254.

**Problem:** The cache holds strong references without a size limit. Clearing it deletes entries without explicitly
disposing signals or their pending requests. This is an additional retention path alongside the known EventSignal
registry lifecycle concern; no heap growth measurement was performed here. Some signals are shared, so unconditional
disposal on removing one card would also be incorrect.

```typescript
const _placeholderUserEventSignalCache: Record<number, ReturnType<typeof _makePlaceholderUserEventSignal>> = Object.create(null);

export function clearPlaceholderUserEventSignalCache() {
    for (const key in _placeholderUserEventSignalCache) {
        delete _placeholderUserEventSignalCache[key];
    }
}
```

**Recommendation:** Define cache ownership, acquire/release semantics and eviction. Abort pending requests and call the
supported disposal API only after the last consumer releases an entry. Use React effect cleanup for component-owned
resources; `using` belongs to a bounded synchronous scope, not the lifetime of a rendered component. Add a lifecycle
demonstration showing live signals, subscriptions and requests, and verify counts return to baseline after repeated
mount/unmount and cache reset.

### 4. 🟠 Warning — The JSON loader does not safely serialize arbitrary JSON

**File:** `demo/eventSignals-test-app/vite.config.ts`, lines 136–146.

**Problem:** Static review: JSON is embedded inside a generated template literal. Backticks and `${...}` inside JSON
strings can break or change the generated JavaScript; keys such as `foo-bar` are invalid exported identifiers. Current
assets built successfully, so this is an input-dependent build defect rather than an observed failure of the current
data.

```typescript
const rawString = JSON.stringify(json);
// ...
const __json = JSON.parse(\`${rawString}\`);
// ...
.map(key => `export const ${key} = __json[${JSON.stringify(key)}];`)
```

**Recommendation:** Prefer the standard JSON transformation if it meets the documented requirements. If the custom
loader is needed, emit `JSON.parse` with a separately JSON-encoded string literal and export only valid identifiers,
retaining all keys in the default export. Add cases for backticks, interpolation text, backslashes, reserved words and
non-identifier keys.

### 5. 🟠 Warning — Empty game squares have no accessible names

**File:** `demo/eventSignals-test-app/modules/TicTacToe/TicTacToeGameImmutable.tsx`, lines 43–58.

**Problem:** The browser accessibility tree contains nine unnamed buttons before the first move. Removing the outline
also removes the explicit focus indicator in this implementation. A move and returning to game start worked with a
pointer, but keyboard and screen-reader navigation are harder to understand.

```typescript
<button
    style={{ /* ... */ outline: 0, /* ... */ }}
    onClick={onSquareClick}
>
    {value}
</button>
```

**Recommendation:** Label each square with row, column and current value, keep a visible `:focus-visible` style, and
announce turn/winner changes in a restrained live region. Apply the same contract to all three implementations.
Acceptance: finish a game and travel through its history using only the keyboard; a screen reader identifies every
square.

### 6. 🟡 Suggestion — World-time presentation needs a compact information hierarchy

**File:** `demo/eventSignals-test-app/pages/10.GlobalTimes.module.css`, lines 473–494.

**Problem:** List and table modes render and clocks change once per second. At the inspected desktop width, the table
splits long values and truncates headings, while two page-level titles repeat the same name. The locale codes and
technical timezone identifiers compete with the city and time.

```css
.cities-container.cities-table {
    font-size: 1.1rem;
    td { padding: 0.3rem; }
    .local-time { font-size: 1.2rem; }
}
```

**Recommendation:** Make city and local time primary; place locale/IANA details in expandable secondary content. Give
table headers adequate width, use a dedicated horizontal-scroll container, and switch to cards at small widths. Add city
search, favourites, comparison with the user timezone and a meeting-time slider. Verify 390 px and long translated
names; do not use a live region for every clock tick.

### 7. 🔵 Info — Weather is a planned extension, not working functionality

**File:** `demo/eventSignals-test-app/lib/weather.ts`, lines 1–8.

**Problem:** The helper is unfinished and weather is not present on the inspected GlobalTimes page. The existing weather
plan is useful input, but its historical estimates and provider limits were not verified in this review.

```typescript
// todo: Файл не доделан
async function getWeatherByCity(city: string) {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`;
    const geoResponse = await fetch(geocodeUrl);
```

**Recommendation:** Implement the existing [weather plan](_dev/todo/WEATHER_INTEGRATION_PLAN.md) after the baseline UX
and lifecycle work. Store coordinates explicitly, cache by coordinates, deduplicate in-flight requests, handle
abort/timeout/HTTP errors and show stale data with its timestamp. Refresh weather independently of the one-second clock
signal. Before enabling the live provider, check its current terms and limits; use fixtures for automated checks.

## Design direction

Use one restrained application shell and consistent example cards instead of a different visual treatment for every
page. Keep a readable system font, a limited color palette and clear primary/secondary controls. Make the active
navigation obvious without relying only on color. Rename “Test two/three/four” to the concepts they demonstrate: bound
form, async search and shared widgets.

Each example should have a short purpose statement, an expected outcome, a reset action and a collapsible source/API
explanation. Put render counters, raw DTOs, component keys and debug actions behind a developer toggle. Keep the two
search implementations side by side on a wide screen and stacked on mobile, with the same input/scenario so the
comparison is meaningful. Show pending, retained previous output, resolved and failed states explicitly.

For GlobalTimes, retain the useful regional formatting and timezone information but give city/time the strongest
hierarchy. Group controls together and avoid repeating the page title. Add favourites and meeting comparison before
increasing the number of continuously animated elements. Respect reduced-motion preferences and avoid continuously
announcing time changes.

## Feature and code work packages

| Priority | Package                     | Scope and acceptance                                                                                                                                                                                                                                        |
|----------|-----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| P0       | Working first visit         | Overview/root route; valid user selection; deterministic success fixture. A new visitor sees a working example without developer instructions.                                                                                                              |
| P1       | Async teaching scenarios    | Shared input for React/EventSignal search, explicit slow/error/cancel modes, visible source/output distinction and request timing. Rapid edits never display an older result as current.                                                                    |
| P1       | Lifecycle and ownership     | Acquire/release cache entries, abort requests, dispose last-owner resources, add a small subscription/computation inspector. Repeated navigation and widget removal return resource counts to baseline.                                                     |
| P1       | Accessible shared UI        | Named game cells, focus, buttons, forms, consistent cards and responsive navigation/table. Keyboard-only and 390 px scenarios are verified.                                                                                                                 |
| P1       | Build boundary              | Safe JSON transformation, explicit typecheck and production/deep-link smoke checks. Escaping-sensitive JSON fixtures compile; public asset URLs resolve.                                                                                                    |
| P2       | World-time product features | Search/favourite cities, timezone comparison, meeting-time slider and persisted view preferences. DST/date-boundary examples are documented and tested.                                                                                                     |
| P2       | Weather                     | Complete the existing weather plan with fixtures, request deduplication and independent cache/refresh. One clock tick never causes a weather fetch.                                                                                                         |
| P2       | Example decomposition       | Separate counter, user-request/cache and form state from AppStates; separate GlobalTimes view controls, table/cards and clock rendering; share the board UI while retaining distinct game-state implementations. Preserve history for moved implementation. |

Prefer extracting cohesive example state and presentation over introducing a new generic framework. Keep the
source/output and async contract aligned with root-library type tests; remove old Promise casts only after verifying the
real generic inference. The demonstration should expose library behavior without teaching consumers to depend on private
implementation details.

## Suggested first implementation batch

Combine the root overview, valid user fixture and explicit scenario controls with source links/reset actions. Then
implement shared cache ownership and the named-square/keyboard changes. This forms a reviewable baseline before weather
or a large design rewrite. Use the shared recommendations for environment, library-copy and verification work.
