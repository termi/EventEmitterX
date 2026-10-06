---
iso date: "2026-10-06T15:06:01.466Z"
timestamp: 1791299161466
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "logic, api, docs, tests"
---

# EventSignal Write Queue — Rationale

## Problem and Required Contract

Implementation: [EventSignal.ts](../../modules/EventEmitterEx/EventSignal.ts).
Acceptance examples: [EventSignal_contract_spec.ts](../../spec/modules/EventEmitterEx/EventSignal_contract_spec.ts).
Related decisions: [signal contract](../../roadmap/03_SIGNAL_CONTRACT.md).

`set(reducer)` is a source write whose reducer receives the preceding accepted
output as `prev`, the current source separately, and `data`. For a writable signal,
the preceding source is its working output. For a computed signal, source and
output can differ: a source of 1 can produce an output of 10.

Repeated reducers must consume intermediate output in call order. They cannot
all read the last published value. If the preceding output is a Promise, the next
reducer must wait for its resolved value instead of receiving a Promise or stale
output. Ordinary source writes accepted behind that reducer must keep their place
in the same order. Publication must still follow normal reads, microtasks,
triggers and throttles; preparation for a reducer must not force public `get()`.

The queue addresses this asynchronous ordering problem. Synchronous sequences
use the private working-output cache without allocating a queue.

## Chosen Mechanism

| Member                                                    | Responsibility                                                                                                                                  |
|-----------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| `_prepareReducerValue()`                                  | Select an in-flight output, pending preview or initial Promise; otherwise obtain the synchronous working output or calculate a private preview. |
| `_reducerOutput`, `_reducerOutputPromise`, `_sourceEpoch` | Cache intermediate output and prevent a preview from being reused after its source/dependencies change.                                         |
| `_queuedSets`                                             | Hold FIFO entries: literal source values or reducers, plus each entry's resolve/reject functions.                                               |
| `_setCompletion`                                          | Identify an active batch and provide its completion barrier for readers.                                                                        |
| `_enqueueSet()`                                           | Start a batch if needed, append an entry and return its individual `Promise<void>`.                                                             |
| `_waitForSetValue()`                                      | Resume the same batch when required output settles; cancel it on failure.                                                                       |
| `_drainQueuedSets()`                                      | Apply entries in order, pausing again when a reducer needs asynchronous output.                                                                 |
| `_cancelQueuedSets()`                                     | Invalidate pending previews, remove outstanding entries and reject their promises and the batch barrier.                                        |

The flow is:

1. `set` applies a literal immediately when no batch is active. A reducer first
   asks `_prepareReducerValue()` for its previous output.
2. A synchronous previous output permits immediate application. A Promise starts
   the queue and installs a continuation through `_waitForSetValue()`.
3. While `_setCompletion` exists, **every** following `set`, including literals,
   is appended. A literal cannot bypass a reducer already waiting for output.
4. The drain examines the first entry. A literal needs no preview. A reducer may
   need a new preview of the source left by the preceding entry; if asynchronous,
   the drain pauses without removing the entry.
5. After `_applySet` succeeds, the entry is removed and its promise resolves.
   When no entries remain, the barrier is cleared/resolved and normal
   recalculation scheduling resumes.

Continuations capture a `WeakRef` to the signal and the batch identity. A callback
from an old batch cannot drain or cancel a newer batch. Preview caching also
checks source epochs; cancellation advances the epoch so late preview results
cannot become current working output.

## Examples

### Different Source and Output

```ts
using scaled$ = new EventSignal(0, (_prev, source) => source * 10, {
    initialSourceValue: 0,
});
scaled$.get();
scaled$.set(prev => prev + 1);
scaled$.set(prev => prev + 1);
scaled$.set(prev => prev + 1);
const output = scaled$.get(); // 1110
```

| Write            | Reducer prev (output) | Accepted source | Resulting output |
|------------------|----------------------:|----------------:|-----------------:|
| First increment  |                     0 |               1 |               10 |
| Second increment |                    10 |              11 |              110 |
| Third increment  |                   110 |             111 |             1110 |

Without working output, all three increments could read 0 and submit source 1.
With a throttle, the intermediate 10 and 110 are private previews: they do not
release the throttle or notify listeners. Output stays at its published value
until the configured release. Preview computations count as real computations;
computation callbacks can therefore run during a reducer write.

### Async Computation and Interleaved Literal Write

```ts
using scaled$ = new EventSignal(0, async (_prev, source) => source * 10, {
    initialSourceValue: 0,
});
await scaled$.get();
const writes = [
    scaled$.set(prev => prev + 1),
    scaled$.set(prev => prev + 1),
    scaled$.set(5),
    scaled$.set(prev => prev + 1),
];
await Promise.all(writes);
const output = await scaled$.get(); // 510
const source = scaled$.getSourceValue(); // 51
```

The first reducer accepts source 1. The second needs output 10 and waits for its
preview. The literal 5 and final reducer join that queue. After the second accepts
source 11, the literal replaces it with 5. The final reducer waits for output 50,
then accepts source 51. Reading produces output 510. Letting the literal bypass
the waiting reducer would change the order and the meaning of the final reducer.

These are synchronous reducers over **async computations**. A reducer returning
a Promise is rejected; asynchronous source-transform callbacks are a separate API
decision, not an implicit use of this queue.

### Pending Initial Value

```ts
const initial = Promise.withResolvers<number>();
using counter$ = new EventSignal(initial.promise);
const write = counter$.set(prev => prev + 1);
initial.resolve(10);
await write;
const output = await counter$.get(); // 11
```

The reducer receives 10 after resolution, not the initial Promise or an invented
default value. This is why waiting is also needed for a writable signal without
a computation callback.

## Completion, Readers and Notification

`set` and methods built through `createMethod` return `void | Promise<void>`.
An immediate write returns `void`; a queued write returns a promise. Its fulfillment
means that its source write has been applied, including an equality no-op. It does
**not** guarantee completion of all later writes, publication of output, or
execution of subscriber callbacks. Use `await signal$.get()` when output is needed;
a configured throttle can still preserve the previously published output.

During a batch, `get()` waits for `_setCompletion` and then reads again. Dependency
registration happens before this barrier. A computation trying to read its own
queued signal is rejected rather than waiting on itself. `_recalculateIfNeeded()`
does not schedule publication while the batch remains active, and checks the
barrier again inside an already scheduled microtask.

`mutate` is synchronous and cannot join this waiting protocol. It rejects while
writes are pending instead of changing source out of order. Await pending writes
before mutating. Normal literal writes outside an active batch retain lazy,
latest-write behavior; the queue does not serialize every async computation.

## Failure, Disposal and Ownership

A preview rejection, failure of an already running computation, or reducer throw
fails the outstanding batch. `_waitForSetValue` checks both rejected promises and
the signal error status because a published computation can represent failure
through last-value fallback. `_cancelQueuedSets` rejects all remaining jobs and
the batch barrier, clears the queue and invalidates pending preview state.
The error path records the signal error. A later independent write can recover.

Cancellation is **not a transaction rollback**: already applied sources and
already fulfilled write promises remain applied/fulfilled. Later entries are
discarded because executing them after a failed predecessor would silently alter
their intended meaning. Synchronous failures on the immediate path throw; queued
failures reject promises. Internal no-op rejection handlers preserve existing
fire-and-forget callers, while awaiting the original promise still sees rejection.

`destructor`/`Symbol.dispose` cancel outstanding writes with a destroyed-object
error; a configured `AbortSignal` follows destruction. Waiting readers reject too.
Late Promise settlement must not resume reducers or publish into a destroyed
signal. Cancellation does not abort the external computation or undo its side
effects; the computation owner must implement its own cancellation if needed.

The instance owns queue entries until application or cancellation. Each reducer
closure may retain application objects. Weak continuations avoid adding a direct
strong reference to the signal, but do not solve the known global registry
retention problem. Explicit disposal remains important; global lifetime repair
belongs to [roadmap stage 02](../../roadmap/02_LIFECYCLE.md).

## Alternatives and Tradeoffs

| Alternative                               | Why it was not chosen                                                                         |
|-------------------------------------------|-----------------------------------------------------------------------------------------------|
| Reduce using the last published value     | Loses repeated increments and ignores source/output transformations.                          |
| Feed source into the prev argument        | Breaks the output-based reducer contract when source and output differ.                       |
| Force public get after each write         | Couples reducer correctness to publication and may interfere with triggers/throttles.         |
| Independent Promise.then per write        | Does not establish one order across reducers and literal writes or one cancellation boundary. |
| Drop older pending writes                 | Suitable for replacement sources in some APIs, but loses accepted reducer operations.         |
| Reject every write requiring async output | Simpler, but removes useful reducers over async computation and pending initial values.       |
| Queue every write unconditionally         | Adds promises and scheduling to synchronous callers without an ordering need.                 |

The chosen mechanism costs extra state, per-job promises and potentially additional
computation previews. The queue is unbounded and has no per-write abort/timeout.
A never-settling output can retain its queued entries until disposal/abort.
Queue limits, backpressure, independent cancellation, a wider runtime matrix and
dependency changes during async computation require separate design work.

## Verification and Scope

Existing acceptance tests cover transformed output, synchronous notification
coalescing, throttle release, mixed async reducers/literals, pending initial
values, mutation rejection, running-computation/preview/reducer failures,
recovery, disposal, abort and late settlement. Test names include
`orders async reducers and literal writes in the same queue`,
`rejects the batch on a preview error and accepts a later independent write`, and
`rejects pending writes on dispose and ignores a late initial completion`.

This document explains the current implementation; it does not claim atomic
transactions, bounded memory, cancellation of external work, or complete async
dependency tracking. It adds no runtime behavior.

---

## [RU] Проблема и требуемый контракт

Реализация: [EventSignal.ts](../../modules/EventEmitterEx/EventSignal.ts).
Приёмочные примеры: [EventSignal_contract_spec.ts](../../spec/modules/EventEmitterEx/EventSignal_contract_spec.ts).
Связанные решения: [контракт сигналов](../../roadmap/03_SIGNAL_CONTRACT_RU.md).

`set(reducer)` записывает source; reducer получает предшествующий принятый output
как `prev`, отдельно текущий source и `data`. У записываемого сигнала предыдущий
source служит рабочим output. У computed-сигнала source и output могут отличаться:
source 1 может давать output 10.

Последовательные reducers должны потреблять промежуточный output в порядке
вызовов. Они не могут все читать последнее опубликованное значение. Если
предыдущий output — Promise, следующий reducer должен дождаться его результата,
а не получать Promise или устаревший output. Обычные записи source, принятые
после такого reducer, должны сохранить место в том же порядке. Публикация должна
следовать обычным чтениям, microtasks, triggers и throttles; подготовка reducer
не должна принудительно вызывать публичный `get()`.

Очередь решает эту проблему асинхронного порядка. Синхронные последовательности
используют приватный кеш рабочего output без создания очереди.

## [RU] Выбранный механизм

| Member                                                    | Ответственность                                                                                                                               |
|-----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| `_prepareReducerValue()`                                  | Выбирает вычисляемый output, ожидающий preview или initial Promise; иначе получает синхронный рабочий output или вычисляет приватный preview. |
| `_reducerOutput`, `_reducerOutputPromise`, `_sourceEpoch` | Кешируют промежуточный output и запрещают повторное использование preview после изменения source/dependencies.                                |
| `_queuedSets`                                             | Содержит FIFO-записи: literal source или reducers с resolve/reject-функциями каждой записи.                                                   |
| `_setCompletion`                                          | Идентифицирует активную группу записей и предоставляет читателям барьер её завершения.                                                        |
| `_enqueueSet()`                                           | При необходимости начинает группу, добавляет запись и возвращает её индивидуальный `Promise<void>`.                                           |
| `_waitForSetValue()`                                      | Продолжает ту же группу после завершения требуемого output; отменяет её при ошибке.                                                           |
| `_drainQueuedSets()`                                      | Применяет записи по порядку, снова останавливаясь, когда reducer требует асинхронный output.                                                  |
| `_cancelQueuedSets()`                                     | Инвалидирует ожидающие previews, удаляет оставшиеся записи и отклоняет их promises и барьер группы.                                           |

Последовательность работы:

1. `set` сразу применяет literal, если нет активной группы. Для reducer сначала
   запрашивается предыдущий output через `_prepareReducerValue()`.
2. Синхронный предыдущий output позволяет применить запись сразу. Promise
   запускает очередь и устанавливает продолжение через `_waitForSetValue()`.
3. Пока существует `_setCompletion`, **каждый** следующий `set`, включая literals,
   добавляется в очередь. Literal не может обойти reducer, ожидающий output.
4. Обработка рассматривает первую запись. Literal не требует preview. Reducer
   может потребовать новый preview source, оставленного предыдущей записью;
   если он асинхронный, обработка останавливается без удаления записи.
5. После успешного `_applySet` запись удаляется и её promise разрешается.
   Когда записей не остаётся, барьер очищается/разрешается и возобновляется
   обычное планирование пересчёта.

Продолжения захватывают `WeakRef` сигнала и идентификатор группы. Callback старой
группы не может обработать или отменить новую. Кеширование preview также
проверяет эпохи source; отмена увеличивает эпоху, чтобы поздние результаты
preview не стали текущим рабочим output.

## [RU] Примеры

### Различающиеся Source и Output

```ts
using scaled$ = new EventSignal(0, (_prev, source) => source * 10, {
    initialSourceValue: 0,
});
scaled$.get();
scaled$.set(prev => prev + 1);
scaled$.set(prev => prev + 1);
scaled$.set(prev => prev + 1);
const output = scaled$.get(); // 1110
```

| Запись            | Reducer prev (output) | Принятый source | Получаемый output |
|-------------------|----------------------:|----------------:|------------------:|
| Первое увеличение |                     0 |               1 |                10 |
| Второе увеличение |                    10 |              11 |               110 |
| Третье увеличение |                   110 |             111 |              1110 |

Без рабочего output все три увеличения могли бы читать 0 и передавать source 1.
При throttle промежуточные 10 и 110 — приватные previews: они не снимают throttle
и не уведомляют listeners. Output остаётся опубликованным значением до
настроенного разрешения публикации. Preview-вычисления считаются реальными
вычислениями; поэтому computation callbacks могут выполняться во время reducer-записи.

### Асинхронное вычисление и Literal среди записей

```ts
using scaled$ = new EventSignal(0, async (_prev, source) => source * 10, {
    initialSourceValue: 0,
});
await scaled$.get();
const writes = [
    scaled$.set(prev => prev + 1),
    scaled$.set(prev => prev + 1),
    scaled$.set(5),
    scaled$.set(prev => prev + 1),
];
await Promise.all(writes);
const output = await scaled$.get(); // 510
const source = scaled$.getSourceValue(); // 51
```

Первый reducer принимает source 1. Второму нужен output 10, и он ждёт его
preview. Literal 5 и последний reducer попадают в ту же очередь. После принятия
вторым reducer source 11 literal заменяет его на 5. Последний reducer ждёт output
50, затем принимает source 51. Чтение даёт output 510. Если literal обойдёт
ожидающий reducer, изменятся порядок и смысл последнего reducer.

Это синхронные reducers над **асинхронными computations**. Reducer, возвращающий
Promise, отклоняется; асинхронные callbacks преобразования source требуют
отдельного решения API, а не неявного использования этой очереди.

### Ожидающее начальное значение

```ts
const initial = Promise.withResolvers<number>();
using counter$ = new EventSignal(initial.promise);
const write = counter$.set(prev => prev + 1);
initial.resolve(10);
await write;
const output = await counter$.get(); // 11
```

Reducer получает 10 после разрешения, а не initial Promise или придуманное
значение по умолчанию. Поэтому ожидание требуется и записываемому сигналу
без computation callback.

## [RU] Завершение, чтение и уведомления

`set` и методы, построенные через `createMethod`, возвращают `void | Promise<void>`.
Немедленная запись возвращает `void`; запись в очереди — promise. Его разрешение
означает применение записи source, включая отсутствие изменения при равенстве.
Это **не** гарантирует завершение всех последующих записей, публикацию output или
выполнение subscriber callbacks. Когда нужен output, используйте
`await signal$.get()`; настроенный throttle всё ещё может сохранять предыдущий
опубликованный output.

Во время группы `get()` ждёт `_setCompletion`, затем повторяет чтение. Регистрация
зависимости происходит до этого барьера. Computation, пытающийся прочитать
собственный сигнал с очередью, отклоняется вместо ожидания самого себя.
`_recalculateIfNeeded()` не планирует публикацию при активной группе и повторно
проверяет барьер внутри уже запланированной microtask.

`mutate` синхронный и не может присоединиться к этому протоколу ожидания.
Он отклоняется при ожидающих записях вместо изменения source вне порядка.
Перед мутацией дождитесь записей. Обычные literals вне активной группы сохраняют
ленивое поведение с принятием последней записи; очередь не сериализует все
асинхронные computations.

## [RU] Ошибки, уничтожение и владение

Отклонение preview, ошибка уже выполняющегося computation или исключение reducer
прерывают оставшуюся группу. `_waitForSetValue` проверяет и отклонённые promises,
и error status сигнала: опубликованный computation может представлять ошибку
через возврат последнего значения. `_cancelQueuedSets` отклоняет все оставшиеся
jobs и барьер, очищает очередь и инвалидирует состояние ожидающего preview.
Путь обработки ошибки записывает ошибку сигнала. Последующая независимая запись
может восстановить работу.

Отмена **не является откатом транзакции**: уже применённые sources и уже
разрешённые write promises остаются применёнными/разрешёнными. Последующие
записи отбрасываются, потому что выполнение после ошибочного предшественника
молча изменило бы их смысл. Синхронные ошибки немедленного пути выбрасываются;
ошибки очереди отклоняют promises. Внутренние no-op rejection handlers сохраняют
существующие fire-and-forget вызовы, а ожидание исходного promise всё ещё получает ошибку.

`destructor`/`Symbol.dispose` отменяют ожидающие записи с ошибкой уничтоженного
объекта; настроенный `AbortSignal` ведёт к уничтожению. Ожидающие читатели также
получают отклонение. Позднее завершение Promise не должно возобновить reducers
или опубликовать значение в уничтоженном сигнале. Отмена не прерывает внешнее
вычисление и не откатывает его побочные эффекты; при необходимости владелец
computation должен реализовать собственную отмену.

Экземпляр владеет записями очереди до применения или отмены. Каждое reducer-замыкание
может удерживать объекты приложения. Слабые продолжения не добавляют прямую
сильную ссылку на сигнал, но не решают известную проблему удержания глобальным
регистром. Явное уничтожение остаётся важным; исправление глобального lifetime
относится к [этапу 02 roadmap](../../roadmap/02_LIFECYCLE_RU.md).

## [RU] Альтернативы и компромиссы

| Альтернатива                                             | Почему не выбрана                                                                      |
|----------------------------------------------------------|----------------------------------------------------------------------------------------|
| Использовать последний опубликованный output для reducer | Теряет повторные увеличения и игнорирует преобразования source/output.                 |
| Передавать source как prev                               | Нарушает output-based контракт reducer при различии source и output.                   |
| Принудительно вызывать публичный get после каждой записи | Связывает корректность reducer с публикацией и может вмешиваться в triggers/throttles. |
| Независимый Promise.then для каждой записи               | Не устанавливает общий порядок reducers и literals или общую границу отмены.           |
| Отбрасывать старые ожидающие записи                      | Подходит для замены source в некоторых API, но теряет принятые reducer-операции.       |
| Отклонять каждую запись, требующую async output          | Проще, но исключает полезные reducers над async computation и pending initial values.  |
| Всегда ставить все записи в очередь                      | Добавляет promises и планирование синхронным вызовам без необходимости порядка.        |

Выбранный механизм требует дополнительного состояния, promises на запись и
возможных дополнительных preview-вычислений. Очередь не ограничена и не имеет
abort/timeout для отдельной записи. Никогда не завершающийся output может
удерживать записи до уничтожения/abort. Ограничения очереди, backpressure,
независимая отмена, более широкая матрица runtime и изменения dependencies во
время async computation требуют отдельного проектирования.

## [RU] Проверка и границы

Существующие приёмочные тесты проверяют преобразованный output, объединение
синхронных уведомлений, разрешение throttle, смешанные async reducers/literals,
pending initial values, отклонение mutation, ошибки выполняющегося computation,
preview и reducer, восстановление, уничтожение, abort и позднее завершение.
Среди названий тестов:
`orders async reducers and literal writes in the same queue`,
`rejects the batch on a preview error and accepts a later independent write` и
`rejects pending writes on dispose and ignores a late initial completion`.

Документ объясняет текущую реализацию и не заявляет атомарные транзакции,
ограниченную память, отмену внешней работы или полное отслеживание асинхронных
зависимостей. Он не добавляет runtime-поведение.
