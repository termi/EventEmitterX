---
iso date: "2026-10-06T18:30:42.023Z"
timestamp: 1791311442023
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# Проверки аудита 2026-10-05

Запускались без изменения исходников, snapshots, manifests и версий. Полные временные логи находятся в workspace
аудит-сессии `work/`; сводка включена в AUDIT.md. Команды ниже предназначены для повторения проверки, не выполняют
публикацию или установку.

Из корня репозитория:

```powershell
$env:CI='true'
node node_modules/jest/bin/jest.js --runInBand --ci --cacheDirectory '<audit-work>/jest-cache'
node node_modules/typescript/bin/tsc --project tsconfig.json --noEmit --incremental false --pretty false
```

Итог Jest: exit 1; 2 passed / 1 failed suites; 352 passed, 14 failed, 1 skipped, 6 todo, 373 tests. 12 падений содержат
`performance.mark is not a function`; 2 — error `test` в EventTarget/iterator. EventSignal suite прошёл.

Итог tsc: exit 2, 372 diagnostics, 37 непосредственно из modules. Include захватывает demo, в которых есть отсутствующие
зависимости. Это не 372 независимых дефекта библиотеки; группировка причин — задача этапа 01.

Probe из этой директории:

```powershell
node --expose-gc lifecycle-probe.cjs 'D:\work\Projects\EventEmitterX'
```

Наблюдения до исправления: `100 derived → 100 listeners`; `explicit destructor → 0 listeners`;
`drop external child references + 5 event loop/GC cycles → 100 listeners, last child alive`. Проба показывает известный
retaining path, не является стабильным универсальным GC unit test.

## Проверка исправления lifecycle — 2026-10-06

Проба теперь изолирует создание от приостановленного async frame. Запуск `pnpm test:signals:gc`: девять сценариев
собирают по восемь забытых сигналов и удаляют записи подписок; контроль с живым владельцем продолжает получать
обновления. Тот же тест падает на исходной реализации.
`node --expose-gc _dev/check_signal_lifecycle.cjs --without-weakref` проверяет только явную очистку. Гарантии и
оставшаяся работа описаны в [этапе 02](../02_LIFECYCLE_RU.md).
