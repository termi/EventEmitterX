---
iso date: "2026-10-08T22:55:40.798Z"
timestamp: 1791500140798
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 03 — Публичные контракты и точные типы

Приоритет P0 для деклараций и совместимости; P1 для удобства. Зависит от 01; lifecycle проверяется совместно с 02.

## 03.1 — Автоматический вывод типов сигнала

Статус: основная часть реализована на TypeScript 5.9.3. См. [контракт, решения и миграцию](03_SIGNAL_CONTRACT_RU.md).

- [x] Отдельно определить T/S/D/R, initial/resolved output и source/data.
- [x] Проверить inline, named, Jest mock и self.data callbacks; sync/async/hybrid, Promise initial values, литералы,
  unions, null и undefined.
- [x] Исправить вывод constructor/createSignal; сохранить явные full-self перегрузки.
- [x] Согласовать readers, listeners, React snapshots, set/mutate/map и createMethod.
- [x] Строгие source fixtures и потребители сгенерированных деклараций с CommonJS, NodeNext и Bundler.
- [x] Описать границы вывода, альтернативы и миграцию.
- [ ] Проверить дополнительные версии TypeScript/runtime и выбрать поддерживаемый диапазон.
- [ ] Проверить реальных React/SSR-потребителей и resolution опубликованного пакета.

Запускайте `pnpm typecheck:contracts` (алиас `typecheck:signals` сохранён). Исходники библиотеки и потребители
сгенерированных деклараций теперь требуют ноль диагностик; потребители CommonJS, NodeNext и Bundler используют
`skipLibCheck: false`. См. [проверку базы](verification/BASELINE_VERIFICATION_RU.md).

## 03.1.1 — Inline Data с вложенными методами

- [ ] Восстановить автоматический вывод D для inline data с вложенными методами с параметрами по умолчанию вместе с
  контекстно типизированным computation callback. В сообщённом случае конструктора сейчас выбирается D=undefined;
  воспроизвести его в строгих source fixtures и fixtures опубликованных деклараций до изменения сигнатур.
- [ ] Проверить constructor и createSignal, доступ через self$.data, необязательные числовые аргументы методов и
  неверные аргументы; сохранить проверки sync/async/hybrid inference и полного API self.
- [ ] Сравнить независимый вывод options/data с фабрикой или поэтапным builder. Сохранить существующие позиции generics
  и оценить миграцию перед добавлением generic для options; перегрузки конструктора не могут объявлять собственные
  параметры типов.

Текущий обход: объявить объект data в локальной переменной перед вызовом. Его методы и тип data выводятся без cast или
явных generics. Это исправляет сообщённый случай в спецификации, но не восстанавливает исходную inline-форму.
Эксперименты с сигнатурами не устранили воспроизведение без потери других проверок типов; более широкое изменение API
отложено вместо ослабления деклараций.

## 03.2 — Последовательные computed reducers и ожидание async output

Статус: реализовано. Три последовательных `set(v => ++v)` в trigger-регрессии дают 4 без обхода.

- [x] Приватный рабочий output сохраняет отдельный source и порядок reducers.
- [x] Считать промежуточные computations, кешировать previews и инвалидировать при изменениях source/зависимостей.
- [x] Сохранить ленивость прямых записей, объединение уведомлений и публикацию под контролем throttle.
- [x] Создать очередь на ожидающий output; упорядочить перемежающиеся записи и созданные методы.
- [x] Определить void/Promise completion, ошибки, ожидающие initial values и восстановление.
- [x] Отклонять Promise-returning reducers и обход ожидающих записей через mutation.
- [x] Очищать callbacks очереди через dispose/abort и подавлять поздние завершения после уничтожения.
- [x] Проверить преобразованный output, null, undefined/no-update, async races, subscribers и triggers.

Экземпляр владеет очередью без лимита до завершения или явного disposal/abort. [Этап 02](02_LIFECYCLE_RU.md) реализует
слабое владение уведомлениями и проверяет забытые сигналы нативным GC; внешние handles подписки намеренно удерживают
владельца. Переносимость runtime и более широкие контракты lifecycle зависимостей остаются открытыми.

## Оставшаяся работа по EventSignal

- [ ] Определить явный runtime async-контракт чтения для корректного Promise-only
  типа get даже у обычных Promise-returning functions, уничтоженных до первого
  вызова. Сравнить объявляемый режим чтения с отдельной async-фабрикой;
  сохранить вывод, ленивость и sync/hybrid-потребителей. Один R стирается.
- [ ] Систематически проверить динамические зависимости, cycles и границы до/после await; не обещать отсутствующее async
  tracking.
- [ ] Проверить DTO-проекцию над числовой revision и integration cleanup.
- [ ] Отдельно рассмотреть сохраняющий метаданные или двусторонний projection API; текущий map односторонний.
- [x] Исправить глобальное удержание уведомлениями через слабые callbacks на этапе 02.
- [ ] Завершить оставшиеся контракты lifecycle подписок/зависимостей этапа 02 до релиза.
- [ ] Рассмотреть независимо отменяемые записи или лимиты очереди при потребительских требованиях; не терять принятые
  записи незаметно.

## EventEmitterX и алиас EventEmitter

Эталон — `node:events` (имя `node:event` из обсуждения уточняется до реального built-in). Алиас экспортирует тот же
конструктор, не wrapper и не другую реализацию.

- [ ] Differential suite сравнивает default configuration с нативным EventEmitter: порядок, sync emit, this, повторные
  listeners, once wrappers/rawListeners, prepend, removeListener/removeAllListeners, listeners/eventNames/listenerCount,
  новые/удалённые слушатели во время emit, newListener/removeListener, error/errorMonitor, captureRejections,
  maxListeners.
- [x] Включить символы в eventNames; сравнить перечисление строковых, символьных и числовых ключей с нативным Node.
- [ ] Для static once/on/addAbortListener/getEventListeners и options составить отдельную матрицу: реализовано,
  расширено, отличается, отсутствует. Не обещать весь модуль node:events на основании совместимого класса.
- [ ] Проверить типы event maps, tuples/readonly tuples, symbol keys, this, перегрузки и structural compatibility с Node
  EventEmitter.
- [ ] Сравнить AbortSignal/stopImmediatePropagation, cleanup once при success/error/abort/timeout, и EventTarget
  semantics отдельно от Node.

Начальный differential/DOM-набор содержит 14 успешных тестов на Node 26.8.1. Закрытые event maps, символьные payloads,
identity слушателей, типизация rejection hook и структурное присваивание Node проверяются строгими
fixtures. [Матрица совместимости](../docs/EVENT_COMPATIBILITY_RU.md) фиксирует покрытые контракты и открытые границы;
README теперь ссылается на неё вместо утверждения полной совместимости. Полный differential-набор, readonly tuples,
покрытие статических helpers и дополнительные runtimes остаются открытыми.

Официальный эталон: [Node events](https://nodejs.org/api/events.html).

## Реализованные контракты emitter — 2026-10-09

- [x] Завершить обе группы владения/очистки proxy и заменить шесть todo на 28 исполняемых случаев.
- [x] Исправить mixed on/once bridges, символьные/falsy/coerced ключи, владение записанным routing и восстановление после исключения получателя.
- [x] Сравнить errorMonitor до необработанной ошибки и изменения handlers монитором с нативным Node.
- [x] Возвращать once results в captureRejections и сохранять this rejection hook.
- [x] Сравнить нативный addAbortListener и явно проверить/описать границы DOM fallback.
- [x] Добавить положительные/отрицательные fixtures generic proxy для исходников и сгенерированных деклараций.

Проверка Node 26.8.1 / TypeScript 5.9.3: 480 pass, ноль fail/todo, один прежний skip EventSignal; строгие типы,
обе сборки, все 24 порядка загрузки CJS и GC проходят. [Контракты proxy](../docs/PROXY_SUBSCRIPTIONS_RU.md) и
[обновлённая совместимость/миграция](../docs/EVENT_COMPATIBILITY_RU.md) описывают границы.
Полная differential/static helper матрица, maxListeners, readonly tuples и дополнительные runtimes остаются открытыми.
Перенос proxy отдельно закоммичен как `adaa15d`; его history merge/rename коммиты нельзя squash-ить.

## Завершение

Каждая публичная форма имеет точный runtime/type пример, отрицательные type checks, документированный cleanup и
async-контракт. Потребителю Junct не нужен урезанный интерфейс, wrapper StateSignal или принудительное чтение после set.
Breaking changes получают миграционные примеры.
