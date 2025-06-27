'use strict';

import { defineMethodProperty } from "../utils/object";

// noinspection UnnecessaryLocalVariableJS
const _WeakMap = WeakMap;
const _WeakMap_prototype = _WeakMap.prototype;
const _WeakMap_prototype_has = _WeakMap_prototype.has;
const _WeakMap_prototype_get = _WeakMap_prototype.get;
const _WeakMap_prototype_set = _WeakMap_prototype.set;

if (!_WeakMap_prototype.getOrInsert) {
    defineMethodProperty(_WeakMap_prototype, 'getOrInsert', function getOrInsert(this: WeakMap<object, unknown>, key: object, defaultValue: unknown) {
        if (_WeakMap_prototype_has.call(this, key)) {
            return _WeakMap_prototype_get.call(this, key);
        }

        _WeakMap_prototype_set.call(this, key, defaultValue);

        return defaultValue;
    });
}

if (!_WeakMap_prototype.getOrInsertComputed) {
    defineMethodProperty(_WeakMap_prototype, 'getOrInsertComputed', function getOrInsertComputed(this: WeakMap<object, unknown>, key: object, computation: (key: object) => unknown) {
        if (_WeakMap_prototype_has.call(this, key)) {
            return _WeakMap_prototype_get.call(this, key);
        }

        const defaultValue = computation(key);

        _WeakMap_prototype_set.call(this, key, defaultValue);

        return defaultValue;
    });
}
