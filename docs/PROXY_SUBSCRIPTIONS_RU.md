---
iso date: "2026-10-08T22:55:40.798Z"
timestamp: 1791500140798
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, tests, docs"
---

# Proxy-подписки и очистка

## Точки входа и владение

`EventEmitterSimpleProxy` пересылает события одного источника и отправляет события обратно ему.
`EventEmitterProxy` выбирает source/target emitters через options/hooks; прямой emit получателю
требует `allowDirectEmitToTarget: true`. `emitSelf` доставляет локально. Lifecycle-события остаются локальными.

Импортируйте оба через `modules/events` либо напрямую из их модулей в `modules/EventEmitterEx`.
Прежняя точка входа, прямые импорты и core разделяют identity конструкторов/символов. Нативный installed ESM/subpath
packaging остаётся этапом 06; это пути модулей разработки.

Proxy владеет callbacks своих source bridges, а не посторонними слушателями источника. Храните proxy на время жизни
области потребителя и уничтожайте при выходе. Постоянные и once локальные слушатели разделяют постоянный
bridge на source/event группу. Локальные once wrappers удаляются до своих callbacks;
удаление последнего локального слушателя также снимает source bridge.

## Смешанные слушатели и выборочная очистка

```typescript
import { EventEmitterX, EventEmitterSimpleProxy } from './modules/events';

using source = new EventEmitterX();
using proxy = new EventEmitterSimpleProxy({ emitter: source });
source.on('data', value => console.log('another owner', value));
proxy.on('data', value => console.log('persistent', value));
proxy.once('data', value => console.log('first only', value));
source.emit('data', 1);
source.emit('data', 2);
proxy.removeAllListeners('data'); // Preserves the source's other owner.
```

`removeAllListeners()` и `removeAllListeners(undefined)` удаляют все группы proxy.
`removeAllListeners(event)` удаляет только выбранную группу, включая символы, пустые строки и ноль.
Числовые имена — расширение типизации EventEmitterX: `0` и `'0'` разделяют object-key группу и один bridge
на одном источнике. Повторные локальные регистрации дают повторные callbacks, а не повторные bridges.
Вложенный proxy может снять свои подписки, сохранив соседнего потребителя на parent.

## Routing hooks и исключения

Routed proxy запоминает фактические source и identity callback при регистрации. Очистка не вызывает
`getSourceEmitter` заново. Изменение hook влияет на последующие регистрации, но не мигрирует прежние bridges.
Если одно локальное событие зарегистрировано на двух выбранных источниках, оба могут доставлять в эту локальную группу.
Для намеренной миграции удалите группу, измените hook и зарегистрируйте callbacks повторно.

```typescript
import { EventEmitterProxy } from './modules/events';

using first = new EventEmitterX();
using second = new EventEmitterX();
using proxy = new EventEmitterProxy({ sourceEmitter: first });
proxy.on('data', handler);
proxy.removeAllListeners('data');
proxy.setGetSourceEmitter(() => second);
proxy.on('data', handler);
```

Исключение target listener продолжает распространяться. Anti-loop состояние восстанавливается в `finally`,
поэтому последующее source/target событие обрабатывается. У simple proxy нет API source/target hooks.
Произвольные ошибки foreign emitter и reentrant изменения lifecycle hooks требуют более широких контрактов;
существующее подавление ошибок снятия подписок источника не изменено.

## Проверки и решения

28 focused proxy-тестов покрывают владение, смешанные once/on, символы, falsy/coerced ключи, смену routing,
nested/sibling владельцев, нативные источники и восстановление после исключения получателя. Положительные/отрицательные строгие
fixtures проверяют оба generic proxy в исходниках и сгенерированных декларациях. `pnpm verify` дополнительно проверяет
все 24 порядка загрузки CJS, runtime export keys, identity конструкторов/символов, сборки и GC сигналов.

[Обоснование владения](../changelogs/reasons/EventEmitterX_PROXY_SUBSCRIPTION_OWNERSHIP.md),
[перенос с сохранением истории](../changelogs/reasons/EventEmitterX_PROXY_DECOMPOSITION.md),
[границы совместимости](EVENT_COMPATIBILITY_RU.md).
