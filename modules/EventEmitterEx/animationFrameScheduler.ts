let _nextAnimationFrameCounter = 0;
let _nextAnimationFrameTimer: ReturnType<typeof requestAnimationFrame> | undefined = void 0;
const PREDEFINED_QUEUE_POOL_SIZE = 64;
const REDUCE_ARRAY_EACH = 100;
const _nextAnimationFrameQueue: (() => void)[] = new Array(PREDEFINED_QUEUE_POOL_SIZE).fill(_noop);
let _nextAnimationFrameQueueLen = 0;
const _onNextAnimationFrame = () => {
    _nextAnimationFrameTimer = void 0;
    _nextAnimationFrameCounter++;

    try {
        for (let i = 0 ; i < _nextAnimationFrameQueueLen ; i++) {
            (_nextAnimationFrameQueue[i] as NonNullable<typeof _nextAnimationFrameQueue[0]>)();
            _nextAnimationFrameQueue[i] = _noop;
        }
    }
    catch (error) {
        console.error('EventSignal~subscribeOnNextAnimationFrame~onNextAnimationFrame: error:', error);
    }

    _nextAnimationFrameQueueLen = 0;

    if ((_nextAnimationFrameCounter % REDUCE_ARRAY_EACH) === 0
        && _nextAnimationFrameQueue.length > PREDEFINED_QUEUE_POOL_SIZE
    ) {
        _nextAnimationFrameQueue.length = PREDEFINED_QUEUE_POOL_SIZE;
    }
};
export const _awaitNextAnimationFrame = (func: () => void) => {
    _nextAnimationFrameQueue[_nextAnimationFrameQueueLen++] = func;

    if (!_nextAnimationFrameTimer) {
        _nextAnimationFrameTimer = requestAnimationFrame(_onNextAnimationFrame);
    }
};
export const _unAwaitNextAnimationFrame = (func: () => void) => {
    const index = _nextAnimationFrameQueue.indexOf(func);

    if (index !== -1) {
        _nextAnimationFrameQueue[index] = _noop;
    }
};

function _noop() {}
