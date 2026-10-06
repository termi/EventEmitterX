---
iso date: "2026-10-06T20:11:43.377Z"
timestamp: 1791317503377
ai_model: "GPT6"
git user: '"Egor Halimonenko" <termi_uc@inbox.ru>'
area: "logic, frontend, tests, docs"
---

# Weak notification ownership before channel relocation

## Problem and chosen sequence

The original path was `global emitter → registered callback → signal → computation/data/source`. Finalization could not
break it: the target was not collectible while its callback held it. This affected dependency subscriptions and could
also affect user callbacks capturing their signal, external emitters, shared timers, AbortSignal and the React component
registry.

The owner requested two commits: first preserve the global channels and fix weak notification ownership, then replace
channels with instance-owned channels/direct links after a manual commit. This change implements only the first step.

## Ownership mechanism

`weakSignalCallback.ts` creates a wrapper in a separate lexical scope. Its only retained target is a WeakRef to the
callback, not a closure with the owner. Each live signal strongly owns its original callbacks in `_ownedCallbacks` or
`_listenerCallbacks`. Therefore callbacks remain callable while their signal is alive, and the global wrapper cannot
keep a forgotten signal alive.

For dependency listeners, `_weakDepUpdated` keeps a stable registration identity. `_dependencyCleanups` and
`_resourceCleanups` record detach operations bound to emitter, event name and weak wrapper. Finalization holds only the
symbol and cleanup set; neither may contain a bound signal method or a closure capturing the signal. ClearDeps removes
its cleanup entries. Timer/source callbacks and onEnd/filter callbacks use the same weak ownership boundary.

Subscriber registration preserves a single weak wrapper per original callback, original `this`, once/prepend ordering
and removeListener identity. Once dispatch removes the owner's record before invoking user code. Unsubscribe removes the
record; suspend removes registration and resume reconstructs it. Closed/destroyed subscriptions cannot resume. A
subscription handle itself intentionally references its signal: retaining a handle is retaining an owner.

React's component registry and RAF queue register weak callbacks. The adapter records emitter-removal and
queue-cancellation operations with the core, and releases owned callbacks on unsubscribe. Cleanup captures the component
type at registration rather than reading a potentially changed type later.

## Collection versus disposal

Review follow-up: `weakSignalCallback.ts` also owns `SignalSubscriptionFlags`, named callback-map/record types, and
`getWeakListener`, which reuses wrappers and releases once records. EventSignal delegates listener-record creation and
uses immutable local callback snapshots rather than non-null assertions. Source registration rollback now surrounds
emitter resolution and options access as well as the listener loop. The destructor's remaining cleanup entries are
dependency detach operations and React component-type/RAF cleanup; the four constructor resource callbacks have already
been handled explicitly.

Finalization performs eventual detach and removes the signal's incoming/subscriber/timer entries. It does not execute
onDestroy or promise a cleanup deadline. Explicit destructor/Symbol.dispose unregisters finalization, cancels queued
writes, detaches resources and releases callback records. An already-aborted owner destroys the constructed signal.
Failure during constructor resource setup cleans earlier registrations and preserves the original error, aggregating
cleanup errors if necessary.

Destruction remains idempotent. It attempts remaining cleanup even when an external removal, final-value computation or
onDestroy throws, then reports AggregateError. Source cancellation is also idempotent and attempts all removals. Invalid
multi-event registration is rolled back.

## Examples

```ts
using source$ = new EventSignal(1);

function createForgottenChild() {
  const child$ = new EventSignal(0, () => source$.get() * 2);
  child$.get();
  return new WeakRef(child$);
}

const reference = createForgottenChild();
// source$ stays alive; child$ is eligible for GC without destructor.
```

```ts
using value$ = new EventSignal(0);
const subscription = value$.on(() => console.log(value$.getLast()));
subscription.unsubscribe(); // immediate release; no need to wait for GC
subscription.resume(); // false: a closed subscription cannot be revived
```

## Alternatives and limits

- Moving channels to signals removes global listener ownership but still needs weak reverse links from live sources to
  forgotten dependents. It is the agreed second step, deliberately excluded here.
- A custom adjacency-list implementation could replace EventEmitterX entirely; it must separately preserve
  duplicate/once/prepend/removal behavior and notification timing.
- A Map or symbol-keyed WeakMap alone does not repair callbacks pointing back to their targets. Finalization alone also
  cannot make a strongly retained target collectible.
- Weak callback targets are ordinary function objects; no symbol-WeakRef support is needed. The existing strong fallback
  remains operational without native WeakRef, but automatic collection is not promised. Without FinalizationRegistry,
  dead registrations are not guaranteed to disappear automatically. Explicit disposal remains required for deterministic
  cleanup.
- Pending asynchronous computations can retain their owner until the external Promise settles. This step fixes registry
  ownership, not every arbitrary Promise retaining path. Existing queue-disposal and late-completion behavior is
  preserved. Multi-runtime and real React/SSR lifetime validation remain future work.

## Evidence

Node 26.8.1: `pnpm test:signals:gc` collects 72 forgotten signals across nine scenarios (dynamic/explicit dependency,
self subscriber, source emitter, emitter/signal/clock trigger, abort owner, React subscription with queued RAF),
verifies registration removal and checks live-owner notification delivery. The same regression fails on the original
HEAD source. The no-WeakRef mode verifies deterministic disposal only.

Construction runs outside suspended async test frames to avoid local-variable retention obscuring eligibility. This also
corrects the original audit probe. A bounded GC test is evidence on this runtime, not a cross-platform collection
deadline.

114 EventSignal tests pass, one is skipped; six new lifecycle tests cover aborted construction, cleanup exceptions,
failed registration, idempotent disposal, subscription guards and listener semantics. Strict type/declaration checks
report only the recorded 36 diagnostics. Full suite: 401 passed, the same 14 events_spec failures, one skipped and six
todo.

---

## [RU] Проблема и выбранная последовательность

Исходный путь: `global emitter → зарегистрированный callback → signal → computation/data/source`. Финализация не могла
разорвать его: объект не мог собираться, пока callback удерживал его. Это затрагивало подписки зависимостей и могло
затрагивать пользовательские callbacks, захватывающие свой сигнал, внешние emitter-ы, общие таймеры, AbortSignal и
реестр компонентов React.

Владелец запросил два коммита: сначала сохранить глобальные каналы и исправить слабое владение уведомлениями, затем
после ручного коммита заменить каналы каналами экземпляров/прямыми связями. Это изменение реализует только первый шаг.

## [RU] Механизм владения

`weakSignalCallback.ts` создаёт обёртку в отдельной лексической области. Единственная удерживаемая цель — WeakRef на
callback, а не замыкание с владельцем. Каждый живой сигнал сильно владеет исходными callbacks в `_ownedCallbacks` или
`_listenerCallbacks`. Поэтому callbacks остаются вызываемыми, пока сигнал жив, а глобальная обёртка не может удержать
забытый сигнал.

Для слушателей зависимостей `_weakDepUpdated` сохраняет стабильную идентичность регистрации. `_dependencyCleanups` и
`_resourceCleanups` записывают операции отключения, привязанные к emitter-у, имени события и слабой обёртке. Финализация
хранит только символ и набор очистки; они не должны содержать привязанный метод сигнала или замыкание, захватывающее
сигнал. ClearDeps удаляет свои записи очистки. Callbacks таймеров/источника и callbacks onEnd/filter используют ту же
слабую границу владения.

Регистрация подписчика сохраняет одну слабую обёртку на исходный callback, исходный `this`, порядок once/prepend и
идентичность removeListener. Once-dispatch удаляет запись владельца до вызова пользовательского кода. Unsubscribe
удаляет запись; suspend снимает регистрацию, а resume создаёт её заново. Закрытые/уничтоженные подписки нельзя
возобновить. Сам дескриптор подписки намеренно ссылается на сигнал: сохранение дескриптора означает сохранение
владельца.

Реестр компонентов React и очередь RAF регистрируют слабые callbacks. Адаптер записывает операции удаления слушателей и
отмены очереди в ядре и освобождает принадлежащие ему callbacks при unsubscribe. Очистка захватывает тип компонента при
регистрации, а не читает потенциально изменённый тип позднее.

## [RU] Сборка и явный dispose

Уточнение после ревью: `weakSignalCallback.ts` также содержит `SignalSubscriptionFlags`, именованные типы Map/записей
callbacks и `getWeakListener`, который переиспользует обёртки и освобождает once-записи. EventSignal делегирует создание
записей слушателей и использует неизменяемые локальные снимки callbacks вместо non-null assertions. Откат регистрации
источника теперь охватывает получение emitter-а и чтение options вместе с циклом слушателей. Оставшиеся записи очистки
destructor — отключение зависимостей и очистки React component-type/RAF; четыре callback-а ресурсов конструктора уже
обработаны явно.

Финализация выполняет eventual detach и удаляет входящие/subscriber/timer записи сигнала. Она не выполняет onDestroy и
не обещает срок очистки. Явный destructor/Symbol.dispose отменяет финализацию, отменяет очередь записей, отключает
ресурсы и освобождает записи callbacks. Уже отменённый владелец уничтожает созданный сигнал. Ошибка настройки ресурсов
конструктора очищает предыдущие регистрации и сохраняет исходную ошибку, при необходимости агрегируя ошибки очистки.

Уничтожение остаётся идемпотентным. Оно пытается выполнить остальную очистку, даже если внешнее удаление, вычисление
финального значения или onDestroy бросает исключение, затем сообщает AggregateError. Отмена источника также идемпотентна
и пытается выполнить все удаления. Некорректная регистрация нескольких событий откатывается.

## [RU] Примеры

```ts
using source$ = new EventSignal(1);

function createForgottenChild() {
  const child$ = new EventSignal(0, () => source$.get() * 2);
  child$.get();
  return new WeakRef(child$);
}

const reference = createForgottenChild();
// source$ stays alive; child$ is eligible for GC without destructor.
```

```ts
using value$ = new EventSignal(0);
const subscription = value$.on(() => console.log(value$.getLast()));
subscription.unsubscribe(); // immediate release; no need to wait for GC
subscription.resume(); // false: a closed subscription cannot be revived
```

## [RU] Альтернативы и ограничения

- Перенос каналов к сигналам удаляет глобальное владение слушателями, но всё равно требует слабых обратных связей от
  живых источников к забытым зависимым сигналам. Это согласованный второй шаг, намеренно не включённый сюда.
- Собственная реализация списков связей может полностью заменить EventEmitterX; она должна отдельно сохранить поведение
  duplicate/once/prepend/removal и время уведомлений.
- Map или WeakMap с символом сами по себе не исправляют callbacks, указывающие обратно на свои цели. Одна финализация
  также не делает сильно удерживаемый объект доступным сборке.
- Цели слабых callbacks — обычные объекты функций; поддержка symbol-WeakRef не требуется. Существующий сильный fallback
  работает без нативного WeakRef, но автоматическая сборка не обещается. Без FinalizationRegistry автоматическое
  исчезновение мёртвых записей не гарантируется. Для детерминированной очистки требуется явный dispose.
- Незавершённые асинхронные вычисления могут удерживать владельца до завершения внешнего Promise. Этот шаг исправляет
  владение реестров, а не все произвольные пути удержания через Promise. Существующее поведение dispose очереди и
  позднего завершения сохранено. Проверка нескольких runtime и lifetime реального React/SSR остаётся будущей работой.

## [RU] Подтверждение

Node 26.8.1: `pnpm test:signals:gc` собирает 72 забытых сигнала в девяти сценариях (динамическая/явная зависимость,
подписчик с захватом себя, source emitter, emitter/signal/clock trigger, abort owner, подписка React с ожидающим RAF),
проверяет удаление регистраций и доставку уведомлений живому владельцу. Та же регрессия падает на исходниках
первоначального HEAD. Режим без WeakRef проверяет только детерминированный dispose.

Создание выполняется вне приостановленных async frames теста, чтобы удержание локальных переменных не мешало проверке
доступности сборке. Это также исправляет исходную пробу аудита. Ограниченный GC-тест — подтверждение для этого runtime,
а не межплатформенный срок сборки.

114 тестов EventSignal проходят, один пропущен; шесть новых lifecycle-тестов проверяют отменённое создание, исключения
очистки, ошибочную регистрацию, идемпотентный dispose, ограничения подписок и семантику слушателей. Строгие проверки
типов/declarations показывают только зафиксированные 36 диагностик. Полный набор: 401 успешный тест, те же 14 ошибок
events_spec, один пропущенный и шесть todo.
