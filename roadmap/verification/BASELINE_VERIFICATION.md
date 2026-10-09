---
iso date: "2026-10-09T12:36:23.600Z"
timestamp: 1791549383600
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, types, tests, docs"
---

# Baseline repair verification — 2026-10-07

## Reproduction

Use the existing installed development dependencies. This change does not install, publish or pin new versions.

```powershell
pnpm verify
# Same pipeline without a pnpm dependency-verification/install step:
node _dev/verify.cjs
```

Individual entry points:

```powershell
pnpm typecheck
pnpm typecheck:contracts
pnpm test --runInBand --ci
pnpm build
pnpm build:parallel
pnpm test:build
pnpm test:signals:gc
node --expose-gc _dev/check_signal_lifecycle.cjs --without-weakref
```

`typecheck:signals` remains an alias for the same strict contract runner. `test:build` requires completed builds.
The verification runner uses the current Node executable for every child, logs the runtime, and stops on failure.
It does not classify a relaxed runtime transform as strict typing evidence.

## Observed results

Environment: Node v26.8.1, TypeScript 5.9.3, Windows x64. Full temporary logs remain under ignored `build_cache/`.
The baseline before this package was 401 passing / 14 failing tests and 36 library diagnostics.

| Check                                           | Result                                                                        |
|-------------------------------------------------|-------------------------------------------------------------------------------|
| Library-only strict tsc                         | 0 diagnostics                                                                 |
| Source signal/emitter contract fixtures         | 0 diagnostics; positive and negative checks                                   |
| CommonJS / NodeNext / Bundler emitted consumers | 2 fixture files pass in each mode; skipLibCheck disabled                      |
| Full Jest, Node and DOM environments            | 9 suites pass; 429 tests pass; 0 failures; 1 skip; 6 todo                     |
| Sequential CJS / ESM development builds         | Both pass; authored `.d.ts` inputs copied                                     |
| Parallel CJS / ESM development builds           | Both pass                                                                     |
| Consumers of both actual build outputs          | Both pass                                                                     |
| Actual CJS runtime smoke                        | Event awaiting, accumulated reducers, computed dependencies and disposal pass |
| Native weak lifecycle                           | Nine GC scenarios and live-owner control pass                                 |
| No-native-WeakRef fallback                      | Explicit disposal passes; no automatic-GC promise                             |

Fourteen new focused Node/DOM tests cover differential emitter behavior, native cleanup and timing capabilities.
The twelve timing failures disappear with explicit Node performance injection. The two deferred-error failures
disappear in the same full run; no iterator scenario was disabled or weakened. The TypeScript/ts-jest peer warning
remains, and error-path signal tests intentionally log their errors.

## Remaining scenario ownership

Ownership means the responsible module, not an assignment to an individual.

| Existing pending scenario                              | Source                                                               | Owner                             | Target                                                             |
|--------------------------------------------------------|----------------------------------------------------------------------|-----------------------------------|--------------------------------------------------------------------|
| Computation error cancels computation in other signals | `spec/modules/EventEmitterEx/EventSignal_spec.ts`, `errors handling` | EventSignal computation/lifecycle | Stages 02/03: define propagation before enabling the existing skip |
| SimpleProxy removeAllListeners with undefined          | `spec/modules/events_spec.ts`, EventEmitterSimpleProxy               | Simple proxy subscriptions        | Stage 03 emitter contracts                                         |
| SimpleProxy removeAllListeners with event name         | Same group                                                           | Simple proxy subscriptions        | Stage 03 emitter contracts                                         |
| SimpleProxy removeAllListeners with proxy hook         | Same group                                                           | Simple proxy hook ownership       | Stage 03 emitter contracts                                         |
| Proxy removeAllListeners with undefined                | `spec/modules/events_spec.ts`, EventEmitterProxy                     | Proxy subscriptions               | Stage 03 emitter contracts                                         |
| Proxy removeAllListeners with event name               | Same group                                                           | Proxy subscriptions               | Stage 03 emitter contracts                                         |
| Proxy removeAllListeners with proxy hook               | Same group                                                           | Proxy hook ownership              | Stage 03 emitter contracts                                         |

These entries were present before the repair. Conditional emitter/DOM branches in the old test helper are not seven
additional pending cases; Jest's structured result records exactly the one skip and six todo above. No new skip/todo was added.

## Scope and follow-up

The global weak-callback signal implementation remains on `dev`; the instance-channel experiment stays separate.
No historical implementation was moved, no packages were edited, and no generated demo copies were changed.
[The compatibility matrix](../../docs/EVENT_COMPATIBILITY.md) states checked contracts and open Node differences.

The pipeline is reproducible with this installed toolchain; clean dependency installation, version pinning, CI and
broader Node/TypeScript matrices remain stage 01 work. Real React/SSR remains separate. ESM output still uses `.js`
under the development tree; native `.mjs` packaging, export maps, clean tarballs and isolated installed consumers
remain stage 06. This run does not establish release readiness or a universal performance claim.

## Emitter Contract Continuation — 2026-10-09

The earlier result/table above records the 2026-10-07 baseline. Previous emitter-contract checkpoint: 11 passing suites,
480 passing tests, zero failures/todo and one existing EventSignal error-propagation skip. The six proxy todo cases
are replaced by executable ownership tests in `spec/modules/EventEmitterEx/EventEmitterSimpleProxy_spec.ts` and
`spec/modules/EventEmitterEx/EventEmitterProxy_spec.ts`, sharing `spec_utils/proxySubscriptionOwnership.ts`.
Source and emitted contracts have zero diagnostics; both builds, actual CJS output, 24 fresh-process emitter entry
orders and native/fallback GC pass. Node 26.8.1, TypeScript 5.9.3, Windows x64; the existing ts-jest peer warning remains.
[Compatibility and migration](../../docs/EVENT_COMPATIBILITY.md), [proxy ownership](../../docs/PROXY_SUBSCRIPTIONS.md).

## Listener Contract Verification — 2026-10-09

Current full `_dev/verify.cjs`: 519 pass, one existing EventSignal skip, zero failures/todo; eleven suites.
39 additional runtime cases cover listener limits, reentrancy, callback identity, static inspection and browser
warning/lifecycle behavior. The initial expanded Node run reproduced 23 failures; all are repaired. Strict library
and source/emitted tuple/proxy/interface fixtures report zero diagnostics in CommonJS, NodeNext and Bundler.
Both builds, built CJS execution, 24 import orders and native/fallback GC pass. No new ts-jest TS diagnostics remain;
the pre-existing TypeScript peer warning and EventSignal console output remain. Toolchain: Node 26.8.1 / TS 5.9.3,
Windows x64. [Contracts and limits](../../docs/EVENT_COMPATIBILITY.md); additional versions/CI remain stage 01.
