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

    magicContext.displayName = magicContext.Provider.displayName = displayName ?? 'EventSignalsContext';

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

                // noinspection CommaExpressionJS
                if (currentValue && !(currentValue instanceof (_FakeKlass.prototype = newValue, _FakeKlass))) {
                    Object.setPrototypeOf(newValue, currentValue);
                }
                else {
                    Object.setPrototypeOf(newValue, null);
                }
            }

            // noinspection JSUnusedGlobalSymbols
            this.__currentValue = newValue;
        },
    });

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

    let reactFC: ((...props: any[]) => any) | null = null;
    let predefinedProps: Object | undefined;

    // @ts-expect-error `TS2538: Type Object cannot be used as an index type.
    //  TS2538: Type undefined cannot be used as an index type.`
    const reactFCs = magicContextValue[componentType] || null;

    if (reactFCs) {
        if (typeof reactFCs === 'object') {
            if (status === 'error-boundary') {
                return reactFCs?.['error-boundary'] || null;
            }

            if (status === 'error-only') {
                return reactFCs?.['error'] || null;
            }

            reactFC = reactFCs
                ? ((status != null ? reactFCs[status] : null) || reactFCs["default"] || reactFCs)
                : null
            ;
        }
        else if (!status || status === 'default') {
            reactFC = reactFCs;
        }

        if (Array.isArray(reactFC)) {
            predefinedProps = reactFC[1];
            reactFC = reactFC[0];
        }

        if (reactFC) {
            if (predefinedProps) {
                return { 0: reactFC, 1: predefinedProps, __proto__: null };
            }

            return { 0: reactFC, __proto__: null };
        }
    }

    return null;
}
