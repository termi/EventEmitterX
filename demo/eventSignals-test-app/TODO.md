# TODO `esbuild`

## Поддержка `const enum`

Сейчас в `Vite`, через `esbuild`, не полноценная поддержка `TypeScript`.

Например: `esbuild` (как и `swc`):
- Не поддерживают инлайнинг `const enum` которые располагаются в другом файле и подключаются через `import`
- Не поддерживают `const enum` которые располагаются в `.d.ts` файле

### Решение

Написать плагин для vite, который переопределит TypeScript compiler на наш стандартный `tsc`.

Пример такого плагина, с которого можно списать: https://github.com/herberttn/vite-plugin-typescript-transform

## Поддержка сложных Generic

Вот такая ошибка происходит, для строки
```typescript
private readonly _sourceEmitterRef?: ReturnType<typeof _weakRefFabric<EventEmitter | EventEmitterEx | EventTarget>>;
```

```
X [ERROR] Expected ">" but found "<"

    ../../../cftools/modules/EventEmitterEx/EventSignal.ts:71:73:
      71 │     private readonly _sourceEmitterRef?: ReturnType<typeof _weakRefFabric<EventEmitter | EventEmitterEx | EventTarget>>;
         │                                                                          ^
         ╵                                                                          >

error when starting dev server:
Error: Build failed with 1 error:
../../../cftools/modules/EventEmitterEx/EventSignal.ts:71:73: ERROR: Expected ">" but found "<"

```
