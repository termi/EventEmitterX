/* eslint-disable callforce/typescript__no_declaration_in_dts,@typescript-eslint/no-explicit-any */
//

declare namespace _EventSignal_ReactPropTypes {
    export const nominalTypeHack: unique symbol;

    export interface Validator<T> {
        (props: { [key: string]: any }, propName: string, componentName: string, location: string, propFullName: string): Error | null;
        [nominalTypeHack]?: {
            type: T,
        } | undefined;
    }
}

type Validator<T> = _EventSignal_ReactPropTypes.Validator<T>;

export namespace EventSignal_ReactCopy {
    type JSXElementConstructor<P> =
        | ((props: P) => ReactElement<any, any> | null);
    type Key = string;

    interface ReactElement<P = any, T extends JSXElementConstructor<any> | string = JSXElementConstructor<any> | string> {
        type: T;
        props: P;
        key: Key | null;
    }
    type WeakValidationMap<T> = {
        [K in keyof T]?: null extends T[K]
            ? Validator<T[K] | null | undefined>
            : undefined extends T[K]
                ? Validator<T[K] | null | undefined>
                : Validator<T[K]>
    };

    // TODO: similar to how Fragment is actually a symbol, the values returned from createContext,
    // forwardRef and memo are actually objects that are treated specially by the renderer; see:
    // https://github.com/facebook/react/blob/v16.6.0/packages/react/src/ReactContext.js#L35-L48
    // https://github.com/facebook/react/blob/v16.6.0/packages/react/src/forwardRef.js#L42-L45
    // https://github.com/facebook/react/blob/v16.6.0/packages/react/src/memo.js#L27-L31
    // However, we have no way of telling the JSX parser that it's a JSX element type or its props other than
    // by pretending to be a normal component.
    //
    // We don't just use ComponentType or FunctionComponent types because you are not supposed to attach statics to this
    // object, but rather to the original function.
    interface ExoticComponent<P = {}> {// eslint-disable-line @typescript-eslint/ban-types
        /**
         * **NOTE**: Exotic components are not callable.
         */
        (props: P): (ReactElement|null);
        readonly $$typeof: symbol;
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    interface NamedExoticComponent<P = {}> extends ExoticComponent<P> {
        displayName?: string | undefined;
    }

    interface ProviderExoticComponent<P> extends ExoticComponent<P> {
        propTypes?: WeakValidationMap<P> | undefined;
    }

    type ContextType<C extends Context<any>> = C extends Context<infer T> ? T : never;

    // NOTE: only the Context object itself can get a displayName
    // https://github.com/facebook/react-devtools/blob/e0b854e4c/backend/attachRendererFiber.js#L310-L325
    type Provider<T> = ProviderExoticComponent<ProviderProps<T>>;
    type Consumer<T> = ExoticComponent<ConsumerProps<T>>;

    export interface Context<T> {
        Provider: Provider<T>;
        Consumer: Consumer<T>;
        displayName?: string | undefined;
    }

    type ReactNode = ReactElement | string | number | /*ReactFragment | ReactPortal | */boolean | null | undefined;
    // Context via RenderProps
    interface ProviderProps<T> {
        value: T;
        children?: ReactNode | undefined;
    }

    interface ConsumerProps<T> {
        children: (value: T) => ReactNode;
    }
}
