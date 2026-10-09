---
iso date: "2026-10-09T12:36:23.600Z"
timestamp: 1791549383600
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, types, tests, docs"
---

# Проверка исправленной базы — 2026-10-07

## Воспроизведение

Используйте существующие установленные development-зависимости. Изменение не устанавливает, не публикует и не фиксирует новые версии.

```powershell
pnpm verify
# Same pipeline without a pnpm dependency-verification/install step:
node _dev/verify.cjs
```

Отдельные точки входа:

```powershell
pnpm typecheck
pnpm typecheck:contracts
pnpm test --runInBand --ci
pnpm build
pnpm build:parallel
pnpm test:build
pnpm test:signals:gc
node --expose-gc _dev/check_signal_lifecycle.cjs --without-weakref
```

`typecheck:signals` остаётся алиасом того же строгого runner контрактов. `test:build` требует завершённых сборок.
Runner проверок использует текущий исполняемый файл Node для каждого процесса, показывает runtime и останавливается
при ошибке. Ослабленная runtime-трансформация не считается доказательством строгой типизации.

## Наблюдаемые результаты

Среда: Node v26.8.1, TypeScript 5.9.3, Windows x64. Полные временные логи находятся в игнорируемом `build_cache/`.
База перед этим пакетом изменений: 401 проходящий / 14 падающих тестов и 36 диагностик библиотеки.

| Проверка                                                  | Результат                                                                         |
|-----------------------------------------------------------|-----------------------------------------------------------------------------------|
| Строгий tsc только библиотеки                             | 0 диагностик                                                                      |
| Source fixtures контрактов signal/emitter                 | 0 диагностик; положительные и отрицательные проверки                              |
| Сгенерированные потребители CommonJS / NodeNext / Bundler | 2 файла fixtures проходят в каждом режиме; skipLibCheck отключён                  |
| Полный Jest в Node и DOM окружениях                       | 9 наборов проходят; 429 тестов проходят; 0 падений; 1 skip; 6 todo                |
| Последовательные development-сборки CJS / ESM             | Обе проходят; авторские `.d.ts` скопированы                                       |
| Параллельные development-сборки CJS / ESM                 | Обе проходят                                                                      |
| Потребители настоящих outputs обеих сборок                | Обе проходят                                                                      |
| Настоящий CJS runtime smoke                               | Ожидание событий, накопительные reducers, computed-зависимости и dispose проходят |
| Нативный weak lifecycle                                   | Девять GC-сценариев и контроль живого владельца проходят                          |
| Fallback без нативного WeakRef                            | Явный dispose проходит; автоматическая GC не обещается                            |

Четырнадцать новых точечных Node/DOM-тестов покрывают сравнительное поведение emitter, нативную очистку и timing.
Двенадцать падений timing исчезают при явной передаче Node performance. Два падения отложенных ошибок исчезают в том
же полном запуске; сценарии iterator не отключались и не ослаблялись. Peer-предупреждение TypeScript/ts-jest
сохраняется, а тесты ошибочных путей signal намеренно пишут ошибки в лог.

## Владение оставшимися сценариями

Владение обозначает ответственный модуль, а не назначение конкретному человеку.

| Существующий незавершённый сценарий                     | Источник                                                             | Владелец                          | Цель                                                                    |
|---------------------------------------------------------|----------------------------------------------------------------------|-----------------------------------|-------------------------------------------------------------------------|
| Ошибка computation отменяет computation других сигналов | `spec/modules/EventEmitterEx/EventSignal_spec.ts`, `errors handling` | EventSignal computation/lifecycle | Этапы 02/03: определить распространение до включения существующего skip |
| SimpleProxy removeAllListeners с undefined              | `spec/modules/events_spec.ts`, EventEmitterSimpleProxy               | Подписки simple proxy             | Контракты emitter этапа 03                                              |
| SimpleProxy removeAllListeners с именем события         | Та же группа                                                         | Подписки simple proxy             | Контракты emitter этапа 03                                              |
| SimpleProxy removeAllListeners с proxy hook             | Та же группа                                                         | Владение hook simple proxy        | Контракты emitter этапа 03                                              |
| Proxy removeAllListeners с undefined                    | `spec/modules/events_spec.ts`, EventEmitterProxy                     | Подписки proxy                    | Контракты emitter этапа 03                                              |
| Proxy removeAllListeners с именем события               | Та же группа                                                         | Подписки proxy                    | Контракты emitter этапа 03                                              |
| Proxy removeAllListeners с proxy hook                   | Та же группа                                                         | Владение hook proxy               | Контракты emitter этапа 03                                              |

Сценарии существовали до исправления. Условные ветки emitter/DOM старого helper не являются ещё семью незавершёнными
сценариями; структурный результат Jest фиксирует ровно один skip и шесть todo выше. Новых skip/todo нет.

## Границы и дальнейшая работа

Глобальная реализация сигналов со слабыми callbacks остаётся в `dev`; эксперимент каналов экземпляров хранится отдельно.
Историческая реализация не перемещалась, packages не редактировались, сгенерированные demo-копии не менялись.
[Матрица совместимости](../../docs/EVENT_COMPATIBILITY_RU.md) описывает проверенные контракты и открытые отличия от Node.

Pipeline воспроизводим с этим установленным toolchain; чистая установка зависимостей, фиксация версий, CI и расширенные
матрицы Node/TypeScript остаются работой этапа 01. Реальные React/SSR — отдельная работа. ESM output по-прежнему имеет
`.js` в development-дереве; нативный `.mjs`-пакет, export maps, чистые tarballs и изолированные установленные потребители
остаются этапом 06. Запуск не доказывает готовность релиза или универсальные показатели производительности.

## Продолжение контрактов emitter — 2026-10-09

Предыдущие результат/таблица выше сохраняют базу 2026-10-07. Предыдущая контрольная точка контрактов emitter: 11 успешных наборов,
480 успешных тестов, ноль ошибок/todo и один прежний skip распространения ошибок EventSignal. Шесть proxy todo
заменены исполняемыми ownership-тестами в `spec/modules/EventEmitterEx/EventEmitterSimpleProxy_spec.ts` и
`spec/modules/EventEmitterEx/EventEmitterProxy_spec.ts` с общим `spec_utils/proxySubscriptionOwnership.ts`.
Контракты исходников/деклараций дают ноль диагностик; обе сборки, реальный CJS output, 24 порядка загрузки emitter
в отдельных процессах и native/fallback GC проходят. Node 26.8.1, TypeScript 5.9.3, Windows x64; прежнее ts-jest peer предупреждение сохраняется.
[Совместимость и миграция](../../docs/EVENT_COMPATIBILITY_RU.md), [владение proxy](../../docs/PROXY_SUBSCRIPTIONS_RU.md).

## Проверка контрактов слушателей — 2026-10-09

Текущий полный `_dev/verify.cjs`: 519 pass, один прежний EventSignal skip, ноль ошибок/todo; одиннадцать наборов.
39 дополнительных runtime-случаев покрывают лимиты, reentrancy, callback identity, static inspection и браузерные
warning/lifecycle контракты. Первый расширенный Node-прогон воспроизвёл 23 ошибки; все исправлены. Строгая библиотека
и source/emitted tuple/proxy/interface fixtures без диагностик в CommonJS, NodeNext и Bundler. Обе сборки,
выполнение CJS, 24 порядка импорта и native/fallback GC проходят. Новых ts-jest TS-диагностик нет; прежнее peer-warning
TypeScript и console-вывод EventSignal сохранены. Среда: Node 26.8.1 / TS 5.9.3, Windows x64.
[Контракты и ограничения](../../docs/EVENT_COMPATIBILITY_RU.md); другие версии/CI остаются этапом 01.
