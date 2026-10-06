// Compile-only constructor inference checks; do not execute as runtime tests.
import { EventSignal } from '../../modules/EventEmitterEx/EventSignal';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

const async$ = new EventSignal('initial', async (prev, source) => {
    type Prev = Expect<Equal<typeof prev, string>>;
    type Source = Expect<Equal<typeof source, number>>;
    return `async:${source}`;
}, { initialSourceValue: 0 });
const asyncResult = async$.get();
type AsyncSignal = Expect<Equal<typeof async$, EventSignal<string, number, undefined, Promise<string>>>>;
type AsyncResult = Expect<Equal<typeof asyncResult, Promise<string>>>;
async$.set((prev, source) => {
    type Prev = Expect<Equal<typeof prev, string>>;
    type Source = Expect<Equal<typeof source, number>>;
    return source + 1;
});
// @ts-expect-error Numeric source must reject a string write.
async$.set('invalid');
// @ts-expect-error Reducers must return the numeric source, not the string output.
async$.set(prev => prev);

const sync$ = new EventSignal('initial', (_prev, source) => `sync:${source}`, { initialSourceValue: 0 });
const syncResult = sync$.get();
type SyncResult = Expect<Equal<typeof syncResult, string>>;

const writable$ = new EventSignal(0);
const writableResult = writable$.get();
type WritableSignal = Expect<Equal<typeof writable$, EventSignal<number, number, undefined, number>>>;
type WritableResult = Expect<Equal<typeof writableResult, number>>;
