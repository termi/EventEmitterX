'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineProperty = defineProperty;
exports.defineMethodProperty = defineMethodProperty;
exports.classof = classof;
function defineProperty(obj, name, value) {
    return Object.defineProperty(obj, name, {
        enumerable: false,
        configurable: true,
        writable: true,
        value: value,
    });
}
function defineMethodProperty(obj, name, method) {
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
function classof(obj) {
    const klass = _toString.call(obj);
    return klass.slice(8, -1);
}
//# sourceMappingURL=_utils.js.map