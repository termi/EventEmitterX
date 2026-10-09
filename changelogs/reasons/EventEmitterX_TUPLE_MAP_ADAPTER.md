---
iso date: "2026-10-09T12:36:23.600Z"
timestamp: 1791549383600
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, types, tests, docs"
---

# Tuple payload maps without generic normalization regressions

## Problem and evidence

Evidence below refers to baseline `717651584f559b29b7dbcd573e42261cabe87f96`; line numbers are from that committed source before this change.

### 🟠 Warning — Interface emit bypasses payload types

**File:** `modules/EventEmitterEx/EventEmitterX.ts`, line 344.

```ts
emit<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: any[] | Parameters<EMD<EventMap>[EventKey]>): boolean;
```

An IEventEmitter view accepts wrong typed payloads through any[].
**Recommendation:** Use the event's Parameters tuple only; untyped default maps already retain any payloads.

### 🟡 Suggestion — Node-style tuple maps have no supported adapter

**File:** `modules/EventEmitterEx/EventEmitterX.ts`, line 408.

```ts
export class EventEmitterX<EventMap extends DefaultEventMap = DefaultEventMap>
```

The generic expects function-valued maps, so readonly tuple inputs cannot be supplied directly.
**Recommendation:** Add an explicit type-only conversion while preserving existing generic positions and callbacks.

## Chosen API and example

Export EventMapFromTuples through the implementation and legacy barrel. Map each mutable/readonly payload tuple to
a callback with mutable rest arguments, existing listener metadata and the existing emitter this context. Preserve
labels, optional elements, rest tails, empty events and symbol keys. There is no runtime adapter or allocation.

```ts
import { EventEmitterX, type EventMapFromTuples } from './modules/events';
type Events = EventMapFromTuples<{
    data: readonly [value: number, label?: string];
    totals: [prefix: string, ...values: number[]];
}>;
const emitter = new EventEmitterX<Events>();
emitter.on('data', (value, label) => { value.toFixed(); label?.toUpperCase(); });
emitter.emit('data', 1); // valid
emitter.emit('totals', 'sum', 1, 2); // valid
// emitter.emit('data', false); // compile error
```

Both proxy classes and IEventEmitter accept the converted map. Function-based maps remain unchanged.
Strict interface emit can reject previously accepted invalid payloads; correct callers need no migration.

## Alternatives and tradeoffs

| Approach | Benefits | Costs / decision |
|---|---|---|
| Explicit EventMapFromTuples | Small erased API; retains legacy generics and strict payloads | Extra type wrapper; chosen |
| Normalize functions/tuples inside every class generic | Direct Node-style maps | Trial signatures break proxy overrides and nested EMD/once normalization; needs a separately designed migration |
| Broaden payloads to any[] | Easy compilation | Discards negative guarantees; rejected |
| Replace function maps with tuples | Uniform new API | Breaks existing consumers and function metadata; rejected |

Do not present this adapter as direct constructor support for raw tuples. Direct heterogeneous map normalization
and more precise static once/on results remain separate API work. No new runtime export is introduced.

## Verification and limits

Strict positive/negative fixtures cover optional/rest/empty/symbol payloads, both proxies, this, typed callback counts,
closed keys, invalid tuple-map entries and function-map interface emit. Source and emitted declarations pass with
zero diagnostics under CommonJS, NodeNext and Bundler, skipLibCheck false. All 24 runtime import orders still expose
the unchanged runtime key set. Full verification: 519 pass, one existing skip; TypeScript 5.9.3 only.
Readonly describes the declaration tuple, not runtime freezing of emitted objects or listeners' payload arrays.

---

## [RU] Проблема и доказательства

Доказательства ниже относятся к базовому коммиту `717651584f559b29b7dbcd573e42261cabe87f96`; номера строк взяты из закоммиченных исходников до изменения.

### 🟠 Предупреждение — Interface emit обходит типы аргументов

**Файл:** `modules/EventEmitterEx/EventEmitterX.ts`, строка 344.

```ts
emit<EventKey extends keyof EMD<EventMap>>(event: EventKey, ...args: any[] | Parameters<EMD<EventMap>[EventKey]>): boolean;
```

Представление IEventEmitter принимает неверные типизированные payload через any[].
**Рекомендация:** Использовать только Parameters события; нетипизированные default-карты уже допускают любые payload.

### 🟡 Предложение — Для Node-style tuple-карт нет поддерживаемого адаптера

**Файл:** `modules/EventEmitterEx/EventEmitterX.ts`, строка 408.

```ts
export class EventEmitterX<EventMap extends DefaultEventMap = DefaultEventMap>
```

Generic ожидает функции, поэтому readonly tuple-карту нельзя передать напрямую.
**Рекомендация:** Добавить явное преобразование только типов с сохранением прежних generic-позиций и callbacks.

## [RU] Выбранный API и пример

EventMapFromTuples экспортируется из реализации и legacy-barrel. Каждый mutable/readonly payload tuple превращается
в callback с изменяемыми rest-аргументами, прежними метаданными слушателя и прежним emitter-контекстом this.
Сохраняются labels, optional-элементы, rest-хвосты, пустые события и symbol-ключи. Runtime-адаптера и аллокаций нет.

```ts
import { EventEmitterX, type EventMapFromTuples } from './modules/events';
type Events = EventMapFromTuples<{
    data: readonly [value: number, label?: string];
    totals: [prefix: string, ...values: number[]];
}>;
const emitter = new EventEmitterX<Events>();
emitter.on('data', (value, label) => { value.toFixed(); label?.toUpperCase(); });
emitter.emit('data', 1); // valid
emitter.emit('totals', 'sum', 1, 2); // valid
// emitter.emit('data', false); // compile error
```

Оба proxy-класса и IEventEmitter принимают преобразованную карту. Функциональные карты не изменены.
Строгий interface emit может отклонить прежние некорректные payload; правильным вызовам миграция не нужна.

## [RU] Альтернативы и компромиссы

| Подход | Преимущества | Цена / решение |
|---|---|---|
| Явный EventMapFromTuples | Небольшой стираемый API; прежние generics и строгие payload | Дополнительная type-обёртка; выбрано |
| Нормализовать функции/tuples внутри generic каждого класса | Прямые Node-style карты | Пробные сигнатуры ломают proxy overrides и вложенную EMD/once-нормализацию; нужна отдельная миграция |
| Расширить payload до any[] | Простая компиляция | Теряются отрицательные гарантии; отклонено |
| Заменить функциональные карты tuples | Единый новый API | Ломает прежних потребителей и метаданные функций; отклонено |

Не представлять адаптер как прямую поддержку сырых tuples конструктором. Прямая нормализация смешанных карт
и более точные результаты static once/on остаются отдельной API-задачей. Нового runtime-экспорта нет.

## [RU] Проверка и ограничения

Строгие positive/negative fixtures покрывают optional/rest/empty/symbol payload, оба proxy, this, типизированный
подсчёт callback, закрытые ключи, некорректные элементы tuple-карт и interface emit функциональных карт.
Исходники и declarations проходят без диагностик в CommonJS, NodeNext, Bundler с skipLibCheck false.
Все 24 порядка runtime-импорта по-прежнему содержат прежний набор ключей. Полная проверка: 519 pass, один прежний skip;
только TypeScript 5.9.3. Readonly описывает tuple в декларации, а не runtime-заморозку объектов или массивов payload.
