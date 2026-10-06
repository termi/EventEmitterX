/** @jest-environment jsdom */
require('termi@polyfills');

import { EventSignal } from '../../../modules/EventEmitterEx/EventSignal';

function makeReact(version = '19.0.0') {
    const context = { Provider: {}, _currentValue: undefined };
    return {
        version,
        context,
        createContext: () => context,
        useContext: () => null,
        useCallback: (callback: () => unknown) => callback,
        memo: (component: (...args: unknown[]) => unknown) => component,
        useSyncExternalStore: jest.fn((_subscribe, getSnapshot) => getSnapshot()),
        createElement: jest.fn((type, props) => ({ type, props })),
    };
}

describe('EventSignal React module integration', () => {
    afterEach(() => {
        EventSignal.initReact(undefined);
        jest.restoreAllMocks();
    });

    it('keeps class identity and the null-rooted prototype through hook reinitialization', () => {
        using signal$ = new EventSignal(3);
        const firstReact = makeReact();
        EventSignal.initReact(firstReact);
        expect(signal$.use(value => value * 2)).toBe(6);
        expect(firstReact.useSyncExternalStore).toHaveBeenCalledTimes(1);

        EventSignal.initReact(undefined);
        const secondReact = makeReact();
        EventSignal.initReact(secondReact);
        expect(signal$.use()).toBe(3);
        expect(secondReact.useSyncExternalStore).toHaveBeenCalledTimes(1);
        expect(firstReact.useSyncExternalStore).toHaveBeenCalledTimes(1);
        expect(signal$).toBeInstanceOf(EventSignal);
        expect(Object.getPrototypeOf(EventSignal.prototype)).toBeNull();
    });

    it.each(['18.3.0', '19.0.0'])('preserves JSX descriptors and context for React %s', version => {
        const previousElementType = EventSignal.prototype.$$typeof;
        const react = makeReact(version);
        EventSignal.initReact(react);
        using signal$ = new EventSignal(7);
        const component = jest.fn(() => null);
        const result = signal$.component({ sFC: component, label: 'render' });

        expect(result).toEqual({
            type: component,
            props: expect.objectContaining({ current$: signal$, current$Value: 7, label: 'render' }),
        });
        // Existing initialization only changes the element marker for React 19.
        expect(signal$.$$typeof).toBe(version.startsWith('19') ? Symbol.for('react.transitional.element') : previousElementType);
        expect(signal$.component.ViewContext).toBe(version.startsWith('19') ? react.context : react.context.Provider);
        expect(signal$.props.current$).toBe(signal$);
        expect(Object.getOwnPropertyDescriptor(EventSignal.prototype, 'props')?.enumerable).toBe(false);
    });

    it('shares the component registry with RAF subscriptions and removes queued callbacks on cleanup', () => {
        const frames: FrameRequestCallback[] = [];
        jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
            frames.push(callback);
            return frames.length;
        });
        EventSignal.initReact(makeReact());
        const componentType = {};
        using signal$ = new EventSignal(0, { componentType });
        const callback = jest.fn();
        const unsubscribe = signal$.subscribeOnNextRender(callback);
        const snapshot = signal$.getSnapshotVersion();
        const component = () => null;

        EventSignal.registerReactComponentForComponentType(componentType, component);
        expect(signal$.getSnapshotVersion()).not.toBe(snapshot);
        expect(frames).toHaveLength(1);
        expect(callback).not.toHaveBeenCalled();
        const render = signal$.component({});
        expect(render).toEqual({ type: component, props: expect.objectContaining({ current$: signal$ }) });

        unsubscribe();
        frames.shift()!(0);
        expect(callback).not.toHaveBeenCalled();
        const cleanedSnapshot = signal$.getSnapshotVersion();
        EventSignal.registerReactComponentForComponentType(componentType, () => null);
        expect(signal$.getSnapshotVersion()).toBe(cleanedSnapshot);
        expect(frames).toHaveLength(0);
    });

    it('renders a destroyed JSX signal without subscribing hooks again', () => {
        const react = makeReact();
        EventSignal.initReact(react);
        using signal$ = new EventSignal(9);
        expect(signal$.component({})).toBe(9);
        const hookCalls = react.useSyncExternalStore.mock.calls.length;

        signal$[Symbol.dispose]();
        expect(signal$.component({})).toBe(9);
        expect(react.useSyncExternalStore).toHaveBeenCalledTimes(hookCalls);
    });
});
