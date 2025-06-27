'use strict';

import { defineMethodProperty } from "../utils/object";

// noinspection UnnecessaryLocalVariableJS
const _Map = Map;
const _Map_prototype = _Map.prototype;
const _Map_prototype_has = _Map_prototype.has;
const _Map_prototype_get = _Map_prototype.get;
const _Map_prototype_set = _Map_prototype.set;

// https://github.com/tc39/proposal-upsert
// see https://github.com/zloirock/core-js/blob/master/packages/core-js/modules/esnext.map.get-or-insert.js
if (!_Map_prototype.getOrInsert) {
    defineMethodProperty(_Map_prototype, 'getOrInsert', function getOrInsert(this: Map<unknown, unknown>, key: unknown, defaultValue: unknown) {
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
    defineMethodProperty(_Map_prototype, 'getOrInsertComputed', function getOrInsertComputed(this: Map<unknown, unknown>, key: unknown, computation: (key: unknown) => unknown) {
        if (_Map_prototype_has.call(this, key)) {
            return _Map_prototype_get.call(this, key);
        }

        const defaultValue = computation(key);

        _Map_prototype_set.call(this, key, defaultValue);

        return defaultValue;
    });
}
