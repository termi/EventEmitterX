# Технический анализ проекта `tech-task-for-interview`

> Анализ выполнен: март 2026

## Содержание

- [Краткое описание](#краткое-описание)
- [Стек технологий](#стек-технологий)
- [Архитектура](#архитектура)
- [Сильные стороны](#сильные-стороны)
- [Слабые стороны и технический долг](#слабые-стороны-и-технический-долг)
- [Итог](#итог)

---

## Краткое описание

Fullstack real-time приложение типа «тапалка»: пользователи могут вступать в раунды и нажимать кнопку, набирая очки. Результаты обновляются у всех участников в реальном времени через SSE (Server-Sent Events). Есть роли (USER, ADMIN, USER_HIDE_TAPS), система JWT-авторизации и общий shared-код между фронтендом и бэкендом.

---

## Стек технологий

### Frontend

| Технология              | Версия   | Назначение                                         |
|-------------------------|----------|----------------------------------------------------|
| **React**               | 19       | UI-фреймворк                                       |
| **React Router DOM**    | 7        | Клиентская маршрутизация                           |
| **Vite**                | 6        | Сборщик/Dev-сервер                                 |
| **TypeScript**          | 5.8      | Типизация                                          |
| **EventSignal**         | internal | Реактивная система состояний (кастомная, см. ниже) |
| CSS Modules / plain CSS | —        | Стилизация (без UI-фреймворка)                     |

### Backend

| Технология         | Версия   | Назначение                                     |
|--------------------|----------|------------------------------------------------|
| **Fastify**        | 5        | HTTP-сервер                                    |
| **Prisma**         | 6        | ORM                                            |
| **SQLite**         | —        | База данных (через Prisma)                     |
| **jsonwebtoken**   | 9        | JWT access/refresh токены                      |
| **fastify-sse-v2** | 4        | Server-Sent Events на сервере                  |
| **dotenv**         | 16       | Конфигурация через `.env`                      |
| **tsx**            | 4        | Запуск TypeScript в dev-режиме                 |
| **node:crypto**    | built-in | `scrypt` + `timingSafeEqual` для хэшей паролей |

### Shared (общий код)

| Технология          | Назначение                                                                     |
|---------------------|--------------------------------------------------------------------------------|
| **TypeScript**      | Типизация всего shared-кода                                                    |
| **EventEmitterX**   | Типизированный EventEmitter (кастомная библиотека автора)                      |
| **EventSignal**     | Реактивные сигналы — кастомный аналог SolidJS Signals                          |
| **Polyfills**       | `Promise.withResolvers`, `Symbol.dispose`, `Map`, `Object`, `WeakMap`, `Error` |
| **Type Guards**     | Кастомная библиотека `type_guards/` для runtime-проверок типов                 |
| **AbortController** | Центральный lifecycle-менеджер всего приложения                                |

### Инфраструктура / Tooling

| Технология                    | Версия | Назначение                                 |
|-------------------------------|--------|--------------------------------------------|
| **pnpm**                      | 6+     | Пакетный менеджер (quasi-monorepo)         |
| **Jest**                      | 30     | Тестирование (backend + полифилы)          |
| **Bun**                       | —      | Альтернативный test runner для shared-кода |
| **ts-jest**                   | 29     | TypeScript-трансформер для Jest            |
| **Babel**                     | 7      | Трансформация для Jest (CJS)               |
| **@happy-dom**                | 18     | DOM-эмуляция в тестах                      |
| **mitm**                      | 1.7    | Перехват HTTP для интеграционных тестов    |
| **ESLint**                    | 9      | Линтер                                     |
| **typescript-eslint**         | 8      | TypeScript-правила ESLint                  |
| **@stylistic/eslint-plugin**  | 5      | Форматирование кода через ESLint           |
| **eslint-plugin-react-hooks** | 5      | Правила хуков React                        |
| **eslint-plugin-promise**     | 7      | Правила для промисов                       |
| **Bash-скрипты**              | —      | Оркестрация запуска dev-окружения          |

---

## Архитектура

### Структура монорепозитория

```
tech-task-for-interview/
├── api/          # Shared: контракты API (типы, SSE-клиент, fetch-обёртка)
├── logic/        # Shared: бизнес-логика (stores, models, CDC)
├── modules/      # Личные библиотеки автора (EventEmitterX, EventSignal)
├── polyfills/    # Полифилы современных JS API
├── type_guards/  # Runtime type-guard утилиты
├── utils/        # Общие утилиты (timers, promise, date, ...)
├── types/        # Глобальные TypeScript типы
├── backend/      # Только серверный код (Fastify + Prisma)
├── frontend/     # Только клиентский код (React + Vite)
├── tests/        # Тесты shared-кода
└── tests_utils/  # Инфраструктура тестов
```

Ключевая идея: `backend/` и `frontend/` — независимые npm-пакеты, но оба импортируют shared-код с верхнего уровня. Это позволяет переиспользовать типы, модели, store'ы и API-контракты без дублирования.

### Shared API-контракты (`api/routers.ts`)

Каждый HTTP-маршрут описывается **один раз** как `const + namespace`:

```typescript
export const rounds = { method: 'get', url: '/rounds', ... } as const satisfies RouterDescription;
export namespace rounds {
    export type Types = { Querystring: { isActive?: string }, Reply: ... };
}
```

Бэкенд регистрирует маршруты в Fastify используя `rounds.method`, `rounds.url`, `rounds.Types`.  
Фронтенд вызывает API через `apiMethods.getRounds()`, который знает URL и типы ответа.  
Это исключает рассинхронизацию между клиентом и сервером.

### Реактивная система EventSignal

Кастомная реактивная система, вдохновлённая SolidJS Signals:

- `EventSignal<T>` — реактивный контейнер со значением, вычислениями, статусами (`pending`, `error`)
- Интегрируется с React через `React.useSyncExternalStore` (без лишних re-render'ов)
- Компоненты регистрируются через `EventSignal.registerReactComponentForComponentType()` — сигнал сам знает, каким React-компонентом рендериться
- Результат: `activeRoundsStore.signal$` можно положить прямо в JSX как JSX-элемент

```tsx
// RoundsList.tsx
{activeRoundsStore.activeRounds.map(round => round.signal$)}
// ^ signal$ — это одновременно и хранилище данных, и React-элемент
```

### CDC + SSE (Change Data Capture)

`mainProcessChangeDataCapture` — центральная шина событий, работающая по-разному в зависимости от окружения:

- **Node.js (бэкенд):** эмитит события при изменениях данных → рассылает по SSE-каналам всем подключённым клиентам. _TODO: отправлять в Redis для multi-node._
- **Браузер (фронтенд):** подключается к SSE-каналу сервера, получает события и эмитит их локально → обновляются store'ы → обновляется UI.

### Паттерны и подходы

| Паттерн                          | Где используется                                                                            |
|----------------------------------|---------------------------------------------------------------------------------------------|
| **Singleton**                    | `ApplicationStats`, `currentUserStore`, `activeRoundsStore`, `mainProcessChangeDataCapture` |
| **Store**                        | `CurrentUserStore`, `ActiveRoundsStore` — shared между FE и BE                              |
| **Model**                        | `RoundModel` — бизнес-модель с реактивным `signal$`                                         |
| **CDC (Change Data Capture)**    | `mainProcessChangeDataCapture`                                                              |
| **Explicit Resource Management** | `Symbol.dispose` / `using` / `AbortController`                                              |
| **BitMask flags**                | `SSEClientFlags`, `_ActiveRoundsSignalUpdateFlags`                                          |
| **Type-safe event emitter**      | `EventEmitterX<Events>`                                                                     |
| **Schema-driven forms**          | `FormFromSchema` + `FormElementDescription`                                                 |

---

## Сильные стороны

### 1. Единый источник истины для API
Типизированные контракты маршрутов (`api/routers.ts`) используются и на бэкенде (Fastify), и на фронтенде (fetch-обёртка). Исключает рассинхронизацию типов запроса/ответа.

### 2. Кастомная реактивная система с интеграцией React
`EventSignal` — нетривиальная реализация реактивных сигналов с поддержкой:
- async-вычислений (`Promise`-значения)
- статусов `pending` / `error` / `ok`
- `useSyncExternalStore` для zero-overhead интеграции с React
- Механизма `registerReactComponentForComponentType` — сигналы сами знают, как рендериться в React-дерево.

### 3. Безопасная аутентификация
- Пароли хэшируются через `node:crypto.scrypt` (memory-hard алгоритм, защита от GPU-атак)
- Сравнение хэшей через `timingSafeEqual` (защита от timing-атак)
- Наивная anti-brute-force защита: случайная задержка при попытке зарегистрировать существующий email

### 4. SSEClient с production-ready логикой
- Экспоненциальный backoff при реконнекте (с максимумом 30 сек)
- Ограничение количества попыток реконнекта (`maxRetries`)
- Корректная обработка `AbortSignal` и ручного disconnect
- `Symbol.dispose` для явного освобождения ресурсов
- `AbortSignal.any([...])` для объединения нескольких сигналов отмены
- Битовые маски для состояний (`SSEClientFlags`) — компактно и без ошибок

### 5. Управление жизненным циклом через AbortController
Единый `mainProcessAbortController` пронизывает весь стек: сервер, SSE-клиенты, таймеры, тесты. Корректная очистка ресурсов при завершении процесса или тестов через `afterAll`.

### 6. Explicit Resource Management (TC39 Stage 4)
Используется `using` и `Symbol.dispose` для deterministic cleanup — например, в `processStream` SSEClient'а и `createAbortSignalTimeout`. Это современный подход, который только появился в TypeScript 5.2.

### 7. Полифилы «под себя»
Вместо подключения `core-js`, автор реализовал собственные полифилы для актуальных API: `Promise.withResolvers`, `Symbol.dispose`, расширения `Map`, `WeakMap`, `Object`. Это снижает зависимость от сторонних полифил-библиотек.

### 8. Инфраструктура интеграционных тестов
- Тесты запускают **реальный Fastify** (не mock)
- `InterceptOutgoingHTTP` (на базе `mitm`) перехватывает HTTP прямо на уровне TCP — запросы не уходят в сеть, но проходят через реальный стек Fastify
- `debugTimers` — утилита для управления таймерами в тестах
- Dual test runner: Jest (backend) + Bun (shared)

### 9. Observability / мониторинг
`ApplicationStats` — легковесный singleton для трекинга:
- счётчики запросов, ошибок
- множество открытых запросов
- авто-shutdown при отсутствии активности (dev-режим)

### 10. Environment detection
`utils/runEnv.ts` — детальное определение окружения: `isNodeJS`, `isWebMainThread`, `isWebWorker`, `isBun`, `isTest`. Позволяет одному shared-файлу вести себя по-разному в разных средах.

### 11. Кастомная библиотека type guards
`type_guards/` — коллекция runtime-проверок типов (`assertIsPositiveNumber`, `assertIsNonEmptyString`, `assertIsNonEmptyArray` и др.), которые бросают ошибки с описательными сообщениями. Используется повсеместно для защитного программирования.

### 12. Автоматическое определение порта
Сервер может запускаться на свободном порту (`getFreePort`), а фронтенд получает этот порт через переменную окружения автоматически — bash-скрипт grep'ает вывод сервера.

---

## Слабые стороны и технический долг

### Критические / Блокирующие продакшн

#### 1. 🔴 SQLite как база данных
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./data/dev.db"
}
```
SQLite не поддерживает конкурентную запись, не масштабируется горизонтально. Закомментированный `uuidv7` намекает на желание перейти на PostgreSQL, но миграции не выполнены.

#### 2. 🔴 Хардкод задержки 2 секунды в production-коде
```typescript
// backend/src/routerHandlers/roundsRouters.ts
await promiseTimeout(2000); // <- в обработчике GET /rounds
```
Искусственная задержка в 2 секунды на каждый запрос списка раундов — скорее всего отладочный артефакт, который попал в рабочий код.

#### 3. 🔴 `console.log` в `App.tsx`
```tsx
console.log((globalThis as unknown as { __BACKEND_PORT__?: string }).__BACKEND_PORT__);
```
Отладочный вывод в точке входа фронтенда.

#### 4. 🔴 Роль пользователя определяется по имени
```typescript
const role: UserRole = (name === 'admin' || name === 'test_admin')
    ? 'ADMIN'
    : name.toLowerCase() === 'никита'
        ? 'USER_HIDE_TAPS'
        : 'USER'
;
```
Любой, кто зарегистрируется с именем `admin`, получит права администратора. Это грубая уязвимость безопасности.

### Незавершённая функциональность

#### 5. 🟡 Нет поддержки multi-node (Redis не реализован)
```typescript
// logic/mainProcessChangeDataCapture.ts
if (isNodeJS) {
    // todo: Тут можно подписаться на канал изменений в Redis...
}
```
CDC между несколькими инстансами сервера не работает. При горизонтальном масштабировании клиенты разных нод не будут получать события друг друга.

#### 6. 🟡 Незакрытые раунды не загружаются при старте сервера
```typescript
// backend/src/services/roundsService.ts
// todo: Загружать из базы незакрытые раунды и отслеживать их состояние
```
При рестарте сервера активные раунды не будут завершены автоматически.

#### 7. 🟡 JWT-refresh логика помечена как нерабочая
```typescript
// api/request.ts
// todo: Сейчас это не работает как надо. Должно:
//  1. При любой ошибке в попытке обновить JWT-токен нужно делать N-попыток
//  2. При исчерпании попыток — возвращать оригинальную ошибку
```

### Качество кода и конфигурация

#### 8. 🟡 `eslint-plugin-unicorn` установлен, но не подключён
`package.json` содержит `"eslint-plugin-unicorn": "^59.0.1"`, однако в `eslint.config.mjs` этот плагин не импортируется и не используется. Мощный набор правил простаивает.

#### 9. ✅ ~~Нет тестов для frontend~~ — покрыто (Vitest + Testing Library)
```
frontend/src/tests/
├── components/   Meter, FormFromSchema, AuthForm  (25 тестов)
├── layouts/      AppLayout                        (5 тестов)
├── hooks/        useAuth                          (5 тестов)
└── eventHandlers/ clicks, forms                  (19 тестов)
```
54 теста, test runner — Vitest 4 + @testing-library/react 16.

#### 10. 🟡 Модули в `/modules` поставляются минифицированными без исходников
`modules/EventEmitterX/events.js`, `EventSignal.js` — минифицированный JavaScript без исходников в репозитории. Отладка, понимание поведения и вклад в код затруднены. Указано, что будет выложено в npm, но сроки неизвестны.

#### 11. 🟡 `Round.flags: Int` без документации
```prisma
flags Int
```
Поле `flags` в модели `Round` — битовая маска, но нигде нет enum'а или комментариев с расшифровкой битов. Значения разбросаны по коду неявно.

#### 12. 🟡 CORS разрешён для всех origins
```typescript
await fastifyApp.register(cors, { origin: '*' });
```
Закомментированный `origin: 'http://localhost'` говорит о том, что это заглушка для разработки, не предназначенная для продакшна.

#### 13. 🟡 Незакрытые вопросы в WIP.md
ESLint-правила `multiline-ternary`, `comma-dangle`, `comma-style` помечены как «work in progress» — часть проекта не соответствует собственным стандартам кодирования.

#### 14. 🟠 Нет Docker / docker-compose
Нет контейнеризации. Запуск требует конкретной версии Node.js, pnpm и bash (что проблематично на Windows без WSL).

#### 15. 🟠 `@ts-expect-error` / `@ts-ignore` в кастомной интеграции
```typescript
// @ts-ignore
createElement: React.createElement,
```
В `registerComponents.ts` используются `@ts-ignore` из-за несовместимости типов между кастомным `EventSignal` и React. Это указывает на неполную типизацию в интерфейсе библиотеки.

#### 16. 🟠 Нет React Error Boundaries
Ошибки рендеринга компонентов не перехватываются, что может приводить к полному падению UI.

---

## Итог

### Оценка

| Категория              | Оценка | Комментарий                                                            |
|------------------------|--------|------------------------------------------------------------------------|
| **Архитектура**        | ⭐⭐⭐⭐⭐  | Нетривиальное разделение shared/FE/BE, единые контракты API            |
| **Реактивная система** | ⭐⭐⭐⭐⭐  | EventSignal — качественная авторская реализация                        |
| **Безопасность**       | ⭐⭐⭐☆☆  | scrypt/timingSafeEqual — хорошо; роль по имени — критическая дыра      |
| **Тесты**              | ⭐⭐⭐⭐☆  | Хорошая инфраструктура на бэкенде, frontend покрыт Vitest              |
| **Production-ready**   | ⭐⭐☆☆☆  | SQLite, задержка 2с, нет Redis, нет Docker                             |
| **Качество кода**      | ⭐⭐⭐⭐☆  | Чистый TypeScript, хорошие абстракции, есть неубранные TODO            |
| **Современность**      | ⭐⭐⭐⭐⭐  | `Symbol.dispose`, `AbortSignal.any`, `Promise.withResolvers`, React 19 |

### Вердикт

Проект демонстрирует **высокий уровень технической культуры** в части архитектуры и используемых подходов: shared-типизированный код, кастомная реактивная система, безопасная работа с crypto, правильное управление жизненным циклом через `AbortController` и `Symbol.dispose`. Это явно не CRUD-шаблон.

Вместе с тем, проект **не готов к production**: SQLite, незакрытые TODO в ключевых модулях, уязвимость с ролями, отсутствие тестов на фронтенде и контейнеризации. Судя по контексту (`tech-task-for-interview`), это сознательный выбор — акцент сделан на демонстрацию архитектурных решений и авторских библиотек, а не на prod-ready инфраструктуру.
