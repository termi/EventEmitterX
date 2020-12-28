'use strict';
/** @private */
const _is = Object.is;
export function displayValueForTypeGuard(value, type = typeof value, options) {
    if (typeof type === 'object') {
        options = type;
        type = typeof value;
    }
    else if (!type) {
        type = typeof value;
    }
    if (value === null
        || value === void 0
        || type === 'boolean'
        || (type === 'number' && (Number.isNaN(value)
            || !Number.isFinite(value)))) {
        const valuePrefix = options?.valuePrefix ?? 'value ';
        // Для этих типов данных всегда показываем значение, даже если `isDisplayValue === false`
        return `${valuePrefix}${_is(value, -0) ? '-0' : value}`;
    }
    const isDisplayValue = options?.isDisplayValue ?? true;
    const isDisplayType = options?.isDisplayType ?? true;
    const valuePrefix = options?.valuePrefix ?? (isDisplayType ? 'value of type ' : 'value ');
    if (isDisplayValue) {
        const displayValue = primitiveValueToStringForTypeGuard(value, void 0, {
            isDisplayArray: options?.isDisplayArray ?? false,
            valueAsString: options?.valueAsString,
        });
        if (!isDisplayType) {
            return `${valuePrefix}${displayValue}`;
        }
        return `${valuePrefix}"${type}"${displayValue ? ` (${displayValue})` : ''}`;
    }
    return `value of type "${type}"`;
}
const _Object_prototype_toString = Object.prototype.toString;
export function primitiveValueToStringForTypeGuard(value, type = typeof value, options) {
    const valueAsString = options?.valueAsString;
    if (type === 'string') {
        const stringValue = value;
        if (stringValue.length > 102) {
            return `"${stringValue.substring(0, 100)}..."`;
        }
        return `"${valueAsString ?? value}"`;
    }
    else if (type === 'bigint') {
        return `${valueAsString ?? value}n`;
    }
    else if (type === 'object') {
        if (valueAsString) {
            return `${valueAsString}`;
        }
        if (Array.isArray(value)) {
            if (options?.isDisplayArray) {
                return `[${value.map(item => primitiveValueToStringForTypeGuard(item)).join(', ')}]`;
            }
            return `Array(${value.length})`;
        }
        const objectString = _Object_prototype_toString.call(value);
        if (objectString === '[object Object]') {
            // default string
            return '';
        }
        return objectString;
    }
    else if (type === 'function' && valueAsString ? /^class\s/.test(valueAsString) : false) {
        // this is class
        const valueAsClass = value;
        const toStringTag = (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore Ignore: `TS7053: Element implicitly has an any type because expression of type unique symbol can't be used to index type Function
        // Property [SymbolConstructor. toStringTag] does not exist on type Function`
        valueAsClass[Symbol.toStringTag]
            ?? valueAsClass.name
            ?? '--UNKNOWN_CLASS--') || /* class name is empty string */ '""';
        return `class ${toStringTag}`;
    }
    return _is(value, -0) ? '-0' : String(value);
}
