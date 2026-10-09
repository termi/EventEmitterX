---
iso date: "2026-10-09T12:36:23.600Z"
timestamp: 1791549383600
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

| Контракт                                                          | Доказательство                                                        | Статус                                                                                                                     |
|-------------------------------------------------------------------|-----------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| Синхронный emit, порядок, this listener и дубликаты               | Сравнительная последовательность с Node                               | Проверено                                                                                                                  |
| Once/prependOnce и вложенный once                                 | Сравнительная последовательность и идентичность обёрток               | Проверено                                                                                                                  |
| Изменение listeners при emit                                      | Удаление существующего callback и добавление другого                  | Проверено для этого сценария                                                                                               |
| listeners/rawListeners и идентичность исходного once              | Нативные и собственные callbacks, удаление по исходной идентичности   | Проверено; raw-обёртки предоставляют `.listener`                                                                           |
| Порядок eventNames для строк/символов/чисел                       | Сравнительное перечисление до/после удаления                          | Проверено; числовой ввод — явное расширение типов и превращается в строковый ключ                                          |
| Идентичность once в newListener/removeListener                    | Сравнительная последовательность lifecycle                            | Проверено для доставки once                                                                                                |
| Очистка static once при успехе/error/abort                        | Нативная и собственная реализации в Node                              | Проверено                                                                                                                  |
| Очистка static on при next/return/throw                           | Нативная и собственная реализации в Node                              | Очистка проверена; равенство немедленного результата throw не заявляется                                                   |
| captureRejectionSymbol и hook обычного async listener             | Идентичность стандартного символа и результат hook                    | Проверено                                                                                                                  |
| Успех/abort DOM-ожидания с timing                                 | Идентичность DOM-события, явный provider и удаление listener          | Проверено отдельно                                                                                                         |
| Структурное присваивание Node EventEmitter                        | Строгие fixtures исходников и сгенерированных declarations            | Проверено как контракт типов, не доказательство равенства runtime                                                          |
| Типизированные закрытые объектные карты событий и Symbol payloads | Положительные/отрицательные fixtures исходников и declarations        | Проверено для текущей карты с функциями                                                                                    |
| error/errorMonitor и async once rejection                         | Мониторинг до исключения, изменения handlers, raw Promise и this hook | Проверено для этих сценариев; заданные maxListeners покрыты ниже                                                           |
| addAbortListener/stopImmediatePropagation                         | Парные нативные Node-тесты и отдельные DOM fallback тесты             | Нативная capability проверена; ограничение propagation браузера явно; покрытие options/версий открыто; матрица границ ниже |
| Tuple-карты payload и более широкая матрица типов/runtime         | Дополнительные строгие fixtures и runtime                             | Адаптер проверен; прямые tuple-generics и другие версии открыты                                                            |

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

Текущий запуск проходит 519 тестов при одном существующем skip и отсутствии todo. Предупреждение о peer-совместимости
ts-jest 27/TypeScript 5.9 сохраняется; строгие типы проверяются независимо. См. [проверки и оставшиеся сценарии](../roadmap/verification/BASELINE_VERIFICATION_RU.md).

## Миграция error и abort — 2026-10-09

Монитор наблюдает необработанную ошибку до исключения emit. Изменения монитора определяют текущие error handlers.
Once callbacks теперь возвращают результат в captureRejections; при выключенном capture отклонённые once Promises больше
не логируются/поглощаются приватно. Включите capture с error handler/hook либо catch в callback. Rejection hooks получают emitter в this.

Node addAbortListener делегирует нативной capability при наличии. Браузерный fallback одноразовый и disposable,
но не обходит stopImmediatePropagation. Pre-aborted регистрация теперь планирует callback; немедленный disposal его
не отменяет. Fallback предоставляет синтетический abort Event; нативный pre-aborted delivery может не передавать event.
Невалидные null signal/callback теперь бросают исключение. Старые/non-native среды используют fallback с его ограничениями.

[Руководство по владению proxy](PROXY_SUBSCRIPTIONS_RU.md), [обоснование error delivery](../changelogs/reasons/EventEmitterX_ERROR_DELIVERY.md),
[обоснование abort capabilities](../changelogs/reasons/EventEmitterX_ABORT_LISTENER_CAPABILITIES.md).

## Группы слушателей и tuple-карты — 2026-10-09

Заданные лимиты теперь следуют порогу и жизни предупреждения Node: `0`/`Infinity` отключают предупреждения;
положительный лимит предупреждает только при превышении. Слушатели не отклоняются. `process.emitWarning` в Node
и `console.warn` в браузере получают Error с `name: 'MaxListenersExceededWarning'`, `emitter`, `type`, `count`.
Prepend/removal сохраняют предупреждавшую группу; удаление или сокращение до одного слушателя позволяют новой
группе предупредить снова. Некорректные лимиты теперь бросают ошибку. Default остаётся **Infinity**, а в Node — десять;
глобального `defaultMaxListeners` нет. Идентичность текста message/stack не обещается.
[Решения по лимитам](../changelogs/reasons/EventEmitterX_LISTENER_LIMITS.md).

Регистрация перечитывает состояние после `newListener`, включая замену таблицы, вложенные подписки и смену лимита.
Уничтожение из callback отменяет незавершённую регистрацию. Удаление дубликатов выбирает последнее добавление.
`listenerCount(event, callback)` считает исходные once-callbacks или raw-wrappers; без фильтра возвращается общее
количество. [Решения по reentrancy](../changelogs/reasons/EventEmitterX_REENTRANT_SUBSCRIPTIONS.md).

Readonly/mutable tuple-карты используют явный адаптер только типов; сырые tuple-карты не являются generic конструктора:

```ts
import { EventEmitterX, type EventMapFromTuples } from './modules/events';
type Events = EventMapFromTuples<{ data: readonly [value: number, label?: string] }>;
const emitter = new EventEmitterX<Events>();
emitter.on('data', (value, label) => { value.toFixed(); label?.toUpperCase(); });
emitter.emit('data', 1);
```

Optional/rest/empty/symbol tuples и оба proxy сохраняют строгие типы. `IEventEmitter.emit` также проверяет payload;
неверные вызовы, ранее принятые через `any[]`, теперь отклоняются. Функциональные карты сохранены. Readonly ограничивает
декларацию, а не замораживает runtime. [Выбор tuple API и границы](../changelogs/reasons/EventEmitterX_TUPLE_MAP_ADAPTER.md).

## Границы статических helpers

| API                                                | Статус                                | Проверенная граница                                                                                                                  |
|----------------------------------------------------|---------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `once`                                             | Реализован с расширениями             | Очистка при success/error/abort и прежние timeout/filter/prepend тесты; точное совпадение Node options/results остаётся открытым     |
| `on`                                               | Реализован с расширениями/отличиями   | Очистка next/return/throw; немедленный результат throw отличается; Node watermark/close options не обещаны                           |
| `addAbortListener`                                 | Native-возможность / browser fallback | Native-защита/disposal и документированное ограничение propagation в браузере                                                        |
| `getEventListeners`                                | Реализован                            | Независимые снимки исходных слушателей custom/native emitter и native EventTarget; introspection произвольного DOM target не обещана |
| Static `getMaxListeners` / `setMaxListeners`       | Отсутствуют                           | Только instance-методы; нет статической настройки нескольких targets                                                                 |
| Global `defaultMaxListeners` / `captureRejections` | Отсутствуют                           | Сохранена per-instance конфигурация; нет module-level defaults                                                                       |

Другие версии Node/runtime/compiler, прямые tuple-generics и точный вывод payload static-await остаются открытыми.
Изменение проверено 519 успешными тестами в одиннадцати наборах, один прежний skip и ноль ошибок/todo;
исходники/declarations без диагностик, сборки/runtime import orders/GC проходят.
