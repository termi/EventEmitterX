'use strict';
export function defineProperty(obj, name, value) {
    return Object.defineProperty(obj, name, {
        enumerable: false,
        configurable: true,
        writable: true,
        value: value,
    });
}
export function defineMethodProperty(obj, name, method) {
    const result = defineProperty(obj, name, method);
    if (typeof method === 'function' && method.name !== name) {
        const descriptor = Object.getOwnPropertyDescriptor(method, 'name');
        if (descriptor?.configurable) {
            Object.defineProperty(method, 'name', { configurable: true, value: name });
        }
    }
    return result;
}
const _toString = Object.prototype.toString;
export function classof(obj) {
    const klass = _toString.call(obj);
    return klass.slice(8, -1);
}
//# sourceMappingURL=_utils.js.map