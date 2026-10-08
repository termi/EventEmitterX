---
iso date: "2026-10-08T22:39:08.532Z"
timestamp: 1791499148532
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, tests, scripts, docs"
---

# Emitter and proxy decomposition with preserved history

## Boundary and mechanism

The user requested extracting both proxy classes before changing their behavior and explicitly authorized
intermediate commits and their integration into `dev`, limited to the extraction.
`modules/events.ts` becomes the compatibility re-export entry; preserving its own line ancestry is not required.
Implementation history belongs to these destinations:

- `modules/EventEmitterEx/EventEmitterX.ts`: existing base emitter, event awaiting, helpers and symbols.
- `modules/EventEmitterEx/EventEmitterSimpleProxy.ts`: existing single-source proxy.
- `modules/EventEmitterEx/EventEmitterProxy.ts`: existing routed source/target proxy.

Both proxy implementations import the core directly. The core imports the async iterator at runtime,
whose reverse emitter import is type-only. No new runtime cycle is introduced.
Keeping the core in a barrel that re-exports its derived classes would introduce a core/barrel/proxy cycle;
direct proxy import could then evaluate a subclass before the base class is initialized.

Legacy exports remain unchanged. For example, importing `EventEmitterSimpleProxy` through `modules/events`
or directly through its new module returns the same constructor. `EventEmitter` and the default export remain
the same `EventEmitterX`; lifecycle symbols are not recreated. Existing declarations-only `asTypedEventEmitter`
stays declaration-only, rather than adding an undefined runtime export.

Existing private option/map types and three helper functions are exported from the implementation module
for proxy imports, but are deliberately absent from the compatibility barrel. They are implementation details,
not new supported consumer contracts. Stack sanitization recognizes the relocated `EventEmitterX` filename
as well as the old filename. No listener, forwarding or cleanup behavior is repaired in this extraction.

## Alternatives and tradeoffs

| Approach | Advantages | Disadvantages / decision |
|---|---|---|
| Core module plus two proxy modules and legacy barrel | Direct imports are acyclic; one constructor/symbol set; clear responsibilities | Adds a core path and explicit export list; chosen |
| Keep the base class in the re-export entry | Smaller file move | Runtime cycle with derived classes; rejected |
| Inject the base class or expose lazy proxy factories | Avoids eager subclass initialization | Changes class API, identity or initialization; rejected |
| Copy fragments in an ordinary commit | Small commit graph | History tracking depends on copy heuristics; rejected for this request |
| Rename ancestry branches and a multi-parent merge | Explicit rename ancestry for every destination | Preparation snapshots are not release/build acceptance points; preserve merge parents |

## History procedure and evidence

Based on [Raymond Chen's procedure](https://devblogs.microsoft.com/oldnewthing/20190917-00/?p=102894/)
and the full-rename preparation variant already used for EventSignal in this repository.
Base: `60b184fce8bcfdc89fb12e3801d290ae5dd6129f`. Three branches rename the entire original file:

| Branch | Rename commit |
|---|---|
| `split/emitter-core-history` | `c4f104ed58c902fb3a960287f35220843fbec968` |
| `split/emitter-simple-proxy-history` | `20d6391a2ab8560055a0276fec6f2e110719d5cb` |
| `split/emitter-proxy-history` | `3f8b8b8a15078a9aba5a7f0cd2457ba906bd51ff` |

The four-parent preparation merge is `ddf100105d6f93f2e4de7973fd66f1f15e293372`:
base plus all three rename commits. It retains the original and full copies; the next ordinary extraction
commit trims each implementation and creates the barrel. No old commit or `main` history is rewritten.
Do not squash the rename commits or preparation merge.

`git --no-pager log --follow -- <destination>` reaches the old `modules/events.ts` history.
The following samples use the same `git --no-pager blame -M -C -C` options before and after extraction:

| Destination line at extraction | Original line | Original commit |
|---|---:|---|
| `EventEmitterX.ts:424` | 424 | `34b3522` |
| `EventEmitterX.ts:1251` | 1251 | `edf8983` |
| `EventEmitterX.ts:2714` | 3374 | `edf8983` |
| `EventEmitterSimpleProxy.ts:11` | 2287 | `00fad11` |
| `EventEmitterSimpleProxy.ts:148` | 2424 | `9501910` |
| `EventEmitterSimpleProxy.ts:49` | 2325 | `ecee3f7` |
| `EventEmitterProxy.ts:39` | 2559 | `cc3ba19` |
| `EventEmitterProxy.ts:166` | 2686 | `3107b62` |
| `EventEmitterProxy.ts:307` | 2827 | `3107b62` |

The table describes the extraction snapshot; later fixes can shift lines. New imports/exports properly belong
to the extraction commit. Ordinary blame can differ from move/copy-aware blame on short or repeated text.

## Verification and limitations

The extraction passes 429 tests, zero failures, one existing skip and six existing todo cases.
Strict library and source/emitted-declaration contracts pass with zero diagnostics; both builds,
built CJS execution and native/fallback GC checks pass. `_dev/check_emitter_entry_points.cjs`
checks all 24 fresh-process import orders, legacy runtime export keys, constructor/symbol identity,
forwarding and disposal. It is included in `pnpm verify`.

The check validates built CJS execution; native published ESM resolution remains stage 06.
Proxy cleanup and Node behavior repairs remain a separate change set. Internal dependencies,
generated demos and the experimental signal channel backend are unchanged.

---

## [RU] Границы и механизм

Пользователь попросил вынести оба proxy-класса до исправления поведения и явно разрешил
промежуточные коммиты и их интеграцию в `dev` только для переноса.
`modules/events.ts` становится совместимой точкой реэкспорта; сохранение истории его собственных строк не требуется.
История реализации относится к следующим файлам:

- `modules/EventEmitterEx/EventEmitterX.ts`: существующий базовый emitter, ожидание событий, helpers и символы.
- `modules/EventEmitterEx/EventEmitterSimpleProxy.ts`: существующий proxy одного источника.
- `modules/EventEmitterEx/EventEmitterProxy.ts`: существующий proxy с маршрутизацией источника/получателя.

Оба proxy импортируют core напрямую. Core импортирует async iterator в runtime,
обратный импорт emitter у которого является type-only. Новый runtime-цикл не создаётся.
Сохранение core в barrel с реэкспортом производных классов создало бы цикл core/barrel/proxy;
прямой импорт proxy мог бы вычислить производный класс до инициализации базового.

Прежние экспорты сохранены. Например, импорт `EventEmitterSimpleProxy` через `modules/events`
или напрямую через новый модуль возвращает тот же конструктор. `EventEmitter` и default export остаются
тем же `EventEmitterX`; символы lifecycle не создаются повторно. Существующий declaration-only `asTypedEventEmitter`
остаётся declaration-only вместо добавления undefined runtime export.

Существующие приватные типы options/map и три helper-функции экспортируются из модуля реализации
для импорта proxy, но намеренно отсутствуют в совместимом barrel. Это детали реализации,
а не новые поддерживаемые контракты потребителя. Очистка stack распознаёт перенесённое имя `EventEmitterX`
вместе со старым именем. Поведение слушателей, пересылки и очистки в этом переносе не исправляется.

## [RU] Альтернативы и компромиссы

| Подход | Преимущества | Недостатки / решение |
|---|---|---|
| Core, два proxy-модуля и прежний barrel | Прямые импорты без циклов; единые конструкторы/символы; ясные обязанности | Новый путь core и явный список экспортов; выбран |
| Базовый класс в точке реэкспорта | Меньше переносимого кода | Runtime-цикл с производными классами; отклонён |
| Передача базового класса или ленивые proxy factories | Нет ранней инициализации производного класса | Меняет API классов, identity или инициализацию; отклонён |
| Копирование фрагментов обычным коммитом | Небольшой граф коммитов | История зависит от copy heuristics; отклонено для этого запроса |
| Rename-ветки и multi-parent merge | Явные rename-предки каждого файла | Подготовительные снимки не являются точками приёмки сборки/релиза; сохранить родителей merge |

## [RU] Процедура и проверка истории

Основано на [процедуре Raymond Chen](https://devblogs.microsoft.com/oldnewthing/20190917-00/?p=102894/)
и варианте подготовки с полным rename, уже применённом здесь для EventSignal.
База: `60b184fce8bcfdc89fb12e3801d290ae5dd6129f`. Три ветки переименовывают весь исходный файл:

| Ветка | Rename-коммит |
|---|---|
| `split/emitter-core-history` | `c4f104ed58c902fb3a960287f35220843fbec968` |
| `split/emitter-simple-proxy-history` | `20d6391a2ab8560055a0276fec6f2e110719d5cb` |
| `split/emitter-proxy-history` | `3f8b8b8a15078a9aba5a7f0cd2457ba906bd51ff` |

Подготовительный merge с четырьмя родителями — `ddf100105d6f93f2e4de7973fd66f1f15e293372`:
база и три rename-коммита. Он сохраняет оригинал и полные копии; следующий обычный коммит переноса
сокращает каждую реализацию и создаёт barrel. Старые коммиты и история `main` не переписываются.
Не применять squash к rename-коммитам и подготовительному merge.

`git --no-pager log --follow -- <destination>` достигает старой истории `modules/events.ts`.
Следующие образцы используют одинаковые опции `git --no-pager blame -M -C -C` до и после переноса:

| Строка назначения при переносе | Исходная строка | Исходный коммит |
|---|---:|---|
| `EventEmitterX.ts:424` | 424 | `34b3522` |
| `EventEmitterX.ts:1251` | 1251 | `edf8983` |
| `EventEmitterX.ts:2714` | 3374 | `edf8983` |
| `EventEmitterSimpleProxy.ts:11` | 2287 | `00fad11` |
| `EventEmitterSimpleProxy.ts:148` | 2424 | `9501910` |
| `EventEmitterSimpleProxy.ts:49` | 2325 | `ecee3f7` |
| `EventEmitterProxy.ts:39` | 2559 | `cc3ba19` |
| `EventEmitterProxy.ts:166` | 2686 | `3107b62` |
| `EventEmitterProxy.ts:307` | 2827 | `3107b62` |

Таблица описывает снимок переноса; последующие исправления могут сдвинуть строки. Новые импорты/экспорты корректно
относятся к коммиту переноса. Обычный blame может отличаться от move/copy-aware blame на коротком или повторяющемся тексте.

## [RU] Проверки и ограничения

Перенос проходит 429 тестов, ноль ошибок, один существующий skip и шесть существующих todo.
Строгая проверка библиотеки и контрактов исходников/деклараций проходит без диагностик; проходят обе сборки,
выполнение собранного CJS и native/fallback GC. `_dev/check_emitter_entry_points.cjs`
проверяет все 24 порядка импорта в отдельных процессах, прежние runtime export keys, identity конструкторов/символов,
пересылку и disposal. Он включён в `pnpm verify`.

Проверяется выполнение собранного CJS; нативное resolution опубликованного ESM остаётся этапом 06.
Исправления proxy cleanup и поведения Node остаются отдельным change set. Внутренние зависимости,
сгенерированные demo и экспериментальный backend каналов сигналов не изменены.
