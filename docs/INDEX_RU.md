# Индекс модулей

В этом документе представлен краткий обзор каждого модуля проекта EventEmitterX.

---

## Основные модули

| Модуль | Файл | Описание |
|--------|------|----------|
| **EventEmitterX** | `modules/events.ts` | Кроссплатформенная реализация EventEmitter для Node.js и браузеров. Замена с расширенными возможностями: `listenerOncePerEventType`, `emitCounter`, продвинутый `static once()` с фильтрами/таймаутами/AbortSignal и асинхронные итераторы. |
| **EventSignal** | `modules/EventEmitterEx/EventSignal.ts` | Реактивная система сигналов с автоматическим отслеживанием зависимостей, вычисляемыми значениями, поддержкой асинхронных вычислений и глубокой интеграцией с React. Сигналы можно рендерить прямо в JSX. |
| **eventsAsyncIterator** | `modules/EventEmitterEx/eventsAsyncIterator.ts` | Асинхронный итератор для потоков событий. Реализует `EventEmitterX.on()` — совместим с Node.js `events.on()`. Поддерживает трансформацию значений, события остановки/ошибки и AbortSignal. |
| **view_utils** | `modules/EventEmitterEx/view_utils.ts` | (БЕТА) React ViewContext утилиты для EventSignal. Предоставляет `createEventSignalMagicContext` для рендеринга на основе типа компонента. |
| **utils** | `modules/EventEmitterEx/utils.ts` | Общие утилиты: безопасная сериализация JSON с учётом циклических ссылок, строковое представление содержимого массива, определение среды выполнения (Vite dev mode). |

---

## Подробная документация

- **[API EventEmitterX](EventEmitterX.md)** — Полная документация API `EventEmitterX`, включая опции конструктора, методы экземпляра, статические методы (`once`, `on`, `getEventListeners`) и примеры использования.
- **[API EventSignal](EventSignal.md)** — Полная документация API `EventSignal`, включая конструктор, геттеры/сеттеры, вычисляемые сигналы, React-хуки, рендеринг компонентов, триггеры, подписки и примеры использования.
- **[Улучшения и план развития](IMPROVEMENTS.md)** — Потенциальные улучшения, известные ограничения и задачи.

---

## Граф зависимостей модулей

```
EventEmitterX (events.ts)
├── использует: abortable, object utils
└── экспортирует: EventEmitterX, once, on, addAbortListener, errorMonitor, ...

EventSignal (EventSignal.ts)
├── использует: EventEmitterX (внутренне для шин событий сигнал/подписчик/таймер)
├── использует: abortable, type_guards, runEnv
├── использует: view_utils (React ViewContext)
├── использует: utils (сериализация)
└── экспортирует: EventSignal, isEventSignal

eventsAsyncIterator (eventsAsyncIterator.ts)
├── использует: abortable
└── экспортирует: eventsAsyncIterator (алиас EventEmitterX.on)
```

