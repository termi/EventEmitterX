---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 07 — Consumer Experience, React and Documentation

Priority P1. Goal: provide a short, correct path from installation to working lifecycle management.

## Work

- [ ] README: root imports, installation, supported environments/versions, actual Node compatibility and a cleanup
  example. Update EN/RU together and synchronize docs-site.
- [ ] Scenarios: basic emitter; awaiting with timeout/abort; async iterator with break; mutable state; lazy projection;
  active subscriptions; async computation pending/error; Model-owned signals for React and a terminal.
- [ ] Show who owns the signal and subscription, who calls destructor and how unsubscribe differs from destroying a
  Model. Do not recreate shared signals inside render.
- [ ] Provide a native useSyncExternalStore bridge as a recipe and adapter; check stable snapshots, selector identity
  changes, tearing, concurrent rendering, StrictMode repeated mount/cleanup and unmount during async/RAF work.
- [ ] Real React fixtures for supported versions supplement fakeReact; one synthetic implementation does not establish
  JSX protocol or React 19 compatibility.
- [ ] SSR: getServerSnapshot, hydration consistency, no server requestAnimationFrame, per-request Model isolation, no
  cross-request subscriptions or React-global initialization conflicts.
- [ ] Browser fixture without Node runtime polyfills; Worker fixture for declared support; measure core and React bundle
  size. Document required runtime facilities instead of claiming “no polyfills” when they are needed.
- [ ] A Junct fixture reproduces integration-document needs inside this repository: shared Dataset/Model signals, native
  methods, revision→DTO projection and microtask updates without forced get. Do not modify the Junct checkout.
- [ ] Executable documentation examples use the packed package; a reading/writing, scheduling and error cheatsheet
  reduces onboarding complexity.

## Completion

A new user can run every quickstart in a clean fixture. Documentation shows a tested/unsupported/experimental matrix.
Shared models are released, React cleanup is repeatable and server snapshots agree during hydration. Documentation
promises only verified behavior.

Adapter contract: [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore).
