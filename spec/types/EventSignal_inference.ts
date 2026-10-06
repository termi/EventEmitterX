// Compile-only public contract fixtures; never execute this file.
import { EventSignal } from 'signal-under-test';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

const async$ = new EventSignal('initial', async (prev, source, self$) => {
    type Prev = Expect<Equal<typeof prev, string>>;
    type Source = Expect<Equal<typeof source, number>>;
    type Data = Expect<Equal<typeof self$.data, { step: number }>>;
    type FullSignal = Expect<Equal<typeof self$, EventSignal<string, number, { step: number }, string | Promise<string>>>>;
    self$.markNextValueAsForced();
    self$.createMethod<number>((_prev, input, source) => source + input);
    // @ts-expect-error Contextual data does not lose its property types.
    self$.data.step = 'invalid';
    // @ts-expect-error Full self still preserves numeric source writes.
    self$.set('invalid');
    return `async:${source + self$.data.step}`;
}, { initialSourceValue: 0, data: { step: 1 } });
const asyncResult = async$.get();
const asyncLast = async$.getLast();
const asyncSafe = async$.getSafe();
const asyncTry = async$.tryGet();
type AsyncSignal = Expect<Equal<typeof async$, EventSignal<string, number, { step: number }, Promise<string>>>>;
type AsyncResult = Expect<Equal<typeof asyncResult, string | Promise<string>>>;
// @ts-expect-error get() also has synchronous fallback paths.
asyncResult.then(value => value);
if (asyncResult instanceof Promise) {
    asyncResult.then(value => {
        type Payload = Expect<Equal<typeof value, string>>;
        return value;
    });
}
Promise.resolve(asyncResult).then(value => {
    type Payload = Expect<Equal<typeof value, string>>;
    return value;
});
type AsyncLast = Expect<Equal<typeof asyncLast, string>>;
type AsyncSafe = Expect<Equal<typeof asyncSafe, string | Promise<string>>>;
type AsyncTry = Expect<Equal<typeof asyncTry, { ok: boolean, error: unknown | null, result: string } | Promise<{ ok: boolean, error: unknown | null, result: string }>>>;
async$.set((prev, source, data) => {
    type Prev = Expect<Equal<typeof prev, string>>;
    type Source = Expect<Equal<typeof source, number>>;
    return source + data.step;
});
// @ts-expect-error Numeric source rejects string writes.
async$.set('invalid');
// @ts-expect-error Reducers return source, not output.
async$.set(prev => prev);
// @ts-expect-error Promise-returning reducers are not supported.
async$.set(async (_prev, source) => source + 1);

const factory$ = EventSignal.createSignal('initial', async (prev, source, self$) => {
    type Prev = Expect<Equal<typeof prev, string>>;
    type Data = Expect<Equal<typeof self$.data, { step: number }>>;
    type FullFactorySignal = Expect<Equal<keyof typeof self$, keyof EventSignal<string, number, { step: number }, string | Promise<string>>>>;
    self$.markNextValueAsForced();
    return `${source + self$.data.step}`;
}, { initialSourceValue: 0, data: { step: 1 } });
type FactoryParity = Expect<Equal<typeof factory$, typeof async$>>;

// Matches the object-returning computation in EventSignal_spec.ts.
const forcedObject$ = new EventSignal<{ numericValue: number }, number>({ numericValue: 0 }, (object, source, self$) => {
    type FullSignal = Expect<Equal<keyof typeof self$, keyof EventSignal<{ numericValue: number }, number>>>;
    if (source != null) {
        object.numericValue = source;
        self$.markNextValueAsForced();
        return object;
    }
});
const inferredObject$ = EventSignal.createSignal({ numericValue: 0 }, (object, source, self$) => {
    type Previous = Expect<Equal<typeof object, { numericValue: number }>>;
    type Source = Expect<Equal<typeof source, number>>;
    type Data = Expect<Equal<typeof self$.data, { step: number }>>;
    self$.markNextValueAsForced();
    const snapshot = self$.getLast();
    type Snapshot = Expect<Equal<typeof snapshot, { numericValue: number }>>;
    const project$ = self$.map(value => value.numericValue);
    const projected = project$.get();
    type Projection = Expect<Equal<typeof projected, number | undefined | Promise<number | undefined>>>;
    return { numericValue: source + self$.data.step };
}, { initialSourceValue: 0, data: { step: 1 } });
const inferredObjectValue = inferredObject$.get();
// Initial and returned anonymous object types can remain a structurally equivalent union.
type ObjectResult = Expect<Equal<typeof inferredObjectValue.numericValue, number>>;
const checkedObject: { numericValue: number } = inferredObjectValue;
const reverseCheckedObject: typeof inferredObjectValue = { numericValue: 1 };

const noSource$ = new EventSignal(0, (prev, source, self$) => {
    type Source = Expect<Equal<typeof source, number | undefined>>;
    type FullSignal = Expect<Equal<typeof self$, EventSignal<number, number, undefined, number | Promise<number>>>>;
    self$.markNextValueAsForced();
    self$.mutate(1);
    // @ts-expect-error All methods retain their source constraints.
    self$.mutate('invalid');
    return source ?? prev;
});
const noSourceValue = noSource$.get();
type NoSourceResult = Expect<Equal<typeof noSourceValue, number>>;

const hybridSelf$ = new EventSignal(0, (_prev, source, self$) => {
    type FullSignal = Expect<Equal<typeof self$, EventSignal<number, number, { async: boolean }, number | Promise<number>>>>;
    self$.markNextValueAsForced();
    return self$.data.async ? Promise.resolve(source) : source;
}, { initialSourceValue: 0, data: { async: true as boolean } });
const hybridSelfFactory$ = EventSignal.createSignal(0, (_prev, source, self$) => {
    self$.markNextValueAsForced();
    return self$.data.async ? Promise.resolve(source) : source;
}, { initialSourceValue: 0, data: { async: true as boolean } });
type HybridSelfParity = Expect<Equal<typeof hybridSelfFactory$, typeof hybridSelf$>>;
const hybridSelfValue = hybridSelf$.get();
type HybridSelfRead = Expect<Equal<typeof hybridSelfValue, number | Promise<number>>>;

const mock = jest.fn(async (_prev: string, source: number) => `mock:${source}`);
const mocked$ = new EventSignal('initial', mock, { initialSourceValue: 0 });
const mockedResult = mocked$.get();
type MockResult = Expect<Equal<typeof mockedResult, string | Promise<string>>>;
const named = async (_prev: string, source: number) => `named:${source}`;
const named$ = EventSignal.createSignal('initial', named, { initialSourceValue: 0 });
const namedResult = named$.get();
type NamedResult = Expect<Equal<typeof namedResult, string | Promise<string>>>;
const narrowCallback = (_prev: 'initial', source: number) => `value:${source}`;
// @ts-expect-error Callback must accept subsequent output, not only the initial literal.
new EventSignal('initial', narrowCallback, { initialSourceValue: 0 });
const legacy = (_prev: string, source: number, self$: EventSignal<string, number, undefined, Promise<string>>) => Promise.resolve(`${source}:${self$.computationsCount}`);
const legacy$ = new EventSignal<string, number, undefined, Promise<string>>('initial', legacy, { initialSourceValue: 0 });
const legacyFactory$ = EventSignal.createSignal<string, number, undefined, Promise<string>>('initial', legacy, { initialSourceValue: 0 });
type LegacyParity = Expect<Equal<typeof legacyFactory$, typeof legacy$>>;

const sync$ = new EventSignal('initial', (_prev, source) => `sync:${source}`, { initialSourceValue: 0 });
const syncResult = sync$.get();
type SyncResult = Expect<Equal<typeof syncResult, string>>;
const syncTry = sync$.tryGet();
type SyncTry = Expect<Equal<typeof syncTry, { ok: boolean, error: unknown | null, result: string }>>;
const writable$ = EventSignal.createSignal(0);
const writableResult = writable$.get();
type WritableSignal = Expect<Equal<typeof writable$, EventSignal<number, number, undefined, number>>>;
type WritableResult = Expect<Equal<typeof writableResult, number>>;
const data$ = EventSignal.createSignal(0, { data: { label: 'counter' } });
type WritableData = Expect<Equal<typeof data$.data, { label: string }>>;

const counter$ = new EventSignal(0, { data: { title: 'counter' } });
const methodData = {
    title: 'test',
    _: {
        increment(arg = 1) { counter$.set(value => value + arg); },
        decrement(arg = 1) { counter$.set(value => value - arg); },
    },
};
const methodData$ = new EventSignal('', (_prev, source, self$) => {
    if ((self$.getStateFlags() & EventSignal.StateFlags.wasSourceSetting) !== 0) {
        counter$.set(source);
    }
    self$.data._.increment();
    return `value:${counter$.get()}`;
}, { initialSourceValue: counter$.get(), data: methodData });
const factoryMethodData$ = EventSignal.createSignal('', (_prev, source, self$) => {
    self$.data._.decrement(source);
    return `value:${counter$.get()}`;
}, { initialSourceValue: counter$.get(), data: methodData });
type FactoryMethodData = Expect<Equal<typeof factoryMethodData$.data, typeof methodData>>;
// @ts-expect-error Factory data methods retain numeric parameters.
factoryMethodData$.data._.increment('invalid');

type MethodData = Expect<Equal<typeof methodData$.data, { title: string, _: { increment(arg?: number): void, decrement(arg?: number): void } }>>;
methodData$.data._.increment();
// @ts-expect-error Default-valued method parameters remain numeric.
methodData$.data._.decrement('invalid');

const pending$ = new EventSignal(Promise.resolve(1));
const pendingLast = pending$.getLast();
const pendingRead = pending$.get();
type PendingLast = Expect<Equal<typeof pendingLast, number | undefined>>;
type PendingRead = Expect<Equal<typeof pendingRead, number | undefined | Promise<number>>>;
const noUpdate$ = new EventSignal<number | undefined, number, undefined, Promise<undefined>>(1, async () => undefined, { initialSourceValue: 0 });
const noUpdateRead = noUpdate$.get();
type NoUpdateRead = Expect<Equal<typeof noUpdateRead, number | undefined | Promise<number | undefined>>>;
const pendingComputed$ = new EventSignal(Promise.resolve(0), (_prev, source) => source, { initialSourceValue: 0 });
const pendingComputedTry = pendingComputed$.tryGet();
type PendingComputedTry = Expect<Equal<typeof pendingComputedTry, { ok: boolean, error: unknown | null, result: number | undefined } | Promise<{ ok: boolean, error: unknown | null, result: number | undefined }>>>;
pending$.set(prev => prev + 1);
// @ts-expect-error Default source is the resolved payload, not Promise.
pending$.set(Promise.resolve(2));
pending$.addListener(value => {
    type ListenerPayload = Expect<Equal<typeof value, number | undefined>>;
});
const reactLast = pending$.use();
type ReactLast = Expect<Equal<typeof reactLast, number | undefined>>;

const hybrid$ = new EventSignal(0, (_prev, source) => source ? Promise.resolve(source) : 0, { initialSourceValue: 0 });
const hybridResult = hybrid$.get();
type HybridResult = Expect<Equal<typeof hybridResult, number | Promise<number>>>;
const factoryHybrid$ = EventSignal.createSignal(0, (_prev, source) => source ? Promise.resolve(source) : 0, { initialSourceValue: 0 });
type HybridParity = Expect<Equal<typeof factoryHybrid$, typeof hybrid$>>;
const increment = async$.createMethod<number>((prev, input, source, self$) => {
    type Prev = Expect<Equal<typeof prev, string>>;
    type Data = Expect<Equal<typeof self$.data, { step: number }>>;
    return source + input + self$.data.step;
});
const methodCompletion = increment(1);
type MethodCompletion = Expect<Equal<typeof methodCompletion, void | Promise<void>>>;
const null$ = new EventSignal<number | null, number>(null, (_prev, source) => source ? source : null, { initialSourceValue: 0 });
const undefined$ = new EventSignal<number | undefined>(undefined);
undefined$.set(1);
// @ts-expect-error A different output requires an explicit initial/output union.
new EventSignal(0, (_prev, source) => `value:${source}`, { initialSourceValue: 0 });
const union$ = new EventSignal<string | number, number, undefined, string>(0, (_prev, source) => `value:${source}`, { initialSourceValue: 0 });
const unionResult = union$.get();
type UnionResult = Expect<Equal<typeof unionResult, string | number>>;

const object$ = new EventSignal({ count: 0, label: '' });
object$.mutate({ count: 1 });
// @ts-expect-error Unknown mutation keys are rejected.
object$.mutate({ missing: true });
// @ts-expect-error Wrong mutation values are rejected.
object$.mutate({ count: 'invalid' });
const foreignProps = { count: 1, missing: true };
// @ts-expect-error Variables cannot smuggle unknown keys into mutate.
object$.mutate(foreignProps);
writable$.mutate(1);
// @ts-expect-error Numeric source rejects string mutations.
writable$.mutate('invalid');

const mapped$ = async$.map(value => value.length);
const mappedResult = mapped$.get();
type MappedRead = Expect<Equal<typeof mappedResult, number | undefined | Promise<number | undefined>>>;
// @ts-expect-error One-way projection has no writable source.
mapped$.set(1);
// @ts-expect-error One-way projection has no mutation input.
mapped$.mutate(1);
