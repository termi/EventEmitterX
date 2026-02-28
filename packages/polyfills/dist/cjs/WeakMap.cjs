'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const _utils_js_1 = require("./_utils.cjs");
// noinspection UnnecessaryLocalVariableJS
const _WeakMap = WeakMap;
const _WeakMap_prototype = _WeakMap.prototype;
const _WeakMap_prototype_has = _WeakMap_prototype.has;
const _WeakMap_prototype_get = _WeakMap_prototype.get;
const _WeakMap_prototype_set = _WeakMap_prototype.set;
if (!_WeakMap_prototype.getOrInsert) {
    (0, _utils_js_1.defineMethodProperty)(_WeakMap_prototype, 'getOrInsert', function getOrInsert(key, defaultValue) {
        if (_WeakMap_prototype_has.call(this, key)) {
            return _WeakMap_prototype_get.call(this, key);
        }
        _WeakMap_prototype_set.call(this, key, defaultValue);
        return defaultValue;
    });
}
if (!_WeakMap_prototype.getOrInsertComputed) {
    (0, _utils_js_1.defineMethodProperty)(_WeakMap_prototype, 'getOrInsertComputed', function getOrInsertComputed(key, computation) {
        if (_WeakMap_prototype_has.call(this, key)) {
            return _WeakMap_prototype_get.call(this, key);
        }
        const defaultValue = computation(key);
        _WeakMap_prototype_set.call(this, key, defaultValue);
        return defaultValue;
    });
}
