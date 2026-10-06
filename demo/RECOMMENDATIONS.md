---
iso date: "2026-10-06T16:12:30.907Z"
timestamp: 1791303150907
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "demo, review"
---

# Demo review and shared recommendations

[Russian version](RECOMMENDATIONS_RU.md).

## Scope and evidence

Review of branch `dev` at `b943225` on 2026-10-06. Both applications were started using their already installed
dependencies. Browser checks used the Codex in-app browser; Node was 26.8.1 and TypeScript 5.9.3. Source-code findings
below are distinguished from reproduced behavior. No dependency reinstall, source fix, publication or commit was
performed.

| Application              | Local address                                     | Verified result                                                                                                                                                       |
|--------------------------|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| EventSignal laboratory   | `http://127.0.0.1:5181`                           | All six menu pages open; counters, bound form, game move/history, search, widget add/clear, clocks and table selection respond. Root URL opens 404.                   |
| Clicker frontend/backend | `http://127.0.0.1:5182` / `http://localhost:3101` | Login, Retry, creation, countdown, tap scoring, completion/winner, profile and settings navigation work. Repeated creation and active filtering fail their contracts. |
| Production bundles       | Output under ignored `build_cache/`               | Both direct Vite builds pass; this is not confirmation of a full release build or a production-preview smoke test.                                                    |
| Clicker typecheck/tests  | Frontend `tsc -b` / Vitest                        | Typecheck fails; 49 tests pass, 5 fail during storage setup on this Node version.                                                                                     |

Clicker used an ignored copy of SQLite and an ephemeral signing secret. Synthetic test users and rounds were written
only to that copy. The original database and generated library copies were not edited. A temporary require-cache
bootstrap supplied the Prisma datasource because a normal database override is absent. Sandbox launch failures were
resolved with local-server permissions and are not app defects.

## Per-application reports

- [EventSignal laboratory](eventSignals-test-app/REVIEW_AND_IMPROVEMENTS.md): code, user experience, teaching scenarios
  and weather extension.
- [Clicker](clicker/REVIEW_AND_IMPROVEMENTS.md): reproduced API defects, build/test blockers, accessibility, responsive
  design and game features.

## Shared findings

### 1. 🟠 Warning — The demos exercise different copies of the library

**File:** `demo/eventSignals-test-app/package.json`, lines 19.

**Problem:** The laboratory imports the root source, while clicker imports its own compiled copy:
`demo/clicker/logic/activeRoundsStore.ts`, line 7,
`import { EventSignal } from "../modules/EventEmitterX/EventSignal";`. A successful clicker run therefore does not
validate the latest root EventSignal implementation. This does not justify editing generated copies directly.

```json
"@termi/eventemitterx": "link:../../"
```

**Recommendation:** Define a shared source-of-truth build and a reproducible copy-generation step, or switch demos to
the package entry points when the packaging/dependency roadmap permits it. Display the library version/commit in a
developer panel. Add a package-consumer run after publishing work; preserve the deferred prohibition on changing
internal packages.

### 2. 🟠 Warning — Build checks have different meanings

**File:** `demo/eventSignals-test-app/package.json`, lines 11.

**Problem:** The laboratory build performs bundling without a typecheck. Clicker declares `tsc -b && vite build` in
`demo/clicker/frontend/package.json`, line 12; its bundler passed but the typecheck failed. Reporting both simply as
“build passed” would conceal a release blocker.

```json
"build": "vite build"
```

**Recommendation:** Provide separate typecheck, test, bundle and preview-smoke commands for both apps, then compose the
release check from all required steps. Use browser-safe project boundaries and track known root diagnostics explicitly
rather than hiding them. Verify clean installation on the documented Node/package-manager baseline and both Windows and
Unix launch paths.

### 3. 🟠 Warning — Clicker lacks a normal isolated-data launch option

**File:** `demo/clicker/backend/prisma/schema.prisma`, lines 5–8.

**Problem:** The SQLite path is fixed; `demo/clicker/backend/src/orm/prismaClient.ts`, line 5, initializes
`new PrismaClient()` without an override. This review needed a temporary bootstrap to inject a datasource pointing to a
copy. Normal manual smoke tests would otherwise write into the existing demo database.

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./data/dev.db"
}
```

**Recommendation:** Add an explicit database URL option and a local fixture/reset command. Keep disposable test data
separate from any existing user data and production configuration. Acceptance: one documented command starts an isolated
demo, seeds named fixture roles and rounds, and can recreate that fixture database without touching the tracked
baseline.

## Development sequence

| Stage                            | Work                                                                                                                                                                 | Completion criteria                                                                                             |
|----------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| 1. Reliable baseline             | Correct clicker idempotency/filtering; isolate administrator fixtures and signing configuration; fix its build/test setup; give the laboratory a valid entry screen. | Default journeys work from documented commands; repeated requests are safe; full required checks pass.          |
| 2. Demo contract                 | Introduce explicit scenarios and local fixtures; standardize shared-library generation/version visibility and start/reset commands.                                  | Successful mode works without external data; delays, failures and cancellations can be selected and reproduced. |
| 3. Accessible design             | Agree on spacing, typography, colors, focus and loading/error/empty states; mobile layout and keyboard flows in both demos.                                          | Check 390/768/desktop widths, 200% zoom, keyboard-only interaction, long RU/EN labels and reduced motion.       |
| 4. Teaching and product features | Laboratory dependency/lifecycle inspector and weather; clicker round history, leaderboard and reconnection status.                                                   | Each feature explains the library behavior it demonstrates and has a bounded, testable acceptance scenario.     |

Use the same visual language while keeping the laboratory exploratory and clicker focused on playing. Provide a short
“what this demonstrates” panel with a source link, expected outcome and reset button. Keep render counts, stack traces
and simulation controls in an optional developer panel. Display concise actionable errors to visitors and detailed
diagnostics there.

For code decomposition, move cohesive responsibilities first: laboratory counter/user fixtures, async search and
world-time presentation/state; clicker authentication, round commands, timing and SSE lifecycle. Preserve Git history
when moving substantive implementation, following the existing project decomposition workflow; simple new type files may
use the previously allowed history exception.

## Verification to add

Automate only meaningful contracts: first entry; writable/computed updates; pending/error/retry and stale async results;
shared-signal disposal; round time boundaries; sequential/concurrent idempotency; keyboard activation; reconnect after
missing events; client remount and server restart. Use disposable fixtures, a controlled clock where appropriate and
listener/request counts for lifecycle checks.

Before calling the demos release-ready, run clean install, complete build, production preview with direct deep-link
refresh, cross-browser checks, backend test suites, multiple clients with SSE disconnect/reconnect, server restart with
unfinished rounds, and a measured memory/lifecycle test. Those checks were not completed in this review. Locale
selection, every game variant, Picture-in-Picture permissions and weather-provider availability were not fully
exercised. Desktop rendering was inspected visually; only clicker received the explicit 390 px measurement.

## Reproduction commands

From each corresponding directory, with dependencies installed:

```powershell
# demo/eventSignals-test-app
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5181 --strictPort
node node_modules/vite/bin/vite.js build --outDir ../../build_cache/demo-signals-dist

# demo/clicker/frontend
$env:VITE_BACKEND_PORT='3101'
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5182 --strictPort
node ../../../node_modules/typescript/bin/tsc -b --pretty false
node node_modules/vitest/vitest.mjs run
node node_modules/vite/bin/vite.js build --outDir ../../../build_cache/demo-clicker-dist
```

The backend was launched through the isolated review bootstrap, not the ordinary `dev` script. Do not infer that setting
`DATABASE_URL` alone isolates the current hardcoded Prisma schema. Standard isolated startup is proposed above.
