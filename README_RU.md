# EventEmitterX

Кроссплатформенная реализация `EventEmitter` для Node.js и браузеров с продвинутой реактивной системой сигналов (**EventSignal**), глубоко интегрированной с React.

<a href="https://termi.github.io/EventEmitterX/" target="_blank" rel="noopener noreferrer"><strong>Online documentation and Demo ↗</strong></a>

## Ключевые возможности

### EventEmitterX
- ✅ Полная совместимость с API Node.js `EventEmitter`
- 🌐 Работает в браузерах без полифилов
- 🔒 `listenerOncePerEventType` — предотвращение дублирования слушателей на событие
- 📊 `emitCounter` — подсчёт вызовов emit для мониторинга
- ⏱️ Расширенный `static once()` — на основе Promise с **фильтром**, **таймаутом**, **AbortSignal**, **несколькими именами событий** и поддержкой `EventEmitter`/`EventTarget`
- 🔄 `static on()` — асинхронный итератор для потоков событий с трансформацией значений
- 🧹 `destructor()` / `Symbol.dispose` — безопасная очистка ресурсов
- 🐛 `isDebugTraceListeners` — прикрепление стеков вызовов к слушателям для отладки

### EventSignal
- ⚡ Реактивные вычисляемые значения с автоматическим отслеживанием зависимостей
- 🔀 Синхронные и асинхронные вычисления
- ⚛️ Глубокая интеграция с React: `use()`, `useListener()`, прямой рендеринг в JSX
- 🎭 Система типов компонентов для полиморфного рендеринга (`registerReactComponentForComponentType`)
- 📡 Внешние источники — подписка на события `EventEmitter`/`EventTarget`
- ⏰ Триггеры — перевычисление по таймеру, эмиттеру или сигналу
- 🎯 `createMethod` — типизированные экшены, привязанные к сигналам
- 📦 Объекты `Subscription` с `suspend()`/`resume()`
- 🔮 Promise API и асинхронная итерация (`for await...of`)

## Быстрый старт

```typescript
import { EventEmitterX } from '@termi/eventemitterx/modules/events';
import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

// --- EventEmitterX ---
const emitter = new EventEmitterX();

// Promise-based once с фильтром и таймаутом
const [data] = await EventEmitterX.once(emitter, 'data', {
  filter: (event, value) => value > 10,
  timeout: 5000,
});

// Асинхронный итератор
for await (const [tick] of EventEmitterX.on(emitter, 'tick')) {
  console.log(tick);
}

// --- EventSignal ---
const counter$ = new EventSignal(0);
const doubled$ = new EventSignal(0, () => counter$.get() * 2);

counter$.set(5);
console.log(doubled$.get()); // 10

// Интеграция с React
EventSignal.initReact(React);

function App() {
  const count = counter$.use();
  return <div>{count}</div>;
}
```

## Документация

| Документ                                      | Описание                                |
|-----------------------------------------------|-----------------------------------------|
| [Анализ проекта](PROJECT_ANALYSIS_RU.md)      | Полный обзор проекта и архитектура      |
| [Индекс модулей](docs/INDEX_RU.md)            | Краткий обзор всех модулей              |
| [API EventEmitterX](docs/EventEmitterX_RU.md) | Подробный справочник API с примерами    |
| [API EventSignal](docs/EventSignal_RU.md)     | Подробный справочник API с примерами    |
| [Улучшения](docs/IMPROVEMENTS_RU.md)          | Потенциальные улучшения и план развития |

> 📖 Английские версии (без суффикса `_RU`) доступны для всех файлов документации.

## Демо-приложения

### EventSignal React Demo

React + Vite приложение, демонстрирующее возможности EventSignal: счётчики, вычисляемые значения, асинхронная загрузка данных, i18n, переключение компонентов и многое другое.

```bash
cd demo/eventSignals-test-app ; pnpm i ; pnpm run dev
```

### Clicker (Full-Stack)

Многопользовательская кликер-игра в реальном времени с Fastify-бэкендом, Prisma ORM и обновлениями через SSE.

```bash
cd demo/clicker ; ./bash/run_dev_backend_frontend.sh
```

## Установка

```bash
pnpm install
```

## Сборка

```bash
pnpm run build        # CJS + ESM
pnpm run build:cjs    # Только CommonJS
pnpm run build:esm    # Только ES Modules
```

## Лицензия

ISC

