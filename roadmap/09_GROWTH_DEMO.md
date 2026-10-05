---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 09 — Further Development and the WEATHER Demo

Priority P2. Evaluate new features after lifecycle, types and installable artifacts stabilize.

## Performance and Extensions

- [ ] Benchmarks: fan-out/fan-in dependency graphs, batched set, dynamic dependencies, async cancellation, listener
  churn and repeated mount/unmount; measure latency, computation/notification counts, heap plateau and bundle size.
  Preserve environment/workload details; avoid claims based on one microbenchmark.
- [ ] Iterator backpressure: watermarks, bounded buffer, overflow policy, compatible-source pause/resume,
  abort/return/throw and slow consumers. Replace queues after measurements while preserving the Node contract.
- [ ] Batch/synchronous subscription modes need a separate API design after existing microtask semantics are
  established; do not silently change default delivery.
- [ ] Domains/request scopes instead of one global bus, diagnostics without instance retention and optional development
  tooling.
- [ ] Selectors/equality/object collections: define value identity and equality contracts; consider value TTL/lifecycle
  and bidirectional maps separately.
- [ ] Prioritize proxy and EventTarget extensions from docs/IMPROVEMENTS by utility and cost; a complete EventTarget
  implementation does not block a Node-compatible emitter unless declared as supported.
- [ ] Move the Clicker demo from vendored module copies to the packed/released package; check API-copy divergence. This
  does not require all backend dependencies in the core typecheck.

## WEATHER_INTEGRATION_PLAN → Demo Development Plan

Sources: `../demo/eventSignals-test-app/_dev/todo/WEATHER_INTEGRATION_PLAN.md` and `_RU.md`. They remain the detailed
design; this stage defines order and acceptance criteria. Their time estimates and provider information are not accepted
as verified current facts; check the API/terms before implementation.

1. [ ] Complete the weather API layer: typed geocoding/forecast results, response validation, network errors,
   AbortSignal, timeout and in-flight deduplication. Verify the selected provider and current terms separately.
2. [ ] Separate coordinate caching and weather TTL; provide a bounded cache, negative caching, retry/backoff and
   fallback with a stale marker. Keys include required coordinates/units/locale; do not accidentally merge nearby cities
   through coarse rounding.
3. [ ] City/model owns weather state, with an independent refresh trigger; second-by-second nowDate updates do not issue
   requests. Define cancellation when a city is removed or pages switch.
4. [ ] Provide a concurrency/rate budget, visibility-aware refresh and correct offline behavior. Design a server layer
   if credentials are needed; do not put secrets in the demo bundle.
5. [ ] Show temperature/weather code and pending/error/stale states in list/grid/table; address units, locale,
   accessibility and layout shifts.
6. [ ] Verify with a fake API/timers: repeated ticks do not fetch, expired TTL produces one request, HTTP 429/network
   errors provide clear fallback, a removed city receives no late result and unsubscribe/destructor releases resources.
7. [ ] Use the demo as a prolonged lifecycle/heap workload: city creation/removal, navigation, PiP and hide/show. Use a
   tarball/released package to exercise the consumer path.

## Completion

Each feature has an independent task with an observable result and test/benchmark. Weather appears in every selected
view without fetching every second or accumulating models/subscriptions. The original WEATHER plans remain a detailed
appendix; work status is tracked here.
