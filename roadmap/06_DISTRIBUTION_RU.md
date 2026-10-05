---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 06 — Корневой индекс, CJS, ESM и TypeScript

Приоритет P0. Зависит от контракта API, декомпозиции и подготовленного графа зависимостей.

## Работа

- [ ] Создать реальный корневой index.ts с реэкспортами всех публичных библиотечных модулей: EventEmitterX и alias
  EventEmitter, EventSignal, EventAwait, iterator, proxy classes, публичные errors/helpers/types. Для utils провести
  explicit public API inventory; tests, demo и private debug hooks не входят в «все модули».
- [ ] Реализовать tsconfig.cjs.json/tsconfig.esm.json и declaration build с явными include/exclude и noEmitOnError. Не
  компилировать demo, tests или старые dist повторно.
- [ ] Спроектировать output и extensions: `dist/cjs/*.cjs`, `dist/esm/*.mjs`, точные relative imports,
  maps/declarations. Обычный tsc из .ts не делает автоматически .cjs/.mjs: нужен проверенный rename/rewrite pipeline
  либо подходящий compiler/bundler.
- [ ] Задать main на скомпилированный индекс CJS; exports.require/import на соответствующие индексы. Types conditions и
  .d.cts/.d.mts либо другая согласованная схема проверяются реальным tsc resolution; одного поля types недостаточно для
  доказательства обеих форм.
- [ ] Добавить удобные subpaths events/signal/react/await и переходные deep exports, если их требуется сохранить. ESM
  tree shaking проверять bundle, sideEffects выбирать после инвентаризации init/registries/prototype mutations.
- [ ] Поставлять TypeScript source через документированный explicit subpath, например `/source`, с разрешаемыми imports.
  Default для обычного JS-потребителя остаётся готовой JS-сборкой.
- [ ] Проверить source через Bun/Deno отдельно: aliases, extensions, enum/namespace/decorators, встроенные Node types,
  runtime APIs. Не считать native TypeScript универсальной гарантией запуска.
- [ ] Проверить dual-package hazard: если CJS и ESM одновременно загружены в процесс, не обещать единую
  identity/registries без отдельного дизайна и проверки. Выбрать поддерживаемый контракт и документировать его.
- [ ] Files allowlist: JS, types, sourcemaps/source по выбранной политике, README/license. Исключить demo, dev patchers,
  test caches и лишние артефакты; ограничить package size.
- [ ] Prepack/prepublishOnly проверяет воспроизводимый build; установка tarball потребителем не запускает dev-only
  patchers или обязательный pnpm gate.

## Завершение

Clean consumer fixtures используют только `npm pack` tarball: Node require/import, NodeNext/Bundler TypeScript, browser
bundler, Bun JS/source, Deno source. Каждая заявленная точка входа существует и её импорт работает без checkout aliases.
Imports EventEmitter и EventEmitterX внутри одной сборки равны по identity. Declaration maps/source paths не ведут на
локальный диск автора.
