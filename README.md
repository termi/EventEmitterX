# EventEmitterX

Another EventEmitter implementation for Node.js and browsers.

Main differences from EventEmitter:
1. Works in browsers
2. Flexible instance settings. Including: `listenerOncePerEventType`, `emitCounter`, etc.
3. Designed for easy debugging, including asynchronous `static once`

This project includes:
1. Main `EventEmitterX`
2. `eventsAsyncIterator` - alias for `static on`
3. `eventAwait` - alias for `static once`
4. `EventSignal` - implementation of signals compatible with `EventEmitter`/`EventTarget`
