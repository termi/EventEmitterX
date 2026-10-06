---
iso date: "2026-10-06T15:37:45.902Z"
timestamp: 1791301065902
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "logic, api, types, tests, docs"
---

# EventSignal React Decomposition — Rationale

## Problem and Decision

Move React implementation out of EventSignal.ts while preserving the public class,
its generic contracts, null-rooted prototype, hooks, snapshots and cleanup.
EventSignalReact.ts owns hooks, initialization, JSX decoration, component registry
and rendering. EventSignalReactScheduler.ts owns the existing RAF callback pool.
The core keeps computation, dependencies, ordered writes, lifecycle and thin delegates.
A typed internal bridge supplies only private operations required by React; it does
not expose private fields publicly. React imports the core only as a type; runtime
initialization receives the constructor from its static block.

## Alternatives and Limits

Inheritance was rejected because it changes the prototype contract. Runtime imports
in both directions risk initialization cycles. Making private fields public or
casting the whole signal to an unrestricted host weakens encapsulation. A separate
opt-in React entry point is deferred: existing imports must still support current
React APIs. Queue, timer and event-adapter extraction is independent later work.

## History Procedure

Based on [Raymond Chen's split-history procedure](https://devblogs.microsoft.com/oldnewthing/20190917-00/?p=102894/).
Create dev from main at 4e3b6c1. Create each history branch from dev and commit a
complete rename of EventSignal.ts to its destination. Build a merge whose parents
include dev and those rename commits, retaining the original and both full copies
in its tree. In a subsequent ordinary commit, reduce the copies to their modules
and connect delegates. This keeps a rename ancestry for each destination without
rewriting main or old commits. The full-copy merge is a history preparation snapshot,
not a buildable release. Preserve these commits and merge parents; do not squash.

A scratch repository verified ordinary blame follows original lines through this
rename-only variant. Verify actual log --follow and blame on each extracted module;
new glue lines belong to the extraction commit. Tests and type consumers must pass
on the final tree; history preparation snapshots are not acceptance points.

---

## [RU] Проблема и решение

Вынести реализацию React из EventSignal.ts, сохранив публичный класс, его generic
контракты, прототип с null в основании, hooks, snapshots и очистку.
EventSignalReact.ts владеет hooks, инициализацией, JSX-декорацией, регистром компонентов
и рендерингом. EventSignalReactScheduler.ts владеет существующим пулом RAF callbacks.
Ядро сохраняет вычисления, зависимости, упорядоченные записи, lifecycle и тонкое делегирование.
Типизированный внутренний адаптер предоставляет только приватные операции,
необходимые React; приватные поля не становятся публичными. React импортирует ядро
только как тип; runtime-инициализация получает конструктор из его static block.

## [RU] Альтернативы и границы

Наследование отвергнуто, поскольку меняет контракт прототипа. Runtime-импорты
в обе стороны создают риск циклической инициализации. Открытие приватных полей или
cast всего сигнала к неограниченному host ослабляет инкапсуляцию. Отдельный opt-in
React entry point отложен: существующие импорты должны поддерживать текущий React
API. Выделение очереди, таймеров и адаптеров событий — независимая последующая работа.

## [RU] Процедура сохранения истории

Основана на [процедуре Raymond Chen](https://devblogs.microsoft.com/oldnewthing/20190917-00/?p=102894/).
Создать dev из main на 4e3b6c1. Каждую history-ветку создать от dev и закоммитить
полный rename EventSignal.ts в целевой файл. Построить merge с родителями dev и
rename-коммитами, сохранив исходник и обе полные копии в его дереве. Следующим
обычным коммитом сократить копии до модулей и подключить делегирование. Это сохраняет
rename-предков каждого нового файла без переписывания main или старых коммитов.
Merge полных копий — подготовительный снимок истории, а не собираемый релиз.
Сохранить эти коммиты и родителей merge; не использовать squash.

Временный репозиторий подтвердил, что обычный blame сохраняет исходные строки
при таком варианте с rename-only ветками. Проверить реальные log --follow и blame
для каждого выделенного модуля; новые соединяющие строки относятся к коммиту
выделения. Тесты и type consumers должны проходить на итоговом дереве;
подготовительные снимки истории не являются точками приёмки.
