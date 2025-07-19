# [`@stylistic/quotes`](https://eslint.style/rules/quotes)

Нельзя выставить разрешение на использование двойных кавычек в обращении к свойствам объекта.
```typescript
const idempotentId = String(req.headers["X-Idempotent-Id"] || '');
```
