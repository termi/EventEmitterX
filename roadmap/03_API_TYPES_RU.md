---
iso date: "2026-10-06T11:50:43.762Z"
timestamp: 1791287443762
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 03 — Публичные контракты и точные типы

Приоритет P0 для корректности публичных деклараций и заявлений совместимости, P1 для расширений удобства. Зависит от 01,
lifecycle проверяется вместе с 02.

## 03.1 — Следующий пункт: автоматический вывод типов сигнала

Приоритет P0 для корректности деклараций и P1 для удобства. Выполнить сразу после исправления записываемого
reducer, перед остальными задачами API/типов. Статус: частично проверено; общее исправление открыто.

### Проверенный простой случай

На TypeScript 5.9.3 существующий конструктор уже выводит все аргументы типов для:

```ts
const signal$ = new EventSignal('initial', async (_prev, source) => `async:${source}`, {
    initialSourceValue: 0,
});
// EventSignal<string, number, undefined, Promise<string>>
// signal$.get(): Promise<string>; reducer prev: string; source: number
```

Runtime-регрессия теперь использует эту форму без явных generics.
`spec/types/EventSignal_inference.ts` проверяет точные выведенные типы sync, async и writable-конструкторов,
а также отклонение неверных записей source и reducer. Проверка через compiler API со строгими опциями проекта
не находит диагностик в fixture; импортированные зависимости дают 43 диагностики в этой проверке.
Этот изолированный результат не заменяет существующую исходную картину строгой проверки библиотеки.

### 🟠 Предупреждение — вывод типов неодинаков для публичных форм

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 63, 256–258, 2598–2610 и 3204–3208.

**Проблема:** Класс задаёт R=T по умолчанию, callback конструктора использует ReturnTypeOrPromise<R>, а
перегрузка createSignal с computation фиксирует результат callback как T. Прямой вывод для конструктора
работает в простом примере выше, но фабрика отвергает Promise-результат. Обращение к self.data внутри
inline async callback конструктора также приводит к R=string и TS2769.
Числовое начальное значение со строковым результатом computation тоже даёт TS2769. Типы, напечатанные
для отклонённых вызовов, являются восстановительными типами компилятора, а не корректными контрактами вывода.

```ts
export class EventSignal<T, S=T, D=undefined, R=T> { /* ... */ }
// Существующий параметр computation фабрики:
computation: EventSignal.ComputationWithSource<T, S, D, T>

// Воспроизведение без явных аргументов типов:
EventSignal.createSignal('initial', async (_prev, source) => `value:${source}`,
    { initialSourceValue: 0 }); // TS2322: Promise<string> is not assignable to string
new EventSignal('initial', async (_prev, source, self) => `${source}:${self.data.step}`,
    { initialSourceValue: 0, data: { step: 1 } }); // TS2769
new EventSignal(0, (_prev, source) => `value:${source}`,
    { initialSourceValue: 0 }); // TS2769
```

**Рекомендация:** Исправить декларации конструктора и фабрики совместно после определения модели value/result.
Не расширять каждый callback до any, не скрывать ошибки casts и не менять глобально default R ради удобства.
Параметр self вводит рекурсивную зависимость вывода; проверить разделение источников inference и контекстного
типа self до выбора решения.

### Работа и критерии приёмки

- [ ] Раздельно определить начальное/сохранённое выходное значение, awaited output computation, source, data и
  исходный результат computation. Выбрать, отклонять ли разные initial/output понятной ошибкой или выражать union:
  первый prev может быть начальным значением, последующие prev — результатом computation.
- [ ] Построить compile-матрицу inline callback, именованных callback, Jest mocks и callback с self.data;
  отсутствие source и initialSourceValue, sync/async/hybrid, начальные Promise, literals, null и undefined.
  Сохранить undefined как отсутствие обновления. Проверить конструктор и createSignal одинаковыми примерами.
- [ ] Сначала проверить прототип inference на минимальных декларациях. Сравнить совместимую модель T/S/D/R с
  моделью output/source/data, выводящей результат из callback; выбрать наименее разрушительный корректный вариант.
  Сохранить существующие явные generics или описать миграцию. TypeScript не выводит сведения, отсутствующие в аргументах.
- [ ] Исправить связь callback/result фабрики и контекстный вывод self; затем проверить get/getLast/getSync/getSafe/
  getSyncSafe/tryGet, set/mutate, map, listeners и React-декларации по этой модели. Сохранить ленивость,
  накопление принятых записей, pending/error и расписание microtask.
- [ ] Добавить отдельную команду строгой проверки compile fixtures с положительными exact-type assertions и
  отрицательными проверками; relaxed ts-jest не доказывает корректность. Существующие диагностики импортов должны
  оставаться видимыми и учитываться. Проверить emitted declarations и поддерживаемые версии TS при завершении этапа.
- [ ] Документировать типичные вызовы без generics, случаи с необходимыми аннотациями и примеры миграции при
  breaking changes. Результаты конструктора и фабрики должны совпадать; исключить случайные any/unknown и
  незаметно синхронный тип get у async computation.

Оценка: автоматический вывод возможен и уже работает для проверенного простого случая. Универсальная поддержка
требует согласованной работы над публичными типами; эксперименты не доказывают общую невозможность в TypeScript.
Официальные сведения: [вывод типов generic-классов](https://www.typescriptlang.org/docs/handbook/2/classes.html#generic-classes)
и [generic defaults](https://www.typescriptlang.org/docs/handbook/2/generics.html#generic-parameter-defaults).

## 03.2 — Последовательные computed-reducer и ожидание async output

Приоритет P0 для зафиксированного целевого поведения. Реализовать после определения source/output/result в 03.1.
Владелец подтвердил: ранее закомментированные последовательности reducer являются требованиями, а арифметические
сокращения были временными обходными вариантами. Не заменять эти последовательности обновлением только source ради прохождения теста.

### 🟠 Предупреждение — последовательность computed всё ещё теряет обновления

**Файл:** `spec/modules/EventEmitterEx/EventSignal_spec.ts`, строки 3040–3048;
`modules/EventEmitterEx/EventSignal.ts`, строки 1417–1428.

**Проблема:** Накопление обычных записываемых сигналов исправлено, включая clock и emitter throttle.
Computed-reducer по-прежнему читает последний output без применения ожидающего computation между записями.
Trigger-тест начинает с output 1; требуемая последовательность даёт 2 вместо 4:

```ts
counterValue$.set(v => ++v);
counterValue$.set(v => ++v);
counterValue$.set(v => ++v);
expect(counterValue$.get()).toBe(4); // Фактически: 2
```

**Рекомендация:** Сохранить именно эту последовательность как критерий приёмки. Существующий trigger-тест явно
пропущен до реализации; временный вариант +3 удалён. Включить весь тест после достижения целевого поведения.
Последовательность emitter-throttle теперь выполняет два настоящих reducer и проходит.

### Проектирование и критерии приёмки

- [ ] Определить, как каждый computed-reducer получает output предыдущего принятого обновления, сохраняя
  различие source и output. Включить computation с преобразованием source, а не только счётчики, близкие к identity.
- [ ] Сравнить синхронное промежуточное computation, упорядоченную очередь reducer и отдельный внутренний
  рабочий output. Определить computationsCount, инвалидацию зависимостей, ошибки и побочные эффекты для вариантов.
  Сохранить ленивость обычных записей source и чтения derived; явно описать необходимое исключение для
  последовательных computed-reducer вместо незаметного принудительного get().
- [ ] Определить влияние throttle и trigger на промежуточный output: порядок reducer не должен случайно
  выпускать публичный output или уведомления до разрешённого триггера. Включить изменения source от событий
  и триггеров между вызовами reducer.
- [ ] Отдельно определить async-ожидание: ожидает ли reducer pending output и что возвращает set?
  Проверить начальный pending Promise, выполняющееся async computation, rejection, устаревшие завершения,
  чередование записей и reducer и уничтожение/abort во время очереди. Решить, поддерживаются ли setter с
  результатом Promise, отклоняются ли они или требуют отдельного API.
- [ ] Ограничить владение очередью и определить отмену/очистку, чтобы оставленные reducer не удерживали сигналы.
  Сохранить чтение setter без регистрации зависимости: запись другого сигнала внутри computation не подписывает на него.
- [ ] Добавить exact-type и runtime-проверки sync/async/hybrid source/output, последовательных результатов,
  throttling, объединения уведомлений и ошибок. Восстановить пропущенный clock-trigger тест без обходного варианта.

Старый тег SET_WITH_SETTER__QUEUES объединял исправленное writable-накопление, набросок принудительного пересчёта
_innerGet и нереализованную Promise-очередь. Неактивные наброски удалены; комментарии исходника ссылаются сюда.
Эта очистка не добавляет очередь или принудительное computation.

## EventSignal

- [ ] Составить таблицу ролей T (значение), S (источник), D (data), R (результат computation/get) по runtime, затем
  согласовать единую модель sync/async/hybrid.
- [ ] Закончить все overloads createSignal и конструктора; проверить inference
  initialValue/computation/options/source/data, literals, unions, undefined, Promise. Сохранить используемую форму
  createSignal(value).
- [ ] Для get/getSync/getSafe/getSyncSafe/getLast/tryGet документировать pending, error, last value и exact return type;
  убрать необоснованные casts и unused ts-expect-error.
- [ ] Ограничить mutate согласно выбранной семантике источника: неизвестные ключи и неверные значения должны
  отклоняться. Scalars — отдельная проверенная форма. Generic default не заменяет ограничение типа.
- [ ] Зафиксировать map как однонаправленную computed projection в первом релизе. Сделать права записи явными в типах;
  двустороннее преобразование проектировать отдельным API позднее, не добавлять его неявно из TODO.
- [ ] Определить сохраняются ли data/React metadata у map, тип источника результата и lifetime derived. Проверить DTO
  проекцию над числовой ревизией.
- [ ] Зафиксировать undefined из computation как «нет обновления»; описать способ хранить/получать undefined как
  значение, не менять семантику молча.
- [ ] Описать lazy без подписчиков, активный microtask recalc, coalescing синхронных set и ошибки; проверить что forced
  get не требуется для доставки активному подписчику.
- [ ] Проверить dynamic deps, циклы и чтения до/после await; async dependency tracking не обещать шире реализованного.
- [ ] Добавить положительные и отрицательные compile fixtures на итоговых декларациях, а не только исходниках. Проверять
  NodeNext и Bundler resolution; поддерживаемый диапазон TS выбрать по тестам.

## EventEmitterX и алиас EventEmitter

Эталон — `node:events` (имя `node:event` из обсуждения уточняется до реального built-in). Алиас экспортирует тот же
конструктор, не wrapper и не другую реализацию.

- [ ] Differential suite сравнивает default configuration с нативным EventEmitter: порядок, sync emit, this, повторные
  listeners, once wrappers/rawListeners, prepend, removeListener/removeAllListeners, listeners/eventNames/listenerCount,
  новые/удалённые слушатели во время emit, newListener/removeListener, error/errorMonitor, captureRejections,
  maxListeners.
- [ ] Исправить Symbol в eventNames; numeric extensions проверять как явное расширение, не как поведение Node по
  умолчанию.
- [ ] Для static once/on/addAbortListener/getEventListeners и options составить отдельную матрицу: реализовано,
  расширено, отличается, отсутствует. Не обещать весь модуль node:events на основании совместимого класса.
- [ ] Проверить типы event maps, tuples/readonly tuples, symbol keys, this, перегрузки и structural compatibility с Node
  EventEmitter.
- [ ] Сравнить AbortSignal/stopImmediatePropagation, cleanup once при success/error/abort/timeout, и EventTarget
  semantics отдельно от Node.

Официальный эталон: [Node events](https://nodejs.org/api/events.html). Версии Node матрицы выбрать и записать явно.
«Полная совместимость» в README заменить точным результатом матрицы при реализации этого этапа; аудит пока README не
менял.

## Завершение

Каждая публичная форма имеет точный runtime/type пример, отрицательные type checks, документированный cleanup и
async-контракт. Потребителю Junct не нужен урезанный интерфейс, wrapper StateSignal или принудительное чтение после set.
Breaking changes получают миграционные примеры.
