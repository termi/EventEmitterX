---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# 09 — Дальнейшее развитие и WEATHER demo

Приоритет P2. Новые функции оцениваются после стабилизации lifecycle, типов и installable artifacts.

## Производительность и расширения

- [ ] Benchmarks: fan-out/fan-in dependency graphs, batched set, dynamic deps, async cancellation, listener churn и
  repeated mount/unmount; измерять latency, computations/notifications count, heap plateau и bundle size. Сохранять
  environment и workload, не делать заявления по одному microbenchmark.
- [ ] Iterator backpressure: watermarks, bounded buffer, политика overflow, pause/resume совместимых источников,
  abort/return/throw и медленный consumer. Реализовать queue replacement после замеров и сохранения Node-контракта.
- [ ] Batch/sync subscription modes — отдельный API design после фиксации существующей microtask семантики; не менять
  default delivery молча.
- [ ] Domains/request scopes вместо единственного глобального bus, diagnostics без удержания экземпляров, optional dev
  tooling.
- [ ] Selectors/equality/object collections: определить value identity и equality контракт; TTL/lifecycle values и
  bidirectional maps рассматривать отдельно.
- [ ] Proxy и EventTarget extensions из docs/IMPROVEMENTS разложить по пользе и цене; полная реализация EventTarget не
  блокирует Node-compatible emitter, если не заявлена.
- [ ] Clicker demo перевести с vendored копий modules на packed/released package; проверить, что копии API не
  расходятся. Это не требует включать все backend dependencies в core typecheck.

## WEATHER_INTEGRATION_PLAN → план развития demo

Источники: `../demo/eventSignals-test-app/_dev/todo/WEATHER_INTEGRATION_PLAN.md` и `_RU.md`. Они сохранены как подробный
дизайн, этот этап задаёт порядок и критерии. Указанные там сроки и сведения о провайдере не приняты как проверенные
текущие факты; API/условия проверить перед реализацией.

1. [ ] Завершить weather API layer: типизированные geocoding/forecast результаты, validation ответа, ошибки сети,
   AbortSignal, timeout, dedup in-flight requests. Выбранного провайдера и его актуальные условия проверить отдельно.
2. [ ] Выделить cache координат и weather TTL; bounded cache, negative caching, retry/backoff и fallback со stale
   marker. Ключ включает необходимые координаты/units/locale; nearby cities не объединять случайным грубым округлением.
3. [ ] Weather state принадлежит city/model и использует независимый refresh trigger; секундный nowDate не вызывает
   запросы. Определить cancellation при удалении города и переключении страниц.
4. [ ] Предусмотреть concurrency/rate budget, visibility-aware refresh и корректное offline поведение. Если нужны
   credentials — спроектировать серверный слой; не помещать секреты в demo bundle.
5. [ ] Показать temperature/weather code, pending/error/stale в list/grid/table; units, locale, accessibility и
   отсутствие скачков layout.
6. [ ] Проверить fake API/timers: повторные ticks не дают fetch, TTL истёк — один запрос, HTTP 429/network error —
   понятный fallback, удалённый city не получает поздний результат, unsubscribe/destructor освобождают resources.
7. [ ] Использовать demo как длительный workload lifecycle/heap: добавление/удаление городов, навигация, PiP, hide/show.
   Работать с tarball/released package, чтобы проверять потребительский путь.

## Завершение

Каждая функция имеет самостоятельную задачу с наблюдаемым результатом и тестом/benchmark. Weather отображается во всех
выбранных представлениях без fetch на каждую секунду и без накопления моделей/подписок. Оригинальные WEATHER планы
остаются подробным приложением, а статус работы ведётся здесь.
