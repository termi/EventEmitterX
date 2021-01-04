

const {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    getEventListeners: node_getEventListeners,
} = require('events');

const event_target = Symbol.for('nodejs.event_target');

module.exports.compatibleEventEmitter_from_EventTarget = function(maybeEventTarget) {
    if (!maybeEventTarget.emit && maybeEventTarget["dispatchEvent"]) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        maybeEventTarget.emit = function emit(type, ...args) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const event = new Event(String(typeof type === 'symbol' ? type.description : type));

            event["args"] = args;

            this["dispatchEvent"](event);
        };

        if (maybeEventTarget[event_target]) {
            // nodejs native EventTarget
            maybeEventTarget.listenerCount = function(type) {
                return node_getEventListeners(this, type).length;
            };
        }
        else {
            maybeEventTarget.listenerCount = function(type) {
                const emitter = this;
                let symbols = Object.getOwnPropertySymbols(emitter).filter(a => a["description"] === 'impl');

                if (symbols.length > 0) {
                    // implementation from polyfill node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js
                    const eventTargetImpl = emitter[symbols[0]];

                    if (eventTargetImpl) {
                        const listeners = eventTargetImpl._eventListeners || eventTargetImpl.listeners || eventTargetImpl.events || eventTargetImpl._events;
                        const handlers = handlersFromListenersObject(listeners, type);

                        if (handlers) {
                            return handlers.length;
                        }
                    }
                }

                throw new Error('Unknown emitter implementation');
            };
        }

        return true;
    }

    return false;
};

function handlersFromListenersObject(listenersObject, type) {
    if (typeof listenersObject === 'object' && listenersObject) {
        const handlers = listenersObject[type];

        if (typeof handlers === 'function') {
            return [ handlers ];
        }
        if (Array.isArray(handlers)) {
            return handlers;
        }

        return [];
    }
}

/**
 *
 * @param {EventTarget|EventEmitter} emitter
 * @param {number|string|symbol} type
 * @returns {[]}
 */
module.exports.getEventListeners = function(emitter, type) {
    if (typeof emitter.listeners === 'function') {
        return emitter.listeners(type);
    }

    if (emitter[event_target]) {
        // nodejs native EventTarget
        return node_getEventListeners(emitter, type);
    }

    {
        let symbols = Object.getOwnPropertySymbols(emitter).filter(a => a["description"] === 'impl');

        if (symbols.length > 0) {
            // implementation from polyfill node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js
            const eventTargetImpl = emitter[symbols[0]];

            if (eventTargetImpl) {
                const listeners = eventTargetImpl._eventListeners || eventTargetImpl.listeners || eventTargetImpl.events || eventTargetImpl._events;
                const handlers = handlersFromListenersObject(listeners, type);

                if (handlers) {
                    return handlers;
                }
            }
        }
    }

    {
        const listeners = emitter.listeners || emitter.events || emitter._events || emitter._eventListeners;
        const handlers = handlersFromListenersObject(listeners, type);

        if (handlers) {
            return handlers;
        }
    }

    throw new Error('Unknown emitter implementation');
}

module.exports.compatibleOnce_for_EventTarget = function(once) {
    return function(emitter, type, options) {
        if (options && options.checkFn) {
            const {checkFn} = options;

            options.checkFn = function(emitter, type, args) {
                if (args[0] instanceof Event && args[0]["args"]) {
                    return checkFn(emitter, type, args[0]["args"]);
                }
                return checkFn(emitter, type, args);
            }
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return once(emitter, type, options).then(result => {
            if (result[0] instanceof Event && result[0]["args"]) {
                return result[0]["args"];
            }
            return result;
        }).catch(error => {
            if (error instanceof Event && error["args"]) {
                // in 'error' event only second argument (after 'error' string) is used
                //  test:
                //  ```
                //  process.nextTick(() => { ee.emit('error',1,2,3,4,5); }); pr = once(ee, 'test').catch((...args) => { console.error('error:', ...args); })
                //  ```
                //  will produced: > 'error: 1'
                throw error["args"][0];
            }
            throw error;
        });
    };
};

module.exports.createDomEventLike = function(type = 'unknown', props = void 0) {
    return {
        type,
        cancelable: true,
        defaultPrevented: false,
        cancelBubble: false,
        preventDefault() {
            this.defaultPrevented = true;
        },
        canceled: false,
        canceledImmediate: false,
        stopImmediatePropagation() {
            this.cancelBubble = true;
            this.canceled = true;
            this.canceledImmediate = true;
        },
        stopPropagation() {
            this.cancelBubble = true;
            this.canceled = true;
        },
        ...props,
    };
};
