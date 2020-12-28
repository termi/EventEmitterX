'use strict';

let tra;

module.exports = {
    process(sourceText, sourcePath, options) {
        if (!tra) {
            const { createTransformer } = require('ts-jest').default;

            tra = createTransformer();
        }

        return tra.process(sourceText, sourcePath, options);
    },
};
