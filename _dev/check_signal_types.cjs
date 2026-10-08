'use strict';

// Strict source fixtures plus consumers of emitted declarations.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'tsconfig.signal-types.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
}
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const formatHost = { getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n' };
const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
const diagnostics = [ ...parsed.errors, ...ts.getPreEmitDiagnostics(program) ];
const outputDir = path.join(root, 'build_cache/signal-types');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'source-diagnostics.log'), ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost));
console.log(`TypeScript ${ts.version}: ${diagnostics.length} source/contract diagnostics.`);
if (diagnostics.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost));
    process.exit(1);
}

// Emit declarations only after the strict source check passes.
const declarations = path.join(outputDir, 'declarations');
const signalDeclaration = path.join(declarations, 'modules/EventEmitterEx/EventSignal.d.ts');
const eventsDeclaration = path.join(declarations, 'modules/events.d.ts');
const fixtures = parsed.fileNames.filter(f => f.replaceAll('\\', '/').includes('/spec/types/'));
if (!fixtures.length) {
    throw new Error('No signal contract fixtures found');
}
const emitter = ts.createProgram(parsed.fileNames.filter(f => !fixtures.includes(f)), {
    ...parsed.options, noEmit: false, noEmitOnError: true, declaration: true,
    emitDeclarationOnly: true, outDir: declarations, rootDir: root,
});
const emitted = emitter.emit();
if (emitted.emitSkipped || emitted.diagnostics.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(emitted.diagnostics, formatHost));
    process.exit(1);
}
require('./copy_library_declarations.cjs')(emitter, declarations);
for (const [ name, module, moduleResolution ] of [
    [ 'CommonJS', ts.ModuleKind.CommonJS, ts.ModuleResolutionKind.Node10 ],
    [ 'NodeNext', ts.ModuleKind.NodeNext, ts.ModuleResolutionKind.NodeNext ],
    [ 'Bundler', ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler ],
]) {
    const consumer = ts.createProgram(fixtures, {
        ...parsed.options, noEmit: true, module, moduleResolution, skipLibCheck: false,
        paths: {
            ...parsed.options.paths,
            'signal-under-test': [ signalDeclaration ],
            'emitter-under-test': [ eventsDeclaration ],
        },
    });
    if (!consumer.getSourceFiles().some(f => path.resolve(f.fileName) === signalDeclaration)) {
        throw new Error(`${name}: fixture did not import the emitted signal declaration`);
    }
    if (!consumer.getSourceFiles().some(f => path.resolve(f.fileName) === eventsDeclaration)) {
        throw new Error(`${name}: fixture did not import the emitted emitter declaration`);
    }
    const errors = ts.getPreEmitDiagnostics(consumer);
    if (errors.length) {
        console.error(ts.formatDiagnosticsWithColorAndContext(errors, formatHost));
        process.exit(1);
    }
    console.log(`${name}: ${fixtures.length} emitted public-contract fixture file(s) passed.`);
}
