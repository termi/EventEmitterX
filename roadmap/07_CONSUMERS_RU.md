---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 07 — Потребительский опыт, React и документация

Приоритет P1. Цель — дать короткий правильный путь от установки к рабочему lifecycle.

## Работа

- [ ] README: корневые импорты, установка, поддерживаемые среды/версии, фактическая Node-совместимость, пример cleanup.
  Обновить EN/RU одновременно и синхронизировать docs-site.
- [ ] Сценарии: обычный emitter; ожидание с timeout/abort; async iterator с break; mutable state; lazy projection;
  active subscriptions; async computation pending/error; Model-owned signals для React и терминала.
- [ ] Показать кто владеет signal и кто подпиской, кто вызывает destructor, чем unsubscribe отличается от уничтожения
  Model. Не создавать общие сигналы заново внутри render.
- [ ] Вынести native bridge useSyncExternalStore в recipe и адаптер; проверить устойчивый snapshot, изменение identity
  selector, tearing, concurrent rendering, StrictMode повторный mount/cleanup и unmount во время async/RAF.
- [ ] Real React fixtures для поддерживаемых версий дополняют fakeReact; JSX-протокол и React 19 не подтверждать одной
  синтетической реализацией.
- [ ] SSR: getServerSnapshot, hydration consistency, отсутствие requestAnimationFrame на сервере, изоляция Model на
  запрос, отсутствие cross-request subscriptions и React global init конфликтов.
- [ ] Browser fixture без Node runtime polyfills; Worker fixture для заявленной поддержки; измерить размер core и React
  bundle. Если какой-то runtime нужен, указать его вместо утверждения «без polyfills».
- [ ] Junct fixture повторяет потребности документа интеграции внутри этого репозитория: общие Dataset/Model signals,
  native methods, revision→DTO projection, microtask updates без forced get. Не изменять Junct checkout.
- [ ] Запускаемые документационные примеры используют packed package; cheatsheet методов чтения/записи, scheduling и
  ошибок снижает сложность входа.

## Завершение

Новый пользователь может выполнить каждый quickstart из clean fixture. Матрица tested/unsupported/experimental видна в
документации. Shared models освобождаются, React cleanup повторяем, server snapshot совпадает при hydration. Документы
обещают только то, что проверено.

Контракт адаптера: [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore).
