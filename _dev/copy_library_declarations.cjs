'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// tsc emits .ts declarations, but does not copy authored .d.ts inputs.
module.exports = function copyLibraryDeclarations(program, outputDir) {
    for (const source of program.getSourceFiles()) {
        if (!source.isDeclarationFile) {
            continue;
        }
        const relative = path.relative(root, source.fileName).replaceAll('\\', '/');
        if (!relative.startsWith('modules/') && !relative.startsWith('utils/')) {
            continue;
        }
        const target = path.join(outputDir, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(source.fileName, target);
    }
};
