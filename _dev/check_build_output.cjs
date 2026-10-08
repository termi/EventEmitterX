'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const config = ts.readConfigFile(path.join(root, 'tsconfig.signal-types.json'), ts.sys.readFile);
if (config.error) {
    throw Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
}
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const fixtures = parsed.fileNames.filter(file => file.replaceAll('\\', '/').includes('/spec/types/'));
const host = { getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => '\n' };
for (const format of [ 'cjs', 'esm' ]) {
    const output = path.join(root, 'build_ts', format);
    const events = path.join(output, 'modules/events.d.ts');
    const signal = path.join(output, 'modules/EventEmitterEx/EventSignal.d.ts');
    assert.ok(fs.existsSync(path.join(output, 'modules/EventEmitterEx/EventSignal_types.d.ts')));
    const program = ts.createProgram(fixtures, {
        ...parsed.options, noEmit: true, skipLibCheck: false,
        paths: { ...parsed.options.paths, 'signal-under-test': [ signal ], 'emitter-under-test': [ events ] },
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length) {
        throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
    }
    for (const filename of [ events, signal ]) {
        assert.ok(program.getSourceFiles().some(source => path.resolve(source.fileName) === filename));
    }
    console.log(`${format}: built declarations and authored inputs passed consumer checks.`);
}

// Actual CJS output, not source transformed by ts-node. ESM package loading remains stage 06.
require('termi@polyfills');
const { EventEmitterX } = require('../build_ts/cjs/modules/events.js');
const { EventSignal } = require('../build_ts/cjs/modules/EventEmitterEx/EventSignal.js');

async function smoke() {
    const emitter = new EventEmitterX();
    const key = Symbol('built event');
    const pending = EventEmitterX.once(emitter, key);
    emitter.emit(key, 7);
    assert.deepEqual(await pending, [ 7 ]);
    assert.equal(emitter.listenerCount(key), 0);
    const source$ = new EventSignal(1);
    const computed$ = new EventSignal(0, () => source$.get() * 2);
    assert.equal(computed$.get(), 2);
    source$.set(value => value + 1);
    source$.set(value => value + 1);
    assert.equal(computed$.get(), 6);
    computed$[Symbol.dispose]();
    source$[Symbol.dispose]();
    emitter[Symbol.dispose]();
    console.log('CJS output: event awaiting, reducer accumulation and disposal passed runtime smoke.');
}

smoke().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
