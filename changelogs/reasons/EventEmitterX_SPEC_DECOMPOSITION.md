---
iso date: "2026-10-09T12:01:13.018Z"
timestamp: 1791547273018
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "tests, docs"
---

# Emitter specification decomposition with preserved history

## Problem and boundaries

`spec/modules/events_spec.ts` mixed the base emitter, simple proxy, routed proxy, event awaiting,
iterators and compatibility helpers in 4,718 lines. The implementation already has matching domain modules.
The user authorized intermediate branches and commits only for relocating existing tests; pending behavior
fixes must be backed up and restored without committing them.

The replacements under `spec/modules/EventEmitterEx/` are:

- `EventEmitterX_spec.ts`: base emitter and subclass contracts, `static once`, iterators and helpers.
- `EventEmitterSimpleProxy_spec.ts`: only the simple proxy contracts.
- `EventEmitterProxy_spec.ts`: only the routed proxy contracts.

Existing test bodies retain their text and nesting. Relative imports gain one directory level.
Both proxy assertions in the original mixed `isEventEmitterX from this context` test move into their
existing `instanceof` cases; the base assertion remains in the core specification. No cases are added or removed.
The core retains the AbortController-polyfill setup; proxy files retain jsdom and load only their required imports.
Example: `events EventEmitterProxy destructor` has the same test name and expectations, but a dedicated file.
`static once` remains with the core until EventAwait extraction.

## History mechanism

Base: `adaa15d6a8f1a894fa4f3c684eab876cbca13459`. Each intermediate branch renames the whole original specification, without edits:

| Branch | Rename commit |
|---|---|
| `split/emitter-core-spec-history` | `c909f0fb9eceb7405f10b5c0f3db5e5224d3fa67` |
| `split/emitter-simple-proxy-spec-history` | `25f76ca101ee2b80f857251dbe058ec36c1c0a7c` |
| `split/emitter-proxy-spec-history` | `3ff3a4aeea0cb10c2c5a140428cddda6efcccceb` |

The four-parent merge `0c43d5a9569d9cd0c3f53f4e21fceb02fbfa6a2e` retains the base plus all three rename parents and full copies.
The following ordinary extraction removes the old file and trims the copies to their domain boundaries.
Existing history is not rewritten. Keep the rename commits and merge; do not squash them.
This repeats the [full-rename preparation used for source decomposition](EventEmitterX_PROXY_DECOMPOSITION.md).

Full-file `git --no-pager blame -M -C -C` was compared with the same command at the base.
`git --no-pager log --follow -- <destination>` reaches the original file history.

| Destination line at extraction | Original line | Original commit |
|---|---:|---|
| `EventEmitterX_spec.ts:246` | 248 | `ee49f6f` |
| `EventEmitterX_spec.ts:2484` | 2758 | `00fad11` |
| `EventEmitterX_spec.ts:4307` | 4581 | `182551f` |
| `EventEmitterSimpleProxy_spec.ts:9` | 2486 | `f6ae0f5` |
| `EventEmitterSimpleProxy_spec.ts:24` | 2496 | `f6ae0f5` |
| `EventEmitterSimpleProxy_spec.ts:96` | 2568 | `ecee3f7` |
| `EventEmitterProxy_spec.ts:9` | 2602 | `3107b62` |
| `EventEmitterProxy_spec.ts:104` | 2692 | `3107b62` |
| `EventEmitterProxy_spec.ts:147` | 2735 | `3107b62` |

These line numbers describe the relocation snapshot. Restored fixes may shift them. Use full-file blame:
restricting it with `-L` can remove the context needed for copy detection and attribute an unchanged short
line to the extraction. New headers and import adjustments properly belong to the extraction.

## Alternatives and tradeoffs

| Alternative | Benefits | Costs and decision |
|---|---|---|
| Ordinary fragment copies | Small commit graph | Relies entirely on copy heuristics; rejected for the history requirement |
| Full rename branches and multi-parent preparation | Explicit ancestry for every destination | Intermediate snapshots duplicate suites and are not runnable acceptance points; chosen |
| Split `static once` too | Smaller core specification | Exceeds the requested current domains; deferred with EventAwait |
| Mix pending fixes into extraction | One verification pass | Conceals behavior changes and violates commit authorization; rejected |

An exact-byte ignored backup plus a retained Git stash covers tracked and untracked pending files.
Restoration applies their test fragments to the new destinations rather than overwriting the new proxy
specification with the former untracked regression file. Shared future regression contracts can live in
`spec_utils/`; they are separate from this committed relocation.

## Verification and limitations

Before and after: 429 passing tests, zero failures, one existing skip and six existing todo; 436 cases total.
All test names and statuses match as multisets. Suites change from nine to eleven because one file becomes three.
Nine sampled original commit identities match across the three destinations.
The complete `_dev/verify.cjs` pipeline passes: strict library/source/declaration types, Jest, CJS/ESM builds,
built-output execution, 24 fresh-process emitter import orders and native/fallback lifecycle checks.
No production source changes are included. Pending proxy and Node compatibility fixes remain a separate change set.

---

## [RU] Проблема и границы

`spec/modules/events_spec.ts` объединял базовый emitter, простой proxy, маршрутизируемый proxy, ожидание
событий, итераторы и вспомогательные проверки совместимости в 4 718 строках. Реализация уже разделена по доменам.
Пользователь разрешил промежуточные ветки и коммиты только для переноса существующих тестов; текущие
исправления поведения нужно сохранить в резервной копии и восстановить без коммита.

Замены в `spec/modules/EventEmitterEx/`:

- `EventEmitterX_spec.ts`: контракты базового emitter и подкласса, `static once`, итераторы и helpers.
- `EventEmitterSimpleProxy_spec.ts`: только контракты простого proxy.
- `EventEmitterProxy_spec.ts`: только контракты маршрутизируемого proxy.

Текст и вложенность существующих тестов сохранены. Относительные импорты получают ещё один уровень каталога.
Обе proxy-проверки исходного смешанного теста `isEventEmitterX from this context` перенесены в существующие
проверки `instanceof`; проверка базового класса остаётся в основном файле. Тесты не добавлены и не удалены.
Core сохраняет настройку полифилла AbortController; proxy-файлы сохраняют jsdom и загружают только нужные импорты.
Пример: `events EventEmitterProxy destructor` сохраняет имя и ожидания, но находится в отдельном файле.
`static once` остаётся с core до выделения EventAwait.

## [RU] Механизм сохранения истории

Базовый коммит: `adaa15d6a8f1a894fa4f3c684eab876cbca13459`. Каждая промежуточная ветка переименовывает весь исходный файл без правок:

| Ветка | Коммит переименования |
|---|---|
| `split/emitter-core-spec-history` | `c909f0fb9eceb7405f10b5c0f3db5e5224d3fa67` |
| `split/emitter-simple-proxy-spec-history` | `25f76ca101ee2b80f857251dbe058ec36c1c0a7c` |
| `split/emitter-proxy-spec-history` | `3ff3a4aeea0cb10c2c5a140428cddda6efcccceb` |

Merge с четырьмя родителями `0c43d5a9569d9cd0c3f53f4e21fceb02fbfa6a2e` сохраняет базовый коммит, три rename-родителя и полные копии.
Следующий обычный коммит переноса удаляет старый файл и сокращает копии до доменных границ.
Существующая история не переписана. Сохранить rename-коммиты и merge; не использовать squash.
Это повторяет [подготовку полными переименованиями при разделении исходников](EventEmitterX_PROXY_DECOMPOSITION.md).

Полнофайловый `git --no-pager blame -M -C -C` сравнивался с такой же командой на базовом коммите.
`git --no-pager log --follow -- <destination>` достигает истории исходного файла.

| Строка назначения на момент переноса | Исходная строка | Исходный коммит |
|---|---:|---|
| `EventEmitterX_spec.ts:246` | 248 | `ee49f6f` |
| `EventEmitterX_spec.ts:2484` | 2758 | `00fad11` |
| `EventEmitterX_spec.ts:4307` | 4581 | `182551f` |
| `EventEmitterSimpleProxy_spec.ts:9` | 2486 | `f6ae0f5` |
| `EventEmitterSimpleProxy_spec.ts:24` | 2496 | `f6ae0f5` |
| `EventEmitterSimpleProxy_spec.ts:96` | 2568 | `ecee3f7` |
| `EventEmitterProxy_spec.ts:9` | 2602 | `3107b62` |
| `EventEmitterProxy_spec.ts:104` | 2692 | `3107b62` |
| `EventEmitterProxy_spec.ts:147` | 2735 | `3107b62` |

Номера строк относятся к снимку переноса. Восстановленные исправления могут их сдвинуть. Использовать полнофайловый
blame: ограничение через `-L` может убрать контекст для обнаружения копий и приписать неизменённую короткую
строку коммиту переноса. Новые заголовки и исправления импортов закономерно относятся к переносу.

## [RU] Альтернативы и компромиссы

| Альтернатива | Преимущества | Цена и решение |
|---|---|---|
| Обычное копирование фрагментов | Небольшой граф коммитов | Полная зависимость от эвристик копирования; отклонено из-за требования истории |
| Полные rename-ветки и подготовительный merge | Явная связь каждого назначения с историей | Промежуточные снимки дублируют наборы тестов и не являются точками проверки; выбрано |
| Одновременно выделить `static once` | Меньше основной файл | Выходит за запрошенные доменные границы; отложено до EventAwait |
| Смешать текущие исправления с переносом | Один цикл проверки | Скрывает изменения поведения и нарушает разрешение на коммиты; отклонено |

Точная побайтовая резервная копия в игнорируемом каталоге и сохранённый Git stash охватывают tracked/untracked-файлы.
Восстановление применяет фрагменты тестов к новым назначениям вместо перезаписи нового proxy-файла прежним
untracked-файлом регрессионных тестов. Общие будущие регрессионные контракты могут находиться в `spec_utils/`;
они отделены от этого закоммиченного переноса.

## [RU] Проверка и ограничения

До и после: 429 прошедших тестов, ноль ошибок, один прежний skip и шесть прежних todo; всего 436 случаев.
Имена и статусы всех тестов совпадают как мультимножества. Наборов стало одиннадцать вместо девяти, поскольку один файл стал тремя.
Девять выбранных исходных коммитов строк совпадают во всех трёх назначениях.
Полный `_dev/verify.cjs` проходит: строгие типы библиотеки/исходников/declarations, Jest, сборки CJS/ESM,
выполнение сборки, 24 порядка импорта emitter в отдельных процессах и native/fallback-проверки жизненного цикла.
Изменения production-кода не включены. Текущие исправления proxy и совместимости с Node остаются отдельным набором изменений.
