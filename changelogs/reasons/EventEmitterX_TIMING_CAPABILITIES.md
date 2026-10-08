---
iso date: "2026-10-06T21:36:58.824Z"
timestamp: 1791322618824
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, types, tests, docs"
---

# Event awaiting: explicit timing capabilities and structural typing

## Problem evidence

### 🟠 Warning — DOM test timing assumed an unavailable User Timing backend

**File:** `spec/modules/events_spec.ts`, line 4007 in pre-change commit
`636ab4c22d98cd146723d1973a8e4ef7a29282a1`; repeated at 4040, 4361, 4377 and 4401.

```typescript
const st = new ServerTiming();
```

That file runs under jsdom. ServerTiming selected DOM performance, which lacked `mark`; the failure occurred at
`packages/ServerTiming/dist/cjs/TimeMark.cjs`, line 102: `performance.mark(this._startKey);`.
Twelve tests failed for this reason. Already scheduled immediate callbacks then emitted errors after setup failed,
producing the two subsequent EventTarget/iterator failures. There was no evidence that those two scenarios needed
a separate iterator behavior change.

**Recommendation:** inject a real capable performance backend through the existing `customPerformance` option,
keeping DOM performance unchanged. Re-run the complete suite to verify the deferred-error cascade disappears.

### 🟠 Warning — An optional provider leaked its concrete dependency into public declarations

**File:** `packages/ServerTiming/dist/esm/index.d.ts`, line 1.

```typescript
import { TimeMark } from "./TimeMark";
```

Without skipLibCheck, a NodeNext consumer followed the dependency's ESM declarations and reported TS2835.
The pre-change `modules/events.ts`, line 146, declared `timing?: ServerTiming;`, although waiting only consumes
three timing methods. Fixing the protected package is outside the current stage.

**Recommendation:** use a structural provider contract in the library; repair the dependency's package declarations
later in stage 05, rather than rewriting packages or hiding the error in consumer checks.

## Chosen mechanism and example

`IEventTiming` requires synchronous `time` and `timeEnd`; `timeClear` is optional. Names may be a single event name
or an array. Existing ServerTiming remains a valid structural input; no runtime adapter or new timing implementation
is introduced. The public type no longer imports that class. Optional-provider exceptions retain existing behavior.

```typescript
const timing: IEventTiming = { time(names) {}, timeEnd(names, omitNotExisted) {} };
const pending = EventEmitterX.once(emitter, 'data', { timing });
```

Tests that require User Timing construct `new ServerTiming({ customPerformance: nodePerformance })`.
An additional DOM test checks real event identity, a completed timing record and an unchanged global performance object.
Node differential tests run in a separate explicit Node environment. Iterator throw tests create errors in the
implementation's own realm: native Node checks its host Error, whereas transpiled library code executes in Jest's VM.
That test choice does not broaden either implementation's cross-realm throw contract.

## Alternatives and tradeoffs

| Choice                                               | Advantages                                                                                | Disadvantages / decision                                             |
|------------------------------------------------------|-------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| Explicit provider + minimal structural type          | Real timing, no global mutation, custom-provider support, independent public declarations | Provider must supply its own capabilities; chosen                    |
| Replace global DOM performance with Node performance | Small setup change                                                                        | Blends Node/DOM behavior and can affect fake clocks; rejected        |
| Mock mark/measure or disable failing tests           | Fast green result                                                                         | Does not verify timing; rejected                                     |
| Keep concrete ServerTiming type and skipLibCheck     | Smallest typing change                                                                    | Retains dependency coupling and hides declaration failures; rejected |
| Edit the dependency's ESM declarations now           | Repairs that dependency directly                                                          | Violates the deferred packages stage; deferred to stage 05           |

## Verification and limitations

Full Jest passes 429 tests, with the original one skip and six todo; all 14 previous failures are resolved.
Positive/negative strict fixtures verify the timing protocol, including a missing required method. Library and
CommonJS/NodeNext/Bundler declaration checks pass without allowed diagnostics or skipLibCheck.
No packages, DOM globals, timer implementation or signal-channel ownership changed. This does not validate every
browser/provider or make ServerTiming's own declarations NodeNext-ready when imported directly.

---

## [RU] Доказательства проблемы

### 🟠 Warning — Timing в DOM-тестах предполагал отсутствующий User Timing backend

**Файл:** `spec/modules/events_spec.ts`, строка 4007 в коммите до изменения
`636ab4c22d98cd146723d1973a8e4ef7a29282a1`; повторения в 4040, 4361, 4377 и 4401.

```typescript
const st = new ServerTiming();
```

Файл выполняется под jsdom. ServerTiming выбирал DOM performance без `mark`; падение происходило в
`packages/ServerTiming/dist/cjs/TimeMark.cjs`, строка 102: `performance.mark(this._startKey);`.
По этой причине падали двенадцать тестов. Уже запланированные immediate callbacks затем отправляли ошибки после
падения setup и создавали два последующих падения EventTarget/iterator. Доказательств необходимости отдельного
изменения поведения iterator для этих двух сценариев не было.

**Рекомендация:** передавать реальный полноценный backend performance через существующую опцию `customPerformance`,
сохраняя DOM performance. Проверить исчезновение каскада отложенных ошибок полным запуском тестов.

### 🟠 Warning — Опциональный provider раскрывал конкретную зависимость в публичных declarations

**Файл:** `packages/ServerTiming/dist/esm/index.d.ts`, строка 1.

```typescript
import { TimeMark } from "./TimeMark";
```

Без skipLibCheck потребитель NodeNext переходил к ESM-декларациям зависимости и получал TS2835.
До изменения `modules/events.ts`, строка 146, объявлял `timing?: ServerTiming;`, хотя ожидание использует только
три метода timing. Исправление защищённого пакета находится за пределами текущего этапа.

**Рекомендация:** использовать в библиотеке структурный контракт provider; исправить declarations пакета позже
на этапе 05 вместо изменения packages или сокрытия ошибки при проверке потребителей.

## [RU] Выбранный механизм и пример

`IEventTiming` требует синхронные `time` и `timeEnd`; `timeClear` опционален. Именем может быть отдельное имя события
или массив. Существующий ServerTiming остаётся корректным структурным вводом; runtime-адаптер или новая реализация
timing не добавляется. Публичный тип больше не импортирует этот класс. Исключения опционального provider обрабатываются по-прежнему.

```typescript
const timing: IEventTiming = { time(names) {}, timeEnd(names, omitNotExisted) {} };
const pending = EventEmitterX.once(emitter, 'data', { timing });
```

Тесты User Timing создают `new ServerTiming({ customPerformance: nodePerformance })`.
Дополнительный DOM-тест проверяет реальную идентичность события, завершённую запись timing и неизменность глобального
performance. Сравнительные Node-тесты выполняются в отдельном явном Node-окружении. Тесты throw iterator создают
ошибки в realm реализации: нативный Node проверяет свой host Error, а транспилированная библиотека работает в VM Jest.
Это решение тестов не расширяет межконтекстный контракт throw ни одной реализации.

## [RU] Альтернативы и компромиссы

| Выбор                                                   | Преимущества                                                                                   | Недостатки / решение                                             |
|---------------------------------------------------------|------------------------------------------------------------------------------------------------|------------------------------------------------------------------|
| Явный provider + минимальный структурный тип            | Реальный timing, нет глобальных изменений, поддержка своих providers, независимые declarations | Provider должен предоставлять свои возможности; выбрано          |
| Заменить глобальный DOM performance на Node performance | Небольшое изменение setup                                                                      | Смешивает Node/DOM и может влиять на fake clocks; отклонено      |
| Мокировать mark/measure или отключить падающие тесты    | Быстрый зелёный результат                                                                      | Не проверяет timing; отклонено                                   |
| Сохранить конкретный тип ServerTiming и skipLibCheck    | Минимальное изменение типов                                                                    | Сохраняет связанность и скрывает падения declarations; отклонено |
| Изменить ESM declarations зависимости сейчас            | Исправляет саму зависимость                                                                    | Нарушает отложенный этап packages; отложено до этапа 05          |

## [RU] Проверки и ограничения

Полный Jest проходит 429 тестов с исходным одним skip и шестью todo; все 14 прежних падений устранены.
Положительные/отрицательные строгие fixtures проверяют протокол timing, включая отсутствующий обязательный метод.
Проверки библиотеки и declarations в CommonJS/NodeNext/Bundler проходят без разрешённых диагностик или skipLibCheck.
Packages, DOM globals, реализация таймеров и владение каналами сигналов не изменялись. Это не проверяет все браузеры/
providers и не делает declarations ServerTiming готовыми для NodeNext при прямом импорте.
