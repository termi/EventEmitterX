'use strict';

const path = require("node:path");
const fs = require("node:fs");

// link to injected file
const jestProcess_onCreate_path = require.resolve('../../../_dev/jest/jestProcess_onCreate.js');

// Use this fir debugging: `node jest-runner_testWorker.js`
if (require.main.filename === __filename) {
    // Этот файл запускается отдельно (не через `require()`)
    fix_node_modules_jest_runner_testWorker();
}

// 'D:\work\Callforce\cftools\node_modules\.pnpm\jest-runner@27.5.1_bffff4271b89d628e8333ead80d3d8e8\node_modules\jest-runner\testWorker.js'
// 'D:\work\Callforce\cftools\node_modules\.pnpm\jest-runner@27.5.1_bffff4271b89d628e8333ead80d3d8e8\node_modules\jest-runner\build\testWorker.js'

/**
 * Patch jest / jest-runner.
 *
 * For example: `jest@27.5.1`. To support other versions use __may__ needed to update `require.resolve()` bellow.
 */
function fix_node_modules_jest_runner_testWorker() {
    try {
        /**
         * Path of file: 'cftools/node_modules/.pnpm/jest@27.5.1_24d7ebca380cec53a2ea24376aecb292/node_modules/jest/build/jest.js'
         */
        const jest_path = require.resolve('jest');
        /** Path of file: 'cftools/node_modules/.pnpm/@jest+core@27.5.1_24d7ebca380cec53a2ea24376aecb292/node_modules/@jest/core/build/jest.js' */
        const jest_core_path = require.resolve('@jest/core', { paths: [ jest_path ] });
        /**
         * Path of file: 'cftools/node_modules/.pnpm/jest-runner@27.5.1_bffff4271b89d628e8333ead80d3d8e8/node_modules/jest-runner/build/index.js'
         */
        const jest_runner_path = require.resolve('jest-runner', { paths: [ jest_path, jest_core_path ] });
        /**
         * Path of file: 'cftools/node_modules/.pnpm/jest-runner@27.5.1_bffff4271b89d628e8333ead80d3d8e8/node_modules/jest-runner/build/testWorker.js'
         */
        const jest_runner_testWorker_path = path.join(path.dirname(jest_runner_path), 'testWorker.js');
        /**
         * '..\\..\\..\\..\\..\\..\\_dev_utils\\jest\\jestProcess_onCreate.js'
         * ==
         * '../../../../../../_dev_utils/jest/jestProcess_onCreate.js'
         */
        const jestProcess_onCreate_relative_path = path.relative(path.dirname(jest_runner_path), jestProcess_onCreate_path);

        {
            const content = String(fs.readFileSync(jest_runner_testWorker_path));
            const old_value = 'async function worker({config, globalConfig, path, context}) {';
            const new_value_start = `async function worker({config, globalConfig, path, context}) {// -CALL_FORCE_FIXED_START-`;
            const new_value_content = `\nrequire('${jestProcess_onCreate_relative_path.replace(/\\/g, '/')}')`;
            const new_value_end = `\n// -CALL_FORCE_FIXED_END-\n`;
            const new_value = new_value_start + new_value_content + new_value_end;

            if (!content.includes(old_value)) {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error(`Can't PATH "jest-runner" testWorker.js: original script changed. Can't find "${old_value}".`);
            }

            /** @type {string | undefined} */
            let newContent;

            // never was
            if (!content.includes(new_value_start)) {
                newContent = content.replace(old_value, new_value);
            }
            else {
                // Path to jestProcess_onCreate_relative_path may be changed
                if (!content.includes(new_value)) {
                    const startIndex = content.indexOf(new_value_start);
                    const endIndex = content.indexOf(new_value_end);

                    if (startIndex === -1 || endIndex === -1) {
                        // noinspection ExceptionCaughtLocallyJS
                        throw new Error(`Can't PATH "jest-runner" testWorker.js! Something wrong with patched script ${JSON.stringify({ startIndex, endIndex })}`);
                    }

                    newContent = content.substring(0, startIndex) + new_value + content.substring(endIndex + new_value_end.length);
                }
            }

            if (newContent) {
                fs.writeFileSync(jest_runner_testWorker_path, newContent);
            }
        }
    }
    catch (err) {
        console.warn(`"${fix_node_modules_jest_runner_testWorker.name}": done with error:`, err);
    }
}

module.exports = {
    fix_node_modules_jest_runner_testWorker,
};
