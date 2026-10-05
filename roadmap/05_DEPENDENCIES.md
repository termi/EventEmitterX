---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 05 — Creating and Publishing Independent Dependencies

Priority P0. Local links are currently intentional; the task is to turn packages into reproducible independent products
rather than merely rename imports.

Prerequisite: revisiting the current prohibition on modifying `packages/` is a deferred task. This plan does not lift
that restriction or authorize package edits now.

## Work

- [ ] Inventory runEnv, type_guards, abortable, ServerTiming, polyfills and ProgressControllerX: sources, artifacts,
  tests, distribution rights and runtime/type dependencies. Some directories currently contain only manifests and dist;
  restoring sources is a separate task, and dist is not a complete source of truth.
- [ ] Create or restore src, CJS/ESM/types builds, unit tests and README for runEnv/type_guards/abortable. Establish
  canonical npm names; reconcile current @termi/runenv, @repo/type_guards and termi@... imports before release.
- [ ] Build a directed dependency graph and determine the publication order topologically. Type-only ServerTiming must
  also resolve from public .d.ts; either its package is available to the consumer or the public type is genuinely
  decoupled.
- [ ] Workspace links/aliases are allowed during development. Packed manifests and JS/.d.ts/source must not refer to a
  neighboring checkout, cftools, `~` or non-registry local aliases.
- [ ] Check root and wildcard exports for every package, especially type_guards require .mjs/.cjs; publish only
  supported subpaths.
- [ ] Keep TypeScript and build tools in devDependencies; choose optional/peerDependencies from the actual graph rather
  than hiding a required runtime dependency.
- [ ] Polyfills: establish which the library requires for the chosen engines baseline; do not make global monkey patches
  an implicit consumer obligation.
- [ ] Prepare npm pack and clean installation of each package with install scripts disabled, offline tarball fixtures
  where possible, and normal declared registry-dependency checks before publication.

## Publication Order

First prepare and verify all packages and the main library together using tarballs. After the owner selects a release,
publish graph leaves, then dependent packages, then EventEmitterX with already-available versions. Choose actual
names/versions and dist-tag from the prepared artifacts; do not claim new packages are published beforehand.

## Completion

Every package builds from available sources in a clean environment, works through CJS/ESM/types and has a documented
runtime baseline. The main package installs without neighboring repositories or development postinstall. The required
runEnv/type_guards/abortable packages are to be prepared in this session; other packages enter the release if required
by the graph.
