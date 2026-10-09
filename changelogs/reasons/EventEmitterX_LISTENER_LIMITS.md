---
iso date: "2026-10-09T12:36:23.600Z"
timestamp: 1791549383600
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, types, tests, docs"
---

# Listener limits and warning lifetime

## Problem and evidence

Evidence below refers to baseline `717651584f559b29b7dbcd573e42261cabe87f96`; line numbers are from that committed source before this change.

### 🟠 Warning — Wrong warning threshold and unlimited semantics

**File:** `modules/EventEmitterEx/EventEmitterX.ts`, lines 937–942.

```ts
if (_maxListeners !== Number.POSITIVE_INFINITY && _maxListeners <= newLen) {
    console.warn(`Maximum event listeners for "${String(event)}" event!`);
}
```

A limit of two warns on the second callback, then every addition; zero also warns instead of disabling warnings.
**Recommendation:** Warn only above a positive limit, once per surviving listener group, with structured metadata.

### 🟠 Warning — Invalid limits are accepted

**File:** `modules/EventEmitterEx/EventEmitterX.ts`, lines 1268–1272; constructor assignment at 447–449.

```ts
setMaxListeners(n: number): this {
    this._maxListeners = n;
    return this;
}
```

Negative, NaN and runtime non-number values silently alter warning behavior.
**Recommendation:** Validate both paths before mutation; preserve the previous limit on failure.

## Chosen mechanism and examples

`_checkMaxListeners` validates constructor and setter without calling an overridable method during construction.
Non-number inputs throw a TypeError with `ERR_INVALID_ARG_TYPE`; negative/NaN numbers throw a RangeError with
`ERR_OUT_OF_RANGE`. Zero and Infinity disable warnings; positive fractional limits remain accepted like Node.
The default stays Infinity, an explicit existing library difference from Node's default ten.

The internal listener array owns optional `warned: true`, populated only on a warning. Prepend/removal copies
preserve it while at least two callbacks remain. Removing the group or collapsing it to a single function drops
that array's lifetime; a subsequently grown array can warn again. Changing a limit does not retrospectively warn
or reset an existing warned array. No per-emitter warning Set or additional global registry is introduced.

With limit two, additions one/two are silent; addition three warns with `count: 3`; additions four/five stay silent.
After `removeAllListeners('data')`, adding three new callbacks warns again. Listeners remain accepted: this is a
leak diagnostic, not a hard cap. Node uses `process.emitWarning(Error)`; browser fallback uses `console.warn(Error)`.
Both objects carry `name`, `emitter`, `type` and `count`. Message/stack text is not claimed byte-identical to Node.

## Alternatives and tradeoffs

| Choice | Benefits | Costs / decision |
|---|---|---|
| Array warning metadata | Same lifetime as Node; no owner registry | Must carry it through local copies; chosen |
| Per-emitter warned-event Set | Easy event lookup | Extra ownership/state and explicit reset rules; rejected |
| Switch default to ten | Matches Node default | Adds warnings to existing signals/proxy owners; deferred pending an explicit default-policy decision |
| Continue console strings everywhere | Minimal migration | No standard Node warning channel or metadata; rejected |
| Call public setter in constructor | Shares validation | Invokes subclass override before its fields initialize; rejected |

Migration: invalid configurations now throw; configured limits warn at `n + 1`, and zero no longer warns.
Node consumers can observe `process.on('warning')`; browser consumers receive an Error instead of a console string.

## Verification and limits

Node differential tests compare string/empty/symbol groups, zero/Infinity/fractional limits, prepend, removal,
collapse/recreation, once, limit changes and invalid values. DOM tests check fallback metadata, defaults and safe
subclass construction. Warning spies intercept the actual channel for each runtime, and restore it through disposal.
Full verification: 519 pass, one existing skip, zero failures/todo; strict source/declarations, builds and GC pass.
Only installed Node 26.8.1/TypeScript 5.9.3 are verified; global defaultMaxListeners/static setMaxListeners remain absent.
Reference: [Node events](https://nodejs.org/api/events.html#emittersetmaxlistenersn).

---

## [RU] Проблема и доказательства

Доказательства ниже относятся к базовому коммиту `717651584f559b29b7dbcd573e42261cabe87f96`; номера строк взяты из закоммиченных исходников до изменения.

### 🟠 Предупреждение — Неверный порог и семантика отключения лимита

**Файл:** `modules/EventEmitterEx/EventEmitterX.ts`, строки 937–942.

```ts
if (_maxListeners !== Number.POSITIVE_INFINITY && _maxListeners <= newLen) {
    console.warn(`Maximum event listeners for "${String(event)}" event!`);
}
```

Лимит два вызывает предупреждение на втором callback и при каждом добавлении; ноль также предупреждает вместо отключения.
**Рекомендация:** Предупреждать только сверх положительного лимита, один раз на живую группу, со структурированными метаданными.

### 🟠 Предупреждение — Некорректные лимиты принимаются

**Файл:** `modules/EventEmitterEx/EventEmitterX.ts`, строки 1268–1272; присваивание в конструкторе 447–449.

```ts
setMaxListeners(n: number): this {
    this._maxListeners = n;
    return this;
}
```

Отрицательные, NaN и runtime-значения другого типа молча меняют поведение предупреждений.
**Рекомендация:** Валидировать оба пути до изменения; сохранять прежний лимит при ошибке.

## [RU] Выбранный механизм и примеры

`_checkMaxListeners` валидирует конструктор и setter без вызова переопределяемого метода при создании.
Значения другого типа вызывают TypeError с `ERR_INVALID_ARG_TYPE`; отрицательные/NaN числа — RangeError с
`ERR_OUT_OF_RANGE`. Ноль и Infinity отключают предупреждения; положительные дробные лимиты принимаются как в Node.
Значение по умолчанию остаётся Infinity — явное прежнее отличие библиотеки от Node с его десятью.

Внутренний массив слушателей хранит необязательное `warned: true`, создаваемое только при предупреждении.
Копии при prepend/removal сохраняют его, пока остаётся минимум два callback. Удаление группы или сокращение
до одной функции завершает жизнь массива; последующее увеличение нового массива может предупредить снова.
Изменение лимита не предупреждает задним числом и не сбрасывает уже предупреждавший массив.
Новый Set на каждый emitter или глобальный реестр не создаётся.

При лимите два первые два добавления молчат; третье предупреждает с `count: 3`; четвёртое/пятое молчат.
После `removeAllListeners('data')` три новых callback снова вызывают предупреждение. Слушатели принимаются:
это диагностика утечки, а не жёсткий предел. Node использует `process.emitWarning(Error)`, браузер — `console.warn(Error)`.
Оба объекта содержат `name`, `emitter`, `type`, `count`. Побайтовое совпадение message/stack с Node не обещается.

## [RU] Альтернативы и компромиссы

| Вариант | Преимущества | Цена / решение |
|---|---|---|
| Метаданные предупреждения на массиве | Жизненный цикл как в Node; нет реестра владельца | Нужно переносить через локальные копии; выбрано |
| Set предупреждённых событий на emitter | Простой поиск события | Дополнительное владение/состояние и правила сброса; отклонено |
| Сменить default на десять | Default как в Node | Новые предупреждения для существующих сигналов/proxy; отложено до явного решения о default |
| Сохранить console-строки везде | Минимальная миграция | Нет стандартного warning-канала Node и метаданных; отклонено |
| Вызывать публичный setter из конструктора | Общая валидация | Вызов override подкласса до инициализации полей; отклонено |

Миграция: некорректная конфигурация теперь бросает ошибку; заданный лимит предупреждает на `n + 1`, ноль больше не предупреждает.
Node-потребители могут наблюдать `process.on('warning')`; браузер получает Error вместо console-строки.

## [RU] Проверка и ограничения

Дифференциальные Node-тесты сравнивают string/empty/symbol-группы, zero/Infinity/дробные лимиты, prepend, removal,
сокращение/пересоздание, once, смену лимита и некорректные значения. DOM-тесты проверяют fallback-метаданные,
default и безопасное создание подкласса. Spies перехватывают реальный канал каждой среды и восстанавливают его через disposal.
Полная проверка: 519 pass, один прежний skip, ноль ошибок/todo; строгие исходники/declarations, сборки и GC проходят.
Проверены только установленные Node 26.8.1/TypeScript 5.9.3; глобальный defaultMaxListeners/static setMaxListeners отсутствуют.
Источник: [Node events](https://nodejs.org/api/events.html#emittersetmaxlistenersn).
