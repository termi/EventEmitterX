'use strict';

// Separate process: GC eligibility is not a Jest fake-timer contract.
process.env.NODE_ENV = 'test';
// Model a browser frame that has not run yet; no real timer keeps the process alive.
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};
require('ts-node').register({ transpileOnly: true, project: require('node:path').resolve(__dirname, '../tsconfig.json') });
require('termi@polyfills');
const withoutWeakRef = process.argv.includes('--without-weakref');
if (withoutWeakRef) global.WeakRef = undefined;
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
    EventSignal,
    __test__get_signalEventsEmitter,
    __test__get_subscribersEventsEmitter,
    __test__get_timersTriggerEventsEmitter,
} = require('../modules/EventEmitterEx/EventSignal.ts');

if (!global.gc) throw new Error('Run node --expose-gc _dev/check_signal_lifecycle.cjs');

const source$ = new EventSignal(1);
const emitter = new EventEmitter();
const abortOwner = new AbortController();

// Keep construction outside the async collection frame. Suspended frames can keep locals alive.
function makeForgotten(kind) {
    let signal$;
    if (kind === 'dependency') signal$ = new EventSignal(0, () => source$.get() * 2);
    if (kind === 'explicit dependency') signal$ = new EventSignal(0, () => 2, { deps: [{ eventName: source$.eventName }] });
    if (kind === 'self subscriber') {
        signal$ = new EventSignal(0);
        signal$.on(() => signal$.getLast());
    }
    if (kind === 'source emitter') signal$ = new EventSignal(0, { sourceEmitter: emitter, sourceEvent: 'source' });
    if (kind === 'emitter trigger') signal$ = new EventSignal(0, () => 1, { trigger: { type: 'emitter', emitter, event: 'tick' } });
    if (kind === 'signal trigger') signal$ = new EventSignal(0, () => 1, { trigger: { eventSignal: source$ } });
    if (kind === 'clock') signal$ = new EventSignal(0, () => 1, { trigger: { type: 'clock', ms: 60_000, timerGroupId: 'gc-probe' } });
    if (kind === 'abort owner') signal$ = new EventSignal(0, { signal: abortOwner.signal });
    if (kind === 'React subscription') {
        signal$ = new EventSignal(0, { componentType: 'gc-probe' });
        signal$.subscribeOnNextRender(() => signal$.getLast());
        signal$.set(1);
    }
    signal$.get();
    return { reference: new WeakRef(signal$), eventName: signal$.eventName };
}

async function collect(batch) {
    for (let attempt = 0; attempt < 40; attempt++) {
        await new Promise(setImmediate);
        global.gc();
        await new Promise(setImmediate); // finalizers are asynchronous
        if (batch.every(item => item.reference.deref() === undefined)) {
            await new Promise(setImmediate);
            return;
        }
    }
    throw new Error('Signals still reachable after bounded GC; inspect retaining paths');
}

async function main() {
    if (withoutWeakRef) {
        const fallback$ = new EventSignal(0, { sourceEmitter: emitter, sourceEvent: 'source' });
        emitter.emit('source', 7);
        assert.equal(fallback$.get(), 7);
        fallback$.destructor();
        assert.equal(emitter.listenerCount('source'), 0);
        source$.destructor();
        console.log('PASS fallback: deterministic disposal without native WeakRef; automatic GC is not promised');
        return;
    }
    for (const kind of ['dependency', 'explicit dependency', 'self subscriber', 'source emitter', 'emitter trigger', 'signal trigger', 'clock', 'abort owner', 'React subscription']) {
        const batch = Array.from({ length: 8 }, () => makeForgotten(kind));
        await collect(batch);
        for (const { eventName } of batch) {
            assert.equal(__test__get_signalEventsEmitter().listenerCount(eventName), 0);
            assert.equal(__test__get_subscribersEventsEmitter().listenerCount(eventName), 0);
            assert.equal(__test__get_timersTriggerEventsEmitter().listenerCount(eventName), 0);
        }
        assert.equal(__test__get_signalEventsEmitter().listenerCount(source$.eventName), 0);
        assert.equal(emitter.listenerCount('source'), 0);
        assert.equal(emitter.listenerCount('tick'), 0);
        console.log(`PASS GC: ${kind} (8 signals and registration cleanup)`);
    }

    const live$ = new EventSignal(0, () => source$.get() * 2);
    let notified = 0;
    const subscription = live$.on(() => { notified++; });
    assert.equal(live$.get(), 2);
    for (let attempt = 0; attempt < 4; attempt++) { await new Promise(setImmediate); global.gc(); }
    notified = 0; // Initial read publication was flushed during the preceding event-loop turns.
    source$.set(4);
    await new Promise(setImmediate);
    assert.equal(live$.get(), 8);
    assert.equal(notified, 1);
    subscription.unsubscribe();
    live$.destructor();
    console.log('PASS GC: live owner preserves callbacks and dependency delivery');
    source$.destructor();
    abortOwner.abort();
}

main().catch(error => { console.error(error); process.exitCode = 1; source$.destructor(); abortOwner.abort(); });
