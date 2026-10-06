---
iso date: "2026-10-06T16:12:30.907Z"
timestamp: 1791303150907
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "demo, review"
---

# Clicker: review and improvements

[Russian version](REVIEW_AND_IMPROVEMENTS_RU.md) · [Shared recommendations](../RECOMMENDATIONS.md).

## Purpose and assessment

The app demonstrates an authenticated real-time game with role-dependent commands, async EventSignal UI, countdowns, tap
batching and SSE updates. The exercised single-player round works end to end. Reproduced API defects and the blocked
typecheck should be corrected before extending gameplay or presenting this as an implementation template.

Review context: `dev` / `b943225`, 2026-10-06; Node 26.8.1, TypeScript 5.9.3, Vite 6.3.5 and existing dependencies.
Frontend ran at `http://127.0.0.1:5182`, backend at `http://localhost:3101`. An ignored SQLite copy and temporary
signing secret isolated all test writes. Current clicker uses its own compiled EventSignal copy.

## Functionality checked

| Scenario                      | Result                             | Evidence / limits                                                                                                                                            |
|-------------------------------|------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Unauthenticated entry         | Works                              | Redirects to `/auth`; empty login invokes required-field validation.                                                                                         |
| Registration/API and login/UI | Works, with unsafe role assignment | A synthetic user was registered via API in the copied database; browser login opens Dashboard. Name-based ADMIN assignment is a finding below.               |
| First dashboard load / reload | Deliberate failure                 | Synthetic error appears on first try and reappears after reload; Retry recovers. Session remains authenticated after reload.                                 |
| Admin create dialog           | Works                              | Modal opens, title can be edited, submission creates and selects the round.                                                                                  |
| Countdown → tap → completion  | Works                              | Scheduled round becomes active, one pointer click raises total/personal score to 1; end state shows winner and removes the tapping area.                     |
| Event propagation             | Partially verified                 | A round created through the API appears in the already running browser dashboard. Multiple clients, disconnect/replay and missed events were not tested.     |
| Profile / Settings            | Routes work                        | Profile shows username; Settings is the Vite starter page.                                                                                                   |
| Mobile 390 × 844              | Fails layout check                 | DOM width 719 px; round details and Logout are clipped. Viewport override was reset afterwards.                                                              |
| Vite production bundle        | Pass                               | 116 modules, about 348 kB JavaScript before gzip. Two existing `"use string"` directives are ignored with warnings. Full production preview was not checked. |
| TypeScript build              | Fail                               | Missing Prisma/type-only imports, erasable-syntax diagnostics and `tsconfig.node.json` no-input error.                                                       |
| Existing frontend tests       | 49 pass / 5 fail                   | All five AppLayout tests fail in `beforeEach` on undefined global storage with Node 26.8.1. Backend suites were not run.                                     |
| Repeat create request         | Fail                               | Same idempotency header and body produce different round IDs.                                                                                                |
| Active-round filtering        | Fail                               | A currently active round appears in all rounds, but not with `isActive=true`.                                                                                |

Theme persistence under a dark system preference is a static finding. Logout, refresh-token expiry, hidden-tap role,
concurrent players, restart recovery and full authorization coverage require further checks. No source fix or commit was
made.

## Findings and recommendations

### 1. 🔴 Critical — Registration grants administrator privileges by name

**File:** `demo/clicker/backend/src/auth/authService.ts`, lines 72–80.

**Problem:** Confirmed against the isolated database: an unauthenticated registration using the name `admin` returns the
ADMIN role. This supports the original interview-demo scenario, but it is a privilege escalation if this endpoint is
exposed as a real application.

```typescript
const role: UserRole = (name === 'admin' || name === 'test_admin')
    ? 'ADMIN'
    : name.toLowerCase() === 'никита'
        ? 'USER_HIDE_TAPS'
        : 'USER';
```

**Recommendation:** Separate fixture provisioning from public registration. Public registration must assign USER
regardless of name. Create administrator and hidden-tap fixtures through an explicit local seed command with a clearly
marked demo mode. Acceptance: names `admin` and `test_admin` cannot elevate a public registration; fixtures still
demonstrate role-dependent behavior.

### 2. 🔴 Critical — Repeated requests create duplicate rounds

**File:** `demo/clicker/backend/src/routerHandlers/roundsRouters.ts`, lines 122–123, 245–246.

**Problem:** Two sequential POST requests with the same `X-Idempotent-Id` created different round IDs. Fastify/Node
normalizes incoming header keys to lowercase, while this lookup uses mixed case. The same lookup is used for taps, so
retry protection is also at risk there; duplicate tap behavior was not exercised.

```typescript
const idempotentId = String(req.headers["X-Idempotent-Id"] || '');
const alreadyHandledResult = (idempotentId && requestsIdempotentMap.get(idempotentId)) || void 0;
```

**Recommendation:** Read `x-idempotent-id`, validate its format and scope keys by user, operation and resource. Store an
atomic reservation/result with expiry and request-payload identity; a process-local response Map alone cannot prevent
concurrent or post-restart duplicates. For persistent operations prefer a database unique key/transaction. Acceptance:
sequential and concurrent retries return one round or one tap result, while another user cannot retrieve a cached
response.

### 3. 🔴 Critical — The active-round filter selects expired rounds

**File:** `demo/clicker/backend/src/routerHandlers/roundsRouters.ts`, lines 60–65.

**Problem:** Confirmed with a newly created currently active round: `/rounds` includes it, `/rounds?isActive=true`
excludes it. The predicate asks for an end time earlier than now, which is the opposite of an ongoing round.

```typescript
where: isActive ? {
    completed: false,
    endedAt: {
        lt: new Date(),
    },
} : void 0,
```

**Recommendation:** Define separate scheduled, ongoing and completed states. If active means ongoing, use
`startedAt <= now` and `endedAt > now` plus `completed=false`; if it includes scheduled rounds, omit the start predicate
and name/document that contract. Reuse one captured server timestamp and test both time boundaries and explicit
completion.

### 4. 🟠 Warning — The normal build is blocked by incompatible shared types/configuration

**File:** `demo/clicker/frontend/tsconfig.node.json`, lines 24–26.

**Problem:** `tsc -b` fails with TS18003 because the include pattern does not match `vite.config.ts`. It also reports
missing Prisma types, type-only-import errors and non-erasable syntax in shared modules. Related locations:
`demo/clicker/api/routers.ts`, lines 3–6 (`import { User, Prisma, Round, UserRole } from '@prisma/client';`);
`demo/clicker/frontend/tsconfig.app.json`, lines 13 and 22 (`verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`).
Direct Vite bundling passes, which does not establish type correctness.

```json
"include": [
    "vite.config"
]
```

**Recommendation:** Fix the include pattern; convert type-only imports explicitly. Extract browser-safe DTOs from ORM
implementation types so the frontend does not require resolving the backend-only Prisma installation. Decide
deliberately whether shared enums are compiled or replaced with erasable constants/types; do not disable strictness
wholesale. Acceptance: the documented `pnpm build` passes from a clean install and checks the shared boundary.

### 5. 🟠 Warning — The current test setup fails on Node 26

**File:** `demo/clicker/frontend/src/tests/layouts/AppLayout.test.tsx`, lines 30–34.

**Problem:** On Node 26.8.1, 49 frontend tests passed and all five AppLayout tests failed before their assertions: the
global `localStorage` was undefined. Vitest uses jsdom, but the unqualified global storage binding is not reliable in
this runtime. This result is environment-specific; the application browser storage itself worked.

```typescript
beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
});
```

**Recommendation:** Use the jsdom window storage explicitly and establish any required global mapping centrally in test
setup, with a defined document origin. Pin and document the supported Node baseline; add a second-runtime check only if
it is in scope. Acceptance: all 54 tests pass, including saved light-mode behavior with a dark OS preference.

### 6. 🟠 Warning — Artificial errors are enabled in the default journey

**File:** `demo/clicker/logic/activeRoundsStore.ts`, lines 66–67, 85–88.

**Problem:** Observed immediately after login and again after a page reload. Retry recovers, so the boundary works, but
a new visitor sees a broken dashboard before playing. The artificial two-second API delay in
`demo/clicker/backend/src/routerHandlers/roundsRouters.ts`, line 56 (`await promiseTimeout(2000);`), also applies to
every list request.

```typescript
const showErrorOnFirstTry = localStorage.getItem('DO_NOT_THROW_ERROR_ON_FIRST_TRY') !== 'true';
// ...
if (showErrorOnFirstTry && !wasErrorOnFirstTry) {
    wasErrorOnFirstTry = true;
    throw _makeFakeError();
}
```

**Recommendation:** Provide an explicit “failure simulation” panel with deterministic scenarios and a reset action.
Default to the successful flow; enable delays/failures via demo settings that never affect ordinary production mode. Add
meaningful empty/loading/offline states and keep last successful data visible while reconnecting.

### 7. 🟠 Warning — The dashboard overflows a mobile viewport

**File:** `demo/clicker/frontend/src/signalComponents/RoundsList.css`, lines 2–18.

**Problem:** Confirmed at 390 × 844: document width is 719 px, the selected round is mostly off-screen and the Logout
control is clipped. The permanent two-column arrangement combines with large dates and the fixed-width ASCII click area.

```css
.cards-page { display: flex; flex-direction: row; }
.cards-list { width: 20%; min-width: 190px; }
.selected-card-container { padding-left: 16px; flex-grow: 1; }
```

**Recommendation:** Stack list and detail at a defined breakpoint, use `min-width: 0` on flexible detail content, wrap
navigation and replace ASCII art with a scalable visual inside the action button. Make dates secondary and use flexible
card height. Acceptance: no document-level horizontal scroll at 390 px; round selection, tapping and logout remain
reachable at 200% zoom.

### 8. 🟠 Warning — The main game action is pointer-only

**File:** `demo/clicker/frontend/src/signalComponents/SelectedRound.tsx`, lines 148–153.

**Problem:** The accessibility tree exposes a container rather than an action button. A pointer click increments both
displayed scores, but the element has no native focus or Enter/Space activation.

```typescript
<div className="selected-card-clicker" data-round-id={id}
    onClick={onSelectedCardClicked}
>
    <span>Кликайте сюда</span>
```

**Recommendation:** Use a native button with a descriptive label, visible focus and the round ID required by the
handler. Preserve server validation and the existing score synchronization. Expose cooldown/unavailable states with
text, and do not announce every high-frequency tap. Acceptance: an authenticated player can earn a point with the
keyboard and cannot tap a finished round.

### 9. 🟠 Warning — Saved light mode is ignored on a dark system

**File:** `demo/clicker/frontend/src/layouts/AppLayout.tsx`, lines 27–29.

**Problem:** Static review: a saved `"false"` falls through to system preference, so a dark OS preference overrides the
user’s explicit light-mode selection on the next mount. A dark-system browser scenario was not executed.

```typescript
const savedMode = localStorage.getItem(_localStorage_darkMode_key);
return savedMode && savedMode === 'true' ? true : _detectBrowserDarkMode();
```

**Recommendation:** Distinguish absent storage from a stored boolean, or model theme as system/light/dark. Apply the
preference consistently on the auth page and app layout, and test remount plus system-preference changes.

### 10. 🟡 Suggestion — Settings opens the Vite starter page

**File:** `demo/clicker/frontend/src/App.tsx`, lines 26.

**Problem:** Confirmed in the browser: Settings shows Vite/React logos, a sample counter and HMR instructions. Profile
only displays the username. These routes do not yet help a player understand or configure the game.

```typescript
<Route path="/settings" element={<DemoPage />} />
```

**Recommendation:** Replace Settings with theme, language, reduced-motion and demo-scenario preferences; hide it until
ready if necessary. Extend Profile with personal round history and scores. Add a clear round-state legend, rules and
scoring explanation; offer admin duration/cooldown controls in the creation dialog. Avoid unrelated template branding.

### 11. 🟠 Warning — The JWT secret has a committed fallback

**File:** `demo/clicker/backend/src/common/env.ts`, lines 12.

**Problem:** Static review: missing configuration silently uses the same committed signing key on every installation.
The snippet omits the literal intentionally. The review backend used an ephemeral random secret. This is unsafe for a
deployed service, even though the current server was tested locally.

```typescript
export const JWT_SECRET = process.env.JWT_SECRET || /* committed fallback literal */;
```

**Recommendation:** Fail startup without an externally supplied secret outside an explicit disposable demo mode.
Document local configuration without real credentials; generate a local secret for fixtures. Restrict development CORS
outside that mode and add schema validation/rate limiting to authentication before public hosting.

## Design direction

Keep the dashboard centered on one selected round: state, remaining time, score and one large accessible tap button.
Make timestamps and technical diagnostics secondary. Replace heavy borders and oversized date typography with consistent
cards, spacing and concise state badges. Use a readable countdown with an accessible progress description; do not expose
a signed negative percentage as the main user explanation.

On mobile, use a compact selectable round list above the details. Keep the primary action within reach and show pending
taps versus confirmed score clearly. Provide visible “connecting / live / reconnecting / offline” status so a stalled
score is understandable. Explain cooldown and scoring before the first round rather than requiring discovery through
errors. Use consistent RU/EN interface text and a meaningful document title.

## Feature and code work packages

| Priority | Package                  | Scope and acceptance                                                                                                                                                                            |
|----------|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| P0       | API correctness          | Header normalization and atomic idempotency; active-state semantics/time boundaries. Retried commands cause one durable effect; active results match the documented contract.                   |
| P0       | Safe demo configuration  | Public USER registration; explicit role fixtures; required signing configuration and isolated database launch. Names cannot grant privileges; default data is reproducible.                     |
| P0       | Build/test baseline      | Browser DTO boundary, matching TypeScript config, reliable jsdom storage. Full frontend build and all existing tests pass on the declared runtime.                                              |
| P1       | Intentional scenarios    | Default success flow; explicit error/delay/cancellation panel, useful empty/loading states and reset. First visit and reload work without an unsolicited fake error.                            |
| P1       | Mobile and keyboard      | Responsive list/detail layout, native tap button, named create control, focus and modal usability. No document overflow at 390 px; keyboard can create/select/play a round.                     |
| P1       | Durable game lifecycle   | Recover unfinished rounds on startup; finalize idempotently and persist winner/result consistently; reconnection resync. Restart before/after end does not lose or duplicate the final outcome. |
| P2       | Real game features       | Paginated history, personal profile statistics, leaderboard with defined tie-breaker and admin duration/cooldown fields. Results are consistent with stored scores and hidden-tap rules.        |
| P2       | Real-time teaching panel | Show batching, pending/confirmed taps, server clock offset, SSE state and subscription counts. Demonstrate two clients and a controlled disconnect with bounded recovery.                       |
| P2       | Decomposition            | Split round listing/creation/taps/SSE handlers; separate game timing, persistence and client presentation responsibilities. Preserve history for moved implementation.                          |

For restart recovery, `demo/clicker/backend/src/services/roundsService.ts`, line 13, already records the intent:
`// todo: Загружать из базы незакрытые раунды и отслеживать их состояние`. Treat this as a planned recovery requirement;
a restart scenario was not executed in this review. Prefer a server-authoritative finalization transaction and
deterministic tie policy over deriving final state only from a connected client or an in-memory model.

Add SSE resynchronization before relying on incremental events for a leaderboard: reconnect should fetch an
authoritative snapshot, reconcile pending commands by idempotency key and expose connection state. Decide whether event
IDs/replay are needed after measuring the demo contract. Avoid expanding the current caches without ownership, limits
and expiry.

## Suggested first implementation batch

Group idempotency and time-filter fixes with disposable fixture startup and focused API contract tests. Separately
repair the typecheck/jsdom baseline. Then combine responsive layout, native tap action and explicit simulation controls.
This sequence makes the application demonstrably reliable before history/leaderboard and a larger backend decomposition.

