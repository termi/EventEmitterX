---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 06 — Root Index, CJS, ESM and TypeScript

Priority P0. Depends on the API contract, decomposition and prepared dependency graph.

## Work

- [ ] Create a real root index.ts re-exporting all public library modules: EventEmitterX and its EventEmitter alias,
  EventSignal, EventAwait, iterator, proxy classes and public errors/helpers/types. Explicitly inventory the public
  utils API; tests, demo and private debug hooks are excluded from “all modules”.
- [ ] Implement tsconfig.cjs.json/tsconfig.esm.json and a declaration build with explicit include/exclude and
  noEmitOnError. Do not recompile demo, tests or old dist.
- [ ] Design output and extensions: dist/cjs/*.cjs, dist/esm/*.mjs, precise relative imports and maps/declarations.
  Ordinary tsc on .ts does not automatically emit .cjs/.mjs: use a verified rename/rewrite pipeline or suitable
  compiler/bundler.
- [ ] Set main to the compiled CJS index and exports.require/import to the corresponding indices. Verify types
  conditions and .d.cts/.d.mts or another consistent scheme with real tsc resolution; a types field alone does not prove
  both forms.
- [ ] Add convenient events/signal/react/await subpaths and transitional deep exports where preservation is required.
  Test ESM tree shaking with a bundle; choose sideEffects after inventorying initialization/registries/prototype
  mutations.
- [ ] Supply TypeScript sources through a documented explicit subpath, for example /source, with resolvable imports.
  Ordinary JS consumers use built JS by default.
- [ ] Check sources separately in Bun/Deno: aliases, extensions, enum/namespace/decorators, built-in Node types and
  runtime APIs. Native TypeScript is not a universal execution guarantee.
- [ ] Check the dual-package hazard: if CJS and ESM load together in one process, do not promise shared
  identity/registries without separate design and verification. Select and document a supported contract.
- [ ] Files allowlist: JS, types, sourcemaps/source according to the chosen policy, README/license. Exclude demos,
  development patchers, test caches and unnecessary artifacts; constrain package size.
- [ ] Prepack/prepublishOnly verifies a reproducible build; consumer tarball installation does not run development-only
  patchers or a mandatory pnpm gate.

## Completion

Clean consumer fixtures use only the npm pack tarball: Node require/import, NodeNext/Bundler TypeScript, browser
bundler, Bun JS/source and Deno source. Every declared entry point exists and imports without checkout aliases.
EventEmitter and EventEmitterX imports within one build have equal identity. Declaration maps/source paths do not point
to the author's local disk.
