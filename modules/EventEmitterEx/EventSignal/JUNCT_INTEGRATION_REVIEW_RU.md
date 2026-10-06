---
iso date: 2026-10-05T20:36:24.321Z
timestamp: 1791232584321
ai_model: GPT6
git user: '"Egor Khalimonenko" <egor@callforce.pro>'
area: api, types, deps, tests, scripts
---

# Потребности интеграции библиотеки Junction и план аудита EventSignal

Это исходные данные для отдельной сессии аудита/публикации владельца, а не завершённый аудит или разрешение публиковать.
Локальная реализация находится в `modules/EventEmitterEx/EventSignal.ts`; соседняя директория `EventSignal/` содержит
этот рабочий документ. Библиотека Junction сейчас сохраняет коммит `f3bb99e2b4c34152de74dc5b04885122e3880fde`. Перед
выбором релиза отдельно проверьте локальное рабочее дерево.

## Исправление потребителя, а не изменение сигнала

DRAFT-коммит репозитория `junct.io` (библиотеки Junction) `c6ed061` скрывал нативные методы за `StateSignal`, создавал
сигналы внутри TextView и принудительно вызывал `get()` после `set()`. Это были решения дизайна потребителя, а не
необходимые изменения upstream. Исправленная интеграция должна предоставлять нативные `createSignal`, `subscribe`,
`addListener`, `mutate`, `map` и destructor, а сигналы должны принадлежать Dataset/Model. Потребители React и терминала
должны использовать общие экземпляры. Не добавляйте принудительное чтение ради уведомления: нативные подписки уже
активируют вычисление; вычисляемые проекции без подписчиков остаются ленивыми.

## 🟠 Предупреждение — Опубликовать пригодный пакет и независимые зависимости

**Файлы:** `package.json`, строки 8–15 и 20–29; `packages/abortable/package.json`, `packages/runEnv/package.json`, `packages/type_guards/package.json` (перед релизом проверить объявленные точки входа).

```json
"main": "index.ts",
"postinstall": "node _dev/postinstall/index.cjs",
"test": "echo \"Error: no test specified\" && exit 1"
```

```json
"termi@abortable": "link:./packages/abortable",
"termi@runEnv": "link:./packages/runEnv",
"termi@type_guards": "link:./packages/type_guards"
```

**Проблема:** Junction не мог использовать сохранённую ревизию как независимо установленную JS/типизированную
npm-зависимость: соседние пакеты зависимостей содержали manifest со ссылками на отсутствующий dist. Временная частная
сборка перенаправляет импорты в `cftools/common/runEnv`, `cftools/type_guards/symbols`, `cftools/common/AbortController`
и используемый только для типов `cftools/modules/ServerTiming`. Это временная локальная зависимость, а не контракт
npm-релиза.

**Рекомендация:** P0 до публикации: вместе с владельцем опубликовать независимые зависимости, определить CJS/ESM/types
exports и files, проверить `npm pack` в чистом потребителе без links, изменения исходников postinstall или соседнего
cftools. Включить Node и Bun; browser/React exports не должны подтягивать серверные runtime-зависимости. Проверять
настоящий tarball, а не только checkout.

## 🟡 Предложение — Сделать отмену подписки явно идемпотентной

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 1921–1930.

```typescript
let closed = false;
const unsubscribe = () => {
    closed = true;
    this._removeListener(ignoredEventName, listener, true);
    listener = void 0;
};
```

**Проблема:** Подписка фиксирует закрытие, но повторная отмена всё ещё входит в `_removeListener` после очистки ссылки
на listener. Это предложение улучшить cleanup, а не причина оборачивать каждую подписку в Junction.

**Рекомендация:** P1: немедленно возвращаться, если подписка уже закрыта. Проверить повторный unsubscribe, unsubscribe
после suspend, resume после закрытия, уничтожение с последующим cleanup и пути исключений. Сохранить нативную функцию,
возвращаемую `subscribe`; потребителям не должен требоваться второй active-флаг.

## 🔵 Информация — Сохранить нативную ленивость и расписание подписок

**Файлы:** `modules/EventEmitterEx/EventSignal.ts`, строки 1628–1644, 1680–1692 и 2412–2418.

```typescript
this._recalcPromise = Promise.resolve()
    .then(async () => {
        // Native subscriber-triggered recalculation in a microtask.
    });
```

```typescript
subscribe = (func: () => void) => {
    return this._addListener(func, void 0, 1 << 3).unsubscribe;
};
```

**Проблема:** Потребителям нужно документированное различие между ленивостью без наблюдателей и активными подписками.
Сохранённая реализация планирует пересчёт с подписчиками в микрозадаче; несколько синхронных записей могут объединяться.
Она не обещает синхронный callback для каждого промежуточного присваивания. Junction не должен трактовать это как
необходимость вызывать `get()` после каждой записи.

**Рекомендация:** P1: определить и проверить read-after-set, активацию подписок, объединение в микрозадачах, порядок
listener, вычисляемые зависимости и unsubscribe-before-delivery. Явно решить, нужен ли опциональный синхронный
режим/режим каждого присваивания; сохранить прежний default, пока владелец не выберет новый контракт. Для поддержки
Junction само по себе изменение расписания не требуется.

## 🟡 Предложение — Проверить полный типизированный API фабрики/проекций

**Файлы:** `modules/EventEmitterEx/EventSignal.ts`, строки 1468–1500, 2537–2547 и 2619–2631.

```typescript
mutate<PROPS=Partial<Awaited<S>>>(props: PROPS)
map<CR>(computation: (currentSourceValue: T) => CR)
static createSignal<T>(initialValue: T): EventSignal<T, T>;
```

**Проблема:** Неограниченный generic `mutate` может выводить произвольные ключи вместо проверки типов полей исходного
объекта. `map` сохраняет исходный тип источника S, поэтому DTO-проекция над сигналом ревизии имеет числовой источник
setter, хотя get возвращает DTO. Реализации фабрики/проекций внутри подавляют ошибки перегрузок. Junction теперь
выпускает полные upstream-декларации вместо придумывания сокращённого интерфейса; эти нативные контракты типов требуют
отдельных проверок.

**Рекомендация:** P1: компилировать положительные/отрицательные примеры мутации объектов, неизвестных ключей, неверных
значений полей, скалярных сигналов, различий source/output проекций, sync/async get и перегрузок createSignal. При
необходимости предпочесть ограниченные перегрузки мутации и именованные sync/async-контракты сигналов. Не менять static
createSignal просто ради дублирования его формы с одним аргументом: она уже подходит для изменяемого состояния. До
реализации согласовать с владельцем семантику записи в производные сигналы.

## Проверка и критерии релиза

- Добавить настоящий корневой test-скрипт и запустить существующий `spec/modules/EventEmitterEx/EventSignal_spec.ts`;
  изучать падения, а не подтверждать весь проект небольшим интеграционным набором Junction.
- Генерировать декларации с библиотечным окружением, содержащим WeakRef (ES2021); иначе declaration emit сохранённых
  исходников сообщал TS4033 в строке 3269. Явно сохранять выбранный JS runtime target и останавливать сборку при
  диагностике declaration emit.
- Проверить lifecycle/cleanup ресурсов, идентичность React useSyncExternalStore/getSnapshotVersion, pending/errors,
  частичную мутацию объектов и ленивые производные значения.
- Публиковать только после завершения аудита владельцем и явного выбора релиза. Этот документ не меняет исходный код или
  версию пакета.

## 🟠 Предупреждение — Reducer изменяемого сигнала может терять инкременты без наблюдателей через первый аргумент

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 1424–1453.

```typescript
const currentValue = this._innerGet();
const { _sourceValue } = this;
const currentSourceValue = (_sourceValue !== void 0 ? _sourceValue : currentValue) as S;
const _newSourceValue = (newSourceValue as ((prev: T, sourceValue: S, data: D) => S))(currentValue as T, currentSourceValue, this.data);
```

**Проблема:** В выбранной реализации последовательные обновления изменяемого числового сигнала без наблюдателей передают прежнее вычисленное значение как `prev`, хотя источник уже содержит более новые ожидающие значения. Поэтому предложенный владельцем пример reducer теряет инкременты:

```typescript
const changes = EventSignal.createSignal(0);
changes.set(prev => ++prev);
changes.set(prev => ++prev);
changes.set(prev => ++prev);
changes.get(); // Observed result: 1; a revision reducer needs 3.
```

**Рекомендация:** P0 для проверки reducer-контракта: решить, должен ли изменяемый сигнал без computation передавать актуальный источник как `prev`, сохраняя различие previous-computed/source для вычисляемых сигналов. Добавить тесты повторных reducer без чтений/подписчиков, подписанных/объединяемых обновлений, чередования literal setters и async/computed источников. Junction временно использует второй нативный аргумент, `changes.set((_prev, sourceValue) => ++sourceValue)`, сохраняющий все три инкремента без принудительного чтения и upstream-патча. Не менять незаметно reducer-семантику вычисляемых сигналов без рассмотрения владельцем.
