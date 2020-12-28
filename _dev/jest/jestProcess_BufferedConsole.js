'use strict';

// like this: 'cftools/node_modules/.pnpm/jest@27.5.1_24d7ebca380cec53a2ea24376aecb292/node_modules/jest/build/jest.js'
const jestPath = require.resolve('jest');
// like this: 'cftools/node_modules/.pnpm/@jest+core@27.5.1_24d7ebca380cec53a2ea24376aecb292/node_modules/@jest/core/build/jest.js'
const jestCorePath = require.resolve('@jest/core', { paths: [ jestPath ] });
// like this: 'cftools/node_modules/.pnpm/@jest+console@27.5.1/node_modules/@jest/console/build/index.js'
const jestConsolePath = require.resolve('@jest/console', { paths: [ jestPath, jestCorePath ] });
const jestConsole = require(jestConsolePath);

const {
    BufferedConsole,
} = jestConsole;

const _BufferedConsole_static_write = BufferedConsole.write;

BufferedConsole.write = function write(buffer, type, message, level) {
    const _buffer = _BufferedConsole_static_write.call(BufferedConsole, buffer, type, message, level);
    const lastLogItem = _buffer.at(-1);

    if (lastLogItem) {
        const { origin } = lastLogItem;

        if (origin
            && typeof origin === 'string'
        ) {
            /*
            let sliceAt = 0;

            if (origin.startsWith('    at LoggerCap._send (')) {
                // +1 for 'at LoggerCap._send'
                // +1 for 'at LoggerCap._send2'
                // eslint-disable-next-line no-magic-numbers
                sliceAt = 2;

                if (origin.includes(' at LoggerCap.timeEnd')) {
                    sliceAt++;
                }
                if (origin.includes(' at ServerTiming.timeEnd')) {
                    sliceAt++;
                }
                if (origin.includes(' at sendNamedLog (')) {
                    sliceAt++;

                    if (/at \w+.log \(/.test(origin)) {
                        sliceAt++;
                    }
                }
            }
            else {
                if (origin.includes(' at sendNamedLog') && origin.includes('consoleUtils.')) {
                    sliceAt++;

                    if (/at \w+.log \(/.test(origin)) {
                        sliceAt++;
                    }
                }
            }
            */

            lastLogItem.origin = origin
                .split('\n')
                // .slice(sliceAt)
                .filter(_filterCallStackLine)
                .join('\n')
            ;
        }
    }

    return buffer;
};

/**
 * @param {string} line
 * @private
 */
function _filterCallStackLine(line) {
    if (!line) {
        return false;
    }

    if (/[/\\]node_modules[/\\]/.test(line)) {
        if (/[/\\]jest-circus[/\\]/.test(line)) {
            return false;
        }
        if (/[/\\]jest-runner[/\\]/.test(line)) {
            return false;
        }
        if (/[/\\]jest-cli[/\\]/.test(line)) {
            return false;
        }
        if (/[/\\]@jest[/\\]core[/\\]/.test(line)) {
            return false;
        }
        // filter strings like:
        // at callTimer (../cftools/node_modules/.pnpm/@sinonjs+fake-timers@9.1.0/node_modules/@sinonjs/fake-timers/src/fake-timers-src.js:739:24)
        // at doTickInner (../cftools/node_modules/.pnpm/@sinonjs+fake-timers@9.1.0/node_modules/@sinonjs/fake-timers/src/fake-timers-src.js:1301:29)
        // at doTick (../cftools/node_modules/.pnpm/@sinonjs+fake-timers@9.1.0/node_modules/@sinonjs/fake-timers/src/fake-timers-src.js:1382:20)
        if (/[/\\]@sinonjs[/\\]fake-timers[/\\]/.test(line)) {
            return false;
        }
        if (/[/\\]jsdom[/\\]lib[/\\]jsdom[/\\]/.test(line)) {
            return false;
        }
    }

    // filter strings like:
    //  at assertIsNearbyNumbers (type_guards\numbers.ts:737:15)
    if (/^(\s+)?at assert/.test(line) && /cftools[/\\]type_guards/.test(line)) {// eslint-disable-line unicorn/no-unsafe-regex
        return false;
    }

    // filter strings like:
    //  at processTicksAndRejections (node:internal/process/task_queues:96:5)
    // noinspection RedundantIfStatementJS
    if (line.includes('node:internal/process/task_queues:')
        || line.includes('node:async_hooks:')
    ) {
        return false;
    }

    return true;
}
