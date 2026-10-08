'use strict';

const path = require('node:path');
const ts = require('typescript');
const copyLibraryDeclarations = require('./copy_library_declarations.cjs');
const root = path.resolve(__dirname, '..');
const configurations = process.argv.slice(2);
if (!configurations.length) {
    throw new Error('Pass a library tsconfig filename');
}
const host = { getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => '\n' };

for (const configuration of configurations) {
    const config = ts.readConfigFile(path.resolve(root, configuration), ts.sys.readFile);
    if (config.error) {
        console.error(ts.formatDiagnosticsWithColorAndContext([ config.error ], host));
        process.exitCode = 1;
        break;
    }
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const diagnostics = [ ...parsed.errors, ...ts.getPreEmitDiagnostics(program) ];
    if (diagnostics.length) {
        console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
        process.exitCode = 1;
        break;
    }
    const emitted = program.emit();
    if (emitted.emitSkipped || emitted.diagnostics.length) {
        console.error(ts.formatDiagnosticsWithColorAndContext(emitted.diagnostics, host));
        process.exitCode = 1;
        break;
    }
    if (!parsed.options.outDir) {
        throw new Error(`${configuration}: outDir is required`);
    }
    copyLibraryDeclarations(program, parsed.options.outDir);
    console.log(`${configuration}: build and authored declarations passed.`);
}
