'use strict';

const { fix_ts_node_configuration } = require('./lib/ts-node.cjs');
const { fix_node_modules_jest_runner_testWorker } = require('./lib/jest-runner_testWorker.cjs');
const { patch_node_modules_jest_snapshot_InlineSnapshots } = require('./lib/jest-snapshot_InlineSnapshots.cjs');

fix_ts_node_configuration();
fix_node_modules_jest_runner_testWorker();
patch_node_modules_jest_snapshot_InlineSnapshots();
