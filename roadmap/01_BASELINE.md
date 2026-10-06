---
iso date: "2026-10-06T08:35:29.727Z"
timestamp: 1791275729727
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 01 — Reproducible Checks

Priority P0. Goal: separate the library, demos, development tools and representative consumer fixtures.

## Work

- [x] Provide working test/typecheck/build scripts; create a library tsconfig that includes library files and excludes
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

## 01.1 — Implemented Command Infrastructure

The command entry points and compiler scope are implemented; this does not mean the existing tests or types pass.
The owner will commit this change set manually before work proceeds to 01.3. The remaining tasks stay open.

| Command                      | Purpose                                              | Observed result                                  |
|------------------------------|------------------------------------------------------|--------------------------------------------------|
| `pnpm test --runInBand --ci` | Existing Jest suite and configuration                | 352 passed, 14 failed, 1 skipped, 6 todo; exit 1 |
| `pnpm run typecheck`         | Library-only checking through tsconfig.library.json  | 36 diagnostics, none from demo; exit 2           |
| `pnpm run build:cjs`         | CommonJS development output under build_ts/cjs       | Compiler diagnostics reported; nonzero exit      |
| `pnpm run build:esm`         | ES2020 module development output under build_ts/esm  | Compiler diagnostics reported; nonzero exit      |
| `pnpm run build`             | Sequential CJS/ESM build using pnpm                  | Stops on the first unsuccessful build            |
| `pnpm run build:parallel`    | Both compiler processes, with a combined exit status | Both failures reported; exit 1                   |

All three configs select the same 13 library root files under modules/ and utils/. The shared library config inherits
the existing strict settings, limits ambient types to node, and excludes demo/spec/spec_utils/packages/_dev and output
directories. Dependency declarations may still be loaded to resolve imports; exclusion is not a ban on dependency
resolution. noEmitOnError prevents writing partial artifacts: both compiler API emission checks skipped emission and
performed zero writes. Existing source files, Jest settings and package directories are unchanged.

The ESM development build emits .js; this is not the final .mjs distribution or a verified Node package entry.
Root exports, extension rewriting, clean-consumer verification and publication remain stage 06 work.
The devEngines version fields use `*` to make the existing Node/pnpm requirements syntactically usable without
prematurely choosing a supported range; toolchain pinning remains task 01.5. pnpm identity is still required.

During verification, the bundled pnpm's dependency auto-install check was disabled through
`pnpm_config_verify_deps_before_run=false` to use installed dependencies without modifying them. Sandbox access to
node_modules required expanded execution permission. This environment-specific override is not committed as a
project setting. Logs stay in ignored build_cache/roadmap-01-1/. Results describe the 2026-10-06 verification run.

## Completion

One documented command sequence from a clean checkout reproduces runtime and strict type/declaration checks. Every
declared supported environment passes; remaining failures are explained, and release blockers are not concealed. Demo
code does not need to be part of the library build. The observed baseline is 352 passing / 14 failing tests and 372
diagnostics from the root tsc run; it is a starting point rather than an acceptance criterion.
