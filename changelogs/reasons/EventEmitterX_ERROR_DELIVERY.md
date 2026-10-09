---
iso date: "2026-10-08T22:55:40.798Z"
timestamp: 1791500140798
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "api, tests, docs"
---

# Error monitoring and once rejection delivery

## Problem evidence

Locations refer to `adaa15d`.

### 🟠 Warning — Monitoring depended on an existing error consumer

**File:** `modules/EventEmitterEx/EventEmitterX.ts`, lines 547–555.

```typescript
if (handler) {
    if (isErrorEvent) { /* notify errorMonitor */ }
}
```

Without an error consumer the monitor did not run; listeners added/removed by a monitor were not reflected in
the previously selected handler. **Recommendation:** notify the monitor before selecting current error handlers.

### 🟠 Warning — Once swallowed rejection results and rejection hooks lost this

**File:** `modules/EventEmitterEx/EventEmitterX.ts`, lines 2727–2738 and line 2935.

```typescript
const maybePromise = this.listener.apply(this.target, args);
maybePromise.catch(error => { console.error(error); });
captureRejectionHandler(err, type, ...args);
```

The once wrapper returned no Promise to emit, so captureRejections could not route it. Custom rejection hooks were
invoked without emitter context. **Recommendation:** return the once result and invoke the hook with the emitter as this.

## Chosen mechanism and migration

The existing specialized monitor dispatch moves outside the error-consumer guard. It runs first, then the emitter
reloads its error handlers. A monitor observes without consuming: absent an error handler, emit still throws.
A monitor that adds a handler permits handling; one that removes the last handler permits throwing.
The ordinary non-error emit paths and manual dispatch specialization remain intact.

The once wrapper removes itself before invocation and returns the original result. Existing emit capture logic
now handles once and ordinary listeners uniformly. The rejection hook is called with `.call(ee, ...)`.

```typescript
using emitter = new EventEmitterX({ captureRejections: true });
emitter.on('error', reportFailure);
emitter.once('data', async () => { throw new Error('failed'); });
emitter.emit('data'); // Async failure reaches reportFailure.
```

Migration: with captureRejections disabled, once Promise rejection is no longer privately logged/swallowed.
Use captureRejections plus an error listener/custom hook, or catch inside the callback. A caller invoking a raw
once wrapper can await its returned Promise. Do not rely on the former console.error side effect.
Existing legacy tests explicitly expecting no unhandled-error monitoring are updated to the documented Node contract.
Native test Errors use their host realm; this does not add cross-realm Error recognition to the library.

## Alternatives and tradeoffs

| Choice | Advantages | Disadvantages / decision |
|---|---|---|
| Return once result to existing capture logic | One rejection mechanism; native-style raw wrapper result | Exposes previously swallowed rejection when capture is off; chosen with migration guidance |
| Attach another catch inside once | Can retain logging | Duplicates capture logic and risks double delivery; rejected |
| Always consume errors in the monitor | Avoids throws | Makes a monitor an error handler, contrary to Node; rejected |
| Use the pre-monitor error-handler snapshot | Smallest code movement | Ignores monitor mutations; rejected |
| Broaden Error detection across realms | More permissive VM handling | Separate runtime contract outside this fix; deferred |

## Verification and limits

Native differential tests cover monitor arguments through the specialized and general paths, monitoring before
unhandled errors, handler mutation, raw once results, async once error/hook delivery and hook this.
The full pipeline passes 480 tests with one existing skip; source/declaration contracts have zero diagnostics.
Reference: [Node events documentation](https://nodejs.org/download/release/v26.3.1/docs/api/events.html).
This does not certify all Node error payloads, global capture defaults, scheduler ordering or max-listener warnings.
Async error handlers still follow the existing anti-recursion policy; they should handle their own rejection.

---

## [RU] Доказательства проблемы

Номера относятся к `adaa15d`.

### 🟠 Warning — Мониторинг зависел от существующего потребителя error

**Файл:** `modules/EventEmitterEx/EventEmitterX.ts`, строки 547–555.

```typescript
if (handler) {
    if (isErrorEvent) { /* notify errorMonitor */ }
}
```

Без error consumer монитор не вызывался; добавленные/удалённые монитором слушатели не отражались
в ранее выбранном handler. **Рекомендация:** уведомлять монитор до выбора текущих error handlers.

### 🟠 Warning — Once поглощал rejection result, а rejection hooks теряли this

**Файл:** `modules/EventEmitterEx/EventEmitterX.ts`, строки 2727–2738 и строка 2935.

```typescript
const maybePromise = this.listener.apply(this.target, args);
maybePromise.catch(error => { console.error(error); });
captureRejectionHandler(err, type, ...args);
```

Once wrapper не возвращал Promise в emit, поэтому captureRejections не мог перенаправить его. Пользовательские hooks
вызывались без контекста emitter. **Рекомендация:** возвращать результат once и вызывать hook с emitter в this.

## [RU] Выбранный механизм и миграция

Существующий специализированный monitor dispatch вынесен за проверку error consumer. Он выполняется первым, затем emitter
перечитывает error handlers. Монитор наблюдает без поглощения: без error handler emit продолжает бросать исключение.
Монитор, добавляющий handler, позволяет обработку; удаляющий последний handler — исключение.
Обычные non-error emit paths и ручная специализация dispatch сохранены.

Once wrapper удаляется до вызова и возвращает исходный результат. Существующая capture-логика emit
теперь одинаково обрабатывает once и обычных слушателей. Rejection hook вызывается через `.call(ee, ...)`.

```typescript
using emitter = new EventEmitterX({ captureRejections: true });
emitter.on('error', reportFailure);
emitter.once('data', async () => { throw new Error('failed'); });
emitter.emit('data'); // Async failure reaches reportFailure.
```

Миграция: при выключенном captureRejections once Promise rejection больше не логируется/поглощается приватно.
Используйте captureRejections вместе с error listener/custom hook либо catch внутри callback. Вызывающий raw
once wrapper может ожидать возвращённый Promise. Не полагайтесь на прежний console.error side effect.
Прежние тесты, явно ожидавшие отсутствия мониторинга необработанной ошибки, обновлены до документированного контракта Node.
Errors в нативных тестах создаются в их host realm; распознавание cross-realm Error в библиотеку не добавлено.

## [RU] Альтернативы и компромиссы

| Выбор | Преимущества | Недостатки / решение |
|---|---|---|
| Возвращать once result существующей capture-логике | Единый механизм rejection; native-style raw wrapper result | Делает видимым ранее поглощённый rejection при выключенном capture; выбран с рекомендацией миграции |
| Добавить ещё один catch внутри once | Можно сохранить логирование | Дублирует capture-логику и рискует двойной доставкой; отклонён |
| Всегда поглощать ошибки в мониторе | Нет исключений | Превращает монитор в error handler вопреки Node; отклонён |
| Использовать snapshot error handlers до монитора | Минимальный перенос кода | Игнорирует изменения монитора; отклонён |
| Расширить распознавание Error между realms | Более гибкая работа в VM | Отдельный runtime-контракт вне исправления; отложен |

## [RU] Проверки и ограничения

Native differential тесты покрывают аргументы монитора в специализированных и общем paths, мониторинг до
необработанной ошибки, изменения handlers, результаты raw once, async once error/hook delivery и this hook.
Полный pipeline проходит 480 тестов с одним прежним skip; контракты исходников/деклараций дают ноль диагностик.
Эталон: [документация Node events](https://nodejs.org/download/release/v26.3.1/docs/api/events.html).
Это не подтверждает все Node error payloads, глобальные capture defaults, порядок scheduler или max-listener warnings.
Async error handlers сохраняют прежнюю защиту от рекурсии и должны самостоятельно обрабатывать rejection.
