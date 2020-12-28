'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSymbol = isSymbol;
exports.assertIsSymbol = assertIsSymbol;
exports.isRegisteredSymbol = isRegisteredSymbol;
exports.assertIsRegisteredSymbol = assertIsRegisteredSymbol;
exports.isWellKnownSymbol = isWellKnownSymbol;
exports.assertIsWellKnownSymbol = assertIsWellKnownSymbol;
exports.isUniqueSymbol = isUniqueSymbol;
exports.assertIsUniqueSymbol = assertIsUniqueSymbol;
require("../../../polyfills/dist/cjs/Symbol.cjs");
const type_guards_utils_js_1 = require("./type_guards_utils.cjs");
function isSymbol(value) {
    return typeof value === 'symbol';
}
function assertIsSymbol(value) {
    const type = typeof value;
    if (type !== 'symbol') {
        throw new TypeError(`value should be typeof "symbol", but ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value, type)} found.`);
    }
}
const _Symbol_isRegistered = Symbol.isRegistered;
function isRegisteredSymbol(value) {
    return typeof value === 'symbol' && _Symbol_isRegistered(value);
}
function assertIsRegisteredSymbol(value) {
    const type = typeof value;
    if (type !== 'symbol' || !_Symbol_isRegistered(value)) {
        throw new TypeError(`value should be Symbol created via Symbol.for('key'), but ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value, type)} found.`);
    }
}
const _Symbol_isWellKnown = Symbol.isWellKnown;
function isWellKnownSymbol(value) {
    return typeof value === 'symbol' && _Symbol_isWellKnown(value);
}
function assertIsWellKnownSymbol(value) {
    const type = typeof value;
    if (type !== 'symbol' || !_Symbol_isWellKnown(value)) {
        throw new TypeError(`value should be well-known Symbol, but ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value, type)} found.`);
    }
}
function isUniqueSymbol(value) {
    return typeof value === 'symbol'
        && !_Symbol_isRegistered(value)
        && !_Symbol_isWellKnown(value);
}
function assertIsUniqueSymbol(value) {
    const type = typeof value;
    const isSymbol = typeof value === 'symbol';
    const isRegistered = isSymbol && _Symbol_isRegistered(value);
    const isWellKnown = !isRegistered && isSymbol && _Symbol_isWellKnown(value);
    if (!isSymbol || isRegistered || isWellKnown) {
        throw new TypeError(`value should be non-well-known and non-registered, unique Symbol, but ${(0, type_guards_utils_js_1.displayValueForTypeGuard)(value, type, {
            valuePrefix: isRegistered
                ? 'registered '
                : isWellKnown
                    ? 'well-known '
                    : '',
        })} found.`);
    }
}
