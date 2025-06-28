/* eslint-disable @typescript-eslint/no-empty-object-type,@typescript-eslint/no-explicit-any */
//
interface ObjectConstructor {
    keys<T extends object>(o: T): (keyof T)[];
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
