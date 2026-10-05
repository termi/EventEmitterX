---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
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

Observations: 100 derived → 100 listeners; explicit destructor → 0 listeners; dropped external child references + 5
event-loop/GC cycles → 100 listeners, last child alive. The probe demonstrates the known retaining path and is not a
stable universal GC unit test.
