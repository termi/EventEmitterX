# EventSignal — Справочник API

> **EventSignal** — это не просто ещё одна реактивная примитива. Это полноценная, проверенная в бою система сигналов, созданная чтобы связать событийный код и современные React-интерфейсы — без лишнего кода и с автоматическим отслеживанием зависимостей.

---

## Почему EventSignal?

Большинство библиотек сигналов создаются в изоляции — они работают в собственной экосистеме и требуют адаптации для работы с существующей событийной инфраструктурой. EventSignal устроен иначе:

- Он нативно интегрируется с **любым `EventEmitter` или `EventTarget`** как реактивным источником данных
- Он рендерится **напрямую в JSX** без компонентов-обёрток и адаптеров
- Он отслеживает зависимости **автоматически** — никаких ручных подписок, никакого boilerplate с селекторами
- Он обрабатывает как **синхронные, так и асинхронные** вычисления со встроенным статусом `pending` / `error`
- Он поставляется с **React-хуками** (`use()`, `useListener()`) и полноценной **системой типов компонентов**
- Он управляет собственным **жизненным циклом** — деструкторы, `Symbol.dispose`, AbortSignal

### Обзор возможностей

| Возможность                      | Описание                                                                                        |
|----------------------------------|-------------------------------------------------------------------------------------------------|
| ⚡ **Авто-отслеживание**          | Зависимости отслеживаются автоматически при вызовах `.get()` внутри вычисления                  |
| ⚛️ **React-native**              | Хук `use()`, прямой рендеринг в JSX, полиморфная система компонентов — без адаптеров            |
| 🔀 **Async из коробки**          | Асинхронные вычисления первого класса со статусом `status`, `lastError` и дедупликацией         |
| 📡 **Мост к событиям**           | Подписка на любой `EventEmitter` / `EventTarget` через `sourceEmitter`                          |
| ⏰ **Триггеры**                   | Перевычисление по таймеру, эмиттеру или другому сигналу с поддержкой throttle                   |
| 🔗 **Производные сигналы**       | `map()`, `createMethod()`, цепочки computed — составляйте сложное состояние из простых частей   |
| 🔮 **Promise и async**           | `toPromise()`, асинхронная итерация `for await...of`                                            |
| 🏷️ **TypeScript-native**        | Полные дженерики: `EventSignal<T, S, D, R>` — типизированы значение, источник, данные и возврат |
| ♻️ **Безопасный жизненный цикл** | `destructor()`, `Symbol.dispose`, `finaleValue` — никаких утечек памяти                         |

### Быстрый старт

```typescript
import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

// Простое хранилище
const count$ = new EventSignal(0);

// Computed — автоматически отслеживает count$, перевычисляется при изменении
const doubled$ = new EventSignal(0, () => count$.get() * 2);

count$.set(5);
console.log(doubled$.get()); // 10

// Асинхронный computed со встроенным отслеживанием статуса
const user$ = new EventSignal(null, async (prev, userId) => {
  const res = await fetch(`/api/users/${userId}`);
  return res.json();
});
// user$.status === 'pending' во время загрузки, 'error' при ошибке

// Интеграция с React
EventSignal.initReact(React);

function Counter() {
  const n = count$.use();  // подписывается и вызывает ре-рендер при изменении
  return <button onClick={() => count$.set(n + 1)}>{n}</button>;
}

// Рендеринг сигнала напрямую в JSX — без компонента-обёртки
const label$ = new EventSignal('Hello', { componentType: 'my-label' });
EventSignal.registerReactComponentForComponentType('my-label', MyLabelComponent);

function App() {
  return <div>{label$}</div>;  // рендерится как <MyLabelComponent current$={label$} />
}
```

### Реактивная композиция

EventSignal отлично подходит для построения сложного состояния из простых частей:

```typescript
const a$ = new EventSignal(2);
const b$ = new EventSignal(3);

// Цепочка computed — автоматически остаётся синхронизированной
const sum$     = new EventSignal(0, () => a$.get() + b$.get());
const product$ = new EventSignal(0, () => a$.get() * b$.get());
const label$   = new EventSignal('', () => `${a$.get()} + ${b$.get()} = ${sum$.get()}`);

a$.set(10);
console.log(label$.get()); // "10 + 3 = 13"
```

### Мост к внешним событиям

Подключите любой `EventEmitter` или `EventTarget` к реактивному состоянию:

```typescript
const windowWidth$ = new EventSignal(window.innerWidth, (prev, event) => {
  return (event?.target as Window)?.innerWidth ?? prev;
}, {
  sourceEmitter: window,
  sourceEvent: 'resize',
});

// windowWidth$ теперь автоматически синхронизируется с событиями resize
```

---

## Обзор

`EventSignal` — реактивная система сигналов, совместимая с `EventEmitter`/`EventTarget` и глубоко интегрированная с React. Сигналы хранят реактивные значения, автоматически отслеживают зависимости, поддерживают вычисляемые значения (синхронные и асинхронные) и могут рендериться напрямую в JSX.

---

## Импорт

```typescript
import { EventSignal, isEventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';
```

---

## Конструктор

```typescript
new EventSignal<T, S, D, R>(initialValue: T)
new EventSignal<T, S, D, R>(initialValue: T, options: NewOptions)
new EventSignal<T, S, D, R>(initialValue: T, computation: ComputationFn)
new EventSignal<T, S, D, R>(initialValue: T, computation: ComputationFn, options: NewOptions)
```

### Типовые параметры

| Параметр | Описание                                                 |
|----------|----------------------------------------------------------|
| `T`      | Тип значения                                             |
| `S`      | Тип исходного значения (по умолчанию `T`)                |
| `D`      | Тип полезной нагрузки data (по умолчанию `undefined`)    |
| `R`      | Тип возвращаемого значения из `get()` (по умолчанию `T`) |

### Функция вычисления (Computation)

```typescript
type ComputationWithSource<T, S, D, R> = (
  prevValue: Awaited<T>,
  sourceValue: S | undefined,
  eventSignal: EventSignal<T, S, D, R>
) => R | undefined;
```

Возврат `undefined` из computation означает «без обновления» — текущее значение сохраняется.

### NewOptions

| Опция               | Тип                          | Описание                                                              |
|---------------------|------------------------------|-----------------------------------------------------------------------|
| `description`       | `string`                     | Человекочитаемое имя (используется в описании Symbol, React DevTools) |
| `deps`              | `{ eventName: symbol }[]`    | Явные зависимости (символы сигналов)                                  |
| `data`              | `D`                          | Произвольные данные, прикреплённые к сигналу                          |
| `signal`            | `AbortSignal`                | Abort-сигнал для управления жизненным циклом                          |
| `finaleValue`       | `Awaited<R>`                 | Значение, устанавливаемое при уничтожении сигнала                     |
| `finaleSourceValue` | `S`                          | Исходное значение при уничтожении сигнала                             |
| `componentType`     | `string \| symbol \| number` | Идентификатор типа React-компонента                                   |
| `reactFC`           | `ReactFC`                    | Прямой React-компонент для рендеринга                                 |
| `trigger`           | `TriggerDescription`         | Внешний триггер (таймер, эмиттер или eventSignal)                     |
| `throttle`          | `TriggerDescription`         | Триггер троттлинга для ограничения частоты                            |
| `onDestroy`         | `() => void`                 | Колбек при уничтожении сигнала                                        |

### NewOptionsWithSource (расширяет NewOptions)

| Опция                | Тип                               | Описание                                       |
|----------------------|-----------------------------------|------------------------------------------------|
| `sourceEmitter`      | `EventEmitter \| EventTarget`     | Внешний источник событий                       |
| `sourceEvent`        | `EventName \| EventName[]`        | Имя (имена) событий для подписки               |
| `sourceMap`          | `(eventName, ...args) => S`       | Маппинг аргументов события в исходное значение |
| `sourceFilter`       | `(eventName, ...args) => boolean` | Фильтрация событий                             |
| `initialSourceValue` | `S`                               | Начальное исходное значение                    |

---

## Создание сигналов

### Простой сигнал (хранилище)

```typescript
const counter$ = new EventSignal(0, {
  description: 'counter',
});

counter$.set(1);
console.log(counter$.get()); // 1
```

### Вычисляемый сигнал

```typescript
const firstName$ = new EventSignal('John');
const lastName$ = new EventSignal('Doe');

const fullName$ = new EventSignal('', () => {
  return `${firstName$.get()} ${lastName$.get()}`;
}, {
  description: 'fullName',
});

console.log(fullName$.get()); // "John Doe"

firstName$.set('Jane');
// fullName$ автоматически пересчитывается при следующем обращении
console.log(fullName$.get()); // "Jane Doe"
```

### Статическая фабрика

```typescript
const signal$ = EventSignal.createSignal(0);
const computed$ = EventSignal.createSignal(0, (prev, source, self) => {
  return someOther$.get() * 2;
});
```

---

## Доступ к значению

### `get()`

Получить текущее значение. Запускает вычисление при необходимости. Регистрирует автоматическую зависимость при вызове внутри другого computation.

```typescript
const value = signal$.get();
```

### `value` (геттер)

Алиас для `getSync()`.

```typescript
const value = signal$.value;
```

### `getSync()`

Получить текущее значение синхронно. Если значение — Promise (async computation), возвращает последнее разрешённое значение.

### `getSafe()`

Как `get()`, но перехватывает ошибки и возвращает последнее значение при неудаче.

### `getSyncSafe()`

Как `getSync()` + `getSafe()`. Возвращает последнее синхронное значение, игнорируя ошибки и состояние ожидания async.

### `getLast()`

Возвращает внутреннее `_value` напрямую без запуска вычислений.

### `tryGet()`

Возвращает объект `TryResult<T>`:

```typescript
type TryResult<T> = {
  ok: boolean;
  error: unknown | null;
  result: T;  // Текущее значение или последнее при ошибке
};
```

### `getSourceValue()`

Получить текущее исходное значение (установленное через `set()` или `sourceEmitter`).

---

## Модификация значения

### `set(newSourceValue)`

Установить новое исходное значение. Запускает перевычисление.

```typescript
counter$.set(42);
```

### `set(setter)`

Установить через функцию. Принимает `(prevValue, sourceValue, data)`.

```typescript
counter$.set(prev => prev + 1);
counter$.set((prev, source, data) => prev + data.step);
```

### `mutate(props)`

Частично обновить объектное значение. Запускает обновление только при обнаружении изменений.

```typescript
const user$ = new EventSignal({ name: 'John', age: 30 });

user$.mutate({ age: 31 });
// Эквивалентно: user$.set(prev => ({ ...prev, age: 31 }))
// Но эффективнее — изменяет in-place с детекцией изменений
```

### `markNextValueAsForced()`

Принудительно обновить значение при следующей установке, даже если оно shallow-equal текущему.

---

## Вычисляемые сигналы — Реальные примеры

### Счётчик со строковым представлением (из демо)

```typescript
const counter1$ = new EventSignal(0, { description: 'counter1$' });

const computed1$ = new EventSignal('', (_prev, sourceValue, self) => {
  // Когда set() вызван напрямую на computed1$, пробрасываем в counter1$
  if ((self.getStateFlags() & EventSignal.StateFlags.wasSourceSetting) !== 0) {
    counter1$.set(sourceValue);
  }
  return `Значение = ${counter1$.get()}`;
}, {
  initialSourceValue: counter1$.get(),
  description: 'computed1$',
  finaleValue: 'Счётчик уничтожен',
  componentType: '--counter--',
});
```

### Сумма двух сигналов

```typescript
const countersSum$ = new EventSignal(0, () => {
  return counter1$.get() + counter2$.get();
}, {
  description: 'countersSum',
});
```

### Асинхронный вычисляемый сигнал (API-запрос, из демо)

```typescript
const userSignal$ = new EventSignal(1, async (prevUserId, sourceUserId, self) => {
  const newUserId = sourceUserId ?? prevUserId;

  self.data.abortController.abort();
  const abortController = new AbortController();
  self.data.abortController = abortController;

  const response = await fetch(`https://api.example.com/users/${newUserId}`, {
    signal: abortController.signal,
  });
  const user = await response.json();

  self.data.userDTO = user;
  return newUserId;
}, {
  description: 'user',
  componentType: 'userCard',
  initialSourceValue: undefined,
  data: {
    userDTO: null,
    abortController: new AbortController(),
  },
});
```

---

## Подписки

### `on(callback)` / `addListener(callback)`

Подписаться на изменения значения. Возвращает объект `Subscription`.

```typescript
const sub = signal$.on((newValue) => {
  console.log('Новое значение:', newValue);
});

// Позже
sub.unsubscribe();
```

### `once(callback)`

Подписаться только на одно изменение.

```typescript
signal$.once((newValue) => {
  console.log('Первое изменение:', newValue);
});
```

### `subscribe(callback)`

Альтернативный API подписки. Возвращает функцию отписки (совместим с `useSyncExternalStore`).

```typescript
const unsubscribe = signal$.subscribe(() => {
  console.log('Изменено!');
});
```

### Объект Subscription

```typescript
interface Subscription {
  unsubscribe(): void;
  suspend(): boolean;   // Приостановить — возвращает true если не была приостановлена
  resume(): boolean;    // Возобновить — возвращает true если была приостановлена
  suspended: boolean;
  closed: boolean;
}
```

### EventEmitter-совместимый API

EventSignal также поддерживает API с именем события для совместимости, хотя имя события игнорируется:

```typescript
signal$.on('change', callback);     // 'change' игнорируется
signal$.removeListener('data', callback);
```

Допустимые игнорируемые имена событий: `''`, `'change'`, `'changed'`, `'data'`, `'error'`. Любое другое значение бросает `TypeError`.

---

## Триггеры

Триггеры позволяют сигналу перевычисляться на основе внешних событий.

### Триггер-таймер

```typescript
const clock$ = new EventSignal(0, (prev) => prev + 1, {
  trigger: {
    type: 'clock',
    ms: 1000,  // каждую секунду
  },
});
```

### Триггер-эмиттер

```typescript
const signal$ = new EventSignal(null, (prev) => /* ... */, {
  trigger: {
    type: 'emitter',
    emitter: someEventTarget,
    event: 'resize',
    filter: (eventName, event) => event.target.innerWidth > 768,
  },
});
```

### Триггер-EventSignal

```typescript
const signal$ = new EventSignal('', (prev) => /* ... */, {
  trigger: {
    type: 'eventSignal',
    eventSignal: otherSignal$,
  },
});
```

### Троттлинг

Ограничение частоты вычислений с помощью отдельного триггера:

```typescript
const throttled$ = new EventSignal(0, () => {
  return fastChanging$.get();
}, {
  throttle: {
    type: 'clock',
    ms: 200,  // вычислять не чаще чем раз в 200мс
  },
});
```

---

## Внешние источники

Подписка на внешние источники событий:

```typescript
const signal$ = new EventSignal(null, (prev, sourceValue) => {
  return processData(sourceValue);
}, {
  sourceEmitter: webSocket,
  sourceEvent: 'message',
  sourceMap: (eventName, event) => event.data,
  sourceFilter: (eventName, event) => event.type === 'update',
});
```

---

## Экшены (createMethod)

Создание типизированных функций-действий, привязанных к сигналу:

```typescript
const counter$ = new EventSignal(0);

const increment = counter$.createMethod<number | void>((prevValue, arg = 1) => {
  return prevValue + arg;
});

const decrement = counter$.createMethod<number | void>((prevValue, arg = 1) => {
  return prevValue - arg;
});

increment();    // counter$.get() === 1
increment(5);   // counter$.get() === 6
decrement(2);   // counter$.get() === 4
```

---

## Производные сигналы (map)

Создание read-only производного сигнала:

```typescript
const doubled$ = counter$.map(value => value * 2);
console.log(doubled$.get()); // counter$.get() * 2
```

---

## Promise API

### `toPromise()`

Получить Promise, который резолвится при следующем изменении значения:

```typescript
const nextValue = await signal$.toPromise();
```

### Асинхронная итерация

```typescript
for await (const value of signal$) {
  console.log('Новое значение:', value);
  if (value > 100) break;
}
```

---

## Интеграция с React

### Инициализация

Вызвать один раз при запуске приложения:

```typescript
import * as React from 'react';
import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

EventSignal.initReact(React);
```

### `use()` — React Hook

Использовать значение сигнала в React-компоненте. Вызывает ре-рендер при изменениях.

```typescript
function Counter() {
  const count = counter$.use();
  return <div>{count}</div>;
}
```

С редюсером (селектором):

```typescript
function IsEven() {
  const isEven = counter$.use(value => value % 2 === 0);
  return <div>{isEven ? 'Чётное' : 'Нечётное'}</div>;
}
```

### `useListener()` — React Effect Hook

Подписаться на изменения без вызова ре-рендеров:

```typescript
function Logger() {
  const lastValue = counter$.useListener((newValue) => {
    console.log('Счётчик изменился на:', newValue);
  });

  return <div>Последнее: {lastValue}</div>;
}
```

### Прямой рендеринг в JSX

Экземпляры EventSignal — валидные React-элементы, рендерятся напрямую в JSX:

```typescript
const greeting$ = new EventSignal('Привет, мир!');

function App() {
  return <div>{greeting$}</div>;
}
```

### Система типов компонентов

Регистрация React-компонентов для рендеринга сигналов:

```typescript
// Регистрируем компонент для типа 'user-card'
EventSignal.registerReactComponentForComponentType('user-card', UserCardComponent);

// Регистрируем компоненты для конкретных статусов
EventSignal.registerReactComponentForComponentType('user-card', Spinner, 'pending');
EventSignal.registerReactComponentForComponentType('user-card', ErrorView, 'error');
EventSignal.registerReactComponentForComponentType('user-card', ErrorBoundary, 'error-boundary');

// Создаём сигнал с этим типом компонента
const user$ = new EventSignal(userData, {
  componentType: 'user-card',
});

// Рендерится как <UserCardComponent current$={user$} />
function App() {
  return <div>{user$}</div>;
}
```

Динамическое переключение компонентов в рантайме:

```typescript
// Переключаем компонент в рантайме
EventSignal.registerReactComponentForComponentType('counter', SignalAsString1);
// ...позже
EventSignal.registerReactComponentForComponentType('counter', SignalAsString2);
```

---

## Жизненный цикл

### `destructor()` / `[Symbol.dispose]()`

Уничтожить сигнал. Очищает подписки, устанавливает финальные значения, реджектит ожидающие промисы.

```typescript
signal$.destructor();
signal$.destroyed; // true
```

### `destroyed` (геттер)

Проверить, уничтожен ли сигнал.

### `getDispose()`

Получить функцию dispose (удобно для передачи как колбек).

### `clearDeps()`

Удалить все подписки на зависимости без уничтожения сигнала.

---

## Свойства

| Свойство            | Тип        | Описание                                                   |
|---------------------|------------|------------------------------------------------------------|
| `id`                | `number`   | Автоинкрементный уникальный ID                             |
| `key`               | `string`   | Строковый ключ (base-36 от id), используется как React key |
| `isEventSignal`     | `true`     | Маркер для type guard                                      |
| `data`              | `D`        | Произвольные данные                                        |
| `status`            | `string?`  | Текущий статус: `'default'`, `'pending'`, `'error'`        |
| `lastError`         | `unknown?` | Последняя ошибка вычисления                                |
| `componentType`     | `string?`  | Идентификатор типа React-компонента                        |
| `version`           | `number`   | Увеличивается при каждом изменении значения                |
| `computationsCount` | `number`   | Общее количество вычислений                                |
| `eventName`         | `symbol`   | Внутренний символ сигнала                                  |

---

## Флаги состояния

Доступ через `signal$.getStateFlags()`. Использовать с перечислением `EventSignal.StateFlags`:

| Флаг                        | Описание                                                              |
|-----------------------------|-----------------------------------------------------------------------|
| `wasDepsUpdate`             | Зависимость была обновлена                                            |
| `wasSourceSetting`          | Исходное значение было установлено (через `set()` или source emitter) |
| `wasSourceSettingFromEvent` | Исходное значение пришло из события source emitter                    |
| `wasThrottleTrigger`        | Сработал throttle-триггер                                             |
| `wasForceUpdateTrigger`     | Сработал триггер принудительного обновления                           |
| `isNeedToCalculateNewValue` | Вычисление ожидается                                                  |
| `hasSourceEmitter`          | Настроен source emitter                                               |
| `hasComputation`            | Есть функция вычисления                                               |
| `hasDepsFromProps`          | Есть явные зависимости из конструктора                                |
| `hasThrottle`               | Настроен троттлинг                                                    |
| `isDestroyed`               | Сигнал уничтожен                                                      |

---

## Вспомогательная функция

### `isEventSignal(value, inThisRealm?)`

Type guard для проверки, является ли значение экземпляром EventSignal.

```typescript
if (isEventSignal(maybeSignal)) {
  console.log(maybeSignal.get());
}
```

---

## Граничные случаи

1. **Циклические зависимости** — Обнаруживаются в рантайме. Бросает `EventSignalError('Depends on own value')` если сигнал читает себя во время вычисления, или `EventSignalError('Now in computing state (cycle deps?)')` для косвенных циклов.

2. **Undefined из computation** — Возврат `undefined` означает «без обновления». Текущее значение сохраняется.

3. **Равенство объектов** — Объектные значения по умолчанию сравниваются через shallow equality. Используйте `markNextValueAsForced()` для обхода.

4. **Async computation** — Экспериментально. Устанавливает статус `'pending'` во время асинхронного вычисления. Одновременные async-вычисления дедуплицируются — используется только результат последнего.

5. **Чтение уничтоженного сигнала** — `get()` возвращает последнее значение (или `finaleValue` если установлено). `set()` — no-op.

6. **React StrictMode** — Совместим. Двойные вызовы из StrictMode обрабатываются корректно.

---

## 🗺️ Дорожная карта — Скоро

EventSignal активно развивается. Ниже перечислены запланированные улучшения и новые возможности.

---

### ⚛️ Расширенная поддержка React

- **Рендеринг с учётом видимости** — Сигналы будут использовать `IntersectionObserver`, чтобы автоматически пропускать ре-рендер компонентов, находящихся за пределами области видимости. Это резко сокращает лишние перерисовки в длинных списках, виртуализированных макетах и скрытых панелях — без какой-либо настройки.

- **Биндинг сигналов на HTML-теги** — Специальные JSX-обёртки для нативных HTML-элементов с автоматическим **двусторонним биндингом**: события DOM обновляют сигнал, изменения сигнала обновляют DOM:

  ```tsx
  // Двусторонний биндинг из коробки
  <EventSignal.$.input    value={text$}     />
  <EventSignal.$.textarea value={bio$}      />
  <EventSignal.$.select   value={country$}  />
  <EventSignal.$.input    type="checkbox" checked={isDark$} />
  ```

  Никаких обработчиков `onChange`, никакого boilerplate `value={x}` + `onChange={() => setX(...)}`.

---

### 🏭 Хелперы-фабрики сигналов

Эргономичные фабричные функции как основной API — вместо `new EventSignal(...)`:

```typescript
import { createSignal, createComputedSignal, createReadonlySignal,
         createAsyncSignal, createSourceSignal } from '@termi/eventsignal';

const count$    = createSignal(0);                               // записываемое хранилище
const doubled$  = createComputedSignal(() => count$.get() * 2); // авто-tracked computed
const readonly$ = createReadonlySignal(count$);                  // представление только для чтения
const user$     = createAsyncSignal(async () =>                  // асинхронный computed
  fetchUser(id$.get())
);
const resize$   = createSourceSignal(window, 'resize',           // источник EventTarget
  (e) => e.target.innerWidth
);
```

---

### 📦 Отдельный пакет `@termi/eventsignal`

EventSignal будет выделен в полностью **независимый npm-пакет** — **без зависимости** от `EventEmitterX`. Если вам нужны только реактивные сигналы и не нужна система событий, вы сможете установить просто:

```bash
npm install @termi/eventsignal
```

Тот же API, те же TypeScript-типы, меньший размер бандла.

---

### ⏱️ Расширенный Throttle и Debounce

`ThrottleDescriptionDebounce` — полный контроль над тем, как и когда уведомляются подписчики:

```typescript
// Режим debounce: уведомить через 300 мс после *последнего* обновления
const search$ = new EventSignal('', async (prev, query) => fetchResults(query), {
  throttle: {
    type: 'debounce',
    ms: 300,
  },
});

// Режим throttle: уведомлять не чаще раза в 200 мс
const scroll$ = new EventSignal(0, () => window.scrollY, {
  throttle: {
    type: 'throttle',
    ms: 200,
  },
});
```

Два настраиваемых режима:
- **Throttle** — уведомлять не чаще чем раз в N мс («leading edge»)
- **Debounce** — уведомить только спустя N мс бездействия после последнего обновления («trailing edge»)

---

### 💾 Внешнее API синхронизации

Новая опция `sync` для сохранения значений сигнала во внешнем хранилище — сигналы, пережившие перезагрузку страницы, разделяющие состояние между вкладками или синхронизированные с сервером:

```typescript
// Сохранение в localStorage
const theme$ = new EventSignal('light', {
  sync: {
    load: ()      => localStorage.getItem('theme') ?? 'light',
    save: (value) => localStorage.setItem('theme', value),
  },
});

// Асинхронная синхронизация через пользовательское API
const settings$ = new EventSignal(defaultSettings, {
  sync: {
    load: ()      => api.getSettings(),
    save: (value) => api.saveSettings(value),
  },
});
```

---

### И многое другое…

- `batch()` — объединить несколько обновлений сигналов в одно уведомление подписчикам
- `peek()` — прочитать значение сигнала внутри вычисления без регистрации зависимости
- Улучшенная интеграция с React DevTools: имена сигналов и граф зависимостей
- Улучшения производительности и уменьшение размера бандла


