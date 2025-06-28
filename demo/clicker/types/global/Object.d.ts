/* eslint-disable @typescript-eslint/no-empty-object-type,@typescript-eslint/no-explicit-any */
//
interface ObjectConstructor {
    /**
     * Returns the names of the enumerable string properties and methods of an object.
     * @param o Object that contains the properties and methods. This can be an object that you created or an existing Document Object Model (DOM) object.
     *
     * More precise Object.keys type declarations
     *
     * see [Inconsistencies within types for ObjectConstructor methods, appeal to revisit the Object.keys discussion #45835](https://github.com/microsoft/TypeScript/issues/45835)
     * see [Object.values and Object.entries are unsound and inconsistent with Object.keys. #38520](https://github.com/microsoft/TypeScript/issues/38520)
     * see [stricter definition of Object.keys; why not? #45390 / comment](https://github.com/microsoft/TypeScript/issues/45390#issuecomment-895661910)
     * see [stackoverflow: Why doesn't Object.keys return a keyof type in TypeScript?](https://stackoverflow.com/questions/55012174/why-doesnt-object-keys-return-a-keyof-type-in-typescript)
     */
    keys<T extends Record<string, unknown>>(o: T): (keyof T)[];
    keys(o: object): string[];

    /**
     * Creates an object that has the specified prototype or that has null prototype.
     * @param proto Object to use as a prototype. May be null.
     *
     * @see [TypeScript / issues / Why are Object.create(null) and {} treated differently regarding undefined-exclusion?](https://github.com/microsoft/TypeScript/issues/52698)
     * @see [TypeScript / issues / Add typed overloads to Object.create](https://github.com/microsoft/TypeScript/issues/39882)
     */
    create(proto: null): {};

    /**
     * Creates an object that has the specified prototype or that has null prototype.
     * @param proto Object to use as a prototype. May be null.
     * @param properties JavaScript object that contains one or more property descriptors.
     *
     * @see [TypeScript / issues / Why are Object.create(null) and {} treated differently regarding undefined-exclusion?](https://github.com/microsoft/TypeScript/issues/52698)
     * @see [TypeScript / issues / Add typed overloads to Object.create](https://github.com/microsoft/TypeScript/issues/39882)
     */
    create<
        P extends object | null,
        M extends PropertyDescriptorMap = {},
    >(proto: P, properties?: M & ThisType<any>): {
        readonly [
        K in keyof M as M[K] extends { readonly writable: false }
            ? K
            : never
        ]: M[K] extends Readonly<TypedPropertyDescriptor<infer V>>
            ? V
            : any;
    } & {
        -readonly [
        K in keyof M as M[K] extends { readonly writable: true }
            ? K
            : never
        ]: M[K] extends Readonly<TypedPropertyDescriptor<infer V>>
            ? V
            : any;
    } & (null extends P ? {} : P);
}
