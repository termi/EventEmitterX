'use strict';

require('./_dev/ts-node/ts-node_loader.cjs').registerTSNodeAutoLoader({
    cacheDirName: './build_cache/ts-node/',
    compilerModuleName: 'typescript',
});

globalThis["__USE_JSDOM__"] = false;
// globalThis["__USE_REACT__"] = true;

module.exports = require('./jest.config.main');
