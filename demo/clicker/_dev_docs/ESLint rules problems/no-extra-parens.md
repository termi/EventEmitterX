# [`@stylistic/no-extra-parens`](https://eslint.style/rules/no-extra-parens)

Невозможно настроить, чтобы в таких случаях игнорировались "ненужные" скобки:

## Приведение к определённому типу
```typescript
const isForReconnect = (eventData as Parameters<SSEClientEvents['disconnect']>[0]);
```

## `BinaryExpression` в несколько строк
```typescript
const value = (
    type === 1
        ? '1'
        : '2'
);
```
