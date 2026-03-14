'use strict';

import { assertIsDefined, assertIsObject } from 'termi@type_guards';
import { queueMicrotaskPromise } from '../utils/promise';

type _FakeReactComponent = () => unknown;
type _FakeReactWrappedComponent = {
    $$typeof: Symbol,
    type: _FakeReactComponent,
};
type _FakeReactEffectCleanup = () => void;
type _FakeReactState<T> = {
    type: 'state',
    index: number,
    value: T,
    version: 0,
    setValue: (newValue: T | ((prevValue: T) => T)) => void,
    owner: _FakeReactOwner,
};
type _FakeReactCallbackMemo<T> = {
    type: 'callbackMemo',
    index: number,
    memorizedCallback: T,
    deps: any[] | null | undefined,
    owner: _FakeReactOwner,
};
type _FakeReactMemo<T> = {
    type: 'memo',
    index: number,
    memorizedValue: T,
    deps: any[] | null | undefined,
    owner: _FakeReactOwner,
};
type _FakeReactEffect = {
    type: 'effect',
    index: number,
    version: 0,
    deps: any[] | null | undefined,
    cleanup: _FakeReactEffectCleanup | undefined,
    owner: _FakeReactOwner,
};
type _FakeReactRef<T> = {
    type: 'ref',
    index: number,
    value: { current: T | null | undefined },
    owner: _FakeReactOwner,
};
type _FakeReactOwner = {
    id: number,
    currentIndex: number,
    values: (_FakeReactCallbackMemo<any> | _FakeReactEffect | _FakeReactMemo<any> | _FakeReactRef<any> | _FakeReactState<any>)[],
    component: _FakeReactComponent,
    renders: 0,
    effectsToRun: (() => void)[],
    version: 0,
    trigger: () => void,
    isDirty: boolean,
    isUnmounted: boolean,
    unmount: _FakeReactEffectCleanup[],
    parent: _FakeReactOwner | null,
    children: _FakeReactOwner[],
    lastRender: unknown[],
};

export class FakeMiniHTMLElement {
    public tagName: string;
    private _attributes = new Map<string, string>();

    constructor(tagName: string) {
        this.tagName = tagName.toUpperCase();
    }

    destructor() {
        this._attributes.clear();
    }

    setAttribute(name: string, value: string) {
        this._attributes.set(name, value);
    }

    getAttribute(name: string) {
        return this._attributes.get(name);
    }
}

export namespace FakeMiniHTMLElement {
    export function isFakeMiniHTMLElement(value: unknown): value is FakeMiniHTMLElement {
        return !!value && value instanceof FakeMiniHTMLElement;
    }

    export function assertIsFakeMiniHTMLElement(value: unknown): asserts value is FakeMiniHTMLElement {
        if (!isFakeMiniHTMLElement(value)) {
            throw new TypeError('value should be instance of class FakeMiniHTMLElement');
        }
    }
}

let fakeReactOwnerCounter = 0;
const currentRenders: Promise<{ owner: _FakeReactOwner, result: unknown[] }>[] = [];
let currentRender: Promise<{ owner: _FakeReactOwner, result: unknown[] }> | null = null;
let currentOwner: _FakeReactOwner | null = null;
// const currentOwnersStack: _FakeReactOwner[] = [];

function _createFakeReactOwner(parent: _FakeReactOwner | null, component: _FakeReactComponent) {
    let owner: _FakeReactOwner;

    return owner = {
        id: ++fakeReactOwnerCounter,
        currentIndex: 0,
        values: [],
        component,
        renders: 0,
        effectsToRun: [],
        version: 0,
        trigger: () => {
            _markOwnerAsDirty(owner);
        },
        parent,
        isUnmounted: false,
        isDirty: false,
        unmount: [],
        children: [],
        lastRender: [],
    };
}

function _markOwnerAsDirty(owner: _FakeReactOwner | null) {
    if (!owner || owner.isDirty || owner.isUnmounted) {
        return;
    }

    let currentOwner = owner;

    while (owner) {
        owner.version++;
        owner.isDirty = true;

        owner = owner.parent;

        if (owner?.isDirty) {
            break;
        }

        if (owner) {
            currentOwner = owner;
        }
    }

    // Если дошли до конца дерева и не встретили другого _FakeReactOwner с isDirty == true
    if (!owner && currentOwner) {
        const { resolve, promise } = Promise.withResolvers<{ owner: _FakeReactOwner, result: unknown[] }>();

        currentRender = promise;
        currentRenders.push(promise);

        // eslint-disable-next-line promise/prefer-await-to-then
        void promise.then(() => {
            if (currentRender === promise) {
                currentRender = null;
            }

            const index = currentRenders.indexOf(promise);

            if (index !== -1) {
                currentRenders.splice(index, 1);
            }
        });

        queueMicrotask(() => {
            const result = _renderOwner(currentOwner);

            currentOwner.isDirty = false;

            resolve({ owner: currentOwner, result });
        });
    }
}

function _unmountOwnerChildren(owner: _FakeReactOwner | null) {
    if (!owner || owner.isUnmounted) {
        return;
    }

    const { children } = owner;

    for (const child of children) {
        _unmountOwner(child);
    }

    owner.parent = null;
}

function _unmountOwner(owner: _FakeReactOwner | null) {
    if (!owner || owner.isUnmounted) {
        return;
    }

    const prev_currentOwner = currentOwner;
    const { unmount } = owner;

    _unmountOwnerChildren(owner);

    currentOwner = owner;

    for (const _unmount of unmount) {
        _unmount?.();
    }

    currentOwner = prev_currentOwner;

    owner.isUnmounted = true;
}

function _renderOwner(owner: _FakeReactOwner | null, result: unknown[] = []) {
    if (!owner || owner.isUnmounted) {
        return result;
    }

    const prev_currentOwner = currentOwner;

    try {
        // Уничтожаем предыдущее дерево (в отличие от React, мы ничего не сравниваем, а всегда перерендериваем всех children).
        _unmountOwnerChildren(owner);
        owner.children.length = 0;
        owner.renders++;
        owner.currentIndex = 0;

        currentOwner = owner;

        let fakeJSX = owner.component();

        if (!Array.isArray(fakeJSX)) {
            fakeJSX = [ fakeJSX ];
        }

        for (const fakeJSXFragment of fakeJSX as any[]) {
            if (!fakeJSXFragment) {
                continue;
            }

            if (typeof fakeJSXFragment === 'string') {
                result.push(fakeJSXFragment);
            }
            else if (typeof fakeJSXFragment === 'number') {
                result.push(String(fakeJSXFragment));
            }
            else if (typeof fakeJSXFragment === 'object') {
                if ((fakeJSXFragment as _FakeReactWrappedComponent).$$typeof
                    && typeof (fakeJSXFragment as _FakeReactWrappedComponent).type === 'function'
                ) {
                    const component = (fakeJSXFragment as _FakeReactWrappedComponent).type;
                    const childOwner = _createFakeReactOwner(owner, component);

                    // note: Now only sync render cycle implemented
                    result = _renderOwner(childOwner, result);
                }
                else if (fakeJSXFragment["ref"] && 'current' in fakeJSXFragment["ref"]) {
                    const _fakeMiniHTMLElement = new FakeMiniHTMLElement('DIV');

                    fakeJSXFragment["ref"]["current"] = _fakeMiniHTMLElement;

                    result.push(_fakeMiniHTMLElement);
                }
            }
            else {
                // noinspection ExceptionCaughtLocallyJS
                throw new TypeError('FakeReact: Invalid typeof node');
            }
        }

        owner.lastRender = result;

        if (owner.effectsToRun) {
            for (const effect of owner.effectsToRun) {
                effect();
            }

            owner.effectsToRun.length = 0;
        }

        return result;
    }
    finally {
        currentOwner = prev_currentOwner;
    }
}

function _fake_useState<T>(initialValue: T | (() => T)): [
    currentValue: T,
    newValue: (newValue: T | ((prevValue: T) => T)) => void,
] {
    if (!currentOwner) {
        throw new Error('Called outside FakeReactComponent');
    }

    const currentIndex = currentOwner.currentIndex++;
    let value = currentOwner.values[currentIndex];

    if (value == null && currentOwner.values.length === currentIndex) {
        value = currentOwner.values[currentIndex] = {
            type: 'state',
            index: currentIndex,
            value: typeof initialValue === 'function'
                ? (initialValue as () => T)()
                : initialValue
            ,
            version: 0,
            setValue: (newValue: T | ((prevValue: T) => T)) => {
                assertIsObject<_FakeReactState<T>>(value);

                if (typeof newValue === 'function') {
                    newValue = (newValue as (prevValue: T) => T)(value.value);
                }

                if (!Object.is(value.value, newValue)) {
                    value.version++;
                    value.value = newValue;
                    value.owner.trigger();
                }
            },
            owner: currentOwner,
        } satisfies _FakeReactState<T>;
    }

    if (value == null || value.type !== 'state') {
        // 'FakeReact: Invalid hooks order in FakeReactComponent'
        // 'FakeReact: Rendered more hooks than during the previous render'
        throw new Error('FakeReact: React has detected a change in the order of Hooks called by <Component>. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks');
    }

    return [
        value.value,
        value.setValue,
    ];
}

function _fake_useEffect(effect: () => ((() => void) | undefined), deps: any[]) {
    if (!currentOwner) {
        throw new Error('FakeReact: Called outside FakeReactComponent');
    }

    const currentIndex = currentOwner.currentIndex++;
    let value = currentOwner.values[currentIndex];
    let wasNewEffect = false;

    if (value == null && currentOwner.values.length === currentIndex) {
        wasNewEffect = true;
        value = currentOwner.values[currentIndex] = {
            type: 'effect',
            index: currentIndex,
            version: 0,
            cleanup: void 0,
            deps,
            owner: currentOwner,
        } satisfies _FakeReactEffect;
    }

    if (value == null || value.type !== 'effect') {
        // 'FakeReact: Invalid hooks order in FakeReactComponent'
        // 'FakeReact: Rendered more hooks than during the previous render'
        throw new Error('FakeReact: React has detected a change in the order of Hooks called by <Component>. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks');
    }

    let changes = wasNewEffect || !deps || !value.deps || deps.length !== value.deps?.length;

    if (!changes && deps && value.deps) {
        const oldDeps = value.deps;

        for (let i = 0 ; i < deps.length ; i++) {
            if (Object.is(deps[i], oldDeps[i])) {
                changes = true;

                break;
            }
        }
    }

    if (changes) {
        const currentCleanup = !wasNewEffect && value.cleanup;

        if (currentCleanup) {
            const index = currentOwner.unmount.indexOf(currentCleanup);

            if (index !== -1) {
                currentOwner.unmount.splice(index, 1);
            }

            currentCleanup();
        }

        const _currentOwner = currentOwner;
        const _effect = value;

        currentOwner.effectsToRun.push(() => {
            const newCleanup = effect();

            _effect.cleanup = newCleanup;
            _effect.deps = deps;

            if (newCleanup) {
                _currentOwner.unmount.push(newCleanup);
            }
        });
    }
}

function _fake_useRef<T>(initialValue?: T | null | undefined): { current: T | null | undefined } {
    if (!currentOwner) {
        throw new Error('FakeReact: Called outside FakeReactComponent');
    }

    const currentIndex = currentOwner.currentIndex++;
    let value = currentOwner.values[currentIndex];

    if (value == null && currentOwner.values.length === currentIndex) {
        value = currentOwner.values[currentIndex] = {
            type: 'ref',
            index: currentIndex,
            value: { current: initialValue },
            owner: currentOwner,
        } satisfies _FakeReactRef<T | null | undefined>;
    }

    if (value == null || value.type !== 'ref') {
        // 'FakeReact: Invalid hooks order in FakeReactComponent'
        // 'FakeReact: Rendered more hooks than during the previous render'
        throw new Error('FakeReact: React has detected a change in the order of Hooks called by <Component>. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks');
    }

    return value.value;
}

function _fake_useCallback<T extends(...args: unknown[]) => void>(callback: T, deps?: any[]): T {
    if (!currentOwner) {
        throw new Error('FakeReact: Called outside FakeReactComponent');
    }

    const currentIndex = currentOwner.currentIndex++;
    let value = currentOwner.values[currentIndex];

    if (value == null && currentOwner.values.length === currentIndex) {
        value = currentOwner.values[currentIndex] = {
            type: 'callbackMemo',
            index: currentIndex,
            memorizedCallback: callback,
            deps,
            owner: currentOwner,
        } satisfies _FakeReactCallbackMemo<T>;
    }

    if (value == null || value.type !== 'callbackMemo') {
        // 'FakeReact: Invalid hooks order in FakeReactComponent'
        // 'FakeReact: Rendered more hooks than during the previous render'
        throw new Error('FakeReact: React has detected a change in the order of Hooks called by <Component>. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks');
    }

    let changes = !deps || !value.deps || deps.length !== value.deps?.length;

    if (!changes && deps && value.deps) {
        const oldDeps = value.deps;

        for (let i = 0 ; i < deps.length ; i++) {
            if (Object.is(deps[i], oldDeps[i])) {
                changes = true;

                break;
            }
        }
    }

    if (changes) {
        value.memorizedCallback = callback;
    }

    return value.memorizedCallback;
}

function _fake_useMemo<T extends(...args: unknown[]) => unknown>(fabric: T, deps?: any[]): ReturnType<T> {
    if (!currentOwner) {
        throw new Error('FakeReact: Called outside FakeReactComponent');
    }

    const currentIndex = currentOwner.currentIndex++;
    let value = currentOwner.values[currentIndex];

    if (value == null && currentOwner.values.length === currentIndex) {
        value = currentOwner.values[currentIndex] = {
            type: 'memo',
            index: currentIndex,
            memorizedValue: fabric() as ReturnType<T>,
            deps,
            owner: currentOwner,
        } satisfies _FakeReactMemo<ReturnType<T>>;
    }

    if (value == null || value.type !== 'memo') {
        // 'FakeReact: Invalid hooks order in FakeReactComponent'
        // 'FakeReact: Rendered more hooks than during the previous render'
        throw new Error('FakeReact: React has detected a change in the order of Hooks called by <Component>. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks');
    }

    let changes = !deps || !value.deps || deps.length !== value.deps?.length;

    if (!changes && deps && value.deps) {
        const oldDeps = value.deps;

        for (let i = 0 ; i < deps.length ; i++) {
            if (Object.is(deps[i], oldDeps[i])) {
                changes = true;

                break;
            }
        }
    }

    if (changes) {
        value.memorizedValue = fabric() as ReturnType<T>;
    }

    return value.memorizedValue;
}

function _fake_useSyncExternalStore<T>(
    subscribe: (onStoreChanges: () => void) => ((() => void) | undefined),
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
) {
    const { 0: value, 1: setValue } = _fake_useState(getServerSnapshot || getSnapshot);
    const getSnapshotRef = _fake_useRef(getSnapshot);

    getSnapshotRef.current = getSnapshot;

    _fake_useEffect(() => {
        return subscribe(() => {
            assertIsDefined(getSnapshotRef.current);

            setValue(getSnapshotRef.current());
        });
    }, [ subscribe ]);

    return value;
}

function _fake_renderComponent(component: _FakeReactComponent) {
    const owner = _createFakeReactOwner(currentOwner, component);
    const result = _renderOwner(owner);

    return {
        owner,
        result,
    };
}

function _fake_createElement(component: _FakeReactComponent | _FakeReactWrappedComponent): _FakeReactWrappedComponent {
    if (typeof component === 'function') {
        return {
            $$typeof: Symbol.for("react.element"),
            type: component,
        };
    }

    return component;
}

function _fake_createContext(): { Provider: Object, _currentValue: Object | undefined } {
    return { Provider: {}, _currentValue: void 0 };
}

export const fakeReact = {
    useState: _fake_useState,
    useRef: _fake_useRef,
    useCallback: _fake_useCallback,
    useMemo: _fake_useMemo,
    useEffect: _fake_useEffect,
    useSyncExternalStore: _fake_useSyncExternalStore,

    createContext: _fake_createContext,
    createElement: _fake_createElement,

    fakeRender: _fake_renderComponent,
    async awaitRender() {
        await queueMicrotaskPromise();
        await queueMicrotaskPromise();

        return Promise.all(currentRenders);
    },
};
