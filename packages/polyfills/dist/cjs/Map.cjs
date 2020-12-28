'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const _utils_js_1 = require("./_utils.cjs");
// todo: [New collections (Set and Map) methods](https://github.com/tc39/proposal-collection-methods)
// noinspection UnnecessaryLocalVariableJS
const _Map = Map;
const _Map_prototype = _Map.prototype;
const _Map_prototype_has = _Map_prototype.has;
const _Map_prototype_get = _Map_prototype.get;
const _Map_prototype_set = _Map_prototype.set;
// https://github.com/tc39/proposal-upsert
// see https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/esnext.map.get-or-insert.js
if (!_Map_prototype.getOrInsert) {
    (0, _utils_js_1.defineMethodProperty)(_Map_prototype, 'getOrInsert', function getOrInsert(key, defaultValue) {
        if (_Map_prototype_has.call(this, key)) {
            return _Map_prototype_get.call(this, key);
        }
        _Map_prototype_set.call(this, key, defaultValue);
        return defaultValue;
    });
}
// https://github.com/tc39/proposal-upsert
// see https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/esnext.map.get-or-insert-computed.js
if (!_Map_prototype.getOrInsertComputed) {
    (0, _utils_js_1.defineMethodProperty)(_Map_prototype, 'getOrInsertComputed', function getOrInsertComputed(key, computation) {
        if (_Map_prototype_has.call(this, key)) {
            return _Map_prototype_get.call(this, key);
        }
        const defaultValue = computation(key);
        _Map_prototype_set.call(this, key, defaultValue);
        return defaultValue;
    });
}
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/groupBy
// https://github.com/tc39/proposal-array-grouping
// https://tc39.es/ecma262/#sec-map.groupby
// see https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/es.map.group-by.js
if (!Map.groupBy) {
    (0, _utils_js_1.defineMethodProperty)(Map, 'groupBy', function (iterable, predicate) {
        if (iterable === void 0 || iterable === null) {
            throw new TypeError('Object.groupBy called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        let index = 0;
        const result = new Map();
        for (const value of iterable) {
            const group = predicate(value, index++);
            const values = result.get(group);
            if (values) {
                values.push(value);
            }
            else {
                result.set(group, [value]);
            }
        }
        return result;
    });
}
//# sourceMappingURL=Map.js.map
