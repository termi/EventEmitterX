---
iso date: "2026-10-08T22:55:40.798Z"
timestamp: 1791500140798
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, tests, docs"
---

# Proxy bridge ownership and deterministic teardown

## Problem evidence

All locations below refer to the behavior-preserving extraction commit `adaa15d`.

### 🟠 Warning — The last local once listener shortened the lifetime of the shared bridge

**Files:** `modules/EventEmitterEx/EventEmitterSimpleProxy.ts`, lines 155–165; `modules/EventEmitterEx/EventEmitterProxy.ts`, lines 314–324.

```typescript
if (once) {
    (_eventEmitter as EventEmitterX).once(event as NodeEventName, eventProxy);
}
```

Adding `on('data', persistent)` followed by `once('data', transient)` made the source bridge once-only.
After the first event, the persistent local listener remained but received no further source events.
**Recommendation:** keep the bridge persistent until the local listener group becomes empty.

### 🟠 Warning — Cleanup omitted symbols and confused absent/falsy or numeric/string keys

**Files:** `modules/EventEmitterEx/EventEmitterSimpleProxy.ts`, lines 211–212; `modules/EventEmitterEx/EventEmitterProxy.ts`, line 293 and lines 379–384.

```typescript
for (const type of Object.keys(_proxyHandlers)) {
    if (event && event !== type) continue;
}
// Routed lookup:
return event === eventType && eventsEmitter === sourceEmitter;
```

Symbol bridges survived bulk cleanup; empty-string/zero selective cleanup affected other groups.
Routed `0` and `'0'` subscriptions created two source bridges even though their local object key is identical.
**Recommendation:** enumerate symbol keys, distinguish `undefined` explicitly and normalize numeric key comparisons.

### 🟠 Warning — A throwing target left the anti-loop marker installed

**File:** `modules/EventEmitterEx/EventEmitterProxy.ts`, lines 190–196.

```typescript
const targetEmitResult = targetEmitter.emit(event as NodeEventName, ...args);
if (has_sourceEmitter_subscription) delete this._antiLoopingInfoMap[event];
```

A target exception skipped cleanup, suppressed subsequent source delivery and rejected later forwarding as nested.
**Recommendation:** restore the marker in `finally`, while propagating the original exception.

### 🟠 Warning — Core bulk removal missed symbolic lifecycle notifications and absent-event guards

**File:** `modules/EventEmitterEx/EventEmitterX.ts`, line 1157 and lines 1169–1179 / 1206–1217.

```typescript
for (const key of Object.keys(_events)) { /* remove with lifecycle delivery */ }
const handler = _events[event];
const listeners = typeof handler === 'function' ? [handler] : _arrayClone1(handler as Listener[]);
```

Symbols were excluded from lifecycle delivery; removing an absent event could read `undefined.length` when
lifecycle listeners or other once wrappers existed. **Recommendation:** use all own keys and return early for an absent group.

## Chosen mechanism and examples

The bridge belongs to the proxy's event listener group, not to its most recent member.
Both proxies now install persistent `on`/`prependListener` bridges. Local once wrappers still remove themselves
before invoking callbacks; the overridden `removeListener` removes the bridge only after the last local listener.
Existing prepend/reposition behavior is retained. Duplicate local callbacks still receive duplicate deliveries.

```typescript
using source = new EventEmitterX();
using proxy = new EventEmitterSimpleProxy({ emitter: source });
proxy.on('data', persistent);
proxy.once('data', transient);
source.emit('data', 1); // Both listeners run.
source.emit('data', 2); // Persistent listener still runs.
proxy.removeAllListeners(); // Only this proxy's source bridge is removed.
```

Symbol-safe enumeration and explicit undefined checks repair simple-proxy selection. The routed proxy normalizes
numeric/string comparisons when finding and removing known subscriptions, but preserves the caller's event value
passed to routing hooks. Cleanup uses recorded emitter/handler identities; it never recomputes a changed hook.
Symbol counters are cleared too. The target anti-loop marker is removed in `finally`.

A source-routing change affects later registrations; existing bridges remain attached to their recorded sources
until the group is removed. It is not an automatic migration API. The simple proxy has no `_proxyHook` API:
its old hook-named todo is replaced by a nested-proxy ownership case; the routed proxy separately tests its actual hooks.

## Alternatives and tradeoffs

| Choice | Advantages | Disadvantages / decision |
|---|---|---|
| One persistent bridge per source/event group | Stable mixed once/on lifetime; local wrappers own one-shot semantics | Cleanup must follow local group ownership; chosen |
| Recompute once/on mode after each registration/removal | Can minimize persistent source listeners | More state and reattachment races; unnecessary |
| One source callback per local listener | Straightforward individual teardown | Changes forwarding/ordering and duplicates local dispatch; rejected |
| Clear every listener on the source | Simple | Removes unrelated owners; rejected |
| Re-run source hook at teardown | Less bookkeeping | Can remove from the wrong source after routing changes; rejected |
| Normalize numeric comparisons only | Preserves hook arguments and established object-key semantics | Numeric and string forms share a local group; chosen |
| Catch target exceptions and suppress them | Avoids a visible exception | Hides user failures; rejected; finally restores state without suppression |

## Verification and limitations

`EventEmitterSimpleProxy_spec.ts` and `EventEmitterProxy_spec.ts` register 28 passing ownership/routing cases
through `spec_utils/proxySubscriptionOwnership.ts` plus routed-only cases, including native sources, symbols, falsy and
coerced keys, mixed once/on, final-once removal, sibling and nested owners, changed hooks and throwing targets.
Nine initial proxy cases and two added routed coercion cases failed before their corresponding fixes.
Six legacy todo placeholders are removed because executable cases now cover their contracts.
After the specification split, both domain files retain their original jsdom environment. Shared ownership cases
run separately for each proxy; the native-source case still constructs `node:events.EventEmitter` explicitly.
Node-specific error/abort capability comparisons remain in `spec/node/events_node_spec.ts`.
Core differential cases check symbolic lifecycle removal and absent-event no-ops.
Full verification: 480 passing tests, zero failures/todo, one existing EventSignal skip; strict types, builds,
CJS entry orders and GC pass. Arbitrary source-emitter implementations, throwing removeListener and mutation
inside external lifecycle hooks need broader future contracts; this change retains the existing cleanup catch policy.

---

## [RU] Доказательства проблемы

Все номера ниже относятся к коммиту переноса без изменения поведения `adaa15d`.

### 🟠 Warning — Последний локальный once-слушатель сокращал жизнь общего bridge

**Файлы:** `modules/EventEmitterEx/EventEmitterSimpleProxy.ts`, строки 155–165; `modules/EventEmitterEx/EventEmitterProxy.ts`, строки 314–324.

```typescript
if (once) {
    (_eventEmitter as EventEmitterX).once(event as NodeEventName, eventProxy);
}
```

Добавление `on('data', persistent)`, затем `once('data', transient)` делало source bridge одноразовым.
После первого события обычный локальный слушатель оставался, но переставал получать события источника.
**Рекомендация:** сохранять bridge постоянным до опустошения локальной группы слушателей.

### 🟠 Warning — Очистка пропускала символы и смешивала отсутствующие/falsy и numeric/string ключи

**Файлы:** `modules/EventEmitterEx/EventEmitterSimpleProxy.ts`, строки 211–212; `modules/EventEmitterEx/EventEmitterProxy.ts`, строка 293 и строки 379–384.

```typescript
for (const type of Object.keys(_proxyHandlers)) {
    if (event && event !== type) continue;
}
// Routed lookup:
return event === eventType && eventsEmitter === sourceEmitter;
```

Символьные bridges оставались после общей очистки; выборочная очистка пустой строки/нуля затрагивала другие группы.
Подписки routed proxy на `0` и `'0'` создавали два source bridge, хотя локальный ключ объекта одинаков.
**Рекомендация:** перечислять символьные ключи, явно отличать `undefined` и нормализовать сравнение числовых ключей.

### 🟠 Warning — Исключение получателя оставляло установленный anti-loop marker

**Файл:** `modules/EventEmitterEx/EventEmitterProxy.ts`, строки 190–196.

```typescript
const targetEmitResult = targetEmitter.emit(event as NodeEventName, ...args);
if (has_sourceEmitter_subscription) delete this._antiLoopingInfoMap[event];
```

Исключение получателя пропускало очистку, подавляло последующие события источника и отклоняло пересылку как вложенную.
**Рекомендация:** восстанавливать marker в `finally`, сохраняя исходное исключение.

### 🟠 Warning — Core bulk removal пропускал символьные lifecycle-уведомления и проверки отсутствующих событий

**Файл:** `modules/EventEmitterEx/EventEmitterX.ts`, строка 1157 и строки 1169–1179 / 1206–1217.

```typescript
for (const key of Object.keys(_events)) { /* remove with lifecycle delivery */ }
const handler = _events[event];
const listeners = typeof handler === 'function' ? [handler] : _arrayClone1(handler as Listener[]);
```

Символы исключались из lifecycle delivery; удаление отсутствующего события могло читать `undefined.length` при
lifecycle-слушателях или других once wrappers. **Рекомендация:** использовать все собственные ключи и сразу возвращаться для отсутствующей группы.

## [RU] Выбранный механизм и примеры

Bridge принадлежит группе слушателей события proxy, а не её последнему участнику.
Оба proxy теперь устанавливают постоянные `on`/`prependListener` bridges. Локальные once wrappers по-прежнему удаляются
до вызова callbacks; переопределённый `removeListener` снимает bridge только после последнего локального слушателя.
Существующее prepend/reposition поведение сохранено. Повторяющиеся локальные callbacks получают повторные уведомления.

```typescript
using source = new EventEmitterX();
using proxy = new EventEmitterSimpleProxy({ emitter: source });
proxy.on('data', persistent);
proxy.once('data', transient);
source.emit('data', 1); // Both listeners run.
source.emit('data', 2); // Persistent listener still runs.
proxy.removeAllListeners(); // Only this proxy's source bridge is removed.
```

Перечисление символов и явные проверки undefined исправляют выбор simple proxy. Routed proxy нормализует
numeric/string сравнения при поиске и снятии известных подписок, но сохраняет исходное значение события
в аргументах routing hooks. Очистка использует записанные identity emitter/handler и не вычисляет изменённый hook заново.
Символьные counters также очищаются. Anti-loop marker получателя снимается в `finally`.

Изменение source routing влияет на последующие регистрации; существующие bridges остаются на записанных источниках
до удаления группы. Это не API автоматической миграции. У simple proxy нет API `_proxyHook`:
его старый todo с таким именем заменён случаем владения nested proxy; routed proxy отдельно проверяет настоящие hooks.

## [RU] Альтернативы и компромиссы

| Выбор | Преимущества | Недостатки / решение |
|---|---|---|
| Один постоянный bridge на source/event группу | Стабильная жизнь смешанных once/on; локальные wrappers владеют одноразовой семантикой | Очистка следует владению локальной группы; выбран |
| Пересчитывать режим once/on после каждой регистрации/удаления | Можно минимизировать постоянные source listeners | Больше состояния и гонок переподключения; не требуется |
| Один source callback на локальный слушатель | Простое индивидуальное снятие | Меняет пересылку/порядок и дублирует локальный dispatch; отклонён |
| Удалять всех слушателей источника | Просто | Удаляет посторонних владельцев; отклонён |
| Вычислять source hook при очистке заново | Меньше учёта | После смены routing удаляет с неправильного источника; отклонён |
| Нормализовать только numeric сравнения | Сохраняет аргументы hook и семантику ключей объекта | Числовая и строковая формы разделяют локальную группу; выбран |
| Перехватывать и подавлять исключения получателя | Нет видимого исключения | Скрывает ошибки пользователя; отклонён; finally восстанавливает состояние без подавления |

## [RU] Проверки и ограничения

`EventEmitterSimpleProxy_spec.ts` и `EventEmitterProxy_spec.ts` регистрируют 28 успешных случаев владения/routing
через `spec_utils/proxySubscriptionOwnership.ts` и отдельные routing-проверки: нативные источники, символы, falsy и
coerced ключи, смешанные once/on, удаление последнего once, соседние и nested владельцы, смена hooks и исключения получателя.
Девять первоначальных proxy-случаев и два дополнительных routed coercion случая падали до соответствующих исправлений.
Шесть прежних todo удалены, поскольку исполняемые случаи теперь покрывают их контракты.
После разделения спецификаций оба доменных файла сохраняют исходную среду jsdom. Общие проверки владения
выполняются отдельно для каждого proxy; native-source проверка по-прежнему явно создаёт `node:events.EventEmitter`.
Node-специфичные сравнения возможностей error/abort остаются в `spec/node/events_node_spec.ts`.
Core differential случаи проверяют символьную lifecycle-очистку и no-op для отсутствующего события.
Полная проверка: 480 тестов проходят, ноль ошибок/todo, один существующий skip EventSignal; строгие типы, сборки,
порядки загрузки CJS и GC проходят. Произвольные реализации source emitter, исключения removeListener и изменения
внутри внешних lifecycle hooks требуют более широких будущих контрактов; существующее подавление ошибок очистки сохранено.
