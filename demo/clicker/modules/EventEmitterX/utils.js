'use strict';
/**
 * @see [WebReflection/flatted]{@link https://github.com/WebReflection/flatted}
 */
export function stringifyWithCircularHandle(item, mapValueOrAutoHandle = false) {
    let seenIndex = 0;
    const seen = new Map();
    const mapIsFunction = typeof mapValueOrAutoHandle === 'function';
    const handleSomeTypes = mapValueOrAutoHandle === true;
    const result = JSON.stringify(item, (key, val) => {
        if (handleSomeTypes) {
            // eslint-disable-next-line unicorn/no-lonely-if
            if (typeof val === 'symbol') {
                return {
                    type: 'Symbol',
                    value: val.toString(),
                    description: val.description,
                };
            }
        }
        if (typeof val === 'object' && val) {
            // eslint-disable-next-line unicorn/no-lonely-if
            if (handleSomeTypes) {
                // eslint-disable-next-line unicorn/no-lonely-if
                if (val instanceof RegExp) {
                    return {
                        type: 'RegExp',
                        value: val.toString(),
                    };
                }
            }
            const index = seen.get(val);
            if (index !== void 0) {
                return `[Circular] ${index}`;
            }
            seen.set(val, seenIndex++);
        }
        if (mapIsFunction) {
            return mapValueOrAutoHandle(key, val);
        }
        return val;
    });
    seen.clear();
    return result;
}
export function arrayContentStringify(list, excludeObjectFn) {
    const { length } = list;
    const result = new Array(length);
    for (let i = 0; i < length; i++) {
        const item = list[i];
        const type = typeof item;
        switch (type) {
            case "function":
                result[i] = item.name;
                break;
            case "object":
                if (item) {
                    if (excludeObjectFn?.(item)) {
                        result[i] = item;
                    }
                    else {
                        result[i] = stringifyWithCircularHandle(item);
                    }
                    break;
                }
            // falls through
            default: // eslint-disable-line no-fallthrough
                result[i] = String(item);
        }
    }
    return result;
}
