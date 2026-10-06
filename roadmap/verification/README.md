---
iso date: "2026-10-06T21:00:50.351Z"
timestamp: 1791320450351
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# Audit Verification on 2026-10-05

Checks ran without changing sources, snapshots, manifests or versions. Full temporary logs are in the audit session's
work/ workspace; AUDIT.md contains the summary. Commands below repeat verification and do not publish or install
anything.

From the repository root:

```powershell
$env:CI='true'
node node_modules/jest/bin/jest.js --runInBand --ci --cacheDirectory '<audit-work>/jest-cache'
node node_modules/typescript/bin/tsc --project tsconfig.json --noEmit --incremental false --pretty false
```

Jest: exit 1; 2 passing / 1 failing suites; 352 passed, 14 failed, 1 skipped, 6 todo, 373 tests. Twelve failures contain
performance.mark is not a function; two contain error test in EventTarget/iterator scenarios. The EventSignal suite
passed.

tsc: exit 2, 372 diagnostics, 37 directly under modules. Include also captures demos with missing dependencies. These
are not 372 independent library defects; grouping their causes is stage 01 work.

Probe from this directory:

```powershell
node --expose-gc lifecycle-probe.cjs 'D:\work\Projects\EventEmitterX'
```

Pre-fix observations: 100 derived → 100 listeners; explicit destructor → 0 listeners; dropped external child
references + 5
event-loop/GC cycles → 100 listeners, last child alive. The probe demonstrates the known retaining path and is not a
stable universal GC unit test.

## Lifecycle Repair Verification — 2026-10-06

The probe now isolates construction from its suspended async frame. Run `pnpm test:signals:gc`: nine scenarios collect
eight forgotten signals each and remove registrations; a live-owner control still receives updates. The same test fails
on the original implementation. `node --expose-gc _dev/check_signal_lifecycle.cjs --without-weakref` checks explicit
cleanup only. See [stage 02](../02_LIFECYCLE.md) for guarantees and remaining work.

## Channel Alternative Decision — 2026-10-06

`dev` retains phase 1: global channels with weak callbacks and its existing 114 passing EventSignal tests.
Phase 2 is preserved on `experiment/eventsignal-instance-channels` at
`d17917f2518a7b3a0700131b2076a949fdb0ae89`; it has 116 passing signal tests and additional GC cases.
Its benchmark script exists only in that branch. No experimental code was merged into `dev`.

[Comparison and reproduction scope](SIGNAL_CHANNEL_COMPARISON.md), [raw measurements](signal-channel-results.json),
and [the architecture decision](../02_LIFECYCLE.md#architecture-decision--2026-10-06) explain why phase 1 remains active:
phase 2 uses about 12.7% more marginal heap for active computed owners in the measured workload, without a reliable
full-graph speed benefit. The linked-list prototype is also retained in the experimental branch for future evaluation.
