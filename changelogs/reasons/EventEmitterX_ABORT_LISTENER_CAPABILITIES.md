---
iso date: "2026-10-08T22:55:40.798Z"
timestamp: 1791500140798
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, tests, docs"
---

# Abort registration: native capability and browser fallback

## Problem evidence

### 🟠 Warning — Ordinary abort registration did not implement the documented capability

**File:** `modules/EventEmitterEx/EventEmitterX.ts`, lines 2197–2203 at `adaa15d`.

```typescript
if (!signal || signal.aborted) {
    return Object.setPrototypeOf({ [Symbol.dispose]: _noop }, null);
}
signal.addEventListener('abort', resource);
```

An already-aborted signal silently skipped delivery. The listener was not once-only, and an earlier listener could
block it with stopImmediatePropagation despite the function's Node-style documentation.
**Recommendation:** delegate to native Node where available; use a tested once-only disposable fallback with explicit limits.

## Mechanism and examples

In the Node environment, the helper delegates to installed `events.addAbortListener` when available. It inherits
native argument validation, once delivery, disposable cleanup, pre-aborted microtask delivery and protection against
stopImmediatePropagation. This uses the existing environment detection and existing events dependency; no new package.

In the browser/non-native fallback, arguments are validated, registration uses `{ once: true }` and disposal removes
that callback. A pre-aborted subscription queues delivery with a synthetic `Event('abort')`; disposing its no-op handle
does not cancel the already queued callback. Native Node may supply no event argument for pre-aborted delivery.
The browser fallback cannot bypass stopImmediatePropagation; no EventTarget monkey patch or private Node symbol is used.

```typescript
const controller = new AbortController();
using registration = addAbortListener(controller.signal, () => releaseResource());
controller.abort(); // Once-only callback; explicit disposal also removes a pending registration.
```

Migration: pre-aborted signals now invoke the callback asynchronously rather than silently doing nothing.
Keep cleanup callbacks safe when resources are already released. Null signal/invalid callbacks now throw instead
of returning a no-op for null. Do not assume pre-aborted delivery can be canceled by immediate disposal.

## Alternatives and tradeoffs

| Choice | Advantages | Disadvantages / decision |
|---|---|---|
| Native Node delegation with explicit fallback | Provides native protected delivery without duplicating internals | Depends on native capability and environment detection; chosen |
| Ordinary listener in every environment | Portable | Cannot provide Node's stopImmediatePropagation guarantee; rejected for Node |
| Patch EventTarget or discover private Node symbols | Might imitate protection | Global side effects/private API coupling; rejected |
| Silently ignore pre-aborted signals | Existing behavior | Skips required resource cleanup; replaced |
| Cancel pre-aborted microtask through the disposable | Extra cancellation control | Differs from native Node; rejected |
| Claim full browser/Node parity | Simpler marketing | False protected-delivery/event-payload claim; rejected |

## Verification and limits

Six paired Node/native cases cover stopped propagation, idempotent disposal and pre-aborted microtask delivery
even after disposal. Five separate DOM cases cover once-only delivery, disposal, synthetic pre-aborted delivery,
argument errors and the propagation limitation. Full verification passes 480 tests, types, builds, entry orders and GC.
Reference: [Node addAbortListener contract](https://github.com/nodejs/node/blob/main/doc/api/events.md).
Node versions without this capability use the fallback, with its limits. Other browsers, workers, foreign/polyfilled
signals and queued-callback exception policies require additional runtime coverage; no universal parity is claimed.

---

## [RU] Доказательства проблемы

### 🟠 Warning — Обычная регистрация abort не реализовывала документированную capability

**Файл:** `modules/EventEmitterEx/EventEmitterX.ts`, строки 2197–2203 в `adaa15d`.

```typescript
if (!signal || signal.aborted) {
    return Object.setPrototypeOf({ [Symbol.dispose]: _noop }, null);
}
signal.addEventListener('abort', resource);
```

Уже отменённый сигнал молча пропускал уведомление. Слушатель не был одноразовым, а предыдущий слушатель мог
заблокировать его через stopImmediatePropagation вопреки Node-style документации функции.
**Рекомендация:** делегировать нативному Node при наличии capability; использовать проверенный одноразовый disposable fallback с явными границами.

## [RU] Механизм и примеры

В Node-окружении helper делегирует установленному `events.addAbortListener` при наличии. Он наследует
нативные проверки аргументов, одноразовую доставку, disposable cleanup, pre-aborted microtask delivery и защиту от
stopImmediatePropagation. Используются прежние определение среды и зависимость events; нового пакета нет.

В браузерном/non-native fallback аргументы проверяются, регистрация использует `{ once: true }`, disposal снимает
callback. Pre-aborted подписка ставит доставку с синтетическим `Event('abort')` в очередь; disposal no-op handle
не отменяет уже поставленный callback. Нативный Node может не передавать аргумент event при pre-aborted delivery.
Браузерный fallback не обходит stopImmediatePropagation; monkey patch EventTarget и приватные символы Node не используются.

```typescript
const controller = new AbortController();
using registration = addAbortListener(controller.signal, () => releaseResource());
controller.abort(); // Once-only callback; explicit disposal also removes a pending registration.
```

Миграция: pre-aborted signals теперь вызывают callback асинхронно вместо молчаливого пропуска.
Callbacks очистки должны быть безопасны при уже освобождённых ресурсах. Null signal/невалидный callback теперь бросают исключение
вместо no-op для null. Не предполагать возможность отменить pre-aborted delivery немедленным disposal.

## [RU] Альтернативы и компромиссы

| Выбор | Преимущества | Недостатки / решение |
|---|---|---|
| Нативный Node с явным fallback | Нативная защищённая доставка без дублирования internals | Зависит от нативной capability и определения среды; выбран |
| Обычный listener во всех средах | Переносимость | Не обеспечивает гарантию Node для stopImmediatePropagation; отклонён для Node |
| Patch EventTarget или поиск приватных символов Node | Может имитировать защиту | Глобальные side effects/связь с private API; отклонён |
| Молча игнорировать pre-aborted signals | Прежнее поведение | Пропускает необходимую очистку ресурсов; заменён |
| Отменять pre-aborted microtask через disposable | Дополнительная отмена | Отличается от нативного Node; отклонён |
| Заявить полную browser/Node parity | Простой маркетинг | Неверная гарантия защищённой доставки/event payload; отклонён |

## [RU] Проверки и ограничения

Шесть парных Node/native случаев покрывают остановку propagation, идемпотентный disposal и pre-aborted microtask delivery
даже после disposal. Пять отдельных DOM-случаев покрывают одноразовую доставку, disposal, синтетический pre-aborted delivery,
ошибки аргументов и ограничение propagation. Полная проверка проходит 480 тестов, типы, сборки, порядки загрузки и GC.
Эталон: [контракт Node addAbortListener](https://github.com/nodejs/node/blob/main/doc/api/events.md).
Версии Node без capability используют fallback с его ограничениями. Другие браузеры, workers, foreign/polyfilled
signals и политика исключений queued callbacks требуют дополнительного runtime-покрытия; универсальная parity не заявляется.
