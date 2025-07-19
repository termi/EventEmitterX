# [`@stylistic/indent`](https://eslint.style/rules/indent)

## В JSX не консистентен с правилом [`@stylistic/jsx-closing-tag-location`](https://eslint.style/rules/jsx-closing-tag-location)

```typescript jsx
function test() {
  return (<div className="auth-switch">
    {isRegistration
      ? (<span>Уже зарегистрированы?{' '}
        <button className="switch-button">Войти</button>
      </span>)// ESLint: Expected closing tag to match indentation of opening.(@stylistic/ jsx-closing-tag-location)
      : (<span>Не зарегистрированы?{' '}
        <button className="switch-button">Регистрация</button>
         </span>)// ESLint: Expected indentation of 6 spaces but found 9.(@stylistic/ indent)
    }
  </div>);
}
```

## В JSX не консистентен с правилом [`@stylistic/jsx-indent-props`](https://eslint.style/rules/jsx-indent-props)

(у этой проблемы есть решение)

```typescript jsx
function test({ timestamp, isBackward }: { timestamp: number, isBackward: boolean }) {
    return (<div className="card-time">{timestamp
        ? (<Ticker
            timestamp={timestamp} // ESLint: Expected indentation of 16 space characters but found 12.(@stylistic/ jsx-indent-props)
                isBackward={isBackward} // ESLint: Expected indentation of 12 spaces but found 16.(@stylistic/ indent)
        />)
        : ''}
    </div>);
}
```

### Решение
Настройка `ignoreTernaryOperator` решает данную проблему

```json
{
  "@stylistic/jsx-indent-props": [
    "error",
    {
      "ignoreTernaryOperator": true
    }
  ]
}
```
## Плохо работает с некоторыми кейсами в JSX

(у этой проблемы есть решение)

```typescript jsx
function test({ timestamp, isBackward, $progressContainerRef }: { timestamp: number, isBackward: boolean, $progressContainerRef: ReturnType<typeof useRef> }) {
    return (
        <div className="card-time">{timestamp
            ? (
                <Ticker
                    timestamp={timestamp}
                    isBackward={isBackward}
                >{(props) => {
                    if (!$progressContainerRef.current) { // ESLint: Expected indentation of 24 spaces but found 20.(@stylistic/ indent)
                        return '';
                    }

                    const timeDiff = props.timestamp - props.currentTimestamp;

                    return <span>{timeDiff}</span>;
                }}</Ticker>
            )
            : ''}
        </div>
    );
}
```
хочет, чтобы было вот так (отвратительно):
```typescript jsx
function test({ timestamp, isBackward, $progressContainerRef }: { timestamp: number, isBackward: boolean, $progressContainerRef: ReturnType<typeof useRef> }) {
    return (
        <div className="card-time">{timestamp
            ? (
                <Ticker
                    timestamp={timestamp}
                    isBackward={isBackward}
                >{(props) => {
                        if (!$progressContainerRef.current) {
                            return '';
                        }

                        const timeDiff = props.timestamp - props.currentTimestamp;

                        return <span>{timeDiff}</span>;
                    }}</Ticker>
            )
            : ''}
        </div>
    );
}
```
### Решение

Добавить `FunctionExpression` и `ArrowFunctionExpression` в список "ignoredNodes".
```json
{
  "@stylistic/indent": [
    "error",
    4,
    {
      "ignoredNodes": [
        "ConditionalExpression",
        "FunctionExpression",
        "ArrowFunctionExpression"
      ]
    }
  ]
}
```
