---
iso date: "2026-10-08T22:55:40.798Z"
timestamp: 1791500140798
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, tests, docs"
---

# Proxy subscriptions and cleanup

## Entry points and ownership

`EventEmitterSimpleProxy` forwards events from one source and emits back to it.
`EventEmitterProxy` selects source and target emitters through options/hooks; direct emit to a target
requires `allowDirectEmitToTarget: true`. `emitSelf` delivers locally. Lifecycle events stay local.

Import both through `modules/events`, or directly through their modules under `modules/EventEmitterEx`.
The legacy entry, direct imports and core share constructor/symbol identity. Native installed ESM/subpath
packaging is still stage 06 work; these are development module paths.

A proxy owns its source bridge callbacks, never unrelated source listeners. Keep a proxy for the lifetime
of its consumer scope and dispose it at scope exit. Persistent and once local listeners share a persistent
bridge per source/event group. Local once wrappers remove themselves before their callbacks;
removing the last local listener also detaches the source bridge.

## Mixed listeners and selective cleanup

```typescript
import { EventEmitterX, EventEmitterSimpleProxy } from './modules/events';

using source = new EventEmitterX();
using proxy = new EventEmitterSimpleProxy({ emitter: source });
source.on('data', value => console.log('another owner', value));
proxy.on('data', value => console.log('persistent', value));
proxy.once('data', value => console.log('first only', value));
source.emit('data', 1);
source.emit('data', 2);
proxy.removeAllListeners('data'); // Preserves the source's other owner.
```

`removeAllListeners()` and `removeAllListeners(undefined)` remove every proxy-owned group.
`removeAllListeners(event)` removes only that group, including symbols, empty strings and zero.
Numeric names are an EventEmitterX type extension: `0` and `'0'` share an object-key group and one bridge
on the same source. Duplicate local registrations still produce duplicate callbacks, not duplicate bridges.
A nested proxy can remove its own subscriptions without removing a sibling consumer on its parent.

## Routing hooks and exceptions

The routed proxy records the actual source and callback identity at registration. Cleanup does not call
`getSourceEmitter` again. Changing a hook affects subsequent registrations; it does not migrate old bridges.
If the same local event has registrations on two selected sources, both sources can deliver to that local group.
To migrate deliberately, remove the group, change the hook and re-register its callbacks.

```typescript
import { EventEmitterProxy } from './modules/events';

using first = new EventEmitterX();
using second = new EventEmitterX();
using proxy = new EventEmitterProxy({ sourceEmitter: first });
proxy.on('data', handler);
proxy.removeAllListeners('data');
proxy.setGetSourceEmitter(() => second);
proxy.on('data', handler);
```

A throwing target listener still propagates its exception. Anti-loop state is restored in `finally`,
so a later source/target event can be handled. The simple proxy has no source/target hook API.
Arbitrary foreign emitter failure and reentrant lifecycle-hook mutation require broader contracts;
the existing suppression of source removal errors remains unchanged.

## Verification and decisions

28 focused proxy tests cover ownership, mixed once/on, symbols, falsy/coerced keys, routing changes,
nested/sibling owners, native sources and recovery after a target exception. Positive/negative strict
fixtures check both generic proxies in source and emitted declarations. `pnpm verify` additionally checks
all 24 CJS import orders, runtime export keys, constructor/symbol identity, builds and signal GC.

[Ownership reasoning](../changelogs/reasons/EventEmitterX_PROXY_SUBSCRIPTION_OWNERSHIP.md),
[history-preserving extraction](../changelogs/reasons/EventEmitterX_PROXY_DECOMPOSITION.md),
[compatibility scope](EVENT_COMPATIBILITY.md).
