---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 08 — Preparing and Publishing an npm Release

Priority P0. Actual publication is a separate action after a reviewable release scope is ready and the owner selects it.
This audit does not publish packages.

## Reviewable Release Scope

- [ ] P0 issues in AUDIT are resolved or excluded from an explicitly selected experimental scope; the known leak is not
  concealed by destructor documentation.
- [ ] RunEnv/type_guards/abortable and other required dependencies are verified; names, versions, licenses,
  README/repository/homepage and access are prepared.
- [ ] A fresh build produces error-free declarations and a repeatable manifest/file list. A local distribution does not
  replace a clean rebuild.
- [ ] Preserve SHA/revision, toolchain versions, changelog, size and checksum of each tarball, and the final test
  matrix. Tarball fixtures install without links/development patches.
- [ ] Inspect npm pack for precise exports/files, installation without scripts, absence of local paths, unnecessary
  demos/caches and accidental data.
- [ ] Required CI passes on the chosen minimum/current versions. Public types pass supported TS resolution modes, and
  real React fixtures pass.
- [ ] Migration notes cover old deep paths, the EventEmitter alias, type fixes, map/async behavior and lifecycle. The
  version reflects the chosen contract; do not change versions during the audit.
- [ ] Prepare graph-based publication order: dependencies → main library; present the dist-tag and release scope
  concretely to the owner.
- [ ] After publication, verify installation from the registry in a clean consumer and check tarball identity and
  documentation links. For a defective release, plan a corrected release and deprecation/notification as needed, without
  promising unconditional unpublish.

## Completion

The owner receives concrete names/versions/tarballs and verification results. Publication occurs only as a separately
selected action and is confirmed by a registry smoke test. Until then, the stage is “prepared” rather than “published”.
