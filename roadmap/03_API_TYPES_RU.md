---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 03 — Публичные контракты и точные типы

Приоритет P0 для корректности публичных деклараций и заявлений совместимости, P1 для расширений удобства. Зависит от 01,
lifecycle проверяется вместе с 02.

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
