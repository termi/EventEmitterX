---
iso date: "2026-10-06T21:36:58.824Z"
timestamp: 1791322618824
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "types, scripts, tests, docs"
---

# From a diagnostic ledger to strict build and consumer verification

## Problem evidence

### 🟠 Warning — Runtime metadata was absent from strict types

**File:** `modules/events.ts`, lines 69 and 819 in pre-change commit
`636ab4c22d98cd146723d1973a8e4ef7a29282a1`.

```typescript
export declare type Listener = (this: EventEmitterX | undefined, ...args: any[]) => Promise<any> | undefined | void;
// ...
handler[kOnceListenerWrappedHandler] === listener
```

Library checking reported 36 diagnostics across untyped listener/error/host metadata, EventTarget feature caches
and the native getEventListeners overload boundary. The existing contract runner allowed that recorded baseline,
so a successful fixture run did not mean the library compiled cleanly.

**Recommendation:** describe actual metadata locally, keep strict options enabled, and require zero diagnostics.
Do not add arbitrary symbol index signatures to public emitters or augment global Node/DOM types.

### 🟠 Warning — Emitted declarations omitted an authored declaration input

**File:** `modules/EventEmitterEx/eventSignalReactIntegration.ts`, line 2.

```typescript
import type { EventSignal_ReactCopy } from "./EventSignal_types";
```

The `.d.ts` emitted for this module references the authored `EventSignal_types.d.ts`, but tsc does not copy that
input into the output directory. A consumer with skipLibCheck disabled reported the missing module.

**Recommendation:** copy library-owned authored declarations after successful emission, then check consumers against
the resulting output rather than masking missing declarations.

## Chosen mechanism

Listener metadata is an optional typed intersection; existing function-only callbacks remain valid. Generic storage
access uses Listener rather than unannotated Function. Declare-only fields type prototype tags without allocating
instance fields. EventTarget feature flags are optional local intersections on private helper inputs; error and host
extensions use localized shapes. The capture-rejection symbol keeps its standard unique-symbol identity and a narrow
optional hook. Numeric/symbol EventTarget introspection retains its runtime argument without new coercion.

Once wrappers additionally expose the original callback as `.listener`, and eventNames enumerates Reflect.ownKeys.
These are the two intentional introspection behavior corrections, verified against native Node.

The obsolete 36-error ledger is removed. The contract runner rejects every source/consumer diagnostic, emits with
noEmitOnError and checks both EventSignal and EventEmitterX declarations under CommonJS, NodeNext and Bundler with
skipLibCheck disabled. Its old filename and `typecheck:signals` command remain available; `typecheck:contracts` is an alias.

`build_library.cjs` validates each config and program before emitting. `copy_library_declarations.cjs` copies only
authored `.d.ts` source inputs under `modules/` and `utils/`, preserving relative paths. It does not copy dependency
declarations. Both sequential and parallel build entry points use this mechanism. Compiler errors stop emission and
copying; existing output is not recursively deleted. Clean publication staging remains stage 06.

`pnpm verify` runs separate child processes for strict library checking, contract checking, runtime tests, both builds,
built-output consumers/runtime smoke, GC and explicit-disposal fallback. It fails at the first unsuccessful step.
The CJS smoke loads actual `.js` output and verifies once, writable reducers, dependencies and disposal. ESM outputs
are checked as development artifacts and declarations; native ESM package execution is not claimed.

## Alternatives and tradeoffs

| Choice                                                    | Advantages                                                          | Disadvantages / decision                                                                    |
|-----------------------------------------------------------|---------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| Local types, zero-error checks and authored-input copying | Precise contracts, complete development output, visible regressions | More explicit metadata and build tooling; chosen                                            |
| Keep the ledger or disable strict options                 | Smallest immediate change                                           | Does not yield a clean library or reliable consumers; rejected                              |
| Add global augmentations / arbitrary symbol indexes       | Short patches                                                       | Widens unrelated platform/public objects and accepts invalid keys; rejected                 |
| Convert the authored `.d.ts` to runtime `.ts`             | tsc emits it automatically                                          | Changes its source role and requires separate decomposition/history consideration; deferred |
| Copy every input declaration                              | Easy traversal                                                      | Pulls dependencies and environment declarations into output; rejected                       |
| Recursively clean all output before verification          | Avoids stale files                                                  | Adds destructive operations and publication concerns to this change; deferred to stage 06   |

## Verification and limits

Node 26.8.1 / TypeScript 5.9.3: zero library/source/declaration diagnostics, 429 runtime tests passed, one original
skip, six original todo; CJS/ESM builds, built declarations and actual CJS smoke pass. Native and fallback GC pass.
No internal package or generated demo copy changed. The first signal-channel implementation remains active.
Toolchain pinning, clean installation CI, the ts-jest peer warning, real React/SSR and native ESM packaging remain open.

---

## [RU] Доказательства проблемы

### 🟠 Warning — Runtime-метаданные отсутствовали в строгих типах

**Файл:** `modules/events.ts`, строки 69 и 819 в коммите до изменения
`636ab4c22d98cd146723d1973a8e4ef7a29282a1`.

```typescript
export declare type Listener = (this: EventEmitterX | undefined, ...args: any[]) => Promise<any> | undefined | void;
// ...
handler[kOnceListenerWrappedHandler] === listener
```

Проверка библиотеки сообщала 36 диагностик о неописанных метаданных listener/error/host, кэшах возможностей EventTarget
и границе перегрузки нативного getEventListeners. Существующий runner контрактов разрешал записанную базу, поэтому
успешный запуск fixtures не означал чистой компиляции библиотеки.

**Рекомендация:** описать фактические метаданные локально, сохранить строгие настройки и требовать ноль диагностик.
Не добавлять произвольные Symbol index signatures публичным emitter и не расширять глобальные Node/DOM-типы.

### 🟠 Warning — В сгенерированных declarations отсутствовал авторский входной файл

**Файл:** `modules/EventEmitterEx/eventSignalReactIntegration.ts`, строка 2.

```typescript
import type { EventSignal_ReactCopy } from "./EventSignal_types";
```

Сгенерированный `.d.ts` этого модуля ссылается на авторский `EventSignal_types.d.ts`, но tsc не копирует этот
входной файл в выходной каталог. Потребитель с отключённым skipLibCheck сообщал об отсутствующем модуле.

**Рекомендация:** копировать авторские declarations библиотеки после успешного emit, затем проверять потребителей
полученного output вместо сокрытия отсутствующих declarations.

## [RU] Выбранный механизм

Метаданные listener — опциональное типизированное пересечение; обычные callbacks-функции остаются корректными.
Доступ к generic-хранилищу использует Listener вместо неописанного Function. Declare-only поля описывают prototype tags
без создания полей экземпляра. Флаги EventTarget — локальные опциональные пересечения входов приватных helpers;
расширения error и host используют локальные формы. Символ отклонений сохраняет стандартную идентичность unique symbol
и узкий опциональный hook. Introspection EventTarget с числами/символами сохраняет runtime-аргумент без нового преобразования.

Once-обёртки также предоставляют исходный callback через `.listener`, а eventNames перечисляет Reflect.ownKeys.
Это две намеренные коррекции поведения introspection, проверенные сравнением с нативным Node.

Устаревший реестр 36 ошибок удалён. Runner контрактов отклоняет любую диагностику исходников/потребителей, генерирует
с noEmitOnError и проверяет declarations EventSignal и EventEmitterX в CommonJS, NodeNext и Bundler без skipLibCheck.
Старое имя файла и команда `typecheck:signals` сохранены; `typecheck:contracts` является алиасом.

`build_library.cjs` проверяет конфигурацию и программу до emit. `copy_library_declarations.cjs` копирует только
авторские входные `.d.ts` из `modules/` и `utils/`, сохраняя относительные пути. Declarations зависимостей не копируются.
Механизм используется последовательными и параллельными сборками. Ошибки компилятора останавливают emit и
копирование; существующий output рекурсивно не удаляется. Чистая подготовка публикации остаётся работой этапа 06.

`pnpm verify` запускает отдельные дочерние процессы проверки библиотеки, контрактов, runtime-тестов, обеих сборок,
потребителей/выполнения output, GC и fallback с явным dispose. Команда прекращается на первом неуспешном шаге.
CJS smoke загружает настоящий `.js` output и проверяет once, записываемые reducers, зависимости и dispose. ESM
проверяется как разрабатываемый artifact и declarations; нативное выполнение ESM-пакета не заявляется.

## [RU] Альтернативы и компромиссы

| Выбор                                                              | Преимущества                                                   | Недостатки / решение                                                                   |
|--------------------------------------------------------------------|----------------------------------------------------------------|----------------------------------------------------------------------------------------|
| Локальные типы, проверки без ошибок и копирование авторских inputs | Точные контракты, полный development output, видимые регрессии | Больше явных метаданных и build tooling; выбрано                                       |
| Сохранить реестр или отключить strict                              | Минимальное немедленное изменение                              | Не даёт чистой библиотеки или надёжных потребителей; отклонено                         |
| Добавить глобальные расширения / произвольные Symbol indexes       | Короткие патчи                                                 | Расширяет посторонние platform/public objects и принимает неверные ключи; отклонено    |
| Превратить авторский `.d.ts` в runtime `.ts`                       | tsc генерирует его автоматически                               | Меняет роль исходника и требует отдельного рассмотрения декомпозиции/истории; отложено |
| Копировать все входные declarations                                | Простой обход                                                  | Переносит зависимости и окружение в output; отклонено                                  |
| Рекурсивно очищать output перед проверкой                          | Исключает устаревшие файлы                                     | Добавляет разрушительные операции и вопросы публикации; отложено до этапа 06           |

## [RU] Проверки и ограничения

Node 26.8.1 / TypeScript 5.9.3: ноль диагностик библиотеки/исходников/declarations, 429 runtime-тестов проходят,
один исходный skip, шесть исходных todo; CJS/ESM-сборки, их declarations и настоящий CJS smoke проходят. Нативный и
fallback GC проходят. Внутренние пакеты и сгенерированные demo-копии не менялись. Первый вариант каналов сигналов активен.
Фиксация toolchain, CI чистой установки, peer-предупреждение ts-jest, реальные React/SSR и нативный ESM-пакет остаются открытыми.
