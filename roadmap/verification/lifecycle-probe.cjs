// Standalone audit probe; requires the repository's already installed dependencies.
const { createRequire } = require('node:module');
const path = require('node:path');
const repo = process.argv[2];
if (!repo || !global.gc) throw new Error('Usage: node --expose-gc lifecycle-probe.cjs <repository-root>');
const requireRepo = createRequire(path.resolve(repo, 'package.json'));
process.env.NODE_ENV = 'test';
requireRepo('ts-node').register({ transpileOnly: true, project: path.resolve(repo, 'tsconfig.json') });
requireRepo('termi@polyfills');
const { EventSignal, __test__get_signalEventsEmitter } = requireRepo('./modules/EventEmitterEx/EventSignal.ts');
const emitter = __test__get_signalEventsEmitter();
const source = new EventSignal(1);
const retained = [];
for (let i = 0; i < 100; i++) {
  const child = new EventSignal(0, () => source.get() * 2);
  child.get();
  retained.push(child);
}
console.log(JSON.stringify({ stage: '100 computed children', listeners: emitter.listenerCount(source.eventName) }));
for (const child of retained) child.destructor();
console.log(JSON.stringify({ stage: 'explicit cleanup', listeners: emitter.listenerCount(source.eventName) }));
source.destructor();
async function probe() {
  const parent = new EventSignal(1);
  let weak;
  for (let i = 0; i < 100; i++) {
    const child = new EventSignal(0, () => parent.get() * 2);
    child.get();
    weak = new WeakRef(child);
  }
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setImmediate(resolve));
    global.gc();
  }
  console.log(JSON.stringify({ stage: 'external child references dropped', listeners: emitter.listenerCount(parent.eventName), lastChildAlive: !!weak.deref() }));
  parent.destructor();
}
probe().catch(error => { console.error(error); process.exitCode = 1; });
