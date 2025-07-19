# [`@stylistic/multiline-ternary`](https://eslint.style/rules/multiline-ternary)

## Пример 1

Не может обработать такую ситуацию (`indent: 2`):

```typescript
const isActive = getIsActive();
const obj = {
  name: 'test',
  activePayload: isActive ? {
    isActive,
    data: {},
  } : null,
};
```
В результате срабатывания `ESLint: fix current file` получается вот такой _крайне некрасивый_ код:
```typescript
const isActive = getIsActive();
const obj = {
  name: 'test',
  activePayload: isActive
    ? {
        isActive,
        data: {},
      }
    : null,
};
```
При этом, правило `@stylistic/comma-style` не даёт перенести запятую на следующую строку. 

А если `indent` выставлен в `4` пробела, то код становиться ещё _более некрасивым_:
```typescript
const isActive = getIsActive();
const obj = {
    name: 'test',
    activePayload: isActive
        ? {
                isActive,
                data: {},
            }
        : null,
};
```

## Пример 2

Очень некрасиво форматирует такой код (`indent: 4`):

```typescript
const promise = isActive
    ? Promise.resolve(1)
        .then((v) => {
            console.log(v);
        })
    : Promise.resolve(2)
        .then((v) => {
            console.log(v);
        })
;
```
В результате срабатывания `ESLint: fix current file` получается вот такой _крайне некрасивый_ код:
```typescript
const promise = isActive
    ? Promise.resolve(1)
            .then((v) => {
                console.log(v);
            })
    : Promise.resolve(2)
            .then((v) => {
                console.log(v);
            })
;
```

## Пример 3

Не позволяет красиво использовать тернарный оператор в простых случаях:
```typescript
const obj = {
    name: 'test',
    typePayload: type === 'type1' ? 'data1'
        : type === 'type2' ? 'data2'
        : type === 'type3' ? 'data3'
        : 'default'
    ,
};
```
В результате срабатывания `ESLint: fix current file` получается вот такой код:
```typescript
const obj = {
    name: 'test',
    typePayload: type === 'type1'
        ? 'data1'
        : type === 'type2'
            ? 'data2'
            : type === 'type3'
                ? 'data3'
                : 'default',
};
```

## Пример 4

```typescript
const requestInit = {
  method: auth_check.method,
  body: _allowRefresh ? JSON.stringify({
    refreshToken: mainProcessJTWStorage.getRefreshToken(),
  } as const satisfies auth_refresh.Types["Body"]) : void 0,
};
```

