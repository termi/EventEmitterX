'use strict';

const path = require("node:path");
const fs = require("node:fs");

const thisFileName = __filename;

// Use this for debugging
if (require.main.filename === thisFileName) {
    // Этот файл запускается отдельно (не через `require()`)
    patch_node_modules_jest_snapshot_InlineSnapshots();
}

/**
 * Patch jest / jest-snapshot.
 *
 * Что делает этот патч: Выключает безусловную загрузку '@babel/traverse', '@babel/generator', '@babel/types', '@babel/core'
 *  и делает их загрузку только при необходимости.
 *
 * Это существенно ускоряет исполнение тестов в jest, если не используются snapshot.
 *
 * Location example: `cftools/node_modules/.pnpm/jest-snapshot@27.5.1/node_modules/jest-snapshot/build/InlineSnapshots.js`
 *
 * This fix is only for `jest@27.5.1`.
 * To support other newest version, need to write another patch code for `jest-snapshot/build/utils.js` (see https://github.com/jestjs/jest/blob/4e7d916ec6a16de5548273c17b5d2c5761b0aebb/packages/jest-snapshot/src/utils.ts#L177).
 */
function patch_node_modules_jest_snapshot_InlineSnapshots() {
    try {
        const jestPackageJson = require('jest/package.json');

        if (jestPackageJson.version === '27.5.1') {
            /**
             * Path of file: 'cftools/node_modules/.pnpm/jest@27.5.1_24d7ebca380cec53a2ea24376aecb292/node_modules/jest/build/jest.js'
             */
            const jest_path = require.resolve('jest');
            /** Path of file: 'cftools/node_modules/.pnpm/@jest+core@27.5.1_24d7ebca380cec53a2ea24376aecb292/node_modules/@jest/core/build/jest.js' */
            const jest_core_path = require.resolve('@jest/core', { paths: [ jest_path ] });
            /**
             * Path of file: 'cftools/node_modules/.pnpm/jest-snapshot@27.5.1/node_modules/jest-snapshot/package.json'
             */
            const jest_snapshot__path = require.resolve('jest-snapshot/package.json', { paths: [ jest_path, jest_core_path ] });
            /**
             * Path of file: 'cftools/node_modules/.pnpm/jest-snapshot@27.5.1/node_modules/jest-snapshot/build/InlineSnapshots.js'
             */
            const jest_snapshot_InlineSnapshots__path = path.join(path.dirname(jest_snapshot__path), 'build/InlineSnapshots.js');

            {
                const content = String(fs.readFileSync(jest_snapshot_InlineSnapshots__path));
                const PATCH_KEY__STRING = `// PATCH_KEY = "${patch_node_modules_jest_snapshot_InlineSnapshots.name}"`;

                if (content.includes(PATCH_KEY__STRING)) {
                    return;
                }

                const PATCHED_AT_TOP = `// PATCHED START by "${thisFileName}"; ${PATCH_KEY__STRING};\n`;

                const pathToReplacedContent = path.join(path.dirname(thisFileName), './data/jest-snapshot__InlineSnapshots.js.27.5.1.txt');
                const newContent = fs.readFileSync(pathToReplacedContent).toString();

                fs.writeFileSync(jest_snapshot_InlineSnapshots__path, PATCHED_AT_TOP + newContent);
                fs.writeFileSync(jest_snapshot_InlineSnapshots__path + '__backup', content);
            }
        }
        else {
            console.warn(`"${patch_node_modules_jest_snapshot_InlineSnapshots.name}": invalid "jest" version "${jestPackageJson.version}". Do nothing.`);
        }
    }
    catch (err) {
        console.warn(`"${patch_node_modules_jest_snapshot_InlineSnapshots.name}": done with error:`, err);
    }
}

module.exports = {
    patch_node_modules_jest_snapshot_InlineSnapshots,
};
