---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 01 — Reproducible Checks

Priority P0. Goal: separate the library, demos, development tools and representative consumer fixtures.

## Work

- [ ] Provide working test/typecheck/build scripts; create a library tsconfig that includes library files and excludes
  demo/spec/build.
- [ ] Preserve the complete existing specification suite. Investigate the 14 failures, starting with perf_hooks/global
  performance and isolation of the deferred EventTarget error. Do not disable tests to obtain a green report.
- [ ] Run runtime tests separately from strict tsc; do not treat disabled strict checking in ts-jest as evidence of type
  correctness.
- [ ] Separate Node and DOM environments, fake and real timers; test real React in a separate project. Check
  Symbol.dispose, WeakRef, Promise.withResolvers and other recent APIs.
- [ ] Pin TypeScript/pnpm versions and the lockfile. Replace latest/no-frozen-lockfile in the reproducible pipeline;
  move root postinstall patches into an explicit development setup or replace them with supported tooling.
- [ ] Add library CI for tests, type checks, builds and consumer smoke tests; the existing gh-pages pipeline serves the
  website/demo.
- [ ] Classify skipped/todo cases and assign a scenario owner and target stage.

## Completion

One documented command sequence from a clean checkout reproduces runtime and strict type/declaration checks. Every
declared supported environment passes; remaining failures are explained, and release blockers are not concealed. Demo
code does not need to be part of the library build. The observed baseline is 352 passing / 14 failing tests and 372
diagnostics from the root tsc run; it is a starting point rather than an acceptance criterion.
