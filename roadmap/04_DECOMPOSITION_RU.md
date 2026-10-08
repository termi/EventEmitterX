---
iso date: "2026-10-08T22:45:04.362Z"
timestamp: 1791499504362
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 04 — Декомпозиция с сохранением git-истории

Приоритет P1. Требование владельца: **переносы должны сохранять возможность проследить историю перенесённых строк**. Не
переписывать историю существующих веток и не смешивать перенос с поведением, форматированием или массовым
переименованием переменных.

## Границы модулей

- [x] Вынести всю React-работу EventSignal в отдельный адаптер, например `eventSignalReactIntegration.ts`: initReact,
  hooks/use/useListener, JSX element properties, component registration/context/error boundary и React scheduler.
- [x] Ядро EventSignal отвечает за значение, зависимости, scheduling вычислений, subscriptions и lifecycle. Связь с
  React — узкий adapter interface; существующие методы временно делегируют, сохраняя API. Не устраивать runtime cycle
  core ↔ adapter.
- [ ] Вынести реализацию `EventEmitterX.static once` в модуль **EventAwait**, например `EventAwait.ts`. Сохранить
  EventEmitterX.once как делегирующий compatibility entry и типовые overloads. EventAwait не импортирует EventEmitterX
  runtime только ради базового ожидания.
- [ ] Следующим шагом выделить subscription/trigger/cleanup primitives и общие emitter/EventTarget helpers, если
  измеренное сцепление это оправдывает.
- [x] Вынести оба proxy-класса и emitter core в отдельные модули реализации с сохранением прежней точки входа.
- [ ] Оценить async iterator как отдельный публичный модуль; избегать раздробления на файлы
  без ясной ответственности.
- [ ] Реэкспортировать модули через индекс и subpaths без изменения identity классов и singleton registries внутри одной
  сборки.

## Завершённое выделение React

Реализовано в dev от main 4e3b6c1. eventSignalReactIntegration.ts содержит hooks, initialization,
JSX, component registry/context и rendering; animationFrameScheduler.ts содержит
RAF pool. Ядро сохраняет state, computation, dependencies, writes/lifecycle и
публичные delegating методы. Обратный импорт ядра в адаптере — только type-only.

[Обоснование и проверка истории](../changelogs/reasons/EventSignal_REACT_DECOMPOSITION.md)
фиксируют ветки, merge и девять проверенных исходных line commits. log --follow
доходит до старой истории; для перемещённых React-блоков нужен blame -M -C -C.
Rename-коммиты и multi-parent merge нельзя squash-ить.

Проверка: 108 EventSignal tests passed, 1 skipped; пять новых React-тестов также
проходят на исходнике main. Строгие fixtures и три режима деклараций проходят
при тех же 36 library diagnostics. Полный набор: 391 passed, те же 14 ошибок
events_spec, 1 skipped, 6 todo. Real React/SSR, самостоятельный consumer React
entry point и последующее выделение таймеров/adapters остаются открытыми.

## Завершённый перенос emitter/proxy — 2026-10-09

Базовая реализация и оба proxy-класса теперь находятся в отдельных модулях `modules/EventEmitterEx`.
`modules/events.ts` — совместимая точка реэкспорта; история реализации сохранена в новых файлах.
Проходят все 429 существующих тестов, строгие контракты, обе сборки и GC. Двадцать четыре порядка загрузки в отдельных процессах сохраняют
identity конструкторов/символов и пересылку. [Решение и девять проверенных образцов истории](../changelogs/reasons/EventEmitterX_PROXY_DECOMPOSITION.md).
Исправления поведения proxy и перенос iterator/EventAwait остаются отдельной работой. Сохранить rename-коммиты и merge с четырьмя родителями.

## Процедура сохранения истории

Git отслеживает snapshots, а rename/copy выводится эвристически; `git mv` само по себе не гарантирует историю каждого
извлечённого фрагмента. После переноса проверять и file history, и происхождение строк.

1. Зафиксировать базовую ревизию и состояние файлов; текущие чужие изменения сначала должны быть согласованы в будущем
   этапе реализации. Работать в выделенной ветке/worktree, не терять незакоммиченные файлы.
2. Отделить чистый перенос от последующего исправления импортов/API. Не менять формат текста перемещаемых блоков.
3. Для split большого файла проверить в пробной ветке вариант rename исходного файла в extracted module с удалением
   нерелевантных частей и сохранением остатка в старом пути. При неоднозначной истории — использовать две ветки от
   общего base: одна переименовывает файл в extracted module и оставляет переносимый код, другая
   сохраняет/переименовывает core и оставляет остальной код; merge вручную собирает оба результата и делегирование.
   Комментарий static once уже предлагает подобную стратегию.
4. Не считать двухветочный merge автоматически достаточным: Git может увидеть rename/delete conflicts или выбрать иную
   эвристику. Проверить результат на representative lines; если плохо — изменить размер/порядок чистых переносов до
   принятия merge.
5. После каждого extraction проверить `git --no-pager log --follow -- <new-file>`,
   `git --no-pager log -M -C -- <old-file> <new-file>` и `git --no-pager blame -M -C -C <new-file>` для исходных строк;
   в описании будущего PR указать base, старые/новые пути и примеры исходных commits.
6. Только затем отдельными commits исправлять делегирование/контракты. При финальном merge сохранять commits переноса и
   merge ancestry; squash может уничтожить выбранную трассировку и допускается лишь после повторной проверки и явного
   изменения требования владельцем.

Выделение React выше явно разрешено в dev. Последующие выделения требуют отдельного разрешения.
Точный сценарий выбирать по результату пробной истории, а не по ритуалу двух веток.

## Завершение

Перенесённые строки прослеживаются до pre-refactor commits указанными командами. Runtime и public type fixtures проходят
до/после. Node-only импорт не требует React init; прямой импорт React adapter работает; old entry points делегируют. Нет
случайного двойного registries/constructors из циклических imports. Изменение file layout не становится незаявленным
breaking API.
