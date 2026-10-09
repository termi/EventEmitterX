---
iso date: "2026-10-09T14:08:42.108Z"
timestamp: 1791554922108
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "ci, deps, docs"
---

# GitHub Pages pnpm Compatibility Pin

## Problem

The Pages workflow installs pnpm with version: latest. The reported run fails at root dependency installation
with ERR_PNPM_INVALID_DEPENDENCY_NAME for termi@ProgressControllerX. Current internal link aliases deliberately use
legacy names such as termi@ProgressControllerX and termi@polyfills, plus ~ for the project root. These are not
standard npm package names. The same rejection is reproducible with pnpm 11.19.0 locally.

## Decision and Alternatives

Pin the Pages workflow to pnpm 10.28.2, which accepts all current root link aliases in an isolated installation
check. This is transitional compatibility, not a claim that the aliases are valid for npm publication.

| Option                                 | Advantage                                                                              | Disadvantage / decision                                                                                 |
|----------------------------------------|----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| Exact pnpm 10.28.2 (chosen)            | Verified alias compatibility; no source/package rename; repeatable installer selection | Holds the workflow on an older major; requires deliberate future updates                                |
| Keep latest or use a major range       | Automatically follows releases                                                         | An unreviewed package-manager change can break installation again                                       |
| Rename aliases and all imports now     | Standard npm names; compatible migration direction                                     | Broad source/internal-package changes outside this deployment fix; deferred dependency-development work |
| Generate rewritten manifests during CI | Avoids modifying source manifests                                                      | Builds different metadata than consumers/local development and hides the migration requirement          |

Migrate internal packages/imports to standard names during the dependency-development stage, then test and update
the pin. Existing Node.js action-runtime and ubuntu-latest notices are separate from this installation error.

## Verification and Limits

Using Node 26.8.1 on Windows, an ignored build_cache fixture was generated from every current root link dependency.
The fixture uses absolute local link targets and no registry dependencies or lifecycle scripts.
pnpm 11.19.0 rejects it with ERR_PNPM_INVALID_DEPENDENCY_NAME. The same offline, lockfile-only, ignore-scripts
installation succeeds with pnpm 10.28.2. The workflow YAML is parsed and its exact pnpm version checked locally.

This verifies the failing alias-validation boundary, not a full fresh Linux dependency installation or Pages deploy.
The GitHub workflow must be rerun from a pushed commit. Packages, imports, source lockfiles and local node_modules
are unchanged.

---

## [RU] Проблема

Workflow Pages устанавливает pnpm через version: latest. Указанный запуск падает при установке корневых зависимостей
с ERR_PNPM_INVALID_DEPENDENCY_NAME для termi@ProgressControllerX. Текущие внутренние link-алиасы намеренно используют
старые имена termi@ProgressControllerX и termi@polyfills, а также ~ для корня проекта. Это нестандартные имена
пакетов npm. Такой же отказ воспроизводится локально на pnpm 11.19.0.

## [RU] Решение и альтернативы

Зафиксировать pnpm 10.28.2 в workflow Pages: он принимает все текущие корневые link-алиасы при изолированной
проверке установки. Это временная совместимость, а не утверждение о корректности алиасов для публикации в npm.

| Вариант                                       | Преимущество                                                                                                | Недостаток / решение                                                                                             |
|-----------------------------------------------|-------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| Точная версия pnpm 10.28.2 (выбрано)          | Проверенная совместимость алиасов; без переименования исходников/пакетов; воспроизводимый выбор установщика | Workflow остаётся на прежней основной версии; будущие обновления нужно проверять                                 |
| Сохранить latest или диапазон основной версии | Автоматически получает релизы                                                                               | Непроверенное изменение менеджера пакетов может снова сломать установку                                          |
| Сейчас переименовать алиасы и все импорты     | Стандартные имена npm; подходящее направление миграции                                                      | Масштабные изменения исходников/внутренних пакетов вне исправления деплоя; отложенный этап развития зависимостей |
| Генерировать изменённые манифесты в CI        | Не нужно менять исходные манифесты                                                                          | Сборка использует другие метаданные, чем потребители/локальная разработка, и скрывает необходимость миграции     |

На этапе развития зависимостей перевести внутренние пакеты/импорты на стандартные имена, затем проверить и
обновить закреплённую версию. Уведомления о runtime Node.js самих Actions и ubuntu-latest относятся к другой проблеме.

## [RU] Проверки и ограничения

На Node 26.8.1 под Windows создана игнорируемая фикстура build_cache из всех текущих корневых link-зависимостей.
Она использует абсолютные локальные link-пути и не содержит registry-зависимостей или lifecycle-скриптов.
pnpm 11.19.0 отклоняет её с ERR_PNPM_INVALID_DEPENDENCY_NAME. Та же offline-установка с lockfile-only и ignore-scripts
проходит на pnpm 10.28.2. YAML workflow локально разбирается с проверкой точной версии pnpm.

Это проверяет границу валидации алиасов, которая вызвала ошибку, а не полную чистую установку на Linux или Pages-деплой.
Workflow GitHub нужно повторно запустить из отправленного коммита. Пакеты, импорты, исходные lockfile и локальные
node_modules не изменены.
