---
iso date: "2026-10-06T21:36:58.824Z"
timestamp: 1791322618824
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, types, tests, docs"
---

# Совместимость EventEmitterX: проверенные границы

## Эталон и покрытие

Эталон этого запуска — установленный нативный `node:events` в Node 26.8.1, Windows x64.
Это точечная матрица, а не заявление о полной совместимости с модулем Node или диапазоне поддерживаемых runtime.
Запускайте `pnpm verify` для отдельных проверок типов библиотеки, потребителей, runtime, сборок и GC.

`spec/node/events_node_spec.ts` явно использует Node-окружение. Существующий набор тестов emitter и
`spec/modules/events_dom_spec.ts` явно используют jsdom. DOM EventTarget не является Node EventEmitter;
обработку error-событий, объекты событий и опции необходимо оценивать отдельно.

| Контракт                                                          | Доказательство                                                      | Статус                                                                            |
|-------------------------------------------------------------------|---------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| Синхронный emit, порядок, this listener и дубликаты               | Сравнительная последовательность с Node                             | Проверено                                                                         |
| Once/prependOnce и вложенный once                                 | Сравнительная последовательность и идентичность обёрток             | Проверено                                                                         |
| Изменение listeners при emit                                      | Удаление существующего callback и добавление другого                | Проверено для этого сценария                                                      |
| listeners/rawListeners и идентичность исходного once              | Нативные и собственные callbacks, удаление по исходной идентичности | Проверено; raw-обёртки предоставляют `.listener`                                  |
| Порядок eventNames для строк/символов/чисел                       | Сравнительное перечисление до/после удаления                        | Проверено; числовой ввод — явное расширение типов и превращается в строковый ключ |
| Идентичность once в newListener/removeListener                    | Сравнительная последовательность lifecycle                          | Проверено для доставки once                                                       |
| Очистка static once при успехе/error/abort                        | Нативная и собственная реализации в Node                            | Проверено                                                                         |
| Очистка static on при next/return/throw                           | Нативная и собственная реализации в Node                            | Очистка проверена; равенство немедленного результата throw не заявляется          |
| captureRejectionSymbol и hook обычного async listener             | Идентичность стандартного символа и результат hook                  | Проверено                                                                         |
| Успех/abort DOM-ожидания с timing                                 | Идентичность DOM-события, явный provider и удаление listener        | Проверено отдельно                                                                |
| Структурное присваивание Node EventEmitter                        | Строгие fixtures исходников и сгенерированных declarations          | Проверено как контракт типов, не доказательство равенства runtime                 |
| Типизированные закрытые объектные карты событий и Symbol payloads | Положительные/отрицательные fixtures исходников и declarations      | Проверено для текущей карты с функциями                                           |
| error/errorMonitor, отклонение async once и maxListeners          | Полная сравнительная матрица с Node                                 | Открыто                                                                           |
| addAbortListener/stopImmediatePropagation и все static helpers    | Полная матрица возможностей                                         | Открыто                                                                           |
| Карты readonly tuple и более широкая матрица типов/runtime        | Дополнительные строгие fixtures и runtime                           | Открыто                                                                           |

## Провайдер timing

Опция `timing` принимает `IEventTiming` — структурный протокол, реально используемый static once:

```typescript
import { EventEmitterX, type IEventTiming } from './modules/events';

const timing: IEventTiming = {
    time(names) { /* Start synchronous measurement(s). */ },
    timeEnd(names, omitNotExisted) { /* End measurement(s). */ },
};
const emitter = new EventEmitterX();
const pending = EventEmitterX.once(emitter, 'data', { timing });
emitter.emit('data', 7);
await pending;
```

`timeClear` опционален; `time` и `timeEnd` обязательны. Вводом могут быть отдельные имена событий или массивы.
Существующие экземпляры ServerTiming остаются структурно совместимыми. Библиотека не создаёт и не импортирует
конкретный пакет timing через этот тип. Providers выполняются синхронно; изменение не добавляет новой обработки
исключений для бросающего provider.

Тесты ServerTiming в jsdom явно передают `node:perf_hooks.performance` через `customPerformance`.
Они не заменяют глобальный DOM performance и не подделывают успешные вызовы timing. Пользовательский browser/runtime
provider должен предоставлять используемые им операции User Timing; библиотека не синтезирует отсутствующие mark/measure.

## Типы, сборки и ограничения

Строгая проверка исходников и потребителей сгенерированных declarations проходит с `skipLibCheck: false` и без
допустимых диагностик. Служебные метаданные listener/debug/error и возможностей EventTarget имеют локальные типы;
глобальные объявления DOM/Node не расширяются, emitter не получает неограниченной Symbol index signature.
Hook отклонений использует тип стандартного unique symbol. Публичный опциональный `.listener` описывает once-обёртки.

Разрабатываемые CJS/ESM-сборки включают авторские декларации. CJS проходит настоящий runtime smoke;
нативная загрузка ESM-пакета, имена `.mjs`, export maps и потребители после чистой установки остаются работой этапа 06.
Внутренние пакеты, сгенерированные demo-копии и эксперимент с каналами экземпляров не изменялись и не внедрялись.

Текущий запуск проходит 429 тестов при одном существующем skip и шести todo. Предупреждение о peer-совместимости
ts-jest 27/TypeScript 5.9 сохраняется; строгие типы проверяются независимо. См. [проверки и оставшиеся сценарии](../roadmap/verification/BASELINE_VERIFICATION_RU.md).
