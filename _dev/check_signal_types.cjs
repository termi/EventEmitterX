// Strict source fixtures plus consumers of emitted declarations.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'tsconfig.signal-types.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const formatHost = { getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n' };
const key = diagnostic => JSON.stringify({
    file: diagnostic.file ? path.relative(root, diagnostic.file.fileName).replaceAll('\\', '/') : null,
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
});
const expected = JSON.parse(fs.readFileSync(path.join(root, 'spec/types/library-diagnostics.json'), 'utf8')).map(entry => JSON.stringify(entry));
const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
const remaining = [...expected];
const unexpected = diagnostics.filter(diagnostic => {
    const index = remaining.indexOf(key(diagnostic));
    if (index < 0) return true;
    remaining.splice(index, 1);
    return false;
});
const outputDir = path.join(root, 'build_cache/signal-types');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'source-diagnostics.log'), ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost));
console.log(`TypeScript ${ts.version}: ${diagnostics.length - unexpected.length} recorded library diagnostics; ${unexpected.length} unexpected.`);
console.log('Library diagnostics remain unresolved; details: build_cache/signal-types/source-diagnostics.log');
if (unexpected.length || remaining.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(unexpected, formatHost));
    if (remaining.length) console.error(`${remaining.length} baseline diagnostics disappeared; review and update the ledger explicitly.`);
    process.exit(1);
}

// Emit only to ignored scratch space. This does not establish a clean library build.
const declarations = path.join(outputDir, 'declarations');
const signalDeclaration = path.join(declarations, 'modules/EventEmitterEx/EventSignal.d.ts');
const fixtures = parsed.fileNames.filter(f => f.replaceAll('\\', '/').includes('/spec/types/'));
if (!fixtures.length) throw new Error('No signal contract fixtures found');
const emitter = ts.createProgram(parsed.fileNames.filter(f => !fixtures.includes(f)), {
    ...parsed.options, noEmit: false, noEmitOnError: false, declaration: true,
    emitDeclarationOnly: true, outDir: declarations, rootDir: root,
});
const emitted = emitter.emit();
if (emitted.emitSkipped || emitted.diagnostics.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(emitted.diagnostics, formatHost));
    process.exit(1);
}
for (const [name, module, moduleResolution] of [
    ['CommonJS', ts.ModuleKind.CommonJS, ts.ModuleResolutionKind.Node10],
    ['NodeNext', ts.ModuleKind.NodeNext, ts.ModuleResolutionKind.NodeNext],
    ['Bundler', ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler],
]) {
    const consumer = ts.createProgram(fixtures, {
        ...parsed.options, noEmit: true, module, moduleResolution, skipLibCheck: true,
        paths: { ...parsed.options.paths, 'signal-under-test': [signalDeclaration] },
    });
    if (!consumer.getSourceFiles().some(f => path.resolve(f.fileName) === signalDeclaration)) {
        throw new Error(`${name}: fixture did not import the emitted signal declaration`);
    }
    const errors = ts.getPreEmitDiagnostics(consumer);
    if (errors.length) {
        console.error(ts.formatDiagnosticsWithColorAndContext(errors, formatHost));
        process.exit(1);
    }
    console.log(`${name}: ${fixtures.length} emitted public-contract fixture file(s) passed.`);
}
