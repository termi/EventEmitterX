---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# EventEmitterX / EventSignal Roadmap

Audit date: 2026-10-05. Status: a plan for the agreed direction; implementation of these stages did not begin during the
audit. Documentation compliance update: 2026-10-06.

Goal: an independently installable event and signal library with reliable lifecycle management, precise types, CJS/ESM
and TypeScript sources, separately published dependencies, and a clear consumer contract.

## Navigation and Order

| Document                                           | Priority          | Result                                                               | Depends on                                                                 |
|----------------------------------------------------|-------------------|----------------------------------------------------------------------|----------------------------------------------------------------------------|
| [Audit](AUDIT.md)                                  | baseline evidence | Findings, evidence, consumer scenarios                               | —                                                                          |
| [01. Reproducible Checks](01_BASELINE.md)          | P0                | An accurate runtime and type-check baseline                          | —                                                                          |
| [02. Memory and Lifecycle](02_LIFECYCLE.md)        | P0                | Elimination of global signal retention                               | 01                                                                         |
| [03. API and Types](03_API_TYPES.md)               | P0/P1             | Verified signal contracts and EventEmitter compatibility             | 01; lifecycle from 02                                                      |
| [04. Decomposition](04_DECOMPOSITION.md)           | P1                | React adapter and EventAwait with preserved history                  | 01, established contracts from 03                                          |
| [05. Independent Dependencies](05_DEPENDENCIES.md) | P0                | Self-contained runEnv/type_guards/abortable packages and their graph | 01; can proceed alongside 02–04 after the package restriction is revisited |
| [06. Distributions](06_DISTRIBUTION.md)            | P0                | Root index and CJS/ESM/types/source exports                          | 03–05                                                                      |
| [07. Consumers and Documentation](07_CONSUMERS.md) | P1                | Verified Node/browser/React/Bun/Deno scenarios                       | 02, 03, 06                                                                 |
| [08. Release](08_RELEASE.md)                       | P0                | Verified tarballs and agreed publication                             | 01–07                                                                      |
| [09. Growth and Demo](09_GROWTH_DEMO.md)           | P2                | Performance, backpressure, weather and subsequent features           | stable contracts; weather after 02, 07                                     |

P0 blocks the first recommended npm release; P1 provides the required API/architecture quality for the chosen release
scope; P2 covers further development. The order expresses dependencies rather than calendar promises. Decomposition
proceeds through small extractions; fixing the P0 leak must not wait for a complete file split.

## Recorded Owner Decisions

- The root index re-exports every public library module in the project. EventEmitterX has the alias EventEmitter; the
  audit must establish its compatibility with `node:events`. Test exports and internals do not automatically become
  public API.
- CJS and ESM (`.mjs`) are required, together with access to TypeScript sources for Bun/Deno. Implement the planned
  build configurations rather than discarding the intention to support multiple builds.
- Local `link:` dependencies are intentional during development. This session is intended to restore/formalize
  independent packages and prepare their publication. The prohibition on editing `packages/` remains in place;
  revisiting it is deferred until the dependency-development stage.
- The createSignal overloads need completion.
- Decomposition of large modules **must preserve git history**. Stage 04 describes the method and verification.
- The known EventSignal leak caused by global registries is a separate P0. Requiring destructor calls alone does not
  repair the architecture.
- WEATHER_INTEGRATION_PLAN is included in stage 09; the original documents are preserved.

## Sources and Boundaries

The audit used the local checkout, existing tests and documentation. Implementation, versions, commits and publication
were not changed. Observed results are separated from hypotheses and future acceptance criteria. These stages form the
development plan; existing PROJECT_ANALYSIS and docs/IMPROVEMENTS remain historical overviews.

Integration documents: `../modules/EventEmitterEx/EventSignal/JUNCT_INTEGRATION_REVIEW.md` and `_RU.md`; existing demo
plans: `../demo/eventSignals-test-app/_dev/todo/WEATHER_INTEGRATION_PLAN.md` and `_RU.md`. The Junct.io repository was
not modified.

Update task status in the relevant stage: `[ ]` means incomplete, `[x]` means completed with evidence, and “deferred”
needs a reason and target release. No implementation task in this set has been completed. English files are originals;
adjacent `_RU.md` files contain equivalent Russian translations.
