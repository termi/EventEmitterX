'use strict';

const path = require("node:path");
const fs = require("node:fs");

const thisFileName = __filename;

if (require.main.filename === __filename) {
    // Этот файл запускается отдельно (не через `require()`)
    fix_ts_node_configuration();
}

function fix_ts_node_configuration() {
    const targetFile = 'ts-node/dist/configuration.js';

    try {
        /**
         Path of file: 'cftools/node_modules/.pnpm/ts-node@10.5.0_778155edce1a7ccb4257dc59ab1546af/node_modules/ts-node/dist/index.js'
         */
        const ts_node_path = require.resolve('ts-node');
        /**
         Path of file: 'cftools/node_modules/.pnpm/ts-node@10.5.0_778155edce1a7ccb4257dc59ab1546af/node_modules/ts-node/dist/configuration.js'
         */
        const ts_node_configuration_path = path.join(path.dirname(ts_node_path), 'configuration.js');
        const content = String(fs.readFileSync(ts_node_configuration_path));
        const PATCH_KEY__STRING = `// PATCH_KEY = "ts-node includes fix"`;
        const PATCHED_START = `// PATCHED START by "${thisFileName}"; ${PATCH_KEY__STRING};`;
        const PATCHED_END = `// PATCHED END by "${thisFileName}"; ${PATCH_KEY__STRING};`;

        if (!content.includes(PATCH_KEY__STRING)) {
            const replaceLines = `
    if (!files) {
        config.files = [];
        config.include = [];
    }`;
            const newLines = `
    if (!files) {
        config.files = [];
        // config.include = [];
    }`;
            const indexOf_replaceLine = content.indexOf(replaceLines);

            if (indexOf_replaceLine === -1) {
                // Файл изменился и нужно написать новый патч.
                // noinspection ExceptionCaughtLocallyJS
                throw new Error(`${thisFileName}: Can't find string for patch. Check out "${targetFile}".`);
            }

            // eslint-disable-next-line prefer-template
            const newContent = content.substring(0, indexOf_replaceLine)
                + '\n'
                + `${PATCHED_START}\n`
                + `${newLines}\n`
                + `${PATCHED_END}\n`
                + content.substring(indexOf_replaceLine + replaceLines.length)
            ;

            fs.writeFileSync(ts_node_configuration_path, newContent);
        }
    }
    catch (err) {
        console.warn(`"${fix_ts_node_configuration.name}": for "${targetFile}": done with error:`, err);
    }
}

module.exports = {
    fix_ts_node_configuration,
};
