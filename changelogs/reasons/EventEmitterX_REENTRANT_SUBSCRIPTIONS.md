---
iso date: "2026-10-09T12:36:23.600Z"
timestamp: 1791549383600
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, types, tests, docs"
---

# Reentrant subscription state and callback identity

## Problem and evidence

Evidence below refers to baseline `717651584f559b29b7dbcd573e42261cabe87f96`; line numbers are from that committed source before this change.

### 🟠 Warning — Registration keeps state captured before lifecycle callbacks

**File:** `modules/EventEmitterEx/EventEmitterX.ts`, lines 792–816.

```ts
const { _events, _maxListeners, _f, __onceWrappers } = this;
const handler = _events[event];
// ...
this.emit('newListener', event, listener);
```

A callback can insert a listener, clear/replace the table, change the limit or destroy the emitter.
The pending outer registration then overwrites callbacks or writes into an obsolete table.
**Recommendation:** Reload state after the hook, then select the current group; stop if the owner was destroyed.

### 🟠 Warning — Removal chooses the oldest duplicate without once wrappers

**File:** `modules/EventEmitterEx/EventEmitterX.ts`, line 1035.

```ts
index = listeners.indexOf(listener);
```

`on(A), on(B), on(A), removeListener(A)` leaves `B,A` rather than Node's `A,B`.
**Recommendation:** Search from the end, independently of unrelated once-wrapper presence.

### 🔵 Info — Callback-specific listenerCount is missing

**File:** `modules/EventEmitterEx/EventEmitterX.ts`, lines 1411–1423.

```ts
listenerCount<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey): number
```

The additional callback argument supported by current Node is ignored.
**Recommendation:** Support typed callback filtering, recognizing original once callbacks and raw wrappers.

## Mechanism and examples

Reload `_events`, `_f` and `_maxListeners` after `newListener`; derive the group and once-wrapper presence afterwards.
The hook still runs before insertion. A hook-inserted callback runs before the outer callback. Clearing the table
and inserting a replacement yields replacement/outer, not an orphaned registration. The destroyed flag prevents
an in-flight once subscription from recreating callbacks or wrappers after destructor.

Deduplication runs on current listeners for the opt-in listenerOncePerEventType mode. Plain removal uses
lastIndexOf; existing once matching and reverse removal are preserved. listenerCount(event, callback) counts every
matching raw/original identity; no filter retains total counts. Null/undefined at runtime mean no filter, matching Node.
Snapshots returned by getEventListeners remain detached and unwrap once listeners; no production changes to that
helper were needed. Native EventEmitter, custom emitter and native EventTarget snapshots are explicitly compared.

## Alternatives and tradeoffs

| Approach | Benefits | Costs / decision |
|---|---|---|
| Reload after lifecycle notification | Native ordering; preserves reentrancy | A few state reads on registration; chosen |
| Notify after insertion | Simpler local state | Breaks newListener ordering; rejected |
| Queue nested registrations | Avoids recursion | Changes synchronous lifecycle semantics; rejected |
| Count via listeners() copies | Reuses introspection | Allocates per query and loses raw-wrapper identity; direct traversal chosen |

Emission specialization and manual array-cloning conventions remain intact. Arbitrary third-party proxy routing-hook
mutation and throwing teardown callbacks are outside this repair. No file extraction or history graph change is needed.

## Verification and limits

Differential cases cover hook insertion, replacement, whole-table clearing, nested once, changed limits,
interleaved duplicate removal and filtered single/mixed/raw/absent counts. DOM cases cover destruction during the
hook and opt-in deduplication. Initial expanded Node tests reproduced 23 failing cases across the contract problems;
all now pass. Full verification: 519 pass, one existing skip, zero failures/todo; strict types/builds/GC pass.
No claim of exhaustive reentrancy for all extensions or runtime versions is made.

---

## [RU] Проблема и доказательства

Доказательства ниже относятся к базовому коммиту `717651584f559b29b7dbcd573e42261cabe87f96`; номера строк взяты из закоммиченных исходников до изменения.

### 🟠 Предупреждение — Регистрация сохраняет состояние до lifecycle-callback

**Файл:** `modules/EventEmitterEx/EventEmitterX.ts`, строки 792–816.

```ts
const { _events, _maxListeners, _f, __onceWrappers } = this;
const handler = _events[event];
// ...
this.emit('newListener', event, listener);
```

Callback может вставить слушателя, очистить/заменить таблицу, сменить лимит или уничтожить emitter.
Внешняя ожидающая регистрация затем затирает callbacks или пишет в устаревшую таблицу.
**Рекомендация:** Перечитать состояние после hook, затем выбрать актуальную группу; остановиться при уничтожении.

### 🟠 Предупреждение — Без once-обёрток удаляется самый старый дубликат

**Файл:** `modules/EventEmitterEx/EventEmitterX.ts`, строка 1035.

```ts
index = listeners.indexOf(listener);
```

`on(A), on(B), on(A), removeListener(A)` оставляет `B,A` вместо Node-варианта `A,B`.
**Рекомендация:** Искать с конца независимо от наличия посторонних once-обёрток.

### 🔵 Информация — Отсутствует подсчёт конкретного callback

**Файл:** `modules/EventEmitterEx/EventEmitterX.ts`, строки 1411–1423.

```ts
listenerCount<EventKey extends keyof EMD<EventMap> = EventName>(event: EventKey): number
```

Дополнительный callback-аргумент актуального Node игнорируется.
**Рекомендация:** Добавить типизированный фильтр callback с распознаванием исходного once-callback и raw-wrapper.

## [RU] Механизм и примеры

После `newListener` перечитываются `_events`, `_f`, `_maxListeners`; затем определяется группа и наличие once-обёрток.
Hook по-прежнему выполняется до вставки. Вставленный из hook callback вызывается перед внешним callback.
Очистка таблицы и вставка замены дают replacement/outer, а не потерянную регистрацию. Destroyed-флаг не позволяет
незавершённой once-подписке заново создать callbacks/обёртки после destructor.

В режиме listenerOncePerEventType дедупликация использует актуальные слушатели. Обычное удаление использует
lastIndexOf; прежнее сопоставление once и обратный порядок удаления сохранены. listenerCount(event, callback)
считает все совпадения raw/original identity; без фильтра возвращает общее количество. Runtime null/undefined
означают отсутствие фильтра как в Node. Снимки getEventListeners остаются независимыми и раскрывают once:
изменений production-кода helper не потребовалось. Явно сравниваются native EventEmitter, custom emitter и native EventTarget.

## [RU] Альтернативы и компромиссы

| Подход | Преимущества | Цена / решение |
|---|---|---|
| Перечитать после lifecycle-уведомления | Порядок Node; сохраняет reentrancy | Несколько чтений состояния при регистрации; выбрано |
| Уведомлять после вставки | Проще локальное состояние | Ломает порядок newListener; отклонено |
| Очередь вложенных регистраций | Нет рекурсии | Меняет синхронную lifecycle-семантику; отклонено |
| Считать через копии listeners() | Повторное использование introspection | Аллокации на запрос и потеря raw-wrapper identity; выбран прямой обход |

Специализация emit и ручное клонирование массивов сохранены. Произвольные изменения из сторонних routing-hooks
proxy и бросающие teardown-callbacks вне этого исправления. Перенос файлов или изменение графа истории не требуется.

## [RU] Проверка и ограничения

Дифференциальные случаи покрывают вставку из hook, замену, очистку всей таблицы, вложенный once, смену лимита,
удаление чередующихся дубликатов и фильтры single/mixed/raw/absent. DOM-проверки покрывают уничтожение внутри
hook и opt-in-дедупликацию. Первые расширенные Node-тесты воспроизвели 23 падающих случая по проблемам контрактов;
теперь все проходят. Полная проверка: 519 pass, один прежний skip, ноль ошибок/todo; строгие типы/сборки/GC проходят.
Исчерпывающая reentrancy для всех расширений и версий сред не заявляется.
