# [@stylistic/comma-style](https://eslint.style/rules/comma-style)

При стандартных настройках, хочет, чтобы запятая была "склеена" с последней строкой в тренарном операторе:

```typescript
const errorDescription = {
  errorMessage: !token
    ? 'Token missing in "Authorization" header'
    : 'Invalid token in "Authorization" header'
  ,// ESLint: Bad line breaking before and after ','.(@stylistic/comma-style)
  success: false,
  status: void 0 as number | undefined,
  error: 'Invalid token',
}
```
хочет, чтобы было вот так:
```typescript
const errorDescription = {
  errorMessage: !token
    ? 'Token missing in "Authorization" header'
    : 'Invalid token in "Authorization" header',
  success: false,
  status: void 0 as number | undefined,
  error: 'Invalid token',
}
```
из-за этого свойства "склеиваются" в один блок.

Приходиться выставить исключение для "ObjectExpression":
```json
[ "error", "last", {
  "exceptions": {
    "ObjectExpression": true
  }
}]
```
