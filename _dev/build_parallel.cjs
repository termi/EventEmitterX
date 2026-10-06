'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const compiler = require.resolve('typescript/bin/tsc');
const configurations = ['tsconfig.cjs.json', 'tsconfig.esm.json'];

Promise.all(configurations.map(configuration => new Promise(resolve => {
    const child = spawn(process.execPath, [compiler, '-p', configuration], {
        cwd: repositoryRoot,
        stdio: 'inherit',
    });

    child.once('error', error => {
        console.error(`Failed to start build for ${configuration}:`, error);
        resolve(1);
    });
    child.once('exit', code => resolve(code === 0 ? 0 : 1));
}))).then(exitCodes => {
    process.exitCode = exitCodes.some(code => code !== 0) ? 1 : 0;
});
