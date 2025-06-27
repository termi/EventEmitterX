//
declare module "freeport-async" {
    type Options = {
        hostnames?: string[],
    }

    async function freePortAsync(rangeStart: number, options?: Options): Promise<number>;
    async function rangeAsync(rangeSize: number, rangeStart: number, options?: Options): Promise<number[]>;
}
