# Improvements & Roadmap

This document outlines potential improvements, known limitations, and TODO items extracted from the codebase.

---

## EventEmitterX

### API Enhancements

- [ ] **Implement `EventTarget` interface** — Provide a full DOM-compatible `EventTarget` implementation for older Node.js versions. Reference implementations exist in the codebase comments.
- [ ] **`handleEvent` support in `removeListener` and `once`** — The `supportEventListenerObject` option only partially works. `removeListener` and once-wrappers do not fully support `{ handleEvent }` objects.
- [ ] **Extract `static once()` to a separate file** (`eventAwaitFor.ts`) — The current `events.ts` is ~3800 lines. Moving `static once()` would improve maintainability. Requires two-branch git strategy to preserve history.
- [ ] **`events.on()` improvements** — Port recent Node.js changes: `FixedQueue`, `highWaterMark`/`lowWaterMark` options, `Stream#pause`/`resume` support.
- [ ] **Rename `errorEventName`/`stopEventName`** to `error`/`close` arrays for Node.js compatibility in `eventsAsyncIterator`.
- [ ] **`addAbortListener` improvements** — Consider alignment with `e.stopImmediatePropagation()` bypass behavior from Node.js 20+.

### Error Handling

- [ ] **Custom error classes** — Create `EventsAbortError`, `EventsOnceError` with structured properties (`types`, `errorType`) instead of generic `Error`.
- [ ] **`captureRejections` integration** — Ensure consistent behavior across all listener invocation paths.

### Performance

- [ ] **`Map`/`WeakMap` for `_events`** — Consider using `Map` instead of plain object for the event store, possibly via a subclass.
- [ ] **Paused state** — The `EventEmitterX_Flags_paused` flag is defined but not implemented. Consider adding pause/resume for backpressure scenarios.

### Developer Experience

- [ ] **`eventNames()` improvements** — Return numeric keys as numbers and include Symbol keys via `Object.getOwnPropertySymbols()`.
- [ ] **`kAddListenerAfterDestroyingCallback`** — Replace `console.warn` with a proper event/callback when adding listeners to a destroyed emitter.

---

## EventSignal

### Core Architecture

- [ ] **WeakMap-based `_events` in internal emitters** — Use `WeakMap` in `signalEventsEmitter` so signal subscriptions auto-cleanup when the signal is GC'd.
- [ ] **Custom domain/emitter per signal** — Allow overriding which `signalEventsEmitter` to use via constructor options.
- [ ] **Lifecycle events** — Emit `onCreateEventSignal`, `onDestroyEventSignal` events.
- [ ] **Synchronous notification mode** — Currently all subscriber notifications are async (microtask). Add an option for synchronous notifications.
- [ ] **`batchUpdates`** — Add `batchUpdatesStart()`/`batchUpdatesEnd()` for explicit control over synchronous update batching.

### Value Management

- [ ] **`updateReason`** — Add a second parameter to `set()` for tracking update reasons. Useful for debugging history and for `ignoreUpdateReason` in React hooks.
- [ ] **`validateSourceValue` / `validateValue`** — Validation functions in options that can reject invalid values.
- [ ] **Mutable value support in `use()` with reducer** — Currently, mutable values (same object ref) returned by reducers are not supported.

### Computed Signals

- [ ] **Fix async computation dependency tracking** — Currently, signals accessed after an `await` inside a computation may not be properly tracked (or may track the wrong signal). This is a fundamental limitation documented in the code.
- [ ] **Error propagation improvements** — Instead of `console.error`, emit errors to `signalEventsEmitter` as a `'signalError'` event.
- [ ] **Throttle bypass for some sources** — Allow throttle to be ignored for specific update sources (`set`, `source`, `trigger`).

### Actions & Methods

- [ ] **`actions` option in constructor** — Define methods (actions) directly in constructor options, accessible as `signal$.actions.methodName()`.
- [ ] **`views` option in constructor** — Auto-generate derived EventSignals from computation functions, accessible as `signal$.views.viewName`.
- [ ] **Improved `map()` — Back-linking** — `map()` should create a derived signal that can propagate changes back to the parent.

### React Integration

- [ ] **`use()` with deps** — Allow passing a dependency array to `use()` to control when the reducer re-evaluates.
- [ ] **`useListener()` options** — Add `suspend`, `noSub`, `ignoreUpdateReason` options.
- [ ] **Destroyed signal component** — `_setComponentOnDestroy` is currently non-functional. Implement proper destroyed-state rendering.
- [ ] **Observable protocol** — Implement [TC39 Observable](https://github.com/tc39/proposal-observable) and [WICG Observable](https://wicg.github.io/observable/) protocols.

### Subscription Improvements

- [ ] **Observer pattern** — Support `subscribe({ next, error, complete })` observer objects.
- [ ] **`cleanupCallback` in `addListener`** — Third parameter for listener cleanup when the listener is removed.
- [ ] **WeakRef-based auto-cleanup** — `weakSpyOnTarget` for automatic listener removal when a referenced object is GC'd.

### Type System

- [ ] **Restrict `componentType`** — Only allow `string | number | symbol`, remove `Object` support.
- [ ] **Unify computation signatures** — `constructor`, `createMethod`, and `map` all have different computation function signatures.

---

## Demo: EventSignals Test App

### Functionality

- [ ] **Error boundaries** — Improve error boundary coverage. Currently only partial via `react-error-boundary`.
- [ ] **Accessibility** — Add ARIA attributes and keyboard navigation to interactive components.
- [ ] **Mobile responsiveness** — Test and improve layout on mobile viewports.
- [ ] **Testing** — Add unit and integration tests. Currently no test files exist for this demo.

### Code Quality

- [ ] **Remove `globalThis` assignments** — `__setCounterComponent0/1/2` and `__test__mainState` should be dev-only.
- [ ] **Extract inline styles** — Move React inline styles to CSS modules or styled components.
- [ ] **i18n system** — The current i18n implementation is tightly coupled to EventSignal. Consider a more standard approach.

---

## Demo: Clicker

### Architecture

- [ ] **Replace `modules/` with npm imports** — The `modules/` directory contains compiled copies of EventEmitterX/EventSignal. Replace with proper package imports once published.
- [ ] **Backend test coverage** — Improve test coverage for backend SSE channels and API routes.
- [ ] **Frontend test coverage** — Add component and integration tests for the frontend.

### Functionality

- [ ] **Offline support** — Handle SSE reconnection gracefully.
- [ ] **Rate limiting** — Add server-side rate limiting for click events.
- [ ] **Admin dashboard improvements** — Better round management UI.

---

## General / Cross-Cutting

### Documentation

- [ ] **JSDoc completion** — Many public methods lack JSDoc comments, especially in EventSignal.
- [ ] **Migration guide** — Document how to migrate from Node.js `EventEmitter` to `EventEmitterX`.
- [ ] **Cookbook / Recipes** — Common patterns: debouncing, form state management, real-time data, etc.

### Build & Packaging

- [ ] **npm publishing** — Publish `@termi/eventemitterx` to npm registry.
- [ ] **Tree-shaking** — Ensure ESM build supports tree-shaking (separate entry points for EventEmitterX and EventSignal).
- [ ] **Bundle size analysis** — The combined source is ~7600 lines. Consider code splitting.
- [ ] **Move internal packages to npm** — `packages/` directory should become proper npm dependencies.

### Testing

- [ ] **Coverage reporting** — Add coverage tooling (Istanbul/c8).
- [ ] **Upgrade Jest** — Currently on Jest 27. Consider upgrading to latest for improved performance and features.
- [ ] **Browser tests** — Add real browser testing (Playwright/Puppeteer) for EventTarget compatibility.
- [ ] **Performance benchmarks** — Add benchmarks comparing with Node.js EventEmitter, EventEmitter2, mitt, etc.

