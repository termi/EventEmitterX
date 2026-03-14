# Technical Analysis: `tech-task-for-interview`

> Analysis date: March 2026

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Strengths](#strengths)
- [Weaknesses & Technical Debt](#weaknesses--technical-debt)
- [Summary](#summary)

---

## Overview

A fullstack real-time "clicker" application: users join rounds and tap a button to accumulate points. Results are broadcast to all participants in real time via SSE (Server-Sent Events). The app supports roles (USER, ADMIN, USER_HIDE_TAPS), JWT-based authentication, and shared code between the frontend and backend.

---

## Technology Stack

### Frontend

| Technology              | Version  | Purpose                                             |
|-------------------------|----------|-----------------------------------------------------|
| **React**               | 19       | UI framework                                        |
| **React Router DOM**    | 7        | Client-side routing                                 |
| **Vite**                | 6        | Build tool / Dev server                             |
| **TypeScript**          | 5.8      | Static typing                                       |
| **EventSignal**         | internal | Reactive state system (custom, see below)           |
| CSS Modules / plain CSS | —        | Styling (no UI framework)                           |

### Backend

| Technology         | Version  | Purpose                                               |
|--------------------|----------|-------------------------------------------------------|
| **Fastify**        | 5        | HTTP server                                           |
| **Prisma**         | 6        | ORM                                                   |
| **SQLite**         | —        | Database (via Prisma)                                 |
| **jsonwebtoken**   | 9        | JWT access / refresh tokens                           |
| **fastify-sse-v2** | 4        | Server-Sent Events                                    |
| **dotenv**         | 16       | Environment configuration                             |
| **tsx**            | 4        | TypeScript runner for development                     |
| **node:crypto**    | built-in | `scrypt` + `timingSafeEqual` for password hashing     |

### Shared Code

| Technology          | Purpose                                                                        |
|---------------------|--------------------------------------------------------------------------------|
| **TypeScript**      | Typing for all shared code                                                     |
| **EventEmitterX**   | Typed EventEmitter (custom library by the author)                              |
| **EventSignal**     | Reactive signals — custom analogue of SolidJS Signals                          |
| **Polyfills**       | `Promise.withResolvers`, `Symbol.dispose`, `Map`, `Object`, `WeakMap`, `Error` |
| **Type Guards**     | Custom `type_guards/` library for runtime type checks                          |
| **AbortController** | Central lifecycle manager for the entire application                           |

### Infrastructure / Tooling

| Technology                    | Version | Purpose                                         |
|-------------------------------|---------|-------------------------------------------------|
| **pnpm**                      | 6+      | Package manager (quasi-monorepo)                |
| **Jest**                      | 30      | Testing (backend + polyfills)                   |
| **Vitest**                    | 4       | Testing (frontend)                              |
| **Bun**                       | —       | Alternative test runner for shared code         |
| **ts-jest**                   | 29      | TypeScript transformer for Jest                 |
| **Babel**                     | 7       | Transformation for Jest (CJS)                   |
| **@testing-library/react**    | 16      | React component testing                         |
| **@happy-dom**                | 18      | DOM emulation for tests                         |
| **mitm**                      | 1.7     | HTTP interception for integration tests         |
| **ESLint**                    | 9       | Linter                                          |
| **typescript-eslint**         | 8       | TypeScript ESLint rules                         |
| **@stylistic/eslint-plugin**  | 5       | Code formatting via ESLint                      |
| **eslint-plugin-react-hooks** | 5       | React hooks rules                               |
| **eslint-plugin-promise**     | 7       | Promise rules                                   |
| **Bash scripts**              | —       | Dev environment orchestration                   |

---

## Architecture

### Monorepo-like Structure

```
tech-task-for-interview/
├── api/          # Shared: API contracts (types, SSE client, fetch wrapper)
├── logic/        # Shared: business logic (stores, models, CDC)
├── modules/      # Author's personal libraries (EventEmitterX, EventSignal)
├── polyfills/    # Polyfills for modern JS APIs
├── type_guards/  # Runtime type-guard utilities
├── utils/        # General utilities (timers, promise, date, ...)
├── types/        # Global TypeScript types
├── backend/      # Server-only code (Fastify + Prisma)
├── frontend/     # Client-only code (React + Vite)
├── tests/        # Tests for shared code
└── tests_utils/  # Test infrastructure
```

The key idea: `backend/` and `frontend/` are independent npm packages, but both import shared code from the root level. This enables reuse of types, models, stores, and API contracts without duplication.

### Shared API Contracts (`api/routers.ts`)

Each HTTP route is described **once** as a `const + namespace`:

```typescript
export const rounds = { method: 'get', url: '/rounds', ... } as const satisfies RouterDescription;
export namespace rounds {
    export type Types = { Querystring: { isActive?: string }, Reply: ... };
}
```

The backend registers routes in Fastify using `rounds.method`, `rounds.url`, `rounds.Types`.  
The frontend calls the API via `apiMethods.getRounds()`, which knows the URL and response types.  
This eliminates the possibility of client/server type drift.

### EventSignal Reactive System

A custom reactive system inspired by SolidJS Signals:

- `EventSignal<T>` — reactive container with a value, computations, and statuses (`pending`, `error`)
- Integrates with React via `React.useSyncExternalStore` (no extra re-renders)
- Components are registered via `EventSignal.registerReactComponentForComponentType()` — a signal knows which React component it should render as
- Result: `activeRoundsStore.signal$` can be placed directly in JSX as a JSX element

```tsx
// RoundsList.tsx
{activeRoundsStore.activeRounds.map(round => round.signal$)}
// ^ signal$ is both a data store and a React element
```

### CDC + SSE (Change Data Capture)

`mainProcessChangeDataCapture` — the central event bus, behaving differently depending on the environment:

- **Node.js (backend):** emits events on data changes → broadcasts via SSE channels to all connected clients. _TODO: forward to Redis for multi-node._
- **Browser (frontend):** connects to the server's SSE channel, receives events and emits them locally → stores update → UI updates.

### Patterns & Approaches

| Pattern                          | Where Used                                                                                  |
|----------------------------------|---------------------------------------------------------------------------------------------|
| **Singleton**                    | `ApplicationStats`, `currentUserStore`, `activeRoundsStore`, `mainProcessChangeDataCapture` |
| **Store**                        | `CurrentUserStore`, `ActiveRoundsStore` — shared between FE and BE                          |
| **Model**                        | `RoundModel` — business model with reactive `signal$`                                       |
| **CDC (Change Data Capture)**    | `mainProcessChangeDataCapture`                                                              |
| **Explicit Resource Management** | `Symbol.dispose` / `using` / `AbortController`                                              |
| **BitMask flags**                | `SSEClientFlags`, `_ActiveRoundsSignalUpdateFlags`                                          |
| **Type-safe event emitter**      | `EventEmitterX<Events>`                                                                     |
| **Schema-driven forms**          | `FormFromSchema` + `FormElementDescription`                                                 |

---

## Strengths

### 1. Single Source of Truth for the API
Typed route contracts (`api/routers.ts`) are used on both the backend (Fastify) and the frontend (fetch wrapper). Eliminates type drift between client and server.

### 2. Custom Reactive System with React Integration
`EventSignal` — a non-trivial implementation of reactive signals with support for:
- Async computations (`Promise` values)
- `pending` / `error` / `ok` statuses
- `useSyncExternalStore` for zero-overhead React integration
- `registerReactComponentForComponentType` — signals know how to render themselves in the React tree.

### 3. Secure Authentication
- Passwords are hashed with `node:crypto.scrypt` (memory-hard algorithm, resistant to GPU attacks)
- Hash comparison via `timingSafeEqual` (timing-attack resistant)
- Naive anti-brute-force: random delay when attempting to register an already-existing email

### 4. SSEClient with Production-Ready Logic
- Exponential backoff on reconnect (capped at 30 s)
- Configurable reconnect attempt limit (`maxRetries`)
- Correct handling of `AbortSignal` and manual disconnect
- `Symbol.dispose` for explicit resource release
- `AbortSignal.any([...])` to combine multiple cancellation signals
- Bitwise masks for connection state (`SSEClientFlags`) — compact and error-free

### 5. Lifecycle Management via AbortController
A single `mainProcessAbortController` threads through the entire stack: server, SSE clients, timers, and tests. Correct resource cleanup on process exit or in `afterAll` during tests.

### 6. Explicit Resource Management (TC39 Stage 4)
`using` and `Symbol.dispose` are used for deterministic cleanup — e.g. in SSEClient's `processStream` and `createAbortSignalTimeout`. A modern approach available since TypeScript 5.2.

### 7. Custom Polyfills
Instead of pulling in `core-js`, the author implemented their own polyfills for up-to-date APIs: `Promise.withResolvers`, `Symbol.dispose`, extensions for `Map`, `WeakMap`, `Object`. Reduces reliance on third-party polyfill libraries.

### 8. Integration Test Infrastructure
- Tests spin up a **real Fastify** instance (not a mock)
- `InterceptOutgoingHTTP` (based on `mitm`) intercepts HTTP at the TCP level — requests never leave the process but still pass through the full Fastify stack
- `debugTimers` — utility for controlling timers in tests
- Dual test runner: Jest (backend) + Bun (shared code)

### 9. Observability / Monitoring
`ApplicationStats` — a lightweight singleton for tracking:
- Request and error counters
- Set of open (in-flight) requests
- Auto-shutdown on inactivity (dev mode)

### 10. Environment Detection
`utils/runEnv.ts` — detailed runtime environment detection: `isNodeJS`, `isWebMainThread`, `isWebWorker`, `isBun`, `isTest`. Allows a single shared file to behave differently across environments.

### 11. Custom Type Guards Library
`type_guards/` — a collection of runtime type checks (`assertIsPositiveNumber`, `assertIsNonEmptyString`, `assertIsNonEmptyArray`, etc.) that throw descriptive errors. Used throughout the codebase for defensive programming.

### 12. Automatic Port Discovery
The server can start on a free port (`getFreePort`), and the frontend receives that port via an environment variable automatically — a bash script greps the server's stdout output.

---

## Weaknesses & Technical Debt

### Critical / Production-blocking

#### 1. 🔴 SQLite as the Database
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./data/dev.db"
}
```
SQLite does not support concurrent writes and cannot scale horizontally. The commented-out `uuidv7` hints at a desire to migrate to PostgreSQL, but no migration has been done.

#### 2. 🔴 Hardcoded 2-second Delay in Production Code
```typescript
// backend/src/routerHandlers/roundsRouters.ts
await promiseTimeout(2000); // <- in the GET /rounds handler
```
An artificial 2-second delay on every request for the rounds list — most likely a debug artifact that leaked into production code.

#### 3. 🔴 `console.log` in `App.tsx`
```tsx
console.log((globalThis as unknown as { __BACKEND_PORT__?: string }).__BACKEND_PORT__);
```
Debug output at the frontend entry point.

#### 4. 🔴 User Role Assigned by Username
```typescript
const role: UserRole = (name === 'admin' || name === 'test_admin')
    ? 'ADMIN'
    : name.toLowerCase() === 'никита'
        ? 'USER_HIDE_TAPS'
        : 'USER'
;
```
Anyone who registers with the name `admin` is granted administrator privileges. This is a critical security vulnerability.

### Incomplete Functionality

#### 5. 🟡 No Multi-node Support (Redis Not Implemented)
```typescript
// logic/mainProcessChangeDataCapture.ts
if (isNodeJS) {
    // todo: subscribe to a Redis change channel here...
}
```
CDC between multiple server instances does not work. In a horizontally scaled setup, clients on different nodes will not receive each other's events.

#### 6. 🟡 Unclosed Rounds Not Reloaded on Server Restart
```typescript
// backend/src/services/roundsService.ts
// todo: Load unclosed rounds from DB and track their state
```
When the server restarts, active rounds will not be automatically completed.

#### 7. 🟡 JWT Refresh Logic Marked as Broken
```typescript
// api/request.ts
// todo: This does not work correctly. It should:
//  1. Retry JWT token refresh N times on any error
//  2. Return the original error after exhausting retries
```

### Code Quality & Configuration

#### 8. 🟡 `eslint-plugin-unicorn` Installed but Not Configured
`package.json` lists `"eslint-plugin-unicorn": "^59.0.1"`, but the plugin is never imported or used in `eslint.config.mjs`. A powerful ruleset is sitting idle.

#### 9. ✅ ~~No Frontend Tests~~ — Covered (Vitest + Testing Library, AI Generated)
```
frontend/src/tests/
├── components/    Meter, FormFromSchema, AuthForm  (25 tests)
├── layouts/       AppLayout                        (5 tests)
├── hooks/         useAuth                          (5 tests)
└── eventHandlers/ clicks, forms                   (19 tests)
```
54 tests, test runner — Vitest 4 + @testing-library/react 16.

#### 10. 🟡 `/modules` Shipped as Minified JS Without Sources
`modules/EventEmitterX/events.js`, `EventSignal.js` — minified JavaScript with no source files in the repository. Debugging, understanding behaviour, and contributing to the code are all difficult. Noted as "will be published to npm", with no timeline.

#### 11. 🟡 `Round.flags: Int` Without Documentation
```prisma
flags Int
```
The `flags` field on the `Round` model is a bitmask, but there is no enum or comment anywhere explaining what each bit means. The values are scattered implicitly throughout the code.

#### 12. 🟡 CORS Allows All Origins
```typescript
await fastifyApp.register(cors, { origin: '*' });
```
The commented-out `origin: 'http://localhost'` indicates this is a development placeholder not intended for production.

#### 13. 🟡 Unresolved Items in WIP.md
ESLint rules `multiline-ternary`, `comma-dangle`, and `comma-style` are marked as "work in progress" — part of the codebase does not conform to its own coding standards.

#### 14. 🟠 No Docker / docker-compose
No containerization. Running the project requires a specific version of Node.js, pnpm, and bash (which is problematic on Windows without WSL).

#### 15. 🟠 `@ts-expect-error` / `@ts-ignore` in Custom Integration
```typescript
// @ts-ignore
createElement: React.createElement,
```
`@ts-ignore` is used in `registerComponents.ts` due to type incompatibilities between the custom `EventSignal` and React. This indicates incomplete typing in the library's interface.

#### 16. 🟠 No React Error Boundaries
Rendering errors are not caught, which can cause the entire UI to crash.

---

## Summary

### Ratings

| Category             | Rating | Comment                                                                   |
|----------------------|--------|---------------------------------------------------------------------------|
| **Architecture**     | ⭐⭐⭐⭐⭐  | Non-trivial shared/FE/BE split, unified API contracts                     |
| **Reactive System**  | ⭐⭐⭐⭐⭐  | EventSignal — a high-quality custom implementation                        |
| **Security**         | ⭐⭐⭐☆☆  | scrypt/timingSafeEqual — great; role-by-username — critical vulnerability |
| **Tests**            | ⭐⭐⭐⭐☆  | Solid backend infrastructure, frontend now covered by Vitest              |
| **Production-ready** | ⭐⭐☆☆☆  | SQLite, 2 s hardcoded delay, no Redis, no Docker                          |
| **Code Quality**     | ⭐⭐⭐⭐☆  | Clean TypeScript, good abstractions, some lingering TODOs                 |
| **Modernity**        | ⭐⭐⭐⭐⭐  | `Symbol.dispose`, `AbortSignal.any`, `Promise.withResolvers`, React 19    |

### Verdict

The project demonstrates a **high level of engineering culture** in its architecture and approach: shared typed code, a custom reactive system, secure crypto usage, and correct lifecycle management via `AbortController` and `Symbol.dispose`. This is clearly not a CRUD boilerplate.

At the same time, the project is **not production-ready**: SQLite, unclosed TODOs in critical modules, the role-assignment vulnerability, and the lack of containerization. Given the context (`tech-task-for-interview`), this appears to be a deliberate choice — the focus is on showcasing architectural decisions and custom libraries rather than building a production-grade infrastructure.
