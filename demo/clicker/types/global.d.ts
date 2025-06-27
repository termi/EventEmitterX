//
declare global {
    interface ObjectConstructor {
        keys<T extends object>(o: T): (keyof T)[];
        keys(o: object): string[];

    }
}
