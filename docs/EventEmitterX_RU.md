# EventEmitterX — Справочник API

## Обзор

`EventEmitterX` — кроссплатформенная реализация `EventEmitter`, совместимая как с Node.js, так и с браузерами. Расширяет стандартный API Node.js EventEmitter дополнительными возможностями для отладки, мониторинга производительности и продвинутых асинхронных паттернов.

---

## Импорт

```typescript
import { EventEmitterX } from '@termi/eventemitterx/modules/events';
// или
import EventEmitterX, { once, on } from '@termi/eventemitterx/modules/events';
```

---

## Конструктор

```typescript
new EventEmitterX(options?: ConstructorOptions)
```

### ConstructorOptions

| Опция                        | Тип                   | По умолчанию | Описание                                                                                                                   |
|------------------------------|-----------------------|--------------|----------------------------------------------------------------------------------------------------------------------------|
| `maxListeners`               | `number`              | `Infinity`   | Максимальное количество слушателей на событие (предупреждение при превышении)                                              |
| `listenerOncePerEventType`   | `boolean`             | `false`      | Если `true`, слушатель может быть зарегистрирован не более одного раза на тип события (аналогично поведению `EventTarget`) |
| `captureRejections`          | `boolean`             | `false`      | Автоматический перехват отклонений в async-слушателях                                                                      |
| `emitCounter`                | `Console \| ICounter` | —            | Подсчёт вызовов emit. Передайте `console` для console.count или кастомный `ICounter`                                       |
| `listenerWithoutThis`        | `boolean`             | `false`      | Вызывать слушатели без привязки `this` к эмиттеру                                                                          |
| `supportEventListenerObject` | `boolean`             | `false`      | Поддержка DOM-паттерна `{ handleEvent }`                                                                                   |
| `isDebugTraceListeners`      | `boolean`             | `false`      | Прикрепление стека вызовов к слушателям через `listener.__debugTrace`                                                      |

### Пример

```typescript
const emitter = new EventEmitterX({
  maxListeners: 50,
  listenerOncePerEventType: true,
  emitCounter: console,
});
```

---

## Методы экземпляра

### Стандартные методы EventEmitter

Эти методы ведут себя идентично Node.js `EventEmitter`:

| Метод                                  | Сигнатура                                                                          |
|----------------------------------------|------------------------------------------------------------------------------------|
| `on(event, listener)`                  | Добавить слушатель для `event`. Возвращает `this`.                                 |
| `addListener(event, listener)`         | Алиас для `on`.                                                                    |
| `once(event, listener)`                | Добавить одноразовый слушатель. Удаляется после первого вызова. Возвращает `this`. |
| `off(event, listener)`                 | Алиас для `removeListener`.                                                        |
| `removeListener(event, listener)`      | Удалить конкретный слушатель. Возвращает `this`.                                   |
| `removeAllListeners(event?)`           | Удалить все слушатели (опционально для конкретного события). Возвращает `this`.    |
| `prependListener(event, listener)`     | Добавить слушатель в начало списка. Возвращает `this`.                             |
| `prependOnceListener(event, listener)` | Добавить одноразовый слушатель в начало. Возвращает `this`.                        |
| `emit(event, ...args)`                 | Отправить событие. Возвращает `true`, если слушатели существовали.                 |
| `listeners(event)`                     | Возвращает копию массива слушателей (разворачивает once-обёртки).                  |
| `rawListeners(event)`                  | Возвращает копию «сырого» массива слушателей (включая once-обёртки).               |
| `listenerCount(event)`                 | Возвращает количество слушателей для `event`.                                      |
| `eventNames()`                         | Возвращает массив имён событий с зарегистрированными слушателями.                  |
| `setMaxListeners(n)`                   | Установить максимум слушателей. Возвращает `this`.                                 |
| `getMaxListeners()`                    | Получить текущее максимальное значение слушателей.                                 |

### Нестандартные методы

#### `hasListeners(event)`

Проверить наличие слушателей для данного события.

```typescript
if (emitter.hasListeners('data')) {
  emitter.emit('data', payload);
}
```

#### `hasListener(event, listenerToCheck?)`

Проверить, зарегистрирован ли конкретный слушатель. Если `listenerToCheck` не указан, ведёт себя как `hasListeners`.

```typescript
const handler = () => console.log('событие!');
emitter.on('data', handler);
emitter.hasListener('data', handler); // true
```

#### `destructor()`

Уничтожить эмиттер. Отправляет `kDestroyingEvent`, удаляет все слушатели и предотвращает добавление новых.

```typescript
emitter.destructor();
emitter.isDestroyed; // true
```

#### `[Symbol.dispose]()`

Алиас для `destructor()`. Поддерживает синтаксис `using` (TC39 Explicit Resource Management).

```typescript
{
  using emitter = new EventEmitterX();
  emitter.on('data', handler);
} // автоматически уничтожается здесь
```

---

## Статические методы

### `EventEmitterX.once()` — Расширенный Promise-based Once

Это наиболее значительное отличие от Node.js `events.once()`. Поддерживает:

- **Несколько имён событий** — резолвится на первое сработавшее
- **Функция-фильтр** — резолвить только когда фильтр возвращает `true`
- **Таймаут** — реджектить с `TimeoutError` после указанного количества мс
- **AbortSignal** — реджектить с `AbortError` при срабатывании сигнала
- **Массив AbortController** — группировка нескольких abort-контроллеров
- **ServerTiming** — отслеживание метрик времени
- **Кастомное имя события ошибки** — переопределение стандартного `'error'`
- **Колбек onDone** — вызывается перед резолвом промиса
- **Кастомный конструктор Promise** — использование пользовательской реализации Promise
- **Работает с EventEmitter, EventTarget и совместимыми эмиттерами**

#### Сигнатуры

```typescript
// С EventEmitterX
static once(emitter: EventEmitterX, types: EventName | EventName[], options?: StaticOnceOptions): Promise<any[]>;

// С Node.js EventEmitter
static once(emitter: NodeEventEmitter, types: string | symbol | (string | symbol)[], options?: StaticOnceOptions): Promise<any[]>;

// С DOM EventTarget
static once(eventTarget: EventTarget, types: string | string[], options?: StaticOnceOptionsEventTarget): Promise<[Event]>;
```

#### Опции (StaticOnceOptions)

| Опция              | Тип                                   | Описание                                               |
|--------------------|---------------------------------------|--------------------------------------------------------|
| `prepend`          | `boolean`                             | Добавить слушатель в начало списка                     |
| `signal`           | `AbortSignal`                         | Отменить ожидание через abort-сигнал                   |
| `abortControllers` | `AbortController[]`                   | Группа abort-контроллеров                              |
| `timeout`          | `number`                              | Таймаут в мс до реджекта с `TimeoutError`              |
| `errorEventName`   | `EventName`                           | Кастомное имя события ошибки (по умолчанию: `'error'`) |
| `filter`           | `(emitEventName, ...args) => boolean` | Функция-фильтр — резолвить только при возврате `true`  |
| `onDone`           | `(emitEventName, ...args) => void`    | Колбек, вызываемый перед резолвом                      |
| `timing`           | `ServerTiming`                        | Отслеживание Server-Timing                             |
| `Promise`          | `PromiseConstructor`                  | Кастомный конструктор Promise                          |
| `debugInfo`        | `Object`                              | Отладочная информация для ошибок таймаута/отмены       |

#### Примеры

**Базовое использование:**

```typescript
const emitter = new EventEmitterX();

setTimeout(() => emitter.emit('ready', { status: 'ok' }), 1000);

const [result] = await EventEmitterX.once(emitter, 'ready');
console.log(result); // { status: 'ok' }
```

**Несколько имён событий (гонка):**

```typescript
const emitter = new EventEmitterX();

// Резолвится на первое сработавшее
const result = await EventEmitterX.once(emitter, ['success', 'failure']);
```

**С фильтром:**

```typescript
const emitter = new EventEmitterX();

// Резолвить только когда значение больше 10
const [value] = await EventEmitterX.once(emitter, 'data', {
  filter: (eventName, value) => value > 10,
});
```

**С таймаутом:**

```typescript
try {
  const result = await EventEmitterX.once(emitter, 'response', {
    timeout: 5000,
  });
} catch (error) {
  // error.name === 'TimeoutError'
  // error.code === 'ETIMEDOUT'
}
```

**С AbortSignal:**

```typescript
const controller = new AbortController();

setTimeout(() => controller.abort(), 3000);

try {
  await EventEmitterX.once(emitter, 'data', {
    signal: controller.signal,
  });
} catch (error) {
  // error.name === 'AbortError'
}
```

**С DOM EventTarget:**

```typescript
const button = document.querySelector('#myButton');

const [event] = await EventEmitterX.once(button, 'click', {
  timeout: 10000,
  passive: true,
});
```

**Граничный случай — ожидание самого события `'error'`:**

```typescript
// При ожидании самого события 'error' специальная обработка ошибок не применяется
const [error] = await EventEmitterX.once(emitter, 'error');
```

---

### `EventEmitterX.on()` — Асинхронный итератор

Создаёт асинхронный итератор для потоков событий. Алиас для `eventsAsyncIterator`.

```typescript
static on(emitter: EventEmitter | EventTarget, event: EventName, options?: Options): AsyncIterator
```

#### Опции

| Опция            | Тип                                        | Описание                                                        |
|------------------|--------------------------------------------|-----------------------------------------------------------------|
| `signal`         | `AbortSignal`                              | Прервать итератор                                               |
| `computeValue`   | `(eventName, eventArgs, addCallback) => T` | Трансформировать аргументы события перед yield                  |
| `stopEventName`  | `EventName`                                | Событие, останавливающее итератор                               |
| `errorEventName` | `EventName`                                | Событие, вызывающее throw в итераторе (по умолчанию: `'error'`) |

#### Пример

```typescript
const emitter = new EventEmitterX();

// Генерируем события
setInterval(() => emitter.emit('tick', Date.now()), 1000);

// Потребляем как асинхронный итератор
for await (const [timestamp] of EventEmitterX.on(emitter, 'tick')) {
  console.log('Тик:', timestamp);
  if (timestamp > deadline) break;
}
```

---

### `EventEmitterX.getEventListeners(emitter, eventName)`

Получить слушатели из любого совместимого эмиттера (EventEmitterX, Node EventEmitter или EventTarget).

```typescript
const listeners = EventEmitterX.getEventListeners(emitter, 'data');
```

---

### `EventEmitterX.addAbortListener(signal, callback)`

Безопасно слушать событие abort на `AbortSignal`. Возвращает `Disposable`.

```typescript
const disposable = EventEmitterX.addAbortListener(signal, () => {
  console.log('Отменено!');
});

// Позже: очистка
disposable[Symbol.dispose]();
```

---

## Статические свойства

| Свойство                 | Тип      | Описание                                               |
|--------------------------|----------|--------------------------------------------------------|
| `errorMonitor`           | `symbol` | Символ для мониторинга событий ошибок без их перехвата |
| `captureRejectionSymbol` | `symbol` | `Symbol.for('nodejs.rejection')`                       |
| `usingDomains`           | `false`  | Домены не поддерживаются                               |

---

## Специальные события

| Событие                | Когда отправляется                                                      |
|------------------------|-------------------------------------------------------------------------|
| `'newListener'`        | Перед добавлением нового слушателя                                      |
| `'removeListener'`     | После удаления слушателя                                                |
| `'error'`              | При ошибке. Если нет слушателя — бросает исключение.                    |
| `'duplicatedListener'` | Когда `listenerOncePerEventType` включён и обнаружен дубликат слушателя |
| `kDestroyingEvent`     | Во время вызова `destructor()`, до удаления всех слушателей             |

---

## TypeScript Generics

```typescript
interface MyEvents {
  data: (payload: Buffer) => void;
  error: (err: Error) => void;
  close: () => void;
}

const emitter = new EventEmitterX<MyEvents>();

emitter.on('data', (payload) => {
  // payload типизирован как Buffer
});

const [payload] = await EventEmitterX.once(emitter, 'data');
```

---

## Заметки о совместимости

- `EventEmitterEx` — устаревший алиас для `EventEmitterX`
- `EventEmitter` также экспортируется как алиас
- Интерфейсы `ICompatibleEmitter` / `IMinimumCompatibleEmitter` определяют минимальный контракт для совместимости со `static once()`

