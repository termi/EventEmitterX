---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 05 — Создание и публикация независимых зависимостей

Приоритет P0. Локальные links сейчас намеренны; задача — превратить пакеты в воспроизводимые независимые продукты, а не
просто переименовать imports.

Предварительное условие: пересмотр действующего запрета на изменение `packages/` — отложенная задача. Этот план не
снимает запрет и не разрешает редактирование пакетов сейчас.

## Работа

- [ ] Инвентаризировать runEnv, type_guards, abortable, ServerTiming, polyfills, ProgressControllerX: наличие
  исходников, артефактов, tests, прав на распространение, runtime/type dependencies. Часть каталогов сейчас содержит
  только manifest и dist; восстановление исходников — отдельная задача, dist не считать полноценным source of truth.
- [ ] Для runEnv/type_guards/abortable создать или восстановить src, сборку CJS/ESM/types, unit tests и README.
  Установить канонические npm names; текущие @termi/runenv, @repo/type_guards и импортные termi@... согласовать до
  релиза.
- [ ] Построить directed dependency graph и определить порядок публикации топологически. Type-only ServerTiming тоже
  должен разрешаться из публичных .d.ts; либо пакет доступен потребителю, либо публичный тип действительно развязан.
- [ ] В development допускаются workspace links/aliases. В packed manifests и JS/.d.ts/source не должно быть ссылок на
  соседний checkout, cftools, `~` или нерегистрируемые local aliases.
- [ ] Проверить root и wildcard exports для всех пакетов, особенно type_guards require .mjs/.cjs; публиковать только
  поддерживаемые subpaths.
- [ ] TypeScript и build-инструменты держать в devDependencies; определить optional/peerDependencies по реальному графу,
  а не скрывать обязательную runtime-зависимость.
- [ ] Polyfills: определить, какие требуются библиотеке при выбранном engines baseline; не делать глобальные monkey
  patches скрытой обязанностью потребителя.
- [ ] Подготовить npm pack и clean-install каждого пакета с выключенными install scripts, offline tarball fixtures там,
  где возможно, и обычной проверкой объявленных registry dependencies перед публикацией.

## Порядок выпуска

Сначала подготовить и проверить все пакеты и основную библиотеку совместно из tarballs. После выбранного владельцем
релиза публиковать leaves графа, затем зависимые пакеты, затем EventEmitterX с уже доступными версиями. Конкретные
имена/версии и dist-tag выбирать по подготовленным артефактам; не объявлять новые пакеты опубликованными заранее.

## Завершение

Каждый пакет собирается из доступных исходников в чистом окружении, работает через CJS/ESM/types, имеет documented
runtime baseline. Основной package устанавливается без соседних репозиториев и dev postinstall. Минимальные обязательные
runEnv/type_guards/abortable готовятся в рамках этой сессии; прочие пакеты входят в выпуск, если требуются графом.
