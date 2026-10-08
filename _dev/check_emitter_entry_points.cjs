'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const entries = [
    'modules/events.js',
    'modules/EventEmitterEx/EventEmitterX.js',
    'modules/EventEmitterEx/EventEmitterSimpleProxy.js',
    'modules/EventEmitterEx/EventEmitterProxy.js',
];
if (process.argv[2] === '--child') {
    require('termi@polyfills');
    const order = JSON.parse(process.argv[3]);
    for (const index of order) require(path.join(root, 'build_ts/cjs', entries[index]));
    const [events, core, simple, routed] = entries.map(entry => require(path.join(root, 'build_ts/cjs', entry)));
    assert.deepEqual(Object.keys(events).sort(), [
        'ABORT_ERR', 'EventEmitter', 'EventEmitterEx', 'EventEmitterProxy', 'EventEmitterSimpleProxy',
        'EventEmitterX', 'TimeoutError', 'addAbortListener', 'captureRejectionSymbol', 'default',
        'errorMonitor', 'getEventListeners', 'isEventEmitterCompatible', 'isEventEmitterEx',
        'isEventEmitterX', 'isEventTargetCompatible', 'kDestroyingEvent', 'on', 'once',
    ].sort());
    assert.equal(events.EventEmitterX, core.EventEmitterX);
    assert.equal(events.default, core.EventEmitterX);
    assert.equal(events.EventEmitter, core.EventEmitterX);
    assert.equal(events.kDestroyingEvent, core.kDestroyingEvent);
    assert.equal(events.EventEmitterSimpleProxy, simple.EventEmitterSimpleProxy);
    assert.equal(events.EventEmitterProxy, routed.EventEmitterProxy);
    const source = new core.EventEmitterX();
    const first = new simple.EventEmitterSimpleProxy({ emitter: source });
    const second = new routed.EventEmitterProxy({ sourceEmitter: source });
    assert.ok(first instanceof events.EventEmitterX);
    assert.ok(second instanceof events.EventEmitterX);
    let count = 0;
    first.on('data', () => count++);
    second.on('data', () => count++);
    source.emit('data');
    assert.equal(count, 2);
    first[Symbol.dispose]();
    second[Symbol.dispose]();
    assert.equal(source.listenerCount('data'), 0);
    source[Symbol.dispose]();
} else {
    function permutations(values) {
        if (!values.length) return [[]];
        return values.flatMap((value, index) => permutations(values.filter((_, other) => other !== index)).map(rest => [value, ...rest]));
    }
    for (const order of permutations([0, 1, 2, 3])) {
        const result = spawnSync(process.execPath, [__filename, '--child', JSON.stringify(order)], { cwd: root, encoding: 'utf8' });
        assert.ifError(result.error);
        assert.equal(result.status, 0, `Entry order ${order}: ${result.stderr || result.stdout}`);
    }
    console.log('Emitter entries: 24 fresh-process import orders preserve exports, class/symbol identity and forwarding.');
}
