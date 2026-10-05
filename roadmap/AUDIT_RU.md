---
iso date: "2026-10-05T21:59:11.977Z"
timestamp: 1791237551977
ai_model: "GPT6"
git user: "\"Egor Halimonenko\" <termi_uc@inbox.ru>"
area: "docs, api, types, deps, tests"
---

# Технический и потребительский аудит

## Вывод

У проекта сильная функциональная основа: события, ожидаемые события, async iterator, вычисляемые сигналы, внешние
источники и React. Существующие спецификации существенно шире демонстрационных примеров. Главные препятствия для
потребителя сейчас — удержание сигналов глобальными слушателями, незавершённый дистрибутив, неточные generic-контракты и
неподтверждённое заявление о полной совместимости с Node.

Рекомендуемый первый релиз должен закрыть P0 lifecycle и упаковки и ограничить обещания проверенной матрицей сред. Новые
функции не заменяют эту работу.

## Метод и результаты запуска

На момент исходного аудита 2026-10-05 локальные AGENTS.md в репозитории и родительских каталогах не были найдены.
Прочитаны `.github/copilot-instructions.md`, сведения об EventSignal, обзоры проекта, планы улучшений, Junct и WEATHER.
В checkout уже были изменения `.gitattributes`, `.github/skills-EventSignal.md`, документы WEATHER и Junct; аудит их не
переписывал. С 2026-10-06 источниками инструкций стали AGENTS.md и .agents/rules; это обновление документации следует им
и не повторяет проверки или меняет дату исторических результатов.

Среда проверки: Windows, Node 26.8.1, установленный TypeScript 5.9.3. Это факт локального запуска, не выбранная
минимальная поддерживаемая версия.

| Проверка                                                      | Результат                                                                                           | Что это означает                                                                                     |
|---------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| Jest через локальный CLI, `--runInBand --ci`, отдельный cache | 3 suite: 2 passed, 1 failed; 352 passed, 14 failed, 1 skipped, 6 todo; 373 total                    | EventSignal_spec и test_spec прошли; events_spec упал                                                |
| Разбор 14 падений                                             | 12 с `performance.mark is not a function`; ещё 2 с ошибкой `test` из EventTarget/iterator сценариев | Требуется разделить недостатки среды, тестовую изоляцию и runtime-дефекты; причины ещё не исправлены |
| `tsc -p tsconfig.json --noEmit --incremental false`           | exit 2, 372 диагностики; 37 непосредственно под `modules/`                                          | Общий include захватывает demo и зависимости; проблемы не ограничены demo                            |
| Probe dependency registry                                     | После вычисления 100 derived — 100 слушателей; после явного destructor — 0                          | Явная очистка этого пути работает                                                                    |
| Probe после потери внешних ссылок на derived                  | 5 циклов event-loop + `global.gc()`: 100 слушателей, последний WeakRef жив                          | Воспроизведён удерживающий путь; конечный GC-прогон сам по себе не доказывает все варианты утечки    |

Для GC-probe использованы локальный ts-node transpileOnly и существующие polyfills. Это отдельный runtime-experiment, не
проверка типов. Команды и probe сохранены в `verification/`; исходники библиотеки не менялись. Jest не обновлял
snapshots.

## Реестр проблем

Реестр резюмирует подробные замечания, а не заменяет их доказательства по исходникам.

| ID       | Статус / приоритет                      | Наблюдение и доказательство                                                                                             | Эффект для потребителя                                                                       | Этап   |
|----------|-----------------------------------------|-------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|--------|
| MEM-01   | подтверждено, P0                        | EventSignal.ts: `_subscribeTo` регистрирует `_oneOfDepUpdated`, стрелочный callback замыкает `this`; регистр глобальный | Удалённый Model/View может оставаться в памяти с данными и вычислением                       | 02     |
| MEM-02   | риск, P0                                | FinalizationRegistry удаляет слушателей по символу, но не разрывает сильное удержание до GC                             | Ложное ожидание автоматической очистки; источники, abort, таймеры требуют отдельного разбора | 02     |
| PKG-01   | подтверждено, P0                        | Корневой `main: index.ts`, файла нет; build:cjs/esm ссылаются на отсутствующие configs                                  | Стандартный импорт/сборка не предоставлены                                                   | 06     |
| PKG-02   | намеренная временная схема, P0 к релизу | `link:` и импортные имена `termi@...`; package names отличаются                                                         | Checkout работает через локальную инфраструктуру; самостоятельный tarball не подтверждён     | 05     |
| PKG-03   | подтверждено, P0                        | type_guards wildcard require указывает на `.mjs`, корневой require — `.cjs`; корень не задаёт exports/types/files       | Несогласованное разрешение модулей, лишние файлы в пакете                                    | 05, 06 |
| DEV-01   | подтверждено, P0                        | `test` — заглушка; postinstall патчит ts-node/Jest; TypeScript dependency = latest                                      | Установка потребителя связана с инструментами автора; результаты сборки не воспроизводимы    | 01, 06 |
| TYPE-01  | подтверждено, P0                        | `createSignal` имеет перегрузку, возвращающую `EventSignal<T,T>`; `get` использует casts в R                            | Источник, data и sync/async могут отражаться неточно                                         | 03     |
| TYPE-02  | подтверждено, P1                        | `mutate<PROPS=Partial<Awaited<S>>>` без extends; `map<CR>` сохраняет S и подавляет ошибку конструктора                  | Неверные поля могут приниматься; getter и setter проекции непонятны                          | 03     |
| API-01   | подтверждено, P1                        | events.ts `eventNames()` возвращает Object.keys, пропуская Symbol                                                       | Отличие от Node; диагностика подписок неполна                                                | 03     |
| API-02   | проверка требуется, P0 обещаний         | README обещает Full Node.js API compatibility; iterator watermarks/close обозначены TODO                                | Потребитель может ожидать поведение, которое не реализовано                                  | 03     |
| LIFE-01  | подтверждено по коду, P1                | unsubscribe устанавливает closed, но не проверяет его перед повторной очисткой                                          | Возможные ошибки повторного React/consumer cleanup; runtime-эффект нужно тестировать         | 02     |
| LIFE-02  | статический риск, P1                    | Cleanup callbacks выполняются последовательно без изоляции исключений                                                   | Исключение может прервать оставшуюся очистку                                                 | 02     |
| REACT-01 | риск, P1                                | initReact, JSX-протокол, hooks, регистрация компонентов находятся в EventSignal.ts; тесты преимущественно fakeReact     | Более дорогой аудит, скрытые связи, неподтверждённые real React/SSR контракты                | 04, 07 |
| FLOW-01  | подтверждённая архитектура, P2          | eventsAsyncIterator использует массивы очередей и shift; watermarks TODO                                                | Возможный рост памяти при медленном потребителе; нужен workload benchmark                    | 09     |

## Подробные замечания

#### 🔴 MEM-01 — Глобальные callbacks удерживают производные сигналы

**Проблема:**
Подтверждено, P0: модульный регистр хранит callback, замыкающий this. Удаление внешних ссылок не разрывает этот путь.
Исходная проба сохранила 100 слушателей и последний дочерний сигнал после пяти циклов GC; явная очистка удалила 100
слушателей.

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 30–40

```typescript
//  2. Кидать события onCreateEventSignal, onDestroyEventSignal и другие
//  3. Добавить в опции конструктора EventSignal свойство "domain" для переопределения, какой signalEventsEmitter использовать.
const signalEventsEmitter = new EventEmitterX({
    listenerOncePerEventType: true,
});
const timersTriggerEventsEmitter = new EventEmitterX({
    listenerOncePerEventType: true,
});

const subscribersEventsEmitter = new EventEmitterX({
    listenerOncePerEventType: true,
```

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 101–105

```typescript
    private readonly _oneOfDepUpdated = (noEventSignalDepUpdate?: boolean) => {
        const stateFlags = this._stateFlags;
        const hasNoThrottle_or_wasThrottleTrigger = ((stateFlags & EventSignal.StateFlags.hasThrottle) === 0
            || (stateFlags & EventSignal.StateFlags.wasThrottleTrigger) !== 0
        );
```

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 1833–1836

```typescript
            //    2.1. cleanupCallback(onTeardown) - коллбек, который должен вызываться, когда этот listener удаляется
            //    2.2. weakSpyOnTarget - объект, который нужно добавить в WeakMap и при удалении которого GC мы должны удалить listener (это будет проверять setInterval каждые 2-5 минут).
            signalEventsEmitter.addListener(signalSymbol, this._oneOfDepUpdated);
        }
```

**Рекомендация:**
Использовать слабое получение экземпляра в callbacks регистра и метаданные очистки без удержания объекта; разобрать все
сильные ссылки и проверить heap retaining paths вместе с детерминированными тестами destructor. Этап 02.

#### 🟠 MEM-02 — Финализация не разрывает сильное удержание

**Проблема:**
Риск lifecycle, P0: регистрация/финализация по символу может удалить слушателей только после доступности объекта для GC.
Она не делает сильно удерживаемый объект доступным для сборки и не представляет полную очистку
таймеров/источников/abort.

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 574–577

```typescript
        });

        eventSignalsFinalizationRegistry?.register(this, this._signalSymbol);
    }
```

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 3404–3410

```typescript
if (typeof FinalizationRegistry !== 'undefined') {
    eventSignalsFinalizationRegistry = new FinalizationRegistry(signalSymbol => {
        signalEventsEmitter.removeAllListeners(signalSymbol);
        subscribersEventsEmitter.removeAllListeners(signalSymbol);
    });
}

```

**Рекомендация:**
Сначала устранить сильные удерживающие пути. Использовать финализацию как страховку; сохранить детерминированную очистку
destructor/abort и определить гарантии без нативного WeakRef. Этап 02.

#### 🟠 PKG-01 — Отсутствуют корневая точка входа и конфигурации сборки

**Проблема:**
Подтверждено, P0: manifest ссылается на index.ts и tsconfig.cjs.json/tsconfig.esm.json, отсутствовавшие в проверенном
checkout. Обычный корневой импорт и объявленную двойную сборку нельзя подтвердить в текущем составе.

**Файл:** `package.json`, строки 7–16

```json
  "type": "commonjs",
  "main": "index.ts",
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "postinstall": "node _dev/postinstall/index.cjs",
    "test": "echo \"Error: no test specified\" && exit 1",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:esm": "tsc -p tsconfig.esm.json",
    "build": "npm run build:cjs && npm run build:esm",
    "build:parallel": "npm run build:cjs & npm run build:esm"
```

**Рекомендация:**
Реализовать публичный корневой индекс с алиасом EventEmitter и реальные CJS/ESM/declaration сборки; проверить
упакованные точки входа в чистых потребителях. Сохранить намерение поставки TypeScript-исходников. Этап 06.

#### 🔵 PKG-02 — Локальные зависимости намеренно временные

**Проблема:**
P0 до публикации, а не случайный дефект разработки: aliases termi@ используют link:, а manifests зависимостей объявляют
другие канонические имена. Установка вне checkout не подтверждена. Наличие dist не доказывает воспроизводимость
независимых пакетов.

**Файл:** `package.json`, строки 18–26

```json
  "dependencies": {
    "~": "link:./",
    "termi@ProgressControllerX": "link:./packages/ProgressControllerX",
    "termi@ServerTiming": "link:./packages/ServerTiming",
    "termi@abortable": "link:./packages/abortable",
    "termi@polyfills": "link:./packages/polyfills",
    "termi@runEnv": "link:./packages/runEnv",
    "termi@type_guards": "link:./packages/type_guards",
    "typescript": "latest"
```

**Файл:** `packages/runEnv/package.json`, строки 1–7

```json
{
  "name": "@termi/runenv",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.mjs",
  "types": "./dist/esm/index.d.ts",
```

**Файл:** `packages/type_guards/package.json`, строки 1–7

```json
{
  "name": "@repo/type_guards",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.mjs",
  "types": "./dist/esm/index.d.ts",
```

**Файл:** `packages/abortable/package.json`, строки 1–7

```json
{
  "name": "@termi/abortable",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.mjs",
  "types": "./dist/esm/index.d.ts",
```

**Рекомендация:**
Инвентаризировать исходники/сборки, выбрать канонические имена и граф публикации. Проверить JS, source и публичные
декларации без local links и cftools. Пересмотр запрета на редактирование packages/ отложен; сейчас его не менять. Этап
05.

#### 🟠 PKG-03 — Пути экспорта и состав пакета требуют согласованного контракта

**Проблема:**
Подтверждено, P0: root require type_guards выбирает .cjs, а wildcard require — .mjs под dist/cjs. Проверенный корневой
manifest не задаёт exports/types/files; main указывает на незавершённую source-точку входа. Чистая tarball-матрица не
подтверждает resolution и управляемый состав пакета.

**Файл:** `packages/type_guards/package.json`, строки 8–21

```json
  "exports": {
    ".": {
      "types": "./dist/esm/index.d.ts",
      "require": "./dist/cjs/index.cjs",
      "import": "./dist/esm/index.mjs",
      "default": "./dist/esm/index.mjs"
    },
    "./package.json": "./package.json",
    "./*": {
      "types": "./dist/esm/*.d.ts",
      "require": "./dist/cjs/*.mjs",
      "import": "./dist/esm/*.mjs",
      "default": "./dist/esm/*.mjs"
    }
```

**Файл:** `package.json`, строки 1–16

```json
{
  "name": "@termi/eventemitterx",
  "version": "0.1.0",
  "description": "Another implementation of EventEmitter for Nodejs and browsers",
  "license": "ISC",
  "author": "",
  "type": "commonjs",
  "main": "index.ts",
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "postinstall": "node _dev/postinstall/index.cjs",
    "test": "echo \"Error: no test specified\" && exit 1",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:esm": "tsc -p tsconfig.esm.json",
    "build": "npm run build:cjs && npm run build:esm",
    "build:parallel": "npm run build:cjs & npm run build:esm"
```

**Рекомендация:**
Согласовать require/import/types subpaths с фактическим output и задать явный files allowlist. Проверить root и wildcard
resolution на tarball. Изменения пакетов остаются планом до пересмотра запрета. Этапы 05–06.

#### 🟠 DEV-01 — Инструменты разработки затрудняют проверку релиза

**Проблема:**
Подтверждено, P0: test в корне — заглушка, postinstall патчит ts-node/Jest, TypeScript — runtime dependency latest.
ts-jest также выключает строгие опции. Успешные runtime-тесты поэтому не доказывают строгую корректность деклараций или
воспроизводимость установки потребителя.

**Файл:** `package.json`, строки 10–15

```json
    "preinstall": "npx only-allow pnpm",
    "postinstall": "node _dev/postinstall/index.cjs",
    "test": "echo \"Error: no test specified\" && exit 1",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:esm": "tsc -p tsconfig.esm.json",
    "build": "npm run build:cjs && npm run build:esm",
```

**Файл:** `package.json`, строки 24–27

```json
    "termi@runEnv": "link:./packages/runEnv",
    "termi@type_guards": "link:./packages/type_guards",
    "typescript": "latest"
  },
```

**Файл:** `_dev/postinstall/index.cjs`, строки 1–9

```typescript
'use strict';

const { fix_ts_node_configuration } = require('./lib/ts-node.cjs');
const { fix_node_modules_jest_runner_testWorker } = require('./lib/jest-runner_testWorker.cjs');
const { patch_node_modules_jest_snapshot_InlineSnapshots } = require('./lib/jest-snapshot_InlineSnapshots.cjs');

fix_ts_node_configuration();
fix_node_modules_jest_runner_testWorker();
patch_node_modules_jest_snapshot_InlineSnapshots();
```

**Файл:** `jest.config.main.ts`, строки 73–83

```typescript
compilerOptions.strict = false;
compilerOptions.strictFunctionTypes = false;
compilerOptions.strictPropertyInitialization = false;
compilerOptions.noImplicitAny = false;
compilerOptions.noImplicitThis = false;
compilerOptions.allowJs = true;
compilerOptions.skipLibCheck = false;
compilerOptions.noEmitOnError = false;
compilerOptions.resolveJsonModule = true;
// compilerOptions.types = [ ...(compilerOptions.types || []), 'jest-extended/types' ];

```

**Рекомендация:**
Отделить явную настройку разработки от установки потребителя, закрепить toolchain и добавить рабочие тесты библиотеки
плюс независимую строгую проверку типов/деклараций. Разобрать исторические падения без отключения assertions. Этапы 01 и
06.

#### 🟠 TYPE-01 — Типы перегрузок фабрики и чтения теряют точность

**Проблема:**
Подтверждено, P0: одна перегрузка createSignal возвращает EventSignal<T,T>, хотя принимает options S/D/R; get приводит
runtime values/promises к R. Это свидетельство незавершённого контракта, а не доказательство ошибочности каждой
перегрузки.

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 2619–2622

```typescript
    static createSignal<T>(initialValue: T): EventSignal<T, T>;
    static createSignal<T, S, D, R = T>(initialValue: T, computation: EventSignal.ComputationWithSource<T, S, D, T>, options?: EventSignal.NewOptions<T, S, D, R> | EventSignal.NewOptionsWithSource<T, S, D, R>): EventSignal<T, S, D, R>;
    static createSignal<T, S, D, R = T>(initialValue: T, options: EventSignal.NewOptionsWithSource<T, S, D, R>): EventSignal<T, S, D, R>;
    static createSignal<T, S, D, R>(initialValue: T, options: EventSignal.NewOptions<T, S, D, R>): EventSignal<T, T>;
```

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 1289–1296

```typescript
        }

        if ((stateFlags & EventSignal.StateFlags.wasLastAsyncComputation) !== 0) {
            return Promise.resolve(this._value) as unknown as R;
        }

        return this._value as unknown as R;
    };
```

**Рекомендация:**
Определить роли value/source/data/read-result и sync/async/hybrid семантику, затем завершить перегрузки и компилировать
положительные/отрицательные примеры потребителей на emitted declarations. Этап 03.

#### 🟠 TYPE-02 — Мутация и проекции требуют явных ограничений типов

**Проблема:**
Подтверждено, P1: mutate задаёт generic default без extends constraint. map сохраняет исходный S и подавляет ошибку
перегрузки конструктора; семантика getter/setter проекции поэтому неясна, а неверные mutation inputs могут выводиться.

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 1468–1474

```typescript
    mutate<PROPS=Partial<Awaited<S>>>(props: PROPS) {
        if (props == null || (this._stateFlags & EventSignal.StateFlags.isDestroyed) !== 0) {
            return false;
        }

        if (typeof props !== 'object') {
            if (this._setSourceValue(props as S, true)) {
```

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 2537–2547

```typescript
    map<CR>(computation: (currentSourceValue: T) => CR) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ignore `TS2769: No overload matches this call.
        //   Overload 1 of 5, '(initialValue: CR | Awaited<CR>, options: NewOptions<CR, S, undefined> | NewOptionsWithSource<CR, S, undefined>): EventSignal<...>', gave the following error.
        //     Argument of type '() => CR' is not assignable to parameter of type 'NewOptions<CR, S, undefined> | NewOptionsWithSource<CR, S, undefined>'.
        //     Overload 2 of 5, '(initialValue: CR | Awaited<CR>, computation: ComputationWithSource<CR, S, undefined>): EventSignal<CR, S, undefined>', gave the following error.
        //       Argument of type '() => CR' is not assignable to parameter of type 'ComputationWithSource<CR, S, undefined>'.
        // `
        return new EventSignal<CR, S>(void 0 as CR, () => {
            return computation(this.get() as unknown as T);
        });
```

**Рекомендация:**
Ограничить разрешённые поля/значения объекта и отдельно определить scalar-поведение. Сохранить map первого релиза
однонаправленным с явными правами записи; проверить revision→DTO и sync/async-проекции. Этап 03.

#### 🟠 API-01 — eventNames пропускает Symbol-события

**Проблема:**
Подтверждено, P1: Object.keys не перечисляет Symbol-ключи, хотя сигналы и потребители используют Symbol-события. Это
отличается от нативного Node-поведения и может скрыть регистрации в диагностике.

**Файл:** `modules/events.ts`, строки 1384–1389

```typescript
    eventNames(): NodeEventName[] {
        // todo:
        //  1. return number key as number
        //  2. return Symbol's keys: `[ ...Object.keys(this._events), ...Object.getOwnPropertySymbols(this._events) ]`
        return Object.keys(this._events);
    }
```

**Рекомендация:**
Включить Symbol-ключи и сравнить порядок/значения с node:events; числовые ключи проверять как отдельное расширение
проекта. В текущей пробе удержания использовать прямой listenerCount(symbol). Этап 03.

#### 🟠 API-02 — Полная совместимость с Node не подтверждена

**Проблема:**
P0 для обещаний релиза: README заявляет полную совместимость Node.js EventEmitter API, тогда как iterator
close/watermark options остаются TODO. Совместимость класса и всего модуля events — разные области; утверждению нужна
версионированная матрица.

**Файл:** `README.md`, строки 9–16

```markdown
### EventEmitterX
- ✅ Full Node.js `EventEmitter` API compatibility
- 🌐 Works in browsers without polyfills
- 🔒 `listenerOncePerEventType` — prevent duplicate listeners per event
- 📊 `emitCounter` — count emit calls for monitoring
- ⏱️ Enhanced `static once()` — Promise-based with **filter**, **timeout**, **AbortSignal**, **multiple event names**, and both `EventEmitter`/`EventTarget` support
- 🔄 `static on()` — async iterator for event streams with value transformation
- 🧹 `destructor()` / `Symbol.dispose` — safe resource cleanup
```

**Файл:** `modules/EventEmitterEx/eventsAsyncIterator.ts`, строки 65–75

```typescript
    /**
     * todo: make compatible with nodejs `events.on#options.close` (https://github.com/nodejs/node/blob/71951a0e86da9253d7c422fa2520ee9143e557fa/lib/events.js#L1010)
     *  1. make it array
     *  2. rename to 'close' as in [nodejs.events.on.options](https://nodejs.org/api/events.html#eventsonemitter-eventname-options)
     *  3. add to 'closeEventFilter(this: EventsAsyncIterator, eventName: EventName, ...args)'
     */
    stopEventName?: EventName | null,
    /**
     * todo:
     *  1. make it array
     *  2. rename to 'error'
```

**Файл:** `modules/EventEmitterEx/eventsAsyncIterator.ts`, строки 80–87

```typescript
     * @see [MDN / ReadableStream / queuingStrategy.highWaterMark]{@link https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream#highwatermark}
     * @see [NodeJS / api / events / on.options / (highWaterMark, lowWaterMark)]{@link https://nodejs.org/api/events.html#eventsonemitter-eventname-options}
     */
    // todo: add highWaterMark?: number, также добавить поддержку свойства "highWatermark" - для совместимости с `nodejs events.on` (только если в nodejs не переименуют свойство в highWaterMark)
    //  Default: `Number.MAX_SAFE_INTEGER` The high watermark. The emitter is paused every time the size of events being buffered is higher than it. Supported only on emitters implementing `pause()` and `resume()` methods.
    // todo: add lowWaterMark?: number, также добавить поддержку свойства "lowWatermark" - для совместимости с `nodejs events.on` (только если в nodejs не переименуют свойство в lowWaterMark)
    //  Default: `1` The low watermark. The emitter is resumed every time the size of events being buffered is lower than it. Supported only on emitters implementing `pause()` and `resume()` methods.
    isDebug?: boolean,
```

**Рекомендация:**
Запустить differential tests для класса по умолчанию и отдельно классифицировать static helpers/options как supported,
extended, different или absent. Публиковать только проверенное утверждение. Этап 03.

#### 🟡 LIFE-01 — Повторный unsubscribe не проверяет closed

**Проблема:**
Подтверждённое наблюдение по коду, P1: unsubscribe устанавливает closed, удаляет listener и очищает ссылку, но повторный
вызов снова входит в удаление. Runtime-ошибка зависит от пути removal и требует проверки.

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 1921–1930

```typescript
        let closed = false;
        let suspended = false;
        const unsubscribe = () => {
            closed = true;

            this._removeListener(ignoredEventName, listener, true);

            listener = void 0;
        };

```

**Рекомендация:**
Сразу возвращаться для закрытой подписки; проверить повторный unsubscribe, unsubscribe при suspend, resume после
закрытия и cleanup после уничтожения. Этап 02.

#### 🟠 LIFE-02 — Исключения cleanup могут прервать освобождение ресурсов

**Проблема:**
Статический риск P1: source/trigger/throttle cleanup выполняются последовательно до очистки регистров и onDestroy.
Исключение callback может прервать последующие шаги. Успешная проба явной очистки не проверяет эти пути исключений.

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 713–737

```typescript
        if (_sourceCleanup) {
            _sourceCleanup();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore ignore readonly attribute
            this._sourceCleanup = void 0;
        }
        if (_triggerCleanUp) {
            _triggerCleanUp();
            this._triggerCleanUp = void 0;
        }
        if (_throttleCleanUp) {
            _throttleCleanUp();
            this._throttleCleanUp = void 0;
        }

        /**
         * Удаляем подписки ДРУГИХ сигналов на этот EventSignal.
         */
        signalEventsEmitter.removeAllListeners(_signalSymbol);
        /**
         * Удаляем подписки которые были повешены в функции [on]{@link on}.
         */
        subscribersEventsEmitter.removeAllListeners(_signalSymbol);

        _onDestroy?.();
```

**Рекомендация:**
Использовать fault-injection тесты и гарантировать оставшуюся очистку через guarded steps/finally с явной политикой
сообщения ошибок. Проверить идемпотентность после частичного сбоя. Этап 02.

#### 🟡 REACT-01 — Связи с React требуют выделения и проверки реального фреймворка

**Проблема:**
Архитектурный/тестовый риск P1: core содержит hook calls и регистрацию компонентов, а спецификация явно включает
синтетические fakeReact-тесты. Они полезны, но не подтверждают реальный concurrent React, StrictMode или SSR.

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 2213–2217

```typescript
                }, [ this, reducer ]);

                return _useSyncExternalStore(this.subscribeOnNextAnimationFrame, getSnapshot);
                // return _useSyncExternalStore(this.subscribeOnNextAnimationFrame, () => {
                //     if (!reducerResultCache) {
```

**Файл:** `modules/EventEmitterEx/EventSignal.ts`, строки 2762–2770

```typescript

            reactInit: if ('useSyncExternalStore' in __React) {
                _EventSignal_prototype._useSyncExternalStore = _useSyncExternalStore = __React.useSyncExternalStore;
                _EventSignal_prototype._useRef = __React.useRef;
                _EventSignal_prototype._useState = __React.useState;
                _EventSignal_prototype._useEffect = _useEffect = __React.useEffect;
                _EventSignal_prototype._useLayoutEffect = __React.useLayoutEffect || __React.useEffect;
                _EventSignal_prototype._useCallback = __React.useCallback;

```

**Файл:** `spec/modules/EventEmitterEx/EventSignal_spec.ts`, строки 3777–3783

```typescript
    describe('Synthetic testing of React (using own fakeReact)', function() {
        const { requestAnimationFrame } = globalThis;
        const currentReact = EventSignal._React;

        beforeAll(() => {
            // @ts-expect-error
            globalThis.requestAnimationFrame = queueMicrotask;
```

**Рекомендация:**
Выделить React adapter с сохранением git-истории; добавить real fixtures поддерживаемых версий для snapshots, hydration
и повторного cleanup. Синтетические тесты сохранить для локального поведения. Этапы 04 и 07.

#### 🟡 FLOW-01 — Буферизация iterator требует измеренного backpressure

**Проблема:**
Наблюдаемая архитектура, P2: pending events используют массив с shift, поддержка watermarks закомментирована. Медленный
потребитель может накапливать очередь; влияние нагрузки и корректную termination семантику нужно измерить, а не
объявлять универсальный performance-дефект.

**Файл:** `modules/EventEmitterEx/eventsAsyncIterator.ts`, строки 309–317

```typescript
                return;
            }
        }

        unconsumedEvents.push({
            eventName: event,
            eventArgs: eventArgs as unknown as T,
        });
    };
```

**Файл:** `modules/EventEmitterEx/eventsAsyncIterator.ts`, строки 497–504

```typescript
            // First, we consume all unread events
            if (unconsumedEvents.length > 0) {
                const unconsumedEvent = unconsumedEvents.shift();

                if (unconsumedEvent) {
                    const { eventName, eventArgs } = unconsumedEvent;
                    let value = eventArgs as T;
                    let computeValueStep1Result: ReturnType_computeValueStep1["step1Result"] | void = void 0;
```

**Файл:** `modules/EventEmitterEx/eventsAsyncIterator.ts`, строки 80–87

```typescript
     * @see [MDN / ReadableStream / queuingStrategy.highWaterMark]{@link https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream#highwatermark}
     * @see [NodeJS / api / events / on.options / (highWaterMark, lowWaterMark)]{@link https://nodejs.org/api/events.html#eventsonemitter-eventname-options}
     */
    // todo: add highWaterMark?: number, также добавить поддержку свойства "highWatermark" - для совместимости с `nodejs events.on` (только если в nodejs не переименуют свойство в highWaterMark)
    //  Default: `Number.MAX_SAFE_INTEGER` The high watermark. The emitter is paused every time the size of events being buffered is higher than it. Supported only on emitters implementing `pause()` and `resume()` methods.
    // todo: add lowWaterMark?: number, также добавить поддержку свойства "lowWatermark" - для совместимости с `nodejs events.on` (только если в nodejs не переименуют свойство в lowWaterMark)
    //  Default: `1` The low watermark. The emitter is resumed every time the size of events being buffered is lower than it. Supported only on emitters implementing `pause()` and `resume()` methods.
    isDebug?: boolean,
```

**Рекомендация:**
Измерить slow-consumer workloads, спроектировать bounded-buffer/overflow и pause/resume, проверить abort/return/throw и
порядок событий до замены очередей. Этап 09.

В проверенном checkout packages/*/dist содержит артефакты (например, runEnv и abortable по четыре файла). Документ Junct
описывает отсутствующий dist в другой сохранённой ревизии; текущая полнота и независимость требуют отдельной проверки.
Артефакты сами по себе не подтверждают доступность исходников или воспроизводимую сборку пакетов.

## Как это видит потребитель

1. **Автор Node-сервиса:** хочет заменить импорт EventEmitter и ожидает тот же порядок вызовов, this, duplicate
   listeners, error semantics и Symbol events. Алиас допустим, обещание совместимости требует differential tests.
2. **Автор browser-приложения:** ожидает компактный ESM без серверных runtime-зависимостей и доступные subpath imports.
   Сейчас граф EventSignal → EventEmitterX → abortable необходимо измерить.
3. **Автор React-приложения:** хочет стабильный snapshot, cleanup после unmount и общий Model для React/терминала. Не
   должен вынужденно вызывать get после каждого set или создавать сигналы в render.
4. **Автор TypeScript-библиотеки:** ожидает точные типы источника и результата, ошибки неверной мутации, генерируемые
   декларации без фиктивного сокращения интерфейса.
5. **Автор Bun/Deno-приложения:** хочет официальный source export с разрешаемыми импортами; наличие `.ts` в tarball не
   гарантирует работу этих сред.
6. **Новый пользователь:** хочет один корневой импорт, короткий рецепт lifecycle и явную таблицу поддерживаемых
   возможностей. Deep imports в README, несколько getter-форм и Promise/undefined semantics сейчас увеличивают время
   освоения.

## Точки роста

- Удобный мост emitter/EventTarget → signal → React без дублирования состояния: главный практический сценарий, который
  стоит сделать образцовым.
- EventAwait как самостоятельный модуль: полезен и без сигналов/React.
- Маленькие проверенные subpath exports, независимые зависимости и реальные consumer fixtures дают больше пользы для
  первого релиза, чем расширение набора API.
- Разделение core/React/lifecycle уменьшает цену дальнейшего аудита и вероятность скрытых циклов импорта.
- Weather demo может стать проверкой cancellation, TTL, lazy projections и освобождения ресурсов, а не только витриной
  UI.

## Внешние эталоны

Для матрицы Node использована [официальная документация events](https://nodejs.org/api/events.html): синхронные
listeners, this, Symbol events и опции on/once. Это эталон будущих differential tests, а не сертификат совместимости
проекта.

Для React
использован [официальный контракт useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore):
стабильность snapshot и серверный snapshot. Проверить реальные версии, заявляемые релизом. Изученные страницы не
заменяют локальную проверку.
