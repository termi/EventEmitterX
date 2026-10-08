'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const steps = [
    [ 'library types', [ require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.library.json', '--noEmit' ] ],
    [ 'source and declaration contracts', [ '_dev/check_signal_types.cjs' ] ],
    [
        'Node and DOM runtime specifications',
        [ require.resolve('jest/bin/jest'), '--config', 'jest.config.js', '--runInBand', '--ci' ],
    ],
    [ 'CJS and ESM development builds', [ '_dev/build_library.cjs', 'tsconfig.cjs.json', 'tsconfig.esm.json' ] ],
    [ 'built output', [ '_dev/check_build_output.cjs' ] ],
    [ 'emitter entry-point identity and import order', [ '_dev/check_emitter_entry_points.cjs' ] ],
    [ 'weak lifecycle', [ '--expose-gc', '_dev/check_signal_lifecycle.cjs' ] ],
    [ 'explicit disposal fallback', [ '--expose-gc', '_dev/check_signal_lifecycle.cjs', '--without-weakref' ] ],
];
console.log(`Verification runtime: ${process.version} (${process.platform}/${process.arch}).`);
for (const [ name, args ] of steps) {
    console.log(`Checking ${name}...`);
    const result = spawnSync(process.execPath, args, {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, CI: 'true' },
    });
    if (result.error || result.status !== 0) {
        if (result.error) {
            console.error(result.error);
        }
        process.exitCode = 1;
        break;
    }
}
