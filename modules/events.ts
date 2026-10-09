'use strict';

// Compatibility entry point; implementations import the core directly to avoid runtime cycles.
export {
    EventEmitterX,
    EventEmitterEx,
    EventEmitter,
    default,
    TimeoutError,
    addAbortListener,
    errorMonitor,
    captureRejectionSymbol,
    ABORT_ERR,
    kDestroyingEvent,
    once,
    on,
    getEventListeners,
    isEventEmitterCompatible,
    isEventEmitterEx,
    isEventEmitterX,
    isEventTargetCompatible,
} from './EventEmitterEx/EventEmitterX';
export type {
    ICompatibleEmitter,
    IMinimumCompatibleEmitter,
    Listener,
    NodeEventName,
    EventName,
    DefaultEventMap,
    EventMapFromTuples,
    ICounter,
    IEventTiming,
    IEventEmitter,
    NodeEventEmitter,
} from './EventEmitterEx/EventEmitterX';
export { EventEmitterSimpleProxy } from './EventEmitterEx/EventEmitterSimpleProxy';
export { EventEmitterProxy } from './EventEmitterEx/EventEmitterProxy';

// This helper was declaration-only in the original module; preserve that contract.
export declare const asTypedEventEmitter: typeof import('./EventEmitterEx/EventEmitterX').asTypedEventEmitter;
