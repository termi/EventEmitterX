# EventSignal — Справочник API

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

| Параметр | Описание |
|----------|----------|
| `T` | Тип значения |
| `S` | Тип исходного значения (по умолчанию `T`) |
| `D` | Тип полезной нагрузки data (по умолчанию `undefined`) |
| `R` | Тип возвращаемого значения из `get()` (по умолчанию `T`) |

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

| Опция | Тип | Описание |
|-------|-----|----------|
| `description` | `string` | Человекочитаемое имя (используется в описании Symbol, React DevTools) |
| `deps` | `{ eventName: symbol }[]` | Явные зависимости (символы сигналов) |
| `data` | `D` | Произвольные данные, прикреплённые к сигналу |
| `signal` | `AbortSignal` | Abort-сигнал для управления жизненным циклом |
| `finaleValue` | `Awaited<R>` | Значение, устанавливаемое при уничтожении сигнала |
| `finaleSourceValue` | `S` | Исходное значение при уничтожении сигнала |
| `componentType` | `string \| symbol \| number` | Идентификатор типа React-компонента |
| `reactFC` | `ReactFC` | Прямой React-компонент для рендеринга |
| `trigger` | `TriggerDescription` | Внешний триггер (таймер, эмиттер или eventSignal) |
| `throttle` | `TriggerDescription` | Триггер троттлинга для ограничения частоты |
| `onDestroy` | `() => void` | Колбек при уничтожении сигнала |

### NewOptionsWithSource (расширяет NewOptions)

| Опция | Тип | Описание |
|-------|-----|----------|
| `sourceEmitter` | `EventEmitter \| EventTarget` | Внешний источник событий |
| `sourceEvent` | `EventName \| EventName[]` | Имя (имена) событий для подписки |
| `sourceMap` | `(eventName, ...args) => S` | Маппинг аргументов события в исходное значение |
| `sourceFilter` | `(eventName, ...args) => boolean` | Фильтрация событий |
| `initialSourceValue` | `S` | Начальное исходное значение |

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

| Свойство | Тип | Описание |
|----------|-----|----------|
| `id` | `number` | Автоинкрементный уникальный ID |
| `key` | `string` | Строковый ключ (base-36 от id), используется как React key |
| `isEventSignal` | `true` | Маркер для type guard |
| `data` | `D` | Произвольные данные |
| `status` | `string?` | Текущий статус: `'default'`, `'pending'`, `'error'` |
| `lastError` | `unknown?` | Последняя ошибка вычисления |
| `componentType` | `string?` | Идентификатор типа React-компонента |
| `version` | `number` | Увеличивается при каждом изменении значения |
| `computationsCount` | `number` | Общее количество вычислений |
| `eventName` | `symbol` | Внутренний символ сигнала |

---

## Флаги состояния

Доступ через `signal$.getStateFlags()`. Использовать с перечислением `EventSignal.StateFlags`:

| Флаг | Описание |
|------|----------|
| `wasDepsUpdate` | Зависимость была обновлена |
| `wasSourceSetting` | Исходное значение было установлено (через `set()` или source emitter) |
| `wasSourceSettingFromEvent` | Исходное значение пришло из события source emitter |
| `wasThrottleTrigger` | Сработал throttle-триггер |
| `wasForceUpdateTrigger` | Сработал триггер принудительного обновления |
| `isNeedToCalculateNewValue` | Вычисление ожидается |
| `hasSourceEmitter` | Настроен source emitter |
| `hasComputation` | Есть функция вычисления |
| `hasDepsFromProps` | Есть явные зависимости из конструктора |
| `hasThrottle` | Настроен троттлинг |
| `isDestroyed` | Сигнал уничтожен |

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

