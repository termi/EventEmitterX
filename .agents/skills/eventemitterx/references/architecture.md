---
iso date: "2026-10-05T21:33:25.756Z"
timestamp: 1791236005756
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "config/ai"
---

# Agent Skills — EventEmitterX

> Project-level knowledge and EventEmitterX module architecture for AI agents.

---

## Project Overview

**EventEmitterX** (`@termi/eventemitterx`) is a TypeScript library containing two major modules:

1. **EventEmitterX** (`modules/events.ts`) — A cross-platform `EventEmitter` implementation for Node.js and browsers.
2. **EventSignal** (`modules/EventEmitterEx/EventSignal.ts`) — A reactive signals system with deep React integration.

Supporting modules:
- `modules/EventEmitterEx/eventsAsyncIterator.ts` — Async iterator for events (`EventEmitterX.on()`)
- `modules/EventEmitterEx/utils.ts` — Serialization utilities
- `modules/EventEmitterEx/view_utils.ts` — (BETA) React ViewContext

**Runtime:** Node.js and browsers  
**Language:** TypeScript (strict mode)  
**Tests:** Jest 27.5 + ts-jest, jsdom  
**Package manager:** pnpm

---

## Repository Structure Rules

```
modules/                    ← Core library source code
spec/                       ← Jest tests
spec_utils/                 ← Test helpers (fakeTimers, FakeEventTarget, etc.)
utils/                      ← Shared utility functions
packages/                   ← ⚠️ Internal "external" deps (DO NOT modify — future npm packages)
demo/
  eventSignals-test-app/    ← React+Vite demo for EventSignal
  clicker/                  ← Full-stack demo (Fastify+React)
    modules/                ← ⚠️ Compiled copies of EventEmitterX/EventSignal (DO NOT modify)
_dev/                       ← Dev tooling (postinstall, jest helpers, ts-node)
docs/                       ← Documentation files (EN + RU pairs)
changelogs/                 ← Changelog files
.github/                    ← AI agent instructions
```

### Directories to NEVER modify directly:
- `packages/` — Internal dependencies, will be replaced with npm imports
- `demo/clicker/modules/` — Auto-generated compiled copies

---

## Code Conventions

### TypeScript

- **Library compiler configuration requests strict checks** (test tooling may relax them): `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, etc.
- **Target:** ES2020 (output), using latest ESNext features in source
- **Module system:** CommonJS (main), with ESM build option
- Files start with `'use strict';`
- Use `void 0` instead of `undefined` for assignment (perf convention in this codebase)
- Prefer `===` / `!==` and `Object.is()` for comparisons

### Naming Conventions

- **Classes:** PascalCase — `EventEmitterX`, `EventSignal`
- **Interfaces/Types:** PascalCase with `I` prefix for interfaces representing contracts — `ICompatibleEmitter`, `ICounter`
- **Private members:** Underscore prefix — `_events`, `_stateFlags`, `_value`
- **Constants (internal flags):** UPPER_SNAKE with descriptive prefix — `EventEmitterX_Flags_listenerOncePerEventType`
- **EventSignal instances:** Dollar suffix convention — `counter$`, `computed1$`, `userFullName$`
- **Exported symbols:** camelCase for functions, PascalCase for classes/types
- **Internal helper functions:** Underscore prefix — `_checkListener`, `_shallowEqualObjects`, `_noop`

### Performance Patterns

The codebase uses specific low-level patterns for performance. **Do not "modernize" these:**

1. **Bitfield flags** — State managed via `|=`, `&=`, `& mask` operations on integer fields (`_f`, `_stateFlags`)
2. **Specialized emit paths** — Switch on `arguments.length` (1–4 args) to avoid `arguments` object and `.apply()`
3. **`Object.create(null)`** — Used for hash maps without prototype chain
4. **`Object.setPrototypeOf(prototype, null)`** — Prototype-chain optimization is used; inspect the current implementation before changing it
5. **`/*@__NOINLINE__*/`** — Explicit noinline hints for JIT optimization
6. **Manual array cloning** — `_arrayClone1`, `_arrayClone2`, `_arrayClone3` instead of spread/slice for hot paths

### Error Handling

- `EventEmitterX` throws on unhandled `'error'` events (Node.js-compatible behavior)
- Custom error class: `EventsTypeError` for argument validation

### Import Aliases

The project uses pnpm `link:` protocol for internal packages. These are aliased as:

```
termi@abortable       → packages/abortable
termi@polyfills        → packages/polyfills
termi@runEnv           → packages/runEnv
termi@type_guards      → packages/type_guards
termi@ServerTiming     → packages/ServerTiming
termi@ProgressControllerX → packages/ProgressControllerX
```

For current checkout development, use the established aliases until the dependency migration is implemented: `import { ... } from 'termi@abortable';`

---

## EventEmitterX Architecture

### Key Internals

- `_events: Object` — Plain object (`Object.create(null)`) storing listeners. Single listener stored as function, multiple as array.
- `_f: number` — Bitfield flags for internal state (has_error_listener, listenerOncePerEventType, destroyed, etc.)
- `__onceWrappers: Set` — Tracks once-wrapped listeners for correct removal
- `kOnceListenerWrappedHandler` — Symbol linking once-wrapper to original listener

### Lifecycle

```
new EventEmitterX(options?) → on/once/emit → destructor() or [Symbol.dispose]()
                                                ↓
                                     emit(kDestroyingEvent)
                                     removeAllListeners()
                                     _addListener becomes no-op
```

### `static once()` — Key Design

- Supports `EventEmitterX`, Node.js `EventEmitter`, `DOMEventTarget`, and `IMinimumCompatibleEmitter`
- Uses `Promise.race()` when `signal` or `timeout` is provided
- Enriches error stacks with the call site of `once()` for better debugging
- Cleans up all listeners on resolve, reject, abort, or timeout

---

## Testing Conventions

- Test files in `spec/` mirror `modules/` structure
- Test file naming: `<module_name>_spec.ts`
- Use `@jest-environment jsdom` directive at top of test files requiring DOM APIs
- Import test utilities from `spec_utils/`:
  - `fakeTimers.ts` — `useFakeTimers()`, `useRealTimers()`, `advanceTimersByTime()`
  - `FakeEventTarget.ts` — Fake EventTarget for testing
  - `Deferred.ts` — Manual Promise resolution
  - `simple-react-hooks.ts` — `fakeReact` for testing React hooks without real React
- Tests use `termi@polyfills` via `require('termi@polyfills')`
- Common test constants: `SECONDS = 1000`, `MINUTES = 60 * SECONDS`, etc.

### Writing Tests for EventEmitterX

```typescript
import { EventEmitterX, once, on } from '../../modules/events';
```

---

## Documentation References

| Document             | Path                    |
|----------------------|-------------------------|
| Project Analysis     | `PROJECT_ANALYSIS.md`   |
| Module Index         | `docs/INDEX.md`         |
| EventEmitterX API    | `docs/EventEmitterX.md` |
| EventSignal API      | `docs/EventSignal.md`   |
| Improvements & TODOs | `docs/IMPROVEMENTS.md`  |

---

## Common Pitfalls

1. **Do not use `arguments` object in new code** — The existing codebase uses it in emit paths for performance, but new code should use rest parameters.
2. **`listenerOncePerEventType` is NOT default** — It must be explicitly enabled in constructor options.
3. **`import type` vs `import`** — Use `import type` for type-only imports (enforced by TypeScript config).
4. **Comments in Russian** — Many inline comments and TODOs in the codebase are in Russian. This is normal and expected. Do **not** translate them.
5. **`termi@*` imports** — These are local pnpm links, not npm packages. Do not try to `npm install` them.
6. **`EventEmitterEx` is deprecated** — Always use `EventEmitterX` in new code.
