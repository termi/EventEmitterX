---
iso date: "2026-10-06T15:37:45.902Z"
timestamp: 1791301065902
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "logic, api, types, tests, docs"
---

# EventSignal React Decomposition — Rationale

## Problem and Decision

Move React implementation out of EventSignal.ts while preserving the public class,
its generic contracts, null-rooted prototype, hooks, snapshots and cleanup.
EventSignalReact.ts owns hooks, initialization, JSX decoration, component registry
and rendering. EventSignalReactScheduler.ts owns the existing RAF callback pool.
The core keeps computation, dependencies, ordered writes, lifecycle and thin delegates.
A typed internal bridge supplies only private operations required by React; it does
not expose private fields publicly. React imports the core only as a type; runtime
initialization receives the constructor from its static block.

## Examples and Verification

Existing calls stay unchanged: signal$.use(value => String(value)),
signal$.component({ sFC: component }), EventSignal.initReact(React), and
EventSignal.registerReactComponentForComponentType(type, component). The class
retains the original generic overloads and binds stable subscription/snapshot
callbacks; those wrappers forward to the adapter. Private description, stored
value, component descriptor, component version and subscription access are supplied
by the bridge. Shallow equality remains in the core because computation also uses it;
the bridge passes that existing comparator to component registration.

Hook implementations now live in adapter-local slots rather than private prototype
slots. Reinitialization replaces them; debug, JSX and context state remain scoped
to the installed integration. This avoids inheritance and duplicated constructors.
React uses a type-only core import, while core passes its constructor at runtime.

Five focused React tests pass on both the original main implementation and the
extracted implementation. They cover hook reinitialization, null prototype/class
identity, JSX/context for React 18 and 19, registry/RAF cleanup and destroyed
rendering. All 108 EventSignal tests pass, one is skipped. Strict source fixtures
and emitted consumers pass in CommonJS, NodeNext and Bundler; the same 36 library
diagnostics remain. Full suite: 391 passed, 14 existing events_spec failures,
one skipped and six todo. Real React/SSR and packaging remain separate acceptance.

## Alternatives and Limits

Inheritance was rejected because it changes the prototype contract. Runtime imports
in both directions risk initialization cycles. Making private fields public or
casting the whole signal to an unrestricted host weakens encapsulation. A separate
opt-in React entry point is deferred: existing imports must still support current
React APIs. Queue, timer and event-adapter extraction is independent later work.

## History Procedure

Based on [Raymond Chen's split-history procedure](https://devblogs.microsoft.com/oldnewthing/20190917-00/?p=102894/).
Create dev from main at 4e3b6c1. Create each history branch from dev and commit a
complete rename of EventSignal.ts to its destination. Build a merge whose parents
include dev and those rename commits, retaining the original and both full copies
in its tree. In a subsequent ordinary commit, reduce the copies to their modules
and connect delegates. This keeps a rename ancestry for each destination without
rewriting main or old commits. The full-copy merge is a history preparation snapshot,
not a buildable release. Preserve these commits and merge parents; do not squash.

A scratch repository verified ordinary blame follows original lines through this
rename-only variant. Verify actual log --follow and blame on each extracted module;
new glue lines belong to the extraction commit. Tests and type consumers must pass
on the final tree; history preparation snapshots are not acceptance points.

## Actual History Verification

Base main: 4e3b6c1. Decision commit: a3817ac. Intermediate branches were created
from dev: split/eventsignal-react-history (ae4e062) and
split/eventsignal-react-scheduler-history (d1ec5e7). Their rename ancestry was
joined by a50e785; 8efb126 contains the working extraction and tests.

Both log --follow histories reach the old EventSignal.ts commits. Nine unchanged
line samples match the original blame at the base revision:

| Destination | Original EventSignal.ts line | Original commit |
| --- | ---: | --- |
| EventSignalReact.ts:209 | 3114 | 1b871b8 |
| EventSignalReact.ts:515 | 2425 | 1b871b8 |
| EventSignalReact.ts:607 | 2530 | 1b871b8 |
| EventSignalReact.ts:224 | 3129 | abaff27 |
| EventSignalReact.ts:389 | 3293 | 356c08a |
| EventSignalReact.ts:1014 | 4075 | 4d817e2 |
| EventSignalReactScheduler.ts:9 | 3959 | 532c4ff |
| EventSignalReactScheduler.ts:26 | 3976 | 532c4ff |
| EventSignal.ts:87 | 90 | 4e3b6c1 |

Use git --no-pager blame -M -C -C -- modules/EventEmitterEx/EventSignalReact.ts
and the same command for EventSignalReactScheduler.ts. Default blame follows
RAF lines, but can attribute reordered React blocks to the extraction commit;
-M follows moves within the file. New signatures, bridge accesses and renamed
signal references appropriately belong to the extraction. This is verified line
traceability, not a promise that every unconfigured history viewer follows moves.
Preserve the rename commits and multi-parent merge; do not squash this history.

## Existing Behavior Kept for Separate Work

### [Warning] Repeated Subscription Cleanup

File: modules/EventEmitterEx/EventSignal.ts, lines 2166–2172:

```ts
const unsubscribe = () => {
    closed = true;
    this._removeListener(ignoredEventName, listener, true);
    listener = void 0;
};
```

A second call can pass an undefined listener to removal and throw. The RAF adapter
retains this existing behavior; the new test verifies one cleanup cancels queued
callbacks and removes the registry listener. Recommendation: make subscription
cleanup idempotent in lifecycle stage 02, with repeated unmount/unsubscribe tests,
in a separate behavioral change.

### [Info] React Version Switching

File: modules/EventEmitterEx/EventSignalReact.ts, lines 184–201:

```ts
if (isReactGte19) {
    Object.defineProperties(_EventSignal_prototype, {
        $typeof: { configurable: true, value: Symbol.for("react.transitional.element") },
    });
}
```

The existing initializer updates the element marker for React 19 and does not reset
it when reinitializing with React 18. Tests preserve that behavior rather than
introducing a compatibility fix during extraction. Recommendation: define supported
version-switch/reset semantics and test them separately with real React consumers.

---

## [RU] Проблема и решение

Вынести реализацию React из EventSignal.ts, сохранив публичный класс, его generic
контракты, прототип с null в основании, hooks, snapshots и очистку.
EventSignalReact.ts владеет hooks, инициализацией, JSX-декорацией, регистром компонентов
и рендерингом. EventSignalReactScheduler.ts владеет существующим пулом RAF callbacks.
Ядро сохраняет вычисления, зависимости, упорядоченные записи, lifecycle и тонкое делегирование.
Типизированный внутренний адаптер предоставляет только приватные операции,
необходимые React; приватные поля не становятся публичными. React импортирует ядро
только как тип; runtime-инициализация получает конструктор из его static block.

## [RU] Примеры и проверка

Существующие вызовы не меняются: signal$.use(value => String(value)),
signal$.component({ sFC: component }), EventSignal.initReact(React) и
EventSignal.registerReactComponentForComponentType(type, component). Класс сохраняет
исходные generic overloads и привязанные стабильные callbacks подписки/snapshot;
эти обёртки передают работу адаптеру. Доступ к приватным description, сохранённому
value, descriptor компонента, версии компонента и подпискам предоставляет bridge.
Shallow equality остаётся в ядре, поскольку используется и в computation;
bridge передаёт существующий comparator регистрации компонентов.

Реализации hooks теперь находятся в локальных слотах адаптера вместо приватных
слотов прототипа. Повторная инициализация заменяет их; состояние debug, JSX и context
остаётся в установленной интеграции. Это исключает наследование и дублирование
конструкторов. React использует type-only импорт ядра, а ядро передаёт конструктор runtime.

Пять точечных React-тестов проходят и на исходной реализации main, и после
выделения. Они проверяют повторную инициализацию hooks, null-прототип/identity
класса, JSX/context React 18 и 19, очистку registry/RAF и рендеринг уничтоженного
сигнала. Проходят все 108 EventSignal-тестов, один пропущен. Строгие source fixtures
и emitted consumers проходят для CommonJS, NodeNext и Bundler; остаются те же
36 library diagnostics. Полный набор: 391 passed, 14 существующих ошибок events_spec,
один skipped и шесть todo. Настоящие React/SSR и упаковка остаются отдельной приёмкой.

## [RU] Альтернативы и границы

Наследование отвергнуто, поскольку меняет контракт прототипа. Runtime-импорты
в обе стороны создают риск циклической инициализации. Открытие приватных полей или
cast всего сигнала к неограниченному host ослабляет инкапсуляцию. Отдельный opt-in
React entry point отложен: существующие импорты должны поддерживать текущий React
API. Выделение очереди, таймеров и адаптеров событий — независимая последующая работа.

## [RU] Процедура сохранения истории

Основана на [процедуре Raymond Chen](https://devblogs.microsoft.com/oldnewthing/20190917-00/?p=102894/).
Создать dev из main на 4e3b6c1. Каждую history-ветку создать от dev и закоммитить
полный rename EventSignal.ts в целевой файл. Построить merge с родителями dev и
rename-коммитами, сохранив исходник и обе полные копии в его дереве. Следующим
обычным коммитом сократить копии до модулей и подключить делегирование. Это сохраняет
rename-предков каждого нового файла без переписывания main или старых коммитов.
Merge полных копий — подготовительный снимок истории, а не собираемый релиз.
Сохранить эти коммиты и родителей merge; не использовать squash.

Временный репозиторий подтвердил, что обычный blame сохраняет исходные строки
при таком варианте с rename-only ветками. Проверить реальные log --follow и blame
для каждого выделенного модуля; новые соединяющие строки относятся к коммиту
выделения. Тесты и type consumers должны проходить на итоговом дереве;
подготовительные снимки истории не являются точками приёмки.

## [RU] Фактическая проверка истории

Исходная main: 4e3b6c1. Коммит решений: a3817ac. Промежуточные ветки созданы
от dev: split/eventsignal-react-history (ae4e062) и
split/eventsignal-react-scheduler-history (d1ec5e7). Rename-предки объединены
коммитом a50e785; 8efb126 содержит рабочее выделение и тесты.

Обе истории log --follow доходят до старых коммитов EventSignal.ts. Девять образцов
неизменённых строк совпадают с исходным blame на базовой ревизии:

| Целевой файл | Исходная строка EventSignal.ts | Исходный коммит |
| --- | ---: | --- |
| EventSignalReact.ts:209 | 3114 | 1b871b8 |
| EventSignalReact.ts:515 | 2425 | 1b871b8 |
| EventSignalReact.ts:607 | 2530 | 1b871b8 |
| EventSignalReact.ts:224 | 3129 | abaff27 |
| EventSignalReact.ts:389 | 3293 | 356c08a |
| EventSignalReact.ts:1014 | 4075 | 4d817e2 |
| EventSignalReactScheduler.ts:9 | 3959 | 532c4ff |
| EventSignalReactScheduler.ts:26 | 3976 | 532c4ff |
| EventSignal.ts:87 | 90 | 4e3b6c1 |

Использовать git --no-pager blame -M -C -C -- modules/EventEmitterEx/EventSignalReact.ts
и ту же команду для EventSignalReactScheduler.ts. Обычный blame прослеживает
RAF-строки, но может приписать переупорядоченные React-блоки коммиту выделения;
-M отслеживает перемещения внутри файла. Новые сигнатуры, обращения к bridge и
переименованные ссылки на сигналы обоснованно относятся к выделению. Это проверенная
прослеживаемость строк, а не обещание, что любой ненастроенный просмотрщик истории
отслеживает перемещения. Сохранить rename-коммиты и multi-parent merge; не squash-ить историю.

## [RU] Существующее поведение, оставленное для отдельной работы

### [Warning] Повторная очистка подписки

Файл: modules/EventEmitterEx/EventSignal.ts, строки 2166–2172:

```ts
const unsubscribe = () => {
    closed = true;
    this._removeListener(ignoredEventName, listener, true);
    listener = void 0;
};
```

Второй вызов может передать undefined listener в удаление и выбросить ошибку.
RAF-адаптер сохраняет это поведение; новый тест проверяет, что однократная очистка
отменяет ожидающие callbacks и удаляет listener регистра. Рекомендация: сделать
очистку подписки идемпотентной в lifecycle-этапе 02 с проверками повторного
unmount/unsubscribe отдельным изменением поведения.

### [Info] Переключение версий React

Файл: modules/EventEmitterEx/EventSignalReact.ts, строки 184–201:

```ts
if (isReactGte19) {
    Object.defineProperties(_EventSignal_prototype, {
        $$typeof: { configurable: true, value: Symbol.for("react.transitional.element") },
    });
}
```

Существующий initializer обновляет маркер элемента для React 19 и не сбрасывает
его при повторной инициализации React 18. Тесты сохраняют это поведение вместо
внесения compatibility fix во время выделения. Рекомендация: определить поддержанные
правила переключения версий/reset и проверить их отдельно на настоящих React consumers.
