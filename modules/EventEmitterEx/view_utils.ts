'use strict';

import type { EventSignal } from "./EventSignal";

type ReactContextLike = Object & { Provider: Object & { displayName?: string }, _currentValue: Object | undefined, displayName?: string };
type MagicContextValue = { [key: string | number | symbol]: (...props: any[]) => any };
type ReactMagicContext = Object & { Provider: Object, _currentValue: MagicContextValue | undefined };

/**
 * A BETA version of EventSignal's ViewContext
 *
 * todo: В сеттере: в render-фазе делать подмену значения newValue со string в object.
 */
export function createEventSignalMagicContext(createContext: () => ReactContextLike, displayName?: string): ReactMagicContext {
    const magicContext = createContext();
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const _FakeKlass = function() {};

    if (displayName) {
        magicContext.displayName = magicContext.Provider.displayName = 'EventSignalsContext';
    }

    Object.defineProperty(magicContext, '_currentValue', {
        get() {
            return this.__currentValue;
        },
        set(newValue) {
            const currentValue = this.__currentValue;

            if (newValue) {
                // todo: if (typeof newValue === 'string') newValue = componentsRecordFromMod(newValue as mod);
                if (Array.isArray(newValue)) {
                    newValue = Object.fromEntries(newValue);
                }

                Object.setPrototypeOf(newValue, null);

                // noinspection CommaExpressionJS
                if (currentValue && !(currentValue instanceof (_FakeKlass.prototype = newValue, _FakeKlass))) {
                    Object.setPrototypeOf(newValue, currentValue);
                }
            }

            // noinspection JSUnusedGlobalSymbols
            this.__currentValue = newValue;
        },
    });

    if (Object.getPrototypeOf(magicContext) === Object.prototype) {
        Object.setPrototypeOf(magicContext, null);
    }

    if (Object.getPrototypeOf(magicContext.Provider) === Object.prototype) {
        Object.setPrototypeOf(magicContext.Provider, null);
    }

    // if (Object.getPrototypeOf(magicContext.Consumer) === Object.prototype) {
    //     Object.setPrototypeOf(magicContext.Consumer, null);
    // }

    return magicContext as ReactMagicContext;
}

export function getReactFunctionComponentFromMagicContext(
    magicContextValue: Object,
    componentType: EventSignal.NewOptions<any, any, any, any>["componentType"],
    status?: string,
) {
    const type = typeof componentType;

    if (componentType === null || type === 'undefined') {
        return null;
    }

    // @ts-expect-error `TS2538: Type Object cannot be used as an index type.
    //  TS2538: Type undefined cannot be used as an index type.`
    const reactFCs = magicContextValue[componentType] || null;

    const reactFC = reactFCs
        ? ((status != null ? reactFCs[status] : null) || reactFCs["default"] || reactFCs)
        : null
    ;

    if (reactFC) {
        return { 0: reactFC, __proto__: null };
    }

    return null;
}
