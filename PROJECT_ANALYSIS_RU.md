# EventEmitterX — Анализ проекта

## Обзор

**EventEmitterX** — TypeScript-библиотека, предоставляющая кроссплатформенную реализацию `EventEmitter`, совместимую как с Node.js, так и с браузерами. Проект также включает **EventSignal** — реактивную систему сигналов, совместимую с `EventEmitter`/`EventTarget` и глубоко интегрированную с React.

- **Имя пакета:** `@termi/eventemitterx`
- **Версия:** `0.1.0`
- **Язык:** TypeScript
- **Среда выполнения:** Node.js / Браузеры
- **Фреймворк тестирования:** Jest (с ts-jest)
- **Пакетный менеджер:** pnpm

---

## Структура репозитория

```
EventEmitterX/
├── modules/                    # Основные модули библиотеки
│   ├── events.ts               # EventEmitterX — основная реализация EventEmitter (~3800 строк)
│   └── EventEmitterEx/
│       ├── EventSignal.ts      # EventSignal — реактивная система сигналов (~3850 строк)
│       ├── EventSignal_types.d.ts  # Типы для совместимости с React
│       ├── eventsAsyncIterator.ts  # Асинхронный итератор событий (аналог events.on)
│       ├── utils.ts            # Утилиты (JSON-сериализация и т.д.)
│       ├── view_utils.ts       # React ViewContext утилиты (BETA)
│       └── docs/               # Внутренняя документация и ссылки
├── spec/                       # Тесты (Jest)
│   ├── test_spec.ts
│   └── modules/
│       ├── events_spec.ts          # Тесты EventEmitterX (~4700 строк)
│       └── EventEmitterEx/
│           └── EventSignal_spec.ts # Тесты EventSignal (~4100 строк)
├── spec_utils/                 # Вспомогательные функции для тестов
├── utils/                      # Общие утилиты
├── packages/                   # Внутренние «внешние» зависимости (будущие npm-пакеты)
├── demo/
│   ├── eventSignals-test-app/  # React демо-приложение для EventSignal
│   └── clicker/                # Полностековое демо-приложение (frontend + backend)
├── _dev/                       # Инструменты разработки, postinstall-скрипты, хелперы jest
├── docs/                       # Файлы документации
├── package.json
├── tsconfig.json
└── jest.config.js
```

---

## Основные модули

### 1. EventEmitterX (`modules/events.ts`)

Полнофункциональная реализация `EventEmitter` для Node.js и браузеров.

**Ключевые возможности:**
- Полная совместимость API с Node.js `EventEmitter`
- Работает в браузерах без полифилов
- Опция `listenerOncePerEventType` — предотвращает дублирование слушателей на событие
- Опция `emitCounter` — подсчёт вызовов emit (принимает `console` или кастомный `ICounter`)
- Опция `listenerWithoutThis` — вызов слушателей без привязки `this`
- `captureRejections` — обработка отклонений в асинхронных слушателях
- `supportEventListenerObject` — поддержка паттерна `{ handleEvent }` (DOM-совместимость)
- `isDebugTraceListeners` — прикрепление стека вызовов к слушателям для отладки
- `destructor()` / `Symbol.dispose` — безопасная очистка с событием `kDestroyingEvent`
- Расширенный `static once()` — на основе Promise с `filter`, `timeout`, `AbortSignal`, `ServerTiming`, поддержкой нескольких имён событий, совместимость с `EventEmitter` и `EventTarget`
- `static on()` — асинхронный итератор (`eventsAsyncIterator`) с `computeValue`, `stopEventName`, `errorEventName`
- Статические вспомогательные методы: `getEventListeners`, `addAbortListener`
- Совместимость с `errorMonitor` и `captureRejectionSymbol`

### 2. EventSignal (`modules/EventEmitterEx/EventSignal.ts`)

Реактивная система сигналов, вдохновлённая Preact Signals, Effector и SolidJS, с глубокой интеграцией в React.

**Ключевые возможности:**
- Реактивные вычисляемые значения с автоматическим отслеживанием зависимостей
- Поддержка синхронных и асинхронных вычислений
- Глубокая интеграция с React: `use()`, `useListener()`, прямой рендеринг в JSX через `$$typeof`
- Система типов компонентов: `registerReactComponentForComponentType` для полиморфного рендеринга
- Внешние источники: подписка на события `EventEmitter`/`EventTarget`
- Триггеры: по таймеру (interval/timeout), на основе эмиттера или EventSignal
- Поддержка throttle для ограничения частоты вычислений
- `createMethod` — создание типизированных экшенов, привязанных к сигналу
- `map` — создание производных сигналов
- `mutate` — частичное обновление объектов с детекцией изменений
- Promise API: `toPromise()`, асинхронная итерация через `Symbol.asyncIterator`
- Безопасные геттеры: `get()`, `getSafe()`, `getSyncSafe()`, `getLast()`, `tryGet()`
- Объекты `Subscription` с поддержкой `suspend()`/`resume()`
- `finaleValue` / `finaleSourceValue` — значения при уничтожении
- Интеграция с `AbortSignal` для управления жизненным циклом
- Сравнение объектов по shallow equality

### 3. eventsAsyncIterator (`modules/EventEmitterEx/eventsAsyncIterator.ts`)

Реализация `EventEmitterX.on()` — асинхронного итератора для потоков событий.

**Ключевые возможности:**
- Совместимость с API Node.js `events.on()`
- Работает с `EventEmitter` и `EventTarget`
- Колбек `computeValue` для трансформации событий
- `stopEventName` / `errorEventName` для завершения итератора
- Поддержка `AbortSignal`
- Отладочная информация через `getDebugInfo()`

---

## Демо-приложения

### 1. EventSignals Test App (`demo/eventSignals-test-app/`)

React + Vite приложение, демонстрирующее возможности EventSignal:
- Сигналы-счётчики с вычисляемыми значениями
- Карточка пользователя с композицией имён через вычисляемые сигналы
- Асинхронная загрузка данных из JSONPlaceholder API
- Интернационализация (i18n) с реактивным переключением локали
- Переключение типа компонента в рантайме
- Поддержка PiP (Picture-in-Picture) окна
- Маршрутизация с реактивным состоянием
- Интеграция ErrorBoundary

### 2. Clicker (`demo/clicker/`)

Полностековое приложение (frontend + backend), демонстрирующее взаимодействие в реальном времени:
- Backend: Fastify, Prisma ORM, SSE-каналы
- Frontend: React
- Использует EventEmitterX для событийной коммуникации
- Кликер-игра с раундами и обновлениями в реальном времени

---

## Внутренние зависимости (`packages/`)

> Это внутренние библиотеки, которые планируется опубликовать как отдельные npm-пакеты.

| Пакет                | Назначение                                    |
|----------------------|-----------------------------------------------|
| `abortable`          | Утилиты AbortController/AbortSignal            |
| `polyfills`          | Полифилы ES2024+                               |
| `ProgressControllerX`| Контроллер отслеживания прогресса              |
| `runEnv`             | Определение среды выполнения                   |
| `ServerTiming`       | Утилиты для заголовка Server-Timing            |
| `type_guards`        | Функции-типгарды для TypeScript                |

---

## Тестирование

- **Фреймворк:** Jest 27.5 с ts-jest
- **Среда:** jsdom (эмуляция браузерного API)
- **Покрытие тестами:**
  - `events_spec.ts` — ~4700 строк тестов EventEmitterX
  - `EventSignal_spec.ts` — ~4100 строк тестов EventSignal
  - Покрывает: базовые emit/on/once, `static once()` с фильтрами/таймаутами/AbortSignal, асинхронные итераторы, вычисляемые сигналы, триггеры, throttle, React-хуки, асинхронные вычисления, жизненный цикл/удаление

---

## Сборка и конфигурация

- **TypeScript:** Строгий режим, двойной вывод CJS/ESM через `tsconfig.json` / `tsconfig.esm.json`
- **Пакетный менеджер:** pnpm 6.32+
- **Node.js:** Обязателен (devEngines)
- **Скрипты:**
  - `postinstall` — патчинг dev-зависимостей
  - `build` / `build:cjs` / `build:esm` — компиляция TypeScript

---

## Ключевые архитектурные решения

1. **`class extends null`** — И `EventEmitterX`, и `EventSignal` используют `Object.setPrototypeOf(prototype, null)` для минимизации накладных расходов цепочки прототипов.
2. **Битовые флаги** — Внутреннее состояние управляется через побитовые флаги для производительности (`_f` в EventEmitterX, `_stateFlags` в EventSignal).
3. **Оптимизированный emit** — Специализированные пути emit для 0–3 аргументов для избежания объекта `arguments` и `apply()`.
4. **Совместимость с React** — Экземпляры EventSignal являются валидными React-элементами (`$$typeof`, `type`, `props`, `ref`), что позволяет напрямую рендерить их в JSX.
5. **Shallow equality** — Объектные значения сравниваются через shallow equality для предотвращения ненужных ре-рендеров/перевычислений.

---

## Дополнительная документация

- [Индекс модулей](docs/INDEX.md) — Обзор всех модулей
- [API EventEmitterX](docs/EventEmitterX.md) — Подробный справочник API
- [API EventSignal](docs/EventSignal.md) — Подробный справочник API
- [Улучшения и план развития](docs/IMPROVEMENTS.md) — Потенциальные улучшения и TODO

