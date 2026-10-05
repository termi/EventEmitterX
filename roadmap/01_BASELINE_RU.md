---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 01 — Воспроизводимые проверки

Приоритет P0. Цель — разделить библиотеку, demo, dev-инструменты и типовые потребительские fixtures.

## Работа

- [ ] Сделать рабочие scripts test/typecheck/build; выделить library tsconfig с include библиотечных файлов и
  исключением demo/spec/build.
- [ ] Сохранить полный текущий набор спецификаций. Разобрать 14 падений, сначала perf_hooks/global performance и
  изоляцию отложенного error в EventTarget. Не отключать тесты ради зелёного отчёта.
- [ ] Запускать runtime-тесты отдельно от строгого tsc; убрать ситуацию, когда отключённая strict-проверка ts-jest
  считается доказательством типов.
- [ ] Разделить Node и DOM окружения, fake timers и real timers; real React проверять отдельным проектом. Проверить
  использование Symbol.dispose, WeakRef, Promise.withResolvers и других новых API.
- [ ] Зафиксировать версии TypeScript/pnpm и lockfile. Прекратить latest/no-frozen-lockfile в воспроизводимом pipeline;
  root postinstall патчи перенести в явный dev setup либо заменить поддерживаемым инструментарием.
- [ ] Добавить CI библиотеки с тестами, typecheck, сборкой и consumer smoke tests; существующий gh-pages pipeline
  обслуживает сайт/demo.
- [ ] Классифицировать skipped/todo, указать владельца сценария и целевой этап.

## Завершение

Один документированный запуск из чистого checkout повторяет runtime и строгие type/declaration проверки. Все заявленные
поддерживаемые среды зелёные; каждый оставшийся сбой описан, а релизный блокер не замаскирован. Demo не обязано входить
в library build. Существующий локальный результат: 352 pass / 14 fail; общий tsc 372 diagnostics — исходная точка, а не
критерий качества.
