/**
 * @jest-environment jsdom
 */
/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment, promise/no-nesting,jest/prefer-expect-resolves, unicorn/prefer-dom-node-dataset */
/* globals describe, xdescribe, it, xit, expect */
'use strict';

import {
    EventEmitter,
    on as nodeOn,
    once as nodeOnce,
} from "node:events";

require('termi@polyfills');

import { sleep } from '../../../utils/promise';
import { assertIsDefined, assertIsString } from 'termi@type_guards';
import { assertIsNumber } from 'termi@type_guards';
import {
    EventSignal,
    __test__get_signalEventsEmitter,
    __test__get_subscribersEventsEmitter,
    __test__get_timersTriggerEventsEmitter,
} from "../../../modules/EventEmitterEx/EventSignal";
// import { isAbortError } from "../../../common/AbortController";
import { EventEmitterX, once, on } from "../../../modules/events";
import { ProgressControllerX } from 'termi@ProgressControllerX';

import {
    getEventListeners,
} from '../../../spec_utils/EventTarget_helpers';
import {
    useFakeTimers,
    useRealTimers,
    setSystemTime,
    realSleep,
    advanceTimersByTime,
    advanceTimersByTimeAsync,
} from "../../../spec_utils/fakeTimers";
import { fakeReact, FakeMiniHTMLElement } from "../../../spec_utils/simple-react-hooks";

const { createSignal } = EventSignal;

const __test__signalEventsEmitter = __test__get_signalEventsEmitter();
const __test__subscribersEventsEmitter = __test__get_subscribersEventsEmitter();
const __test__timersTriggerEventsEmitter = __test__get_timersTriggerEventsEmitter();

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const SECONDS_15 = SECONDS * 15;
const SECONDS_30 = SECONDS * 30;

describe('EventSignal', () => {
    const _isEvenNumber = (num: number) => {
        return (num & 1) === 0;
    };

    describe('common cases', () => {
        it('basic case', async function() {
            const signal1$ = new EventSignal(0, {
                description: 'signal1',
            });
            const signal2$ = new EventSignal(100, {
                description: 'signal2',
            });
            const computedSignal1$ = new EventSignal(0, (prev, source, eventSignal) => {
                void prev;
                void source;
                void eventSignal;

                const value = signal1$.get();

                if (_isEvenNumber(value)) {
                    return value + signal2$.get();
                }

                return signal1$.get() + 1000;
            }, {
                description: 'computedSignal1',
                deps: [ signal2$ ],
                data: { test: 1 },
            });

            const value = signal1$.get();

            signal1$.mutate(1);

            signal1$.set(value + 1);

            const computedValue = computedSignal1$.get();

            expect(computedValue).toBe(1001);
            expect(computedSignal1$.get()).toBe(1001);
            expect(computedSignal1$.version).toBe(1);

            signal1$.set(signal1$.get() + 1);
            signal2$.set(200);

            expect(computedSignal1$.get()).toBe(202);
            expect(computedSignal1$.get()).toBe(202);
            expect(computedSignal1$.version).toBe(2);

            signal1$.set(signal1$.get() + 101);

            expect(computedSignal1$.get()).toBe(1103);
            expect(computedSignal1$.get()).toBe(1103);
            expect(computedSignal1$.version).toBe(3);
        });

        it('with objects value', async function() {
            const signal1$ = new EventSignal({ a: 1 });
            const signal2$ = new EventSignal({ b: 1 });
            const computedSignal1$ = new EventSignal(`#{0}-#{0}`, (prev) => {
                const objA = signal1$.get();
                const objB = signal2$.get();
                const args = [ objA.a, objB.b ];

                return prev.replace(/#{(\d+)}/g, function(_, curr: string) {
                    return `#{${args.shift() || curr || 0}}`;
                });
            }, {
                data: { test: 1 },
            });

            expect(computedSignal1$.get()).toBe(`#{1}-#{1}`);
            expect(computedSignal1$.version).toBe(1);

            signal1$.set(obj => ({ ...obj, a: obj.a + 1 }));

            expect(computedSignal1$.get()).toBe(`#{2}-#{1}`);
            expect(computedSignal1$.version).toBe(2);

            const objA = signal1$.get();
            const objB = signal2$.get();

            // Object mutation. No effect to signal.
            objA.a++;
            // Setting the same object. No effect to signal.
            signal2$.set(objB);

            expect(computedSignal1$.get()).toBe(`#{2}-#{1}`);
            expect(computedSignal1$.version).toBe(2);

            signal1$.set(obj => ({ ...obj, a: obj.a + 1 }));
            signal2$.set(obj => ({ ...obj, b: obj.b + 1 }));

            expect(computedSignal1$.get()).toBe(`#{4}-#{2}`);
            expect(computedSignal1$.version).toBe(3);

            {
                const objA = signal1$.get();

                // Object mutation.
                objA.a++;
                signal1$.markNextValueAsForced();
                // Setting the same object. Has effect due calling of `markNextValueAsForced`.
                signal1$.set(objA);

                expect(computedSignal1$.get()).toBe(`#{5}-#{2}`);
                expect(computedSignal1$.version).toBe(4);
                expect(objA).toBe(signal1$.get());
                expect(signal1$.toString()).toBe(`{"a":5}`);
            }
        });

        it('show how dependency works', async function() {
            const numericValue$ = new EventSignal(0, {
                description: '$numericValue',
            });
            const numericValueWasEvent1$ = new EventSignal(0, (prev) => {
                const value = numericValue$.get();

                if (_isEvenNumber(value)) {
                    return ++prev;
                }

                return prev;
            }, {
                description: '$numericValueWasEvent1',
            });
            const numericValueIfEvent$ = new EventSignal(0, (prev) => {
                const value = numericValue$.get();

                if (_isEvenNumber(value)) {
                    return value;
                }

                return prev;
            }, {
                description: '$numericValueIfEvent',
            });
            const numericValueIfEvent2$ = numericValueIfEvent$.map((value) => {
                return value.toString(10);
            });
            //todo: Сейчас этот сигнал работает не так, как хотелось бы:
            // 1. computation срабатывает первый раз даже без изменения зависимостей. Пока ставим -1 в качестве initialValue.
            // 2. computation срабатывает каждый раз, когда зависимости зависимостей изменяются, даже если значение зависимости НЕ изменилось
            const numericValueWasEvent2$ = new EventSignal(-1, (prev) => {
                return ++prev;
            }, {
                description: '$numericValueWasEvent2',
                // todo: Читать флаг isDirty (isNeedToCompute) у deps и выставлять isDirty у текущего EventSignal, только если хотя бы один isDirty
                deps: [ numericValueIfEvent$ ],
                // todo: Вызов computation только после получения нового значения в $numericValueIfEvent можно было бы
                //  реализовать через ещё один вид подписки: "triggers" - в этом случае, в обработчик сигнала
                //  signalEventsEmitter могли бы эмититься newValue и prevValue и инвалидация кеша текущего сигнала
                //  происходила только если newValue != prevValue.
                // triggers: [ $numericValueIfEvent ],
            });

            const numericValue$_inc = numericValue$.createMethod<number | void>(function(sourceValue, input = 1) {
                return sourceValue + input;
            });

            numericValue$_inc();

            expect(numericValue$.get()).toBe(1);
            expect(numericValueIfEvent$.get()).toBe(0);
            expect(numericValueIfEvent2$.get()).toBe('0');
            expect(numericValueIfEvent2$.version).toBe(numericValueIfEvent$.version + 1);
            expect(numericValueWasEvent1$.get()).toBe(0);
            expect(numericValueWasEvent2$.get()).toBe(0);
            expect(numericValueWasEvent2$.computationsCount).toBe(1);

            numericValue$_inc();

            expect(numericValue$.get()).toBe(2);
            expect(numericValueIfEvent$.get()).toBe(2);
            expect(numericValueIfEvent2$.get()).toBe('2');
            expect(numericValueIfEvent2$.version).toBe(numericValueIfEvent$.version + 1);
            expect(numericValueWasEvent1$.get()).toBe(1);
            expect(numericValueWasEvent2$.get()).toBe(1);
            expect(numericValueWasEvent2$.computationsCount).toBe(2);

            numericValue$_inc(4);

            expect(numericValue$.get()).toBe(6);
            expect(numericValueIfEvent$.get()).toBe(6);
            expect(numericValueIfEvent2$.get()).toBe('6');
            expect(numericValueIfEvent2$.version).toBe(numericValueIfEvent$.version + 1);
            expect(numericValueWasEvent1$.get()).toBe(2);
            expect(numericValueWasEvent2$.get()).toBe(2);
            expect(numericValueWasEvent2$.computationsCount).toBe(3);

            const _$numericValueIfEvent_version = numericValueIfEvent$.version;

            numericValue$_inc(3);

            expect(numericValue$.get()).toBe(9);
            expect(numericValueIfEvent$.get()).toBe(6);
            expect(numericValueIfEvent$.version).toBe(_$numericValueIfEvent_version);
            expect(numericValueIfEvent2$.get()).toBe('6');
            expect(numericValueIfEvent2$.version).toBe(numericValueIfEvent$.version + 1);
            expect(numericValueWasEvent1$.get()).toBe(2);
            //todo: Из-за текущей логики инвалидации кеша из-за изменения зависимости зависимостей, computation вызовется,
            // даже если фактически значение $numericValueIfEvent не изменилось.
            expect(numericValueWasEvent2$.get()).toBe(3);
            expect(numericValueWasEvent2$.computationsCount).toBe(4);

            numericValue$.set(100);

            expect(numericValue$.get()).toBe(100);
            expect(numericValueIfEvent$.get()).toBe(100);
            expect(numericValueIfEvent$.version).toBe(3);
            expect(numericValueIfEvent2$.get()).toBe('100');
            expect(numericValueIfEvent2$.version).toBe(4);
            expect(numericValueWasEvent1$.get()).toBe(3);
            expect(numericValueWasEvent2$.get()).toBe(4);
        });

        it('common case with events-updated Store: simple', async function() {
            const ee = new EventEmitterX();
            const usersStore = new UsersStore(ee);
            // Firstly unknown user
            const userName$ = usersStore.getUserNameSignal(1);

            expect(userName$.get()).toBe('...loading');
            expect(String(userName$)).toBe('...loading');
            expect(userName$.version).toBe(1);
            expect(userName$.data.userId).toBe(1);

            // add new user with id=9
            ee.emit('user-add', { id: 1, firstName: 'Joe', secondName: 'Bloggs', age: 55 } satisfies User);

            expect(userName$.get()).toBe('Joe Bloggs');
            expect(userName$.version).toBe(2);

            // update to same name to user with id=1: should be ignored
            ee.emit('user-update', [ 1, 'Joe', 'Bloggs', 24 ] satisfies UserDTO);

            expect(userName$.get()).toBe('Joe Bloggs');
            expect(userName$.version).toBe(2);

            // update to new name to user with id=1
            ee.emit('user-update', [ 1, 'Josef', void 0, void 0 ] satisfies UserDTO);

            expect(userName$.get()).toBe('Josef Bloggs');
            expect(userName$.version).toBe(3);

            userName$.destructor();

            // update of name to user with id=1 after signal destroyed: should be ignored
            ee.emit('user-update', [ 1, 'Test', 'Testovsky', void 0 ] satisfies UserDTO);

            expect(userName$.get()).toBe('Josef Bloggs');
            expect(userName$.version).toBe(3);
        });

        it('common case with events-updated Store: complex', async function() {
            const ee = new EventEmitterX();
            const usersStore = new UsersStore(ee, defaultUsers);
            const user1Name$ = usersStore.getUserNameSignal(1);
            const user2Name$ = usersStore.getUserNameSignal(2);
            const user3Name$ = usersStore.getUserNameSignal(3, 0);
            // Firstly unknown user
            const user9Name$ = usersStore.getUserNameSignal(9);

            for (const { data: { userId } } of [ user1Name$, user2Name$, user3Name$, user9Name$ ]) {
                assertIsNumber(userId);

                expect(ee.listenerCount(`${userId}---username-changes`)).toBe(1);
            }

            expect(user1Name$.get()).toBe('Vasa Pupkin');
            expect(String(user1Name$)).toBe('Vasa Pupkin');
            expect(user1Name$.version).toBe(1);
            expect(user1Name$.data.userId).toBe(1);
            expect(user2Name$.get()).toBe('Jon Dow');
            expect(user2Name$.data.userId).toBe(2);
            expect(user3Name$.get()).toBe('Kelvin Klein');
            expect(user3Name$.data.userId).toBe(3);
            expect(user9Name$.get()).toBe('...loading');
            expect(String(user9Name$)).toBe('...loading');
            expect(user9Name$.version).toBe(1);
            expect(user9Name$.data.userId).toBe(9);

            {// user1
                // update secondName user with id=1
                ee.emit('user-update', [ 1, void 0, 'Kapustin', void 0 ] satisfies UserDTO);

                expect(user1Name$.get()).toBe('Vasa Kapustin');
                expect(user1Name$.version).toBe(2);

                // update age user with id=1
                ee.emit('user-update', [ 1, void 0, void 0, 22 ] satisfies UserDTO);

                expect(user1Name$.get()).toBe('Vasa Kapustin');
                expect(user1Name$.version).toBe(2);
            }

            {// user9 - previously unknown
                // add new user with id=9
                ee.emit('user-add', { id: 9, firstName: 'Joe', secondName: 'Bloggs', age: 55 } satisfies User);

                expect(user9Name$.get()).toBe('Joe Bloggs');
                expect(user9Name$.version).toBe(2);
                expect(user9Name$.computationsCount).toBe(2);
                expect(user9Name$.data.computationCounter).toBe(2);

                // update to same name to user with id=9: should be ignored
                ee.emit('user-update', [ 9, 'Joe', 'Bloggs', 24 ] satisfies UserDTO);

                expect(user9Name$.get()).toBe('Joe Bloggs');
                expect(user9Name$.version).toBe(2);
                expect(user9Name$.computationsCount).toBe(2);
                expect(user9Name$.data.computationCounter).toBe(2);

                // explicitly trigger computation
                ee.emit(`${user9Name$.data.userId}---username-changes`, user9Name$.data.userId);

                expect(user9Name$.get()).toBe('Joe Bloggs');
                expect(user9Name$.version).toBe(2);
                expect(user9Name$.computationsCount).toBe(3);
                expect(user9Name$.data.computationCounter).toBe(3);

                // update to new name to user with id=9
                ee.emit('user-update', [ 9, 'Josef', void 0, void 0 ] satisfies UserDTO);

                expect(user9Name$.get()).toBe('Josef Bloggs');
                expect(user9Name$.version).toBe(3);
                expect(user9Name$.computationsCount).toBe(4);
                expect(user9Name$.data.computationCounter).toBe(4);
            }

            user1Name$.destructor();
            user2Name$.destructor();
            user3Name$.destructor();
            user9Name$.destructor();

            expect(user3Name$.get()).toBe('--user not found--');
            expect(user3Name$.version).toBe(2);

            for (const { data: { userId } } of [ user1Name$, user2Name$, user3Name$, user9Name$ ]) {
                expect(ee.listenerCount(`${userId}---username-changes`)).toBe(0);
            }

            // update of name to user with id=9 after signal destroyed: should be ignored
            ee.emit('user-update', [ 9, 'Test', 'Testovsky', void 0 ] satisfies UserDTO);

            expect(user9Name$.get()).toBe('Josef Bloggs');
            expect(user9Name$.version).toBe(3);
            expect(user9Name$.computationsCount).toBe(4);
        });

        it('common case with events-updated Store: working with mutated objects', async function() {
            const ee = new EventEmitterX();
            const usersStore = new UsersStore(ee);
            const user1: User = { id: 1, firstName: 'Joe', secondName: 'Bloggs', age: 55 };
            const user2: User = { id: 2, firstName: 'Jon', secondName: 'Dow', age: 21 };
            const user$ = usersStore.getUserSignal(user1.id);

            expect(user$.version).toBe(0);
            expect(user$.get()).toBeNull();
            expect(user$.version).toBe(0);
            expect(user$.data.userId).toBe(user1.id);
            expect(user$.get()).toBeNull();
            expect(user$.version).toBe(0);

            usersStore.addUser(user1);

            expect(user$.get()).toBe(user1);
            expect(user$.version).toBe(1);

            usersStore.updateUser(user1.id, {
                secondName: 'Hoss',
            });

            expect(user$.get()).toBe(user1);
            expect(user$.get()?.secondName).toBe('Hoss');
            expect(user$.version).toBe(2);

            user$.set(user2.id);

            expect(user$.get()).toBeNull();
            expect(user$.version).toBe(3);
            expect(user$.data.userId).toBe(user2.id);

            usersStore.addUser(user2);

            expect(user$.get()).toEqual(user2);
            expect(user$.version).toBe(4);

            user$.set(user1.id);

            // user1 будет доступен сразу из кеша usersStore
            expect(user$.get()).toBe(user1);
            expect(user$.get()?.secondName).toBe(user1.secondName);
            expect(user$.data.userId).toBe(user1.id);
            expect(user$.version).toBe(5);

            user$.set(user2.id);

            user$.destructor();

            usersStore.updateUser(user1.id, {
                secondName: 'TuTu',
            });

            expect(user$.get()).toBe(user1);
            // Has updated value due mutation
            expect(user$.get()?.secondName).toBe('TuTu');
            // Has no changes in version due no computation triggered after destructuring
            expect(user$.version).toBe(5);
        });
    });

    describe('detect problems', function() {
        it('cycles dep', async function() {
            const computedSignal1$: EventSignal<number> = new EventSignal(0, () => {
                return computedSignal1$.get() + 1;
            }, {
                description: 'computedSignal1',
            });

            expect(() => {
                computedSignal1$.get();
            }).toThrow('Depends on own value');
        });

        it('detects slightly larger cycles', () => {
            const computedSignal1$: EventSignal<number> = EventSignal.createSignal(0, () => computedSignal2$.get());
            const computedSignal2$: EventSignal<number> = createSignal(0, () => computedSignal1$.get());
            const computedSignal3$ = createSignal(0, () => computedSignal2$.get());

            expect(() => {
                computedSignal3$.get();
            }).toThrow('Now in computing state (cycle deps?)');
        });
    });

    describe('with options.[sourceMap/sourceFilter]', function() {
        it('EventEmitter - with map', async function() {
            const ee = new EventEmitterX();
            const signal1$ = new EventSignal(0, {
                description: 'signal from another emitter',
                sourceEmitter: ee,
                sourceEvent: 'test',
                sourceMap(_eventName, value: { data: number }) {
                    return value.data;
                },
                data: { test: 1 },
            });

            expect(signal1$.get()).toBe(0);

            ee.emit('test', { data: 1 });

            expect(signal1$.get()).toBe(1);

            signal1$.destructor();

            expect(ee.listenerCount('test')).toBe(0);

            expect(signal1$.get()).toBe(1);
        });

        it('EventTarget - with map', async function() {
            const $inputElement = document.createElement('input');

            $inputElement.value = 'placeholder';

            const signal1$ = new EventSignal($inputElement.value, {
                description: 'signal from another emitter',
                sourceEmitter: $inputElement,
                sourceEvent: 'change',
                sourceMap(_eventName, event: { target: { value: string } }) {
                    return event.target.value;
                },
            });

            expect(getEventListeners($inputElement, 'change')).toHaveLength(1);

            expect(signal1$.get()).toBe('placeholder');

            $inputElement.value = 'string 1';
            $inputElement.dispatchEvent(new Event('change'));

            expect(signal1$.get()).toBe('string 1');

            signal1$.destructor();

            expect(getEventListeners($inputElement, 'change')).toHaveLength(0);

            expect(signal1$.get()).toBe('string 1');
        });

        it('EventEmitter - with filter', async function() {
            const ee = new EventEmitterX();
            const signal1$ = new EventSignal(0, {
                description: 'signal from another emitter',
                sourceEmitter: ee,
                sourceEvent: 'test',
                sourceFilter(_eventName, value: number) {
                    return value % 2 === 0;
                },
            });

            expect(signal1$.get()).toBe(0);

            ee.emit('test', 1);

            expect(signal1$.get()).toBe(0);

            ee.emit('test', 2);

            expect(signal1$.get()).toBe(2);

            ee.emit('test', 3);

            expect(signal1$.get()).toBe(2);

            ee.emit('test', 4);

            expect(signal1$.get()).toBe(4);

            signal1$.destructor();

            expect(ee.listenerCount('test')).toBe(0);
        });

        it('EventEmitter - with map and filter', async function() {
            const ee = new EventEmitterX();
            const signal1$ = new EventSignal(0, {
                description: 'signal from another emitter',
                sourceEmitter: ee,
                sourceEvent: [ 'test1', 'test2' ],
                sourceFilter(eventName, value: { data: number }) {
                    if (eventName === 'test1') {
                        return value.data % 2 === 0;
                    }

                    return value.data % 2 === 1;
                },
                sourceMap(_eventName, value: { data: number }) {
                    return value.data;
                },
            });

            expect(signal1$.get()).toBe(0);

            {
                ee.emit('test1', { data: 1 });

                expect(signal1$.get()).toBe(0);

                ee.emit('test2', { data: 1 });

                expect(signal1$.get()).toBe(1);
            }
            {
                ee.emit('test2', { data: 2 });

                expect(signal1$.get()).toBe(1);

                ee.emit('test1', { data: 2 });

                expect(signal1$.get()).toBe(2);
            }
            {
                ee.emit('test1', { data: 3 });

                expect(signal1$.get()).toBe(2);

                ee.emit('test2', { data: 3 });

                expect(signal1$.get()).toBe(3);
            }

            signal1$.destructor();

            expect(ee.listenerCount('test1')).toBe(0);
            expect(ee.listenerCount('test2')).toBe(0);
        });

        it('EventEmitter - event without arguments', async function() {
            const now = new Date('2025-11-29T23:57:32.781Z').getTime();
            const clock = useFakeTimers(now);

            const ee = new EventEmitterX();
            const computed$ = new EventSignal(0, () => {
                return Date.now();
            }, {
                description: 'now time',
                sourceEmitter: ee,
                sourceEvent: 'update-time',
                data: { test: 1 },
            });

            const now1 = computed$.get();

            setSystemTime(now + 7000);

            expect(now1).toBe(computed$.get());

            ee.emit('update-time');

            const now2 = computed$.get();

            expect(now2).not.toBe(now1);
            expect(now2).toBe(computed$.get());

            computed$.destructor();

            expect(ee.listenerCount('update-time')).toBe(0);

            clock.restore();
        });
    });

    describe('with computation', function() {
        it('computation value', function() {
            const number$ = new EventSignal(0);
            const template$ = new EventSignal('Number value is #{number}');
            const string$ = new EventSignal('', () => {
                return template$.get().replaceAll('#{number}', number$.get().toString());
            });

            expect(string$.get()).toBe('Number value is 0');

            number$.set(1);

            expect(string$.get()).toBe('Number value is 1');
            expect(string$.version).toBe(2);
            expect(string$.get()).toBe('Number value is 1');
            expect(string$.version).toBe(2);

            template$.set('Value is: #{number}');

            expect(string$.get()).toBe('Value is: 1');

            number$.set(2);

            expect(string$.get()).toBe('Value is: 2');
        });

        it('EventEmitter - complex: computation with options.[sourceMap/sourceFilter]', async function() {
            const ee = new EventEmitterX();
            const kSomeEvent = Symbol('kSomeEvent');
            const signal$ = new EventSignal(0, {
                description: '$signal',
            });
            const complexSignal$ = new EventSignal<string, number>('', (prevValue, sourceValue) => {
                void prevValue;
                void sourceValue;

                const sValue = signal$.get();

                if (typeof sourceValue === 'number' && sourceValue % 2 === 0) {
                    return `was even, new value is ${sValue}, sourceValue is ${sourceValue}`;
                }

                return String(sValue);
            }, {
                description: 'signal from another emitter with deps',
                sourceEmitter: ee,
                sourceEvent: [ 'test1', 2, kSomeEvent ],
                sourceFilter(eventName, value: number | string | { data: number }) {
                    if (eventName === 'test1') {
                        const _value = (value as { data: number });

                        return _value.data % 2 === 0;
                    }

                    if (eventName === kSomeEvent) {
                        return Number.parseInt(value as string, 16) % 2 === 0;
                    }

                    return (value as number) % 2 === 0;
                },
                sourceMap(eventName, value: number | string | { data: number }) {
                    if (eventName === 'test1') {
                        const _value = (value as { data: number });

                        return _value.data;
                    }

                    if (eventName === kSomeEvent) {
                        return Number.parseInt(value as string, 16);
                    }

                    return (value as number);
                },
            });

            expect(complexSignal$.get()).toBe('0');

            // should ignore this event
            ee.emit('test1', { data: 1 });

            expect(complexSignal$.get()).toBe('0');

            ee.emit('test1', { data: 2 });

            expect(complexSignal$.get()).toBe('was even, new value is 0, sourceValue is 2');

            signal$.set(1);

            expect(complexSignal$.get()).toBe('was even, new value is 1, sourceValue is 2');

            ee.emit(2, 222);

            expect(complexSignal$.get()).toBe('was even, new value is 1, sourceValue is 222');

            ee.emit(2, 3);

            expect(complexSignal$.get()).toBe('was even, new value is 1, sourceValue is 222');

            ee.emit(2, 8);

            expect(complexSignal$.get()).toBe('was even, new value is 1, sourceValue is 8');

            ee.emit(kSomeEvent, (562).toString(16));

            expect(complexSignal$.get()).toBe('was even, new value is 1, sourceValue is 562');

            ee.emit('test1', { data: 2 });

            expect(complexSignal$.get()).toBe('was even, new value is 1, sourceValue is 2');

            signal$.set(32);

            expect(complexSignal$.get()).toBe('was even, new value is 32, sourceValue is 2');

            complexSignal$.set(333);

            expect(complexSignal$.get()).toBe('32');

            const currentVersion = complexSignal$.version;

            complexSignal$.set(400);

            expect(complexSignal$.version).toBe(currentVersion);
            expect(complexSignal$.get()).toBe('was even, new value is 32, sourceValue is 400');
            expect(complexSignal$.version).toBe(currentVersion + 1);

            // Unread sourceValue just before destructor will be ignored
            complexSignal$.set(777);

            complexSignal$.destructor();

            ee.emit(2, 8);
            signal$.set(100);

            expect(complexSignal$.get()).toBe('was even, new value is 32, sourceValue is 400');

            expect(ee.listenerCount('test1')).toBe(0);
            expect(ee.listenerCount(2)).toBe(0);
            expect(ee.listenerCount(kSomeEvent)).toBe(0);
            expect(__test__signalEventsEmitter.listenerCount(signal$.eventName)).toBe(0);
        });

        it('computation value - return object', function() {
            const object$ = new EventSignal<{ numericValue: number }, number>({ numericValue: 0 }, (object, sourceValue, eventSignal) => {
                if (sourceValue != null) {
                    object.numericValue = sourceValue;

                    eventSignal.markNextValueAsForced();

                    return object;
                }
            });

            expect(object$.get().numericValue).toBe(0);
            expect(object$.version).toBe(0);
            expect(object$.computationsCount).toBe(1);

            object$.set(1);

            expect(object$.get().numericValue).toBe(1);
            expect(object$.version).toBe(1);
            expect(object$.computationsCount).toBe(2);
            expect(object$.get().numericValue).toBe(1);

            object$.set(1);

            expect(object$.get().numericValue).toBe(1);
            expect(object$.version).toBe(1);
            expect(object$.computationsCount).toBe(2);
        });

        it('computation value #2', function() {
            const counter$ = new EventSignal(0, {
                description: 'counter1$',
                data: {
                    title: `Счетчик`,
                },
            });
            // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
            // @ts-ignore fixme: [TYPINGS / typings] Fix types for this case
            const computed1$ = new EventSignal('', (_prev, sourceValue, eventSignal) => {
                if ((eventSignal.getStateFlags() & EventSignal.StateFlags.wasSourceSetting) !== 0) {
                    counter$.set(sourceValue);
                }

                return `Значение = ${counter$.get()}`;
            }, {
                initialSourceValue: counter$.get(),
                data: {
                    title: `test`,
                    _: {
                        increment(arg = 1) {
                            counter$.set(v => v + arg);
                        },
                        decrement(arg = 1) {
                            counter$.set(v => v - arg);
                        },
                    },
                },
            });

            expect(computed1$.get()).toBe(`Значение = 0`);

            computed1$.set(777);

            expect(counter$.get()).toBe(0);
            expect(computed1$.get()).toBe(`Значение = 777`);
            expect(counter$.get()).toBe(777);
            expect(counter$.data).toBeDefined();
            expect(counter$.data.title).toBeDefined();
            expect(computed1$.data).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
            // @ts-ignore fixme: [TYPINGS / typings] Fix types for this case
            expect(computed1$.data.title).toBeDefined();
        });
    });

    // todo: Async computation is experimental!
    describe('with async computation', function() {
        it('async computation1', async function() {
            const usersStore = new UsersStore(new EventEmitterX(), defaultUsers);
            const user1 = usersStore.getUserSync(1);
            const user2 = usersStore.getUserSync(2);

            usersStore.resetLastAsyncGetUser();

            expect(user1).toBeDefined();
            expect(user2).toBeDefined();

            const currentUser$ = new EventSignal<UserOrNull, number>(Promise.resolve(null), async (_, userId) => {
                expect((_ as unknown as Promise<any>)?.then).toBeUndefined();

                return await usersStore.getUser(userId);
            });

            expect(usersStore.lastAsyncGetUser).toBeUndefined();

            await Promise.resolve();
            await Promise.resolve();

            expect(usersStore.lastAsyncGetUser).toBeUndefined();

            const promise = currentUser$.get();

            expect(await promise).toBeNull();

            expect(usersStore.lastAsyncGetUser).toBeUndefined();

            currentUser$.set(1);

            expect(await currentUser$.get()).toBe(user1);
            expect(usersStore.lastAsyncGetUser).toBe(1);
            expect(currentUser$.computationsCount).toBe(2);

            usersStore.resetLastAsyncGetUser();

            expect(await currentUser$.get()).toBe(user1);
            expect(usersStore.lastAsyncGetUser).toBeUndefined();
            expect(currentUser$.computationsCount).toBe(2);
            expect(currentUser$.version).toBe(1);

            // set to same value
            currentUser$.set(1);

            expect(await currentUser$.get()).toBe(user1);
            expect(currentUser$.computationsCount).toBe(2);
            expect(currentUser$.version).toBe(1);

            queueMicrotask(() => {
                queueMicrotask(() => {
                    currentUser$.set(2);
                });
            });

            expect(await currentUser$.toPromise()).toBe(user2);
            expect(currentUser$.computationsCount).toBe(3);
            expect(currentUser$.version).toBe(2);

            currentUser$.set(1);

            expect(await currentUser$.get()).toBe(user1);
            expect(currentUser$.computationsCount).toBe(4);
            expect(currentUser$.version).toBe(3);

            currentUser$.set(2);

            expect(await currentUser$.get()).toBe(user2);
            expect(currentUser$.computationsCount).toBe(5);
            expect(currentUser$.version).toBe(4);
        });

        it('async computation2', async function() {
            const usersStore = new UsersStore(new EventEmitterX(), defaultUsers);
            const currentUser$ = new EventSignal<UserOrNull, number>(null, (prevValue, userId, eventSignal) => {
                if (eventSignal.computationsCount < 3) {
                    if (prevValue !== null) {
                        throw new Error('On first computation in this case, prev value should be null');
                    }
                }
                else {
                    assertIsDefined(prevValue);
                }

                // note: `usersStore.getUser` is async function
                return usersStore.getUser(userId);
            });
            const user1 = usersStore.getUserSync(1);
            const user2 = usersStore.getUserSync(2);

            expect(user1).toBeDefined();
            expect(user2).toBeDefined();

            const promise = currentUser$.get();

            expect(await promise).toBeNull();

            currentUser$.set(1);

            expect(await currentUser$.get()).toBe(user1);

            currentUser$.set(2);

            expect(await currentUser$.get()).toBe(user2);
        });

        it('async computation3', async function() {
            const usersStore = new UsersStore(new EventEmitterX(), defaultUsers);
            const currentUser$ = new EventSignal(null as unknown as UserOrNull, (prevValue, userId, eventSignal) => {
                if (eventSignal.computationsCount < 3) {
                    if (prevValue !== null) {
                        throw new Error('On first computation in this case, prev value should be null');
                    }
                }
                else {
                    assertIsDefined(prevValue);
                }

                // note: `usersStore.getUser` is async function
                return usersStore.getUser(userId);
            }, {
                initialSourceValue: 0,
            });
            const user1 = usersStore.getUserSync(1);
            const user2 = usersStore.getUserSync(2);

            expect(user1).toBeDefined();
            expect(user2).toBeDefined();

            const promise = currentUser$.get();

            expect(await promise).toBeNull();

            currentUser$.set(1);

            expect(await currentUser$.get()).toBe(user1);

            currentUser$.set(2);

            expect(await currentUser$.get()).toBe(user2);
        });

        it('async computation with "pendingValue"', async function() {
            const async$ = new EventSignal('', (_v, num) => {
                const promise = new Promise<string>(resolve => {
                    setTimeout(() => {
                        resolve(`test ${num + 100}`);
                    });
                }) as Promise<string> & { pendingValue: string };

                // todo: ЭТО ДРАФТ, он может быть ПЕРЕДЕЛАН.
                //  Может быть заменить на eventSignal.setPendingValue (и eventSignal.getPendingValue)?
                //  Или просто в редактируемое свойство eventSignal.pendingValue?
                //  И добавить eventSignal.pendingHint (string)?
                promise["pendingValue"] = `test ${num}`;

                return promise;
            }, {
                initialSourceValue: 0,
                data: {
                    test: 123,
                },
            });

            expect(async$.data).toBeDefined();
            expect(async$.getLast()).toBe(``);

            const promise = async$.get();

            expect((promise as unknown) instanceof Promise<string>).toBeTruthy();

            const pendingValue = async$.getSync();

            expect(pendingValue).toBe(`test 0`);
            expect(async$.getLast()).toBe(`test 0`);
            expect(async$.getSync()).toBe(`test 0`);
            expect(await promise).toBe(`test 100`);
            expect(async$.getLast()).toBe(`test 100`);
            expect(async$.getSync()).toBe(`test 100`);

            async$.set(2);

            expect(async$.getLast()).toBe(`test 100`);
            expect(async$.getSync()).toBe(`test 2`);
            expect(await async$.get()).toBe(`test 102`);
            expect(async$.getLast()).toBe(`test 102`);
            expect(async$.getSync()).toBe(`test 102`);
        });

        it('should run new async computation if current computation is not finished and all pending promises should resolve with last value', async function() {
            const clock = useFakeTimers();

            const usersStore = new UsersStore(new EventEmitterX(), defaultUsers);

            const currentUser$ = new EventSignal(null as unknown as UserOrNull, async (_prev, userId, eventSignal) => {
                expect((_prev as unknown as Promise<any>)?.then).toBeUndefined();

                eventSignal.data.ac.abort();
                eventSignal.data.ac = new AbortController();

                return userId ? usersStore.getUser(userId, {
                    delay: HOURS,
                    signal: eventSignal.data.ac.signal,
                }) : null;
            }, {
                initialSourceValue: 0,
                data: {
                    ac: new AbortController(),
                },
            });

            const nullValue = await currentUser$.get();

            expect(nullValue).toBeNull();
            expect(currentUser$.getSourceValue()).toBe(0);

            currentUser$.set(1);

            const promise1_2 = currentUser$.get();
            const promise1_3 = currentUser$.get();

            await advanceTimersByTimeAsync(HOURS);

            const currentUser1 = await promise1_2;

            assertIsDefined(currentUser1);
            expect(currentUser1.id).toBe(1);
            expect(await promise1_3).toBe(currentUser1);
            expect(await currentUser$.get()).toBe(currentUser1);

            currentUser$.set(2);

            const promise2 = currentUser$.get();

            await realSleep();

            currentUser$.set(3);

            const promise3_1 = currentUser$.get();
            const promise3_2 = currentUser$.toPromise();

            await advanceTimersByTimeAsync(HOURS);

            const currentUser3 = await currentUser$.get();

            expect(currentUser$.getSourceValue()).toBe(3);
            assertIsDefined(currentUser3);
            expect(currentUser3.id).toBe(3);
            expect(await promise2).toBe(currentUser3);
            expect(await promise3_1).toBe(currentUser3);
            expect(await promise3_2).toBe(currentUser3);

            clock.restore();
        });

        // todo: Async error handling
        // describe('error handling', () => {
        //
        // });
    });

    describe('types', () => {
        it('sync', async function() {
            const number$ = new EventSignal(0);
            const numberWithData_null$ = new EventSignal(0, {
                data: null,
            });
            const numberWithData_string$ = new EventSignal(0, {
                data: 'test',
            });
            const numberWithData_object$ = new EventSignal(0, {
                data: {
                    test: 1,
                },
            });
            // eslint-disable-next-line jest/no-commented-out-tests
            /* fixme: [TYPINGS / typings]
                * see [Bug with type argument inference if it has default value = undefined and actual value is object with non-arrow function #62995](https://github.com/microsoft/TypeScript/issues/62995)
                * see [Improve inference in the presence of context-sensitive expressions #47599](https://github.com/microsoft/TypeScript/issues/47599)
            const numberWithData_object2$ = new EventSignal(0, {
                data: {
                    test() {
                        return 123;
                    },
                },
            });
            */
            const numberWithData_object3$ = new EventSignal(0, {
                data: {
                    test: () => {
                        return 123;
                    },
                },
            });
            const string$ = new EventSignal('');
            const stringWithFinaleValue$ = new EventSignal('', {
                finaleValue: 'finale',
            });
            const computed1$ = new EventSignal(0, (prev, source, eventSignal) => {
                void prev;
                void source;
                void eventSignal;

                return number$.get() + 1000;
            }, {
                deps: [ string$ ],
            });
            const computedWithData2$ = new EventSignal(0, (prev, source, eventSignal) => {
                void prev;
                void source;
                void eventSignal;

                const value = number$.get();

                if (_isEvenNumber(value)) {
                    return value + string$.get().length;
                }

                return number$.get() + 1000;
            }, {
                deps: [ string$ ],
                data: { test: 1 },
            });
            const computedWithData3$ = new EventSignal(0, (prev, _, eventSignal) => {
                void eventSignal;

                return prev + 1;
            }, {
                data: { a: 1, testMethod },
            });
            const computedWithData3$Data = computedWithData3$.data;
            const computedWithData4$ = new EventSignal(0, (prev, _, eventSignal) => {
                void eventSignal;

                return prev + 1;
            }, {
                data: {
                    a: 1,
                    testMethod(this: { a: number }) {
                        return this.a;
                    },
                },
            });
            /*
            // fixme: Так почему-то нельзя: не выводить this автоматически и/или ломается типизация
            const computedWithData5$ = new EventSignal(0, (prev, _, eventSignal) => {
                void eventSignal;

                return prev + 1;
            }, {
                data: {
                    a: 1,
                    testMethod() {
                        return this.a;
                    },
                },
            });
            */
            const data = {
                a: 1,
                testMethod(this: { a: number }) {
                    return this.a;
                },
            };
            const computedWithData6$ = new EventSignal(0, (prev, _, eventSignal) => {
                void eventSignal;

                return prev + 1;
            }, {
                data,
            });

            function testMethod(this: { a: number }) {
                return this.a;
            }

            void [
                number$,
                numberWithData_null$,
                numberWithData_string$,
                numberWithData_object$,
                //fixme: numberWithData_object2$,
                numberWithData_object3$,

                string$,
                stringWithFinaleValue$,

                computed1$,
                computedWithData2$,
                computedWithData3$,
                computedWithData3$Data,
                computedWithData4$,
                computedWithData6$,
                computedWithData6$.data,
            ];

            expect(typeof number$.get()).toBe('number');

            stringWithFinaleValue$.destructor();

            expect(stringWithFinaleValue$.get()).toBe('finale');
            expect(computedWithData3$Data.testMethod()).toBe(1);
            expect(computedWithData4$.data.testMethod()).toBe(1);
            expect(computedWithData6$.data.testMethod()).toBe(1);
        });

        it('async computed', async function() {
            const number$ = new EventSignal(0);
            const string$ = new EventSignal('');
            // fixme: [TYPINGS / typings] remove ` as unknown as Promise<number>`
            const asyncComputed1$ = new EventSignal(0 as unknown as Promise<number>, async (prev, source, eventSignal) => {
                void prev;
                void source;
                void eventSignal;

                return number$.get() + 1000;
            }, {
                deps: [ string$ ],
            });
            const asyncComputed1$Value = asyncComputed1$.get();
            const asyncComputedWithData1$ = new EventSignal(0 as unknown as Promise<number>, async (prev, source, eventSignal) => {
                void prev;
                void source;
                void eventSignal;

                const value = number$.get();

                if (_isEvenNumber(value)) {
                    return value + string$.get().length;
                }

                return number$.get() + 1000;
            }, {
                deps: [ string$ ],
                data: { test: 1 },
            });
            const asyncComputedWithData1$Value = asyncComputedWithData1$.get();
            const usersStore = new UsersStore(new EventEmitterX(), defaultUsers);
            const asyncComputed2$ = new EventSignal(null as unknown as UserOrNull, async (_, userId) => {
                return await usersStore.getUser(userId);
            }, {
                initialSourceValue: 0,
                componentType: 1,
                description: '',
                // todo: Убрать отсюда ` as Awaited<UserOrNull>`
                finaleValue: null as Awaited<UserOrNull>,
                finaleSourceValue: 0,
            });
            const asyncComputedWithData3$ = new EventSignal(null as unknown as UserOrNull, async (_, userId) => {
                return await usersStore.getUser(userId);
            }, {
                initialSourceValue: 0,
                componentType: 1,
                description: '',
                // todo: Убрать отсюда ` as Awaited<UserOrNull>`
                finaleValue: null as Awaited<UserOrNull>,
                finaleSourceValue: 0,
                data: { test: 'test' },
            });
            // eslint-disable-next-line jest/no-commented-out-tests
            /*
            // fixme: [TYPINGS / typings] Что-то не так с типизацией `data`.
            //  Возможно, из-за того, что TypeScript не даёт лиш частично заполнить список Generic и подставляет в D значение undefined, если хоть один generic задан явно.
            const asyncComputedWithData4$ = new EventSignal<UserOrNull, number>(null as unknown as UserOrNull, async (_, userId) => {
                return await usersStore.getUser(userId);
            }, {
                initialSourceValue: 0,
                componentType: 1,
                description: '',
                // todo: Убрать отсюда ` as Awaited<UserOrNull>`
                finaleValue: null as Awaited<UserOrNull>,
                finaleSourceValue: 123,
                data: null,
            });
            */
            const asyncComputed5$ = new EventSignal('', (_v, num) => {
                void _v;
                //   ^?
                void num;
                //   ^?

                const promise = new Promise<string>(resolve => {
                    queueMicrotask(() => {
                        resolve(`test ${num + 1}`);
                    });
                }) as Promise<string> & { pendingValue: string };

                promise["pendingValue"] = `test ${num}`;

                return promise as Promise<string>;
            }, {
                initialSourceValue: 0,
            });
            const asyncComputed5$Value = asyncComputed5$.get();
            /*
            // fixme: Добавление eventSignal в computation ломает типизацию
            const asyncComputed6$ = new EventSignal('', (_v, num, eventSignal) => {
                void _v;
                //   ^?
                void num;
                //   ^?
                void eventSignal;
                //   ^?

                const promise = new Promise<string>(resolve => {
                    queueMicrotask(() => {
                        resolve(`test ${num + 1}`);
                    });
                }) as Promise<string> & { pendingValue: string };

                promise["pendingValue"] = `test ${num}`;

                return promise as Promise<string>;
            }, {
                initialSourceValue: 0,
            });
            const asyncComputed6$Value = asyncComputed6$.get();
            */
            const asyncComputed7$ = new EventSignal('', async (_v, num) => {
                const promise = new Promise<string>(resolve => {
                    queueMicrotask(() => {
                        resolve(`test ${num + 1}`);
                    });
                }) as Promise<string> & { pendingValue: string };

                promise["pendingValue"] = `test ${num}`;

                return promise as Promise<string>;
            }, {
                initialSourceValue: 0,
            });
            const asyncComputed7$Value = asyncComputed5$.get();
            // fixme: [TYPINGS / typings]: Если убрать ` as unknown as Promise<string>` то ломается типизация
            const asyncComputed8$ = new EventSignal('' as unknown as Promise<string>, async (_v, num, eventSignal) => {
                void eventSignal;

                const promise = new Promise<string>(resolve => {
                    queueMicrotask(() => {
                        resolve(`test ${num + 1}`);
                    });
                }) as Promise<string> & { pendingValue: string };

                promise["pendingValue"] = `test ${num}`;

                return promise as Promise<string>;
            }, {
                initialSourceValue: 0,
                data: {
                    test: 123,
                },
            });
            const asyncComputed8$Value = asyncComputed5$.get();

            void [
                asyncComputed1$,
                asyncComputed1$Value,
                asyncComputedWithData1$,
                asyncComputedWithData1$.data,
                asyncComputedWithData1$Value,
                asyncComputed2$,
                asyncComputedWithData3$,
                asyncComputedWithData3$.data,
                // fixme: asyncComputedWithData4$,
                asyncComputed5$,
                asyncComputed5$Value,
                // fixme: asyncComputed6$,
                // fixme: asyncComputed6$Value,
                asyncComputed7$,
                asyncComputed7$Value,
                asyncComputed8$,
                asyncComputed8$Value,
            ];

            expect(typeof asyncComputed1$Value).toBe('object');
            expect(typeof asyncComputed1$Value.then).toBe('function');
            expect(typeof await asyncComputed1$Value).toBe('number');
            expect(typeof asyncComputed5$Value).toBe('object');
            expect(typeof asyncComputed5$Value.then).toBe('function');
            expect(typeof await asyncComputed5$Value).toBe('string');
            expect(typeof asyncComputed7$Value).toBe('object');
            expect(typeof asyncComputed7$Value.then).toBe('function');
            expect(typeof await asyncComputed7$Value).toBe('string');
        });
    });

    it('Dynamic dependencies', () => {
        const states = Array.from('abcdefgh').map((s) => createSignal(s));
        const sources$ = new EventSignal(states);
        const computed$ = new EventSignal('', (_v, _s, eventSignal) => {
            let str = '';

            eventSignal.clearDeps();

            for (const state$ of sources$.get()) {
                str += state$.get();
            }

            return str;
        });

        expect(computed$.get()).toBe('abcdefgh');

        sources$.set(states.slice(0, 5));
        expect(computed$.get()).toBe('abcde');

        sources$.set(states.slice(3));
        expect(computed$.get()).toBe('defgh');

        const currentVersion = computed$.version;

        for (let i = 0, len = 3 ; i < len ; i++) {
            const state$ = states[i];

            // This has no effect to computed$ due computed$ has no subscription for state$[0..3]
            state$?.set(v => v.toUpperCase());
        }

        expect(computed$.get()).toBe('defgh');
        expect(currentVersion).toBe(computed$.version);

        sources$.get()[0]?.set('D');
        expect(computed$.get()).toBe('Defgh');

        // eslint-disable-next-line unicorn/no-array-for-each
        sources$.get().forEach(state$ => { state$.set(v => v.toUpperCase()); });
        expect(computed$.get()).toBe('DEFGH');
    });

    describe('destructor', function() {
        it('seal last value after destruction', () => {
            const source$ = createSignal(0);
            const computed$ = createSignal('', () => {
                return `Value is: ${source$.get()}`;
            });

            expect(computed$.get()).toBe('Value is: 0');

            source$.set(1);
            expect(computed$.get()).toBe('Value is: 1');

            source$.destructor();

            source$.set(2);
            expect(computed$.get()).toBe('Value is: 1');
            expect(source$.get()).toBe(1);
        });

        it('set finaleValue value after destruction #1', () => {
            const source$ = new EventSignal('', {
                description: 'source$',
                finaleValue: '',
            });
            const otherSource$ = new EventSignal(0, (prev, sourceValue) => {
                return sourceValue ?? prev;
            }, {
                description: '$otherSource',
            });
            const computed$ = new EventSignal('', () => {
                return `Source value is: "${source$.get()}" and other source is: ${otherSource$.get()}`;
            }, {
                description: 'computed$',
            });

            expect(computed$.get()).toBe('Source value is: "" and other source is: 0');

            otherSource$.set(1);
            source$.set('test');

            expect(computed$.get()).toBe('Source value is: "test" and other source is: 1');

            source$.destructor();

            expect(computed$.get()).toBe('Source value is: "" and other source is: 1');
            expect(source$.get()).toBe('');

            source$.set('test');
            otherSource$.set(2);

            expect(computed$.get()).toBe('Source value is: "" and other source is: 2');
        });

        it('set finaleValue value after destruction #2', () => {
            type User = {
                firstName: string,
                lastName: string,
                toString: () => string,
            };

            const user: User = {
                firstName: 'John',
                lastName: 'Doe',
                toString() {
                    return `${this.firstName} ${this.lastName}`;
                },
            };

            const user$ = new EventSignal<User | null>(user, {
                description: '$user',
                finaleValue: null,
            });
            const userAge$ = new EventSignal(24, {
                description: '$userAge',
            });
            const computed$ = createSignal('', () => {
                return `Person name is: ${user$.get()} with age=${userAge$.get()}`;
            }, {
                description: 'computed$',
            });

            expect(computed$.get()).toBe('Person name is: John Doe with age=24');
            expect(computed$.version).toBe(1);

            user$.set({
                firstName: 'Joe',
                lastName: 'Blow',
                toString() {
                    return `${this.firstName} ${this.lastName}`;
                },
            });
            userAge$.set(36);

            expect(computed$.get()).toBe('Person name is: Joe Blow with age=36');
            expect(computed$.version).toBe(2);

            user$.destructor();

            expect(computed$.get()).toBe('Person name is: null with age=36');
            expect(user$.get()).toBeNull();
            expect(computed$.version).toBe(3);

            // this set will be ignored
            user$.set(user);

            expect(computed$.get()).toBe('Person name is: null with age=36');
            expect(user$.get()).toBeNull();
            expect(computed$.version).toBe(3);

            // this set will be ignored
            user$.set(user);
            userAge$.set(17);

            expect(computed$.get()).toBe('Person name is: null with age=17');
            expect(computed$.version).toBe(4);
        });
    });

    describe('working with EventEmitter api', function() {
        describe('addListener', function() {
            it('should call listener - sync mode', async () => {
                const firstName$ = new EventSignal('...', {
                    description: 'firstName$',
                });
                const secondName$ = new EventSignal('...', {
                    description: 'secondName$',
                });
                const fullName$ = new EventSignal('', () => {
                    return `${firstName$} ${secondName$}`;
                }, {
                    description: 'fullName$',
                    // subscribe to deps
                    deps: [ firstName$, secondName$ ],
                });
                const names = [
                    { firstName: 'Jon', secondName: 'Dow' },
                    { firstName: 'Rose', secondName: 'Crown' },
                    { firstName: 'Steve', secondName: 'King' },
                ];
                const values: (ReturnType<typeof fullName$.get>)[] = [];
                const listener: Parameters<typeof fullName$.addListener>[0] = newValue => {
                    values.push(newValue);
                };

                fullName$.addListener(listener);

                for (let index = 0 ; index < 3 ; index++) {
                    const { firstName, secondName } = names.at(index)!;

                    firstName$.set(firstName);
                    secondName$.set(secondName);
                }

                // values SHOULD BE empty array due listeners is calling in next microtask
                expect(values).toEqual([]);

                // await next microtask
                await Promise.resolve();

                const lasNameItem = names.at(-1)!;

                expect(values).toEqual([
                    `${lasNameItem.firstName} ${lasNameItem.secondName}`,
                ]);

                fullName$.removeListener(listener);

                expect(__test__subscribersEventsEmitter.listenerCount(fullName$.eventName)).toBe(0);
            });

            it('should call listener - async mode', async () => {
                const firstName$ = new EventSignal('...', {
                    description: 'firstName$',
                });
                const secondName$ = new EventSignal('...', {
                    description: 'secondName$',
                });
                const fullName$ = new EventSignal('', () => {
                    return `${firstName$} ${secondName$}`;
                }, {
                    description: 'fullName$',
                    // subscribe to deps
                    deps: [ firstName$, secondName$ ],
                });
                const names = [
                    { firstName: 'Jon', secondName: 'Dow' },
                    { firstName: 'Rose', secondName: 'Crown' },
                    { firstName: 'Steve', secondName: 'King' },
                ];
                const values: (ReturnType<typeof fullName$.get>)[] = [];

                fullName$.addListener(newValue => {
                    values.push(newValue);
                });

                for await (const index of _asyncIterator(0, 3)) {
                    const { firstName, secondName } = names.at(index)!;

                    firstName$.set(firstName);
                    secondName$.set(secondName);
                }

                expect(values).toEqual(names.map(({ firstName, secondName }) => {
                    return `${firstName} ${secondName}`;
                }));
            });

            it('should remove all listeners after destroyed', async () => {
                const counter$ = new EventSignal(0);
                const computed$ = new EventSignal('', () => {
                    return `Counter is: ${counter$.get()}`;
                }, {
                    finaleValue: `Counter is: destroyed`,
                });
                const values: (ReturnType<typeof computed$.get>)[] = [];

                expect(__test__signalEventsEmitter.listenerCount(computed$.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount(computed$.eventName)).toBe(0);
                expect(__test__signalEventsEmitter.listenerCount(counter$.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount(counter$.eventName)).toBe(0);

                computed$.addListener(newValue => {
                    values.push(newValue);
                });

                expect(__test__signalEventsEmitter.listenerCount(computed$.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount(computed$.eventName)).toBe(1);
                expect(__test__signalEventsEmitter.listenerCount(counter$.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount(counter$.eventName)).toBe(0);

                // add `Counter is: 0` to values and subscribe to counter$
                computed$.get();

                counter$.set(prev => prev + 1);

                expect(counter$.get()).toBe(1);
                expect(values).toEqual([ `Counter is: 0` ]);

                // add `Counter is: 1` to values
                await Promise.resolve();

                expect(__test__signalEventsEmitter.listenerCount(computed$.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount(computed$.eventName)).toBe(1);
                expect(__test__signalEventsEmitter.listenerCount(counter$.eventName)).toBe(1);
                expect(__test__subscribersEventsEmitter.listenerCount(counter$.eventName)).toBe(0);

                expect(counter$.get()).toBe(1);
                expect(values).toEqual([ `Counter is: 0`, `Counter is: 1` ]);

                // add `Counter is: destroyed` to values synchronously
                computed$.destructor();

                expect(__test__signalEventsEmitter.listenerCount(computed$.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount(computed$.eventName)).toBe(0);
                expect(__test__signalEventsEmitter.listenerCount(counter$.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount(counter$.eventName)).toBe(0);

                // `Counter is: destroyed` already should be in values BEFORE calling computed$.get()
                expect(values).toEqual([ `Counter is: 0`, `Counter is: 1`, `Counter is: destroyed` ]);
                expect(computed$.get()).toBe(`Counter is: destroyed`);
            });

            it('should recalculate new value and call listener in next tick - 1', async () => {
                const counter$ = new EventSignal(0);
                const computed$ = new EventSignal('', function() {
                    return `test-${counter$.get()}`;
                });
                let counter1 = 0;

                counter$.addListener(() => {
                    counter1++;
                });

                counter$.set(v => ++v);

                expect(counter1).toBe(0);

                // await next microtask
                await Promise.resolve();

                // fixme: [tag: SUBSCRIPTIONS_ON_NEW_VALUE] В тесте ниже мы подписываемся не на counter$, а на computed$
                //  и наша логика ломается. Так быть не должно.
                expect(counter1).toBe(1);
                expect(computed$.get()).toBe(`test-1`);

                counter$.set(v => ++v);

                expect(counter1).toBe(1);

                // await next microtask
                await Promise.resolve();

                expect(counter1).toBe(2);
                expect(computed$.get()).toBe(`test-2`);
            });

            it('should recalculate new value and call listener in next tick - 2', async () => {
                const counter$ = new EventSignal(0);
                const computed$ = new EventSignal('', function() {
                    return `test-${counter$.get()}`;
                });
                let counter2 = 0;

                computed$.addListener(() => {
                    counter2++;
                });

                counter$.set(v => ++v);

                expect(counter2).toBe(0);

                // await next microtask
                await Promise.resolve();

                // fixme: [tag: SUBSCRIPTIONS_ON_NEW_VALUE] Мы должны тут получать новые значения, потому что мы
                //  подписались на сигнал, который зависит от изменяемого сигнала.
                void counter2;
                /*
                expect(counter2).toBe(1);

                counter$.set(v => ++v);

                expect(counter2).toBe(1);

                // await next microtask
                await Promise.resolve();

                expect(counter2).toBe(2);
                */
            });

            it('should recalculate new value and call listener in next tick - 3', async () => {
                const counter$ = new EventSignal(0);
                const computed$ = new EventSignal('', function() {
                    return `test-${counter$.get()}`;
                });
                let counter1 = 0;
                let counter2 = 0;

                counter$.addListener(() => {
                    counter1++;
                });
                computed$.addListener(() => {
                    counter2++;
                });

                counter$.set(v => ++v);

                expect(counter1).toBe(0);
                expect(counter2).toBe(0);

                // await next microtask
                await Promise.resolve();

                expect(counter1).toBe(1);
                // fixme: [tag: SUBSCRIPTIONS_ON_NEW_VALUE] Мы должны тут получать новые значения, потому что мы
                //  подписались на сигнал, который зависит от изменяемого сигнала.
                void counter2;
                /*
                expect(counter2).toBe(1);

                counter$.set(v => ++v);

                expect(counter2).toBe(1);

                // await next microtask
                await Promise.resolve();

                expect(counter2).toBe(2);
                */
            });
        });

        describe('once', function() {
            it('should work with once', async () => {
                const source$ = new EventSignal(0);
                const computed$ = new EventSignal('', () => {
                    return `Value is: ${source$.get()}`;
                });
                const promise_for_$source = nodeOnce(source$, '');
                const promise_for_$computed = once(computed$, '');

                expect(computed$.get()).toBe('Value is: 0');

                const [ valueFromCompute ] = await promise_for_$computed;

                expect(valueFromCompute).toBe('Value is: 0');

                source$.set(1);
                expect(computed$.get()).toBe('Value is: 1');

                const [ valueFromSource ] = await promise_for_$source;

                expect(valueFromSource).toBe(1);

                source$.destructor();

                source$.set(2);
                expect(computed$.get()).toBe('Value is: 1');
                expect(source$.get()).toBe(1);
            });
        });

        describe('on', function() {
            it('should work with nodejs.events.on *1', async () => {
                const source$ = new EventSignal(0, {
                    description: 'source$',
                });
                const computed$ = new EventSignal('', () => {
                    return `Value is: ${source$.get()}`;
                }, {
                    description: 'computed$',
                });

                // subscribe to deps
                computed$.get();

                queueMicrotask(async () => {
                    for await (const index of _asyncIterator(0, 3)) {
                        source$.set(index);
                    }

                    computed$.destructor();
                });

                let index = 1;

                for await (const [ value ] of nodeOn(computed$ as unknown as EventEmitter, '')) {
                    expect(value).toBe(`Value is: ${index++}`);

                    // todo: Сейчас нет "правильного" способа остановить asyncIterator генерируемый events.on.
                    //  Нужно что-то придумать.
                    if (index === 2) {
                        break;
                    }
                }
            });

            it('should work with nodejs.events.on *2', async () => {
                const firstName$ = new EventSignal('...', {
                    description: 'firstName$',
                });
                const secondName$ = new EventSignal('...', {
                    description: 'secondName$',
                });
                const fullName$ = new EventSignal('', () => {
                    return `${firstName$} ${secondName$}`;
                }, {
                    description: 'fullName$',
                    // subscribe to deps
                    deps: [ firstName$, secondName$ ],
                    data: 0,
                });
                const names = [
                    { firstName: 'Jon', secondName: 'Dow' },
                    { firstName: 'Rose', secondName: 'Crown' },
                    { firstName: 'Steve', secondName: 'King' },
                ];

                queueMicrotask(async () => {
                    for await (const index of _asyncIterator(0, 3)) {
                        const { firstName, secondName } = names.at(index)!;

                        firstName$.set(firstName);
                        secondName$.set(secondName);
                    }

                    fullName$.destructor();
                });

                const values: (ReturnType<typeof fullName$.get>)[] = [];

                for await (const [ value ] of nodeOn(fullName$ as unknown as EventEmitter, '')) {
                    assertIsString(value);

                    values.push(value);

                    fullName$.data++;

                    // todo: Сейчас нет "правильного" способа остановить asyncIterator генерируемый events.on.
                    //  Нужно что-то придумать.
                    if (fullName$.data === 3) {
                        break;
                    }
                }

                expect(values).toEqual(names.map(({ firstName, secondName }) => {
                    return `${firstName} ${secondName}`;
                }));
            });

            it('should work with EventEmitterX.on *1', async () => {
                const source$ = new EventSignal(0, {
                    description: 'source$',
                });
                const computed$ = new EventSignal('', () => {
                    return `Value is: ${source$.get()}`;
                }, {
                    description: 'computed$',
                });

                // subscribe to deps
                computed$.get();

                queueMicrotask(async () => {
                    for await (const index of _asyncIterator(0, 5)) {
                        source$.set(index);
                    }

                    computed$.destructor();
                });

                const values: string[] = [];
                let index = 1;

                for await (const [ value ] of on(computed$, '')) {
                    expect(value).toBe(`Value is: ${index++}`);

                    assertIsString(value);

                    values.push(value);

                    // todo: Сейчас нет "правильного" способа остановить asyncIterator генерируемый EventEmitterX.on.
                    //  Нужно что-то придумать.
                    if (index === 5) {
                        break;
                    }
                }

                expect(values).toEqual([
                    'Value is: 1',
                    'Value is: 2',
                    'Value is: 3',
                    'Value is: 4',
                ]);
            });

            it('should work with EventEmitterX.on *2', async () => {
                const firstName$ = new EventSignal('...', {
                    description: 'firstName$',
                });
                const secondName$ = new EventSignal('...', {
                    description: 'secondName$',
                });
                const fullName$ = new EventSignal('', () => {
                    return `${firstName$} ${secondName$}`;
                }, {
                    description: 'fullName$',
                    // subscribe to deps
                    deps: [ firstName$, secondName$ ],
                    data: 0,
                });
                const names = [
                    { firstName: 'Jon', secondName: 'Dow' },
                    { firstName: 'Rose', secondName: 'Crown' },
                    { firstName: 'Steve', secondName: 'King' },
                ];

                queueMicrotask(async () => {
                    for await (const index of _asyncIterator(0, 3)) {
                        const { firstName, secondName } = names.at(index)!;

                        firstName$.set(firstName);
                        secondName$.set(secondName);
                    }

                    fullName$.destructor();
                });

                const values: (ReturnType<typeof fullName$.get>)[] = [];

                for await (const [ value ] of on(fullName$, '')) {
                    assertIsString(value);

                    values.push(value);

                    fullName$.data++;

                    // todo: Сейчас нет "правильного" способа остановить asyncIterator генерируемый events.on.
                    //  Нужно что-то придумать.
                    if (fullName$.data === 3) {
                        break;
                    }
                }

                expect(values).toEqual(names.map(({ firstName, secondName }) => {
                    return `${firstName} ${secondName}`;
                }));
            });
        });
    });

    describe('working with AbortController api', function() {
        it('AbortController#abort() should lead to call EventSignal#destructor', async () => {
            const ac = new AbortController();
            const source$ = new EventSignal(0);
            const computed$ = new EventSignal('', () => {
                return `Value is: ${source$.get()}`;
            }, {
                signal: ac.signal,
            });

            expect(getEventListeners(ac.signal, 'abort')).toHaveLength(1);

            expect(computed$.get()).toBe('Value is: 0');

            source$.set(1);

            expect(computed$.get()).toBe('Value is: 1');
            expect(source$.get()).toBe(1);

            ac.abort(null);

            source$.set(2);

            expect(computed$.get()).toBe('Value is: 1');
            expect(source$.get()).toBe(2);

            expect(getEventListeners(ac.signal, 'abort')).toHaveLength(0);
        });

        it('ProgressControllerX#abort() should lead to call EventSignal#destructor', async () => {
            const ab = new ProgressControllerX();
            const source$ = new EventSignal(0);
            const computed$ = new EventSignal('', () => {
                return `Value is: ${source$.get()}`;
            }, {
                signal: ab.signal,
            });

            expect(getEventListeners(ab.signal, 'abort')).toHaveLength(1);

            expect(computed$.get()).toBe('Value is: 0');

            source$.set(1);

            expect(computed$.get()).toBe('Value is: 1');
            expect(source$.get()).toBe(1);

            ab.abort(null);

            source$.set(2);

            expect(computed$.get()).toBe('Value is: 1');
            expect(source$.get()).toBe(2);

            expect(getEventListeners(ab.signal, 'abort')).toHaveLength(0);
        });
    });

    describe('working as AsyncIterable', function() {
        it('should work with for-await-of', async () => {
            const source$ = new EventSignal(0, {
                description: 'source$',
            });
            const computed$ = new EventSignal('', () => {
                return `Value is: ${source$.get()}`;
            }, {
                description: 'computed$',
            });

            // subscribe to deps
            computed$.get();

            queueMicrotask(async () => {
                for await (const index of _asyncIterator(0, 5)) {
                    // index === 0 will not trigger change event due it's the same value as initial
                    source$.set(index);

                    // Если не будет столько ожидания `Promise.resolve()`, то `computed$.destructor()` выполниться
                    //  слишком рано относительно `for await (const value of computed$)`.
                    await Promise.resolve();
                    await Promise.resolve();
                    await Promise.resolve();
                }

                computed$.destructor();
            });

            const values: string[] = [];

            for await (const value of computed$) {
                expect(value).toContain(`Value is: `);

                assertIsString(value);

                values.push(value);
            }

            expect(values).toEqual([
                'Value is: 1',
                'Value is: 2',
                'Value is: 3',
                'Value is: 4',
            ]);
        });

        it('should handle destructor as iterator stop with for-await-of', async () => {
            const source$ = new EventSignal(0, {
                description: 'source$',
            });
            const computed$ = new EventSignal('', () => {
                return `Value is: ${source$.get()}`;
            }, {
                description: 'computed$',
            });

            // subscribe to deps
            computed$.get();

            queueMicrotask(async () => {
                for await (const index of _asyncIterator(0, 5)) {
                    source$.set(index);
                }

                computed$.destructor();
                /*
                todo: В такой конфигурации:
                 1. Если computed$ резолвит промисы при закрытии: `for await` ниже получит дубликат 'Value is: 3'
                 2. Если computed$ реджектит промисы при закрытии: `for await` упадёт с ошибкой
                queueMicrotask(() => {
                    computed$.destructor();
                });
                */
            });

            const values: string[] = [];

            for await (const value of computed$) {
                assertIsString(value);

                values.push(value);
            }

            // Тут наблюдается эффект "пропуска кадров", когда некоторые изменения значения не попадают в результат
            expect(values).toEqual([
                'Value is: 1',
                'Value is: 4',
            ]);
            // computed$ закрылся ДО запроса самого последнего обновления, поэтому в нём НЕ самое последнее значение из source$
            expect(computed$.get()).toBe('Value is: 4');
            expect(source$.get()).toBe(4);
        });

        it('should handle destructor as iterator stop with for-await-of *2', async () => {
            const source$ = new EventSignal(0, {
                description: 'source$',
            });
            const computed1$ = new EventSignal('', () => {
                return `Value is: ${source$.get()}`;
            }, {
                description: 'computed1$',
            });
            const computed2$ = new EventSignal('', () => {
                return `(2) Value is: ${source$.get()}`;
            }, {
                description: 'computed2$',
                deps: [ source$ ],
            });

            // subscribe to deps
            computed1$.get();

            queueMicrotask(async () => {
                for await (const index of _asyncIterator(0, 10)) {
                    source$.set(index);
                }

                computed1$.destructor();
                computed2$.destructor();
            });

            const values1: string[] = [];
            const values2: string[] = [];

            await Promise.all([
                (async () => {
                    for await (const value of computed1$) {
                        expect(value).toContain(`Value is: `);

                        assertIsString(value);

                        values1.push(value);
                    }
                })(),
                (async () => {
                    for await (const value of computed2$) {
                        expect(value).toContain(`(2) Value is: `);

                        assertIsString(value);

                        values2.push(value);
                    }
                })(),
            ]);

            expect(values1).toEqual([
                'Value is: 1',
                'Value is: 4',
                'Value is: 7',
            ]);

            expect(values2).toEqual([
                '(2) Value is: 1',
                '(2) Value is: 4',
                '(2) Value is: 7',
            ]);

            // computed1$ закрылся ДО запроса самого последнего обновления, поэтому в нём НЕ самое последнее значение из source$
            expect(computed1$.get()).toBe('Value is: 7');
            // computed2$ закрылся ДО запроса самого последнего обновления, поэтому в нём НЕ самое последнее значение из source$
            expect(computed2$.get()).toBe('(2) Value is: 7');
            expect(source$.get()).toBe(9);
        });

        it('should handle destructor as iterator stop with for-await-of *3', async () => {
            const firstName$ = new EventSignal('...', {
                description: 'firstName$',
            });
            const secondName$ = new EventSignal('...', {
                description: 'secondName$',
            });
            const fullName$ = new EventSignal('', () => {
                return `${firstName$} ${secondName$}`;
            }, {
                description: 'fullName$',
                // subscribe to deps
                deps: [ firstName$, secondName$ ],
            });
            const names = [
                { firstName: 'Jon', secondName: 'Dow' },
                { firstName: 'Rose', secondName: 'Crown' },
                { firstName: 'Steve', secondName: 'King' },
            ];

            queueMicrotask(async () => {
                for await (const index of _asyncIterator(0, 3)) {
                    const { firstName, secondName } = names.at(index)!;

                    firstName$.set(firstName);
                    secondName$.set(secondName);
                }

                fullName$.destructor();
            });

            const values: (ReturnType<typeof fullName$.get>)[] = [];

            for await (const value of fullName$) {
                assertIsString(value);

                values.push(value);
            }

            // Только самое первое значение успело посчитаться
            const lasNameItem = names.at(0)!;

            expect(values).toEqual([
                `${lasNameItem.firstName} ${lasNameItem.secondName}`,
            ]);
        });
    });

    // note: Сейчас пока решил откащаться от наличия `.then` в прототипе EventSignal.
    //  Поэтому, для работы с await используется метод `.toPromise`.
    //  Если в будущем, `.then` будет добавлен в прототип EventSignal, то нужно иметь ввиду, что в коде ниже
    //   нужно/можно удалить `.toPromise()` и всё должно работать.
    describe('working as Thenable', function() {
        describe('await with .toPromise()', function() {
            it('should batch: first sync update dependence values - using await', async () => {
                const firstName$ = new EventSignal('Jon');
                const secondName$ = new EventSignal('Dow');
                const fullName$ = new EventSignal('', () => {
                    return `${firstName$.get()} ${secondName$.get()}`;
                });

                // get first value and subscribe to deps
                expect(fullName$.get()).toBe('Jon Dow');

                queueMicrotask(() => {
                    // inner queueMicrotask is required!!!
                    // microtask queue: queueMicrotask#1, await computed$ (calling computed$.then), queueMicrotask#2
                    queueMicrotask(() => {
                        firstName$.set('Vasa');
                        secondName$.set('Pupkin');
                    });
                });

                const newValue = await fullName$.toPromise();

                expect(newValue).toBe('Vasa Pupkin');
            });

            it('should resolved with new value - using await', async () => {
                const store$ = new EventSignal(0);
                const computed$ = new EventSignal('', function() {
                    return `Value is: ${store$.get()}`;
                });

                expect(computed$.get()).toBe('Value is: 0');

                queueMicrotask(() => {
                    // inner queueMicrotask is required!!!
                    // microtask queue: queueMicrotask#1, await computed$ (calling computed$.then), queueMicrotask#2
                    queueMicrotask(() => {
                        store$.set(1);
                    });
                });

                const newValue = await computed$.toPromise();

                expect(newValue).toBe('Value is: 1');
            });

            it('should resolved with new value - using Promise.resolve', async () => {
                const store$ = new EventSignal(0);
                const computed$ = new EventSignal('', function() {
                    return `Value is: ${store$.get()}`;
                });

                expect(computed$.get()).toBe('Value is: 0');

                queueMicrotask(() => {
                    // inner queueMicrotask is required!!!
                    // microtask queue: queueMicrotask#1, Promise.resolve(computed$) (calling computed$.then), queueMicrotask#2
                    queueMicrotask(() => {
                        store$.set(1);
                    });
                });

                const promise = Promise.resolve(computed$.toPromise());

                const newValue = await promise;

                expect(newValue).toBe('Value is: 1');
            });

            it('should resolved with new value - using then', async () => {
                const store$ = new EventSignal(0);
                const computed$ = new EventSignal('', function() {
                    return `Value is: ${store$.get()}`;
                });

                expect(computed$.get()).toBe('Value is: 0');

                queueMicrotask(() => {
                    store$.set(1);
                });

                const promise = computed$.toPromise();

                const newValue = await promise;

                expect(newValue).toBe('Value is: 1');
            });

            describe('rejection', function() {
                it('should rejected after destroying - using await', async () => {
                    const store$ = new EventSignal(0);
                    const computed$ = new EventSignal('', function() {
                        return `Value is: ${store$.get()}`;
                    });
                    let error;

                    queueMicrotask(() => {
                        // inner queueMicrotask is required!!!
                        // microtask queue: queueMicrotask#1, await computed$ (calling computed$.then), queueMicrotask#2
                        queueMicrotask(() => {
                            computed$.destructor();
                        });
                    });

                    try {
                        await computed$.toPromise();
                    }
                    catch (err) {
                        error = err;
                    }

                    expect(String(error)).toContain('EventSignal object is destroyed');

                    error = void 0;

                    try {
                        await computed$.toPromise();
                    }
                    catch (err) {
                        error = err;
                    }

                    expect(String(error)).toContain('EventSignal object is destroyed');
                });

                it('should rejected after destroying - using Promise.resolve', async () => {
                    const store$ = new EventSignal(0);
                    const computed$ = new EventSignal('', function() {
                        return `Value is: ${store$.get()}`;
                    });
                    let error;

                    queueMicrotask(() => {
                        // inner queueMicrotask is required!!!
                        // microtask queue: queueMicrotask#1, Promise.resolve(computed$) (calling computed$.then), queueMicrotask#2
                        queueMicrotask(() => {
                            computed$.destructor();
                        });
                    });

                    try {
                        await Promise.resolve(computed$.toPromise());
                    }
                    catch (err) {
                        error = err;
                    }

                    expect(String(error)).toContain('EventSignal object is destroyed');

                    error = void 0;

                    try {
                        await Promise.resolve(computed$.toPromise());
                    }
                    catch (err) {
                        error = err;
                    }

                    expect(String(error)).toContain('EventSignal object is destroyed');
                });

                it('should rejected after destroying - using then', async () => {
                    const store$ = new EventSignal(0);
                    const computed$ = new EventSignal('', function() {
                        return `Value is: ${store$.get()}`;
                    });
                    let error;

                    queueMicrotask(() => {
                        computed$.destructor();
                    });

                    try {
                        await computed$.toPromise();
                    }
                    catch (err) {
                        error = err;
                    }

                    expect(String(error)).toContain('EventSignal object is destroyed');

                    error = void 0;

                    try {
                        await computed$.toPromise();
                    }
                    catch (err) {
                        error = err;
                    }

                    expect(String(error)).toContain('EventSignal object is destroyed');
                });
            });
        });
    });

    describe('errors handling', function() {
        // see [Throw in reducer is not cancel computation of other reducers](https://github.com/effector/effector/issues/90)
        // eslint-disable-next-line jest/no-test-prefixes,jest/no-disabled-tests
        xit('throw in computation should cancel computation in other signals', async () => {
            const store$ = new EventSignal(0, {
                description: 'store$',
            });
            const computedStore1$ = new EventSignal('', function() {
                const value = store$.get();

                if (value % 2 === 0) {
                    throw new TypeError('Invalid value');
                }

                return `value=${value}`;
            }, {
                description: 'computedStore1$',
            });
            const computedStore2$ = new EventSignal<[ key: string, value: string ]>([ '', '' ], function() {
                const { 0: key, 1: value } = String(computedStore1$).split('=');

                assertIsString(key);
                assertIsString(value);

                return [ key, value ];
            }, {
                description: 'computedStore2$',
            });

            // const fn = computedStore1$.createEvent<number>((a, d, b) => {
            //     return b.toString();
            // });
            //
            // fn(2);

            store$.set(1);

            expect(computedStore2$.get()).toEqual([ 'value', '1' ]);
            expect(computedStore2$.version).toBe(1);

            store$.set(2);

            expect(computedStore2$.get()).toEqual([ 'value', '1' ]);
            expect(computedStore2$.version).toBe(1);

            store$.set(3);

            expect(computedStore2$.get()).toEqual([ 'value', '3' ]);
            expect(computedStore2$.version).toBe(2);
        });
    });

    describe('trigger', function() {
        beforeAll(() => {
            useFakeTimers(void 0, {
                useJump: true,
            });
        });

        afterAll(() => {
            useRealTimers();
        });

        describe('only works with computation in triggered signal', function() {
            it('force update signal value every X milliseconds 1', async () => {
                const ac = new AbortController();
                const timerGroupId = Symbol();
                // note: replace with `using counterValue$`
                const counterValue$ = new EventSignal(0, (v, sourceValue, eventSignal) => {
                    return eventSignal.getStateFlags() & EventSignal.StateFlags.wasSourceSetting
                        ? sourceValue
                        : ++v
                    ;
                }, {
                    trigger: {
                        timerGroupId,
                        type: 'clock',
                        ms: SECONDS_30,
                        signal: ac.signal,
                        __proto__: null,
                    },
                    data: {
                        test: 1,
                    },
                });
                // note: replace with `using timeValue$`
                const timeValue$ = new EventSignal('', function(_v, options) {
                    return new Date().toLocaleString(void 0, options);
                }, {
                    initialSourceValue: {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZone: '+03:00',
                        hour12: false,
                        hourCycle: 'h23',
                    } as Intl.DateTimeFormatOptions,
                    trigger: {
                        type: 'clock',
                        timerGroupId,
                        ms: MINUTES,
                        __proto__: null,
                    },
                    data: {
                        test: 1,
                    },
                });
                const fromTemplate$ = new EventSignal('', (_v, template) => {
                    const args = [
                        counterValue$.get(),
                        timeValue$.get()
                            // '04.12.2025, 09:05:00' -> '04.12.2025 09:05:00'
                            .replace(', ', ' ')
                            // '09:05:00,751' -> '09:05:00.751'
                            .replace(',', '.')
                        ,
                    ];

                    return template.replace(/(#{(\d+)})/g, function(_full, _group, indexString) {
                        const index = Number(indexString);
                        const value = args[index];

                        return String(value ?? '');
                    });
                }, {
                    initialSourceValue: 'counter is #{0} and time is "#{1}"',
                });

                setSystemTime('2025-12-04T09:05:00+03:00');

                expect(fromTemplate$.get()).toBe('counter is 1 and time is "09:05:00"');

                // fixme: [tag: SET_WITH_SETTER__QUEUES]
                //  Тут "предыдущее значение" для каждого `signal.set(setter)` должно быть новым и актуальным.
                //  counterValue$.set(v => ++v);
                //  counterValue$.set(v => ++v);
                //  counterValue$.set(v => ++v);
                counterValue$.set(v => v + 3);

                expect(counterValue$.get()).toBe(4);
                expect(fromTemplate$.get()).toBe('counter is 4 and time is "09:05:00"');

                await advanceTimersByTimeAsync(SECONDS_15);

                expect(counterValue$.get()).toBe(4);
                expect(fromTemplate$.get()).toBe('counter is 4 and time is "09:05:00"');

                await advanceTimersByTimeAsync(SECONDS_15);

                expect(counterValue$.get()).toBe(5);
                expect(fromTemplate$.get()).toBe('counter is 5 and time is "09:05:00"');

                await advanceTimersByTimeAsync(SECONDS_30 + 735);

                expect(counterValue$.get()).toBe(6);
                expect(fromTemplate$.get()).toBe('counter is 6 and time is "09:06:00"');

                ac.abort();
                timeValue$.set((_v, options) => {
                    return {
                        ...options,
                        hour: 'numeric',
                        fractionalSecondDigits: 3,
                    };
                });
                counterValue$.set(v => ++v);

                expect(counterValue$.get()).toBe(7);
                expect(fromTemplate$.get()).toBe('counter is 7 and time is "9:06:00.735"');

                await advanceTimersByTimeAsync(SECONDS_30);

                expect(fromTemplate$.get()).toBe('counter is 7 and time is "9:06:00.735"');

                await advanceTimersByTimeAsync(SECONDS_30);

                expect(fromTemplate$.get()).toBe('counter is 7 and time is "9:07:00.735"');

                timeValue$.set((_v, options) => {
                    const { hour, minute, second, fractionalSecondDigits, ...rest } = options;

                    return {
                        ...rest,
                        timeStyle: 'medium',
                        dateStyle: 'short',
                    };
                });

                expect(fromTemplate$.get()).toBe('counter is 7 and time is "04.12.2025 09:07:00"');

                await advanceTimersByTimeAsync(MINUTES * 5);

                setSystemTime('2025-12-04T17:49:31.541+03:00');

                expect(fromTemplate$.get()).toBe('counter is 7 and time is "04.12.2025 17:49:31"');

                fromTemplate$.set('[ "#{1}", #{0} ]');

                expect(fromTemplate$.get()).toBe('[ "04.12.2025 17:49:31", 7 ]');

                await advanceTimersByTimeAsync(MINUTES);

                expect(fromTemplate$.get()).toBe('[ "04.12.2025 17:50:31", 7 ]');

                counterValue$.destructor();
                timeValue$.destructor();
                fromTemplate$.destructor();

                expect(getEventListeners(ac.signal, 'abort')).toHaveLength(0);
                expect(getEventListeners(__test__signalEventsEmitter, counterValue$.eventName)).toHaveLength(0);
                expect(getEventListeners(__test__signalEventsEmitter, timeValue$.eventName)).toHaveLength(0);
                expect(getEventListeners(__test__timersTriggerEventsEmitter, counterValue$.eventName)).toHaveLength(0);
                expect(getEventListeners(__test__timersTriggerEventsEmitter, timeValue$.eventName)).toHaveLength(0);
            });

            it('force update signal value every X milliseconds 2 - sync without subscriptions', function() {
                /**
                 * @example Use custom date
                 * nowDate$.set(new Date('2025-12-10T00:19:48.581Z').getTime());
                 * @example Use system date
                 * nowDate$.set(null);
                 */
                const nowDate$ = new EventSignal<Date, Date | number | null>(new Date(), (prevNow, customNow, eventSignal) => {
                    if (customNow) {
                        if ((eventSignal.getStateFlags() & EventSignal.StateFlags.wasSourceSetting) !== 0) {
                            return new Date(customNow);
                        }

                        return new Date(prevNow.getTime() + 1000);
                    }

                    return new Date();
                }, {
                    trigger: {
                        type: 'clock',
                        ms: 1000,
                    },
                });
                const startDate = new Date('2025-12-04T09:05:00+03:00');
                const newDate = new Date('2025-12-20T02:05:00+03:00');

                setSystemTime(startDate);

                expect(nowDate$.computationsCount).toBe(0);

                advanceTimersByTime(SECONDS);

                expect(nowDate$.computationsCount).toBe(0);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + SECONDS);

                advanceTimersByTime(SECONDS);

                expect(nowDate$.computationsCount).toBe(1);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + (SECONDS * 2));

                advanceTimersByTime(SECONDS);

                expect(nowDate$.computationsCount).toBe(2);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + (SECONDS * 3));
                expect(nowDate$.computationsCount).toBe(3);

                // Устанавливаем новое время. Нужно учитывать, из него будет вычислено значение только при следующем вызове get().
                nowDate$.set(newDate);

                expect(nowDate$.computationsCount).toBe(3);

                advanceTimersByTime(SECONDS);

                expect(nowDate$.computationsCount).toBe(3);
                // Т.к. это первый get после вызова set, то тут значение будет равное newDate, даже несмотря на то, что
                //  мы промотали время.
                expect(nowDate$.get().getTime()).toBe(newDate.getTime());

                advanceTimersByTime(SECONDS);

                expect(nowDate$.computationsCount).toBe(4);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime() + SECONDS);

                advanceTimersByTime(SECONDS);

                expect(nowDate$.computationsCount).toBe(5);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime() + (SECONDS * 2));
            });

            it('force update signal value every X milliseconds 3 - async with subscription', async function() {
                /**
                 * @example Use custom date
                 * nowDate$.set(new Date('2025-12-10T00:19:48.581Z').getTime());
                 * @example Use system date
                 * nowDate$.set(null);
                 */
                const nowDate$ = new EventSignal<Date, Date | number | null>(new Date(), (prevNow, customNow, eventSignal) => {
                    if (customNow) {
                        if ((eventSignal.getStateFlags() & EventSignal.StateFlags.wasSourceSetting) !== 0) {
                            return new Date(customNow);
                        }

                        return new Date(prevNow.getTime() + 1000);
                    }

                    return new Date();
                }, {
                    trigger: {
                        type: 'clock',
                        ms: 1000,
                    },
                });
                const nowTime$ = new EventSignal(0, () => {
                    return nowDate$.get().getTime();
                });
                const startDate = new Date('2025-12-04T09:05:00+03:00');
                const newDate = new Date('2025-12-20T02:05:00+03:00');
                let counter = 0;

                // Вешаем обработчик изменений на исходный сигнал для которого выставлен trigger
                nowDate$.addListener(() => {
                    counter++;
                });

                setSystemTime(startDate);

                expect(nowDate$.computationsCount).toBe(0);
                expect(counter).toBe(0);

                await advanceTimersByTimeAsync(SECONDS);

                // Has subscription, already computed
                expect(nowDate$.computationsCount).toBe(1);
                expect(counter).toBe(1);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + SECONDS);
                expect(nowTime$.get()).toBe(startDate.getTime() + SECONDS);
                expect(nowDate$.computationsCount).toBe(1);
                expect(nowTime$.computationsCount).toBe(1);
                expect(counter).toBe(1);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(2);
                expect(counter).toBe(2);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + (SECONDS * 2));
                expect(nowTime$.get()).toBe(startDate.getTime() + (SECONDS * 2));
                expect(nowDate$.computationsCount).toBe(2);
                expect(nowTime$.computationsCount).toBe(2);
                expect(counter).toBe(2);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(3);
                expect(counter).toBe(3);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + (SECONDS * 3));
                expect(nowTime$.get()).toBe(startDate.getTime() + (SECONDS * 3));
                expect(nowDate$.computationsCount).toBe(3);
                expect(nowTime$.computationsCount).toBe(3);
                expect(counter).toBe(3);

                // Устанавливаем новое время.
                // Нужно учитывать, что новое значение пересчитается в после следующей микротаски, т.к. есть подписчики
                //  навешанные через addListener на этот сигнал.
                nowDate$.set(newDate);

                expect(nowDate$.computationsCount).toBe(3);
                expect(counter).toBe(3);

                await realSleep(-1);

                // Подписка через addListener вынуждает сигнал пересчитать значение на новое после установки через set().
                expect(nowDate$.computationsCount).toBe(4);
                expect(counter).toBe(4);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime());
                expect(nowTime$.get()).toBe(newDate.getTime());
                expect(nowDate$.computationsCount).toBe(4);
                expect(nowTime$.computationsCount).toBe(4);
                expect(counter).toBe(4);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(5);
                expect(counter).toBe(5);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime() + SECONDS);
                expect(nowTime$.get()).toBe(newDate.getTime() + SECONDS);
                expect(nowDate$.computationsCount).toBe(5);
                expect(nowTime$.computationsCount).toBe(5);
                expect(counter).toBe(5);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(6);
                expect(counter).toBe(6);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime() + (SECONDS * 2));
                expect(nowTime$.get()).toBe(newDate.getTime() + (SECONDS * 2));
                expect(nowDate$.computationsCount).toBe(6);
                expect(nowTime$.computationsCount).toBe(6);
                expect(counter).toBe(6);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(7);
                expect(counter).toBe(7);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime() + (SECONDS * 3));
                expect(nowTime$.get()).toBe(newDate.getTime() + (SECONDS * 3));
                expect(nowDate$.computationsCount).toBe(7);
                expect(nowTime$.computationsCount).toBe(7);
                expect(counter).toBe(7);
            });

            it('force update signal value every X milliseconds 4 - async with dependent signal and subscriptions', async function() {
                /**
                 * @example Use custom date
                 * nowDate$.set(new Date('2025-12-10T00:19:48.581Z').getTime());
                 * @example Use system date
                 * nowDate$.set(null);
                 */
                const nowDate$ = new EventSignal<Date, Date | number | null>(new Date(), (prevNow, customNow, eventSignal) => {
                    if (customNow) {
                        if ((eventSignal.getStateFlags() & EventSignal.StateFlags.wasSourceSetting) !== 0) {
                            return new Date(customNow);
                        }

                        return new Date(prevNow.getTime() + 1000);
                    }

                    return new Date();
                }, {
                    trigger: {
                        type: 'clock',
                        ms: 1000,
                    },
                });
                const nowTime$ = new EventSignal(0, () => {
                    return nowDate$.get().getTime();
                });
                const startDate = new Date('2025-12-04T09:05:00+03:00');
                const newDate = new Date('2025-12-20T02:05:00+03:00');
                let counter1 = 0;
                let counter2 = 0;

                // Вешаем обработчик изменений на зависимый сигнал
                nowDate$.addListener(() => {
                    counter1++;
                });
                nowTime$.addListener(() => {
                    counter2++;
                });

                setSystemTime(startDate);

                expect(nowDate$.computationsCount).toBe(0);
                expect(counter1).toBe(0);
                expect(counter2).toBe(0);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(1);
                expect(counter1).toBe(1);
                // fixme: [tag: SUBSCRIPTIONS_ON_NEW_VALUE] Почему мы тут не получили нового значения, хотя были подписаны на нужные изменения.
                //  При этом по этому тесту дальше мы нормально получаем новые значения в обработчике.
                //  Смотреть: expect(counter2).toBe(2), expect(counter2).toBe(3) и т.д.
                expect(counter2).toBe(0);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + SECONDS);
                expect(nowTime$.get()).toBe(startDate.getTime() + SECONDS);
                expect(nowDate$.computationsCount).toBe(1);
                expect(nowTime$.computationsCount).toBe(1);
                expect(counter1).toBe(1);
                expect(counter2).toBe(1);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(2);
                expect(counter1).toBe(2);
                expect(counter2).toBe(2);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + (SECONDS * 2));
                expect(nowTime$.get()).toBe(startDate.getTime() + (SECONDS * 2));
                expect(nowDate$.computationsCount).toBe(2);
                expect(nowTime$.computationsCount).toBe(2);
                expect(counter1).toBe(2);
                expect(counter2).toBe(2);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(3);
                expect(counter1).toBe(3);
                expect(counter2).toBe(3);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + (SECONDS * 3));
                expect(nowTime$.get()).toBe(startDate.getTime() + (SECONDS * 3));
                expect(nowDate$.computationsCount).toBe(3);
                expect(nowTime$.computationsCount).toBe(3);
                expect(counter1).toBe(3);
                expect(counter2).toBe(3);

                // Устанавливаем новое время.
                // Нужно учитывать, что новое значение пересчитается в после следующей микротаски, т.к. есть подписчики
                //  навешанные через addListener на nowTime$.
                nowDate$.set(newDate);

                expect(nowDate$.computationsCount).toBe(3);
                expect(counter1).toBe(3);

                await realSleep(-1);

                // Подписка через addListener вынуждает сигнал пересчитать значение на новое после установки через set().
                expect(nowDate$.computationsCount).toBe(4);
                expect(counter1).toBe(4);
                expect(counter2).toBe(4);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime());
                expect(nowTime$.get()).toBe(newDate.getTime());
                expect(nowDate$.computationsCount).toBe(4);
                expect(nowTime$.computationsCount).toBe(4);
                expect(counter1).toBe(4);
                expect(counter2).toBe(4);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(5);
                expect(counter1).toBe(5);
                expect(counter2).toBe(5);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime() + SECONDS);
                expect(nowTime$.get()).toBe(newDate.getTime() + SECONDS);
                expect(nowDate$.computationsCount).toBe(5);
                expect(nowTime$.computationsCount).toBe(5);
                expect(counter1).toBe(5);
                expect(counter2).toBe(5);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(6);
                expect(counter1).toBe(6);
                expect(counter2).toBe(6);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime() + (SECONDS * 2));
                expect(nowTime$.get()).toBe(newDate.getTime() + (SECONDS * 2));
                expect(nowDate$.computationsCount).toBe(6);
                expect(nowTime$.computationsCount).toBe(6);
                expect(counter1).toBe(6);
                expect(counter2).toBe(6);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(7);
                expect(counter1).toBe(7);
                expect(counter2).toBe(7);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime() + (SECONDS * 3));
                expect(nowTime$.get()).toBe(newDate.getTime() + (SECONDS * 3));
                expect(nowDate$.computationsCount).toBe(7);
                expect(nowTime$.computationsCount).toBe(7);
                expect(counter1).toBe(7);
                expect(counter2).toBe(7);
            });
        });
    });

    describe('throttle', function() {
        beforeAll(() => {
            useFakeTimers(void 0, {
                useJump: true,
            });
        });

        afterAll(() => {
            useRealTimers();
        });

        describe('without computation in throttled signal', function() {
            it('don’t allow to EventSignal to get a new value more than once every X milliseconds', async () => {
                const ac = new AbortController();
                const timerGroupId = Symbol();
                // note: replace with `using throttledValue1$`
                const throttledValue1$ = new EventSignal(0, {
                    throttle: {
                        timerGroupId,
                        type: 'clock',
                        ms: 2000,
                        signal: ac.signal,
                        __proto__: null,
                    },
                });
                // note: replace with `using throttledValue2$`
                const throttledValue2$ = new EventSignal(555, {
                    throttle: {
                        timerGroupId,
                        //todo: переделать на `type: 'debounce'` - сколько должно пройти времени с последнего изменения
                        type: 'clock',
                        ms: 2000,
                        __proto__: null,
                    },
                });
                const computed$ = new EventSignal('', () => {
                    return `is ${throttledValue1$.get()} and ${throttledValue2$.get()}`;
                });

                expect(computed$.get()).toBe('is 0 and 555');

                // fixme: [tag: SET_WITH_SETTER__QUEUES]
                //  Тут "предыдущее значение" для каждого `signal.set(setter)` должно быть новым и актуальным.
                //  throttledValue1$.set(v => ++v);
                //  throttledValue1$.set(v => ++v);
                //  throttledValue1$.set(v => ++v);
                throttledValue1$.set(v => v + 3);

                expect(throttledValue1$.get()).toBe(0);
                expect(computed$.get()).toBe('is 0 and 555');
                expect(throttledValue2$.get()).toBe(555);

                await realSleep();
                await advanceTimersByTimeAsync(10);

                expect(throttledValue1$.get()).toBe(0);
                expect(computed$.get()).toBe('is 0 and 555');

                await advanceTimersByTimeAsync(2000);

                expect(throttledValue1$.get()).toBe(3);
                expect(computed$.get()).toBe('is 3 and 555');

                throttledValue1$.set(2);

                expect(throttledValue1$.get()).toBe(3);
                expect(computed$.get()).toBe('is 3 and 555');

                await realSleep();
                await advanceTimersByTimeAsync(500);

                expect(throttledValue1$.get()).toBe(3);
                expect(computed$.get()).toBe('is 3 and 555');

                await advanceTimersByTimeAsync(2000);

                expect(computed$.get()).toBe('is 2 and 555');
                expect(throttledValue1$.get()).toBe(2);

                ac.abort();

                throttledValue1$.set(10);
                throttledValue1$.set(v => ++v);
                throttledValue1$.set(v => ++v);

                // fixme: [tag: SET_WITH_SETTER__QUEUES]
                //  Тут значение в throttledValue1$ должно быть 12 !
                expect(computed$.get()).toBe('is 3 and 555');
                expect(throttledValue1$.get()).toBe(3); //.toBe(12);

                throttledValue1$.destructor();
                throttledValue2$.destructor();
            });

            it('don’t allow to EventSignal to get a new value until event in EventEmitter - simple', async () => {
                const ee = new EventEmitter();
                const throttledValue$ = new EventSignal(0, {
                    throttle: {
                        type: 'emitter',
                        emitter: ee,
                        event: 'event',
                        __proto__: null,
                    },
                });
                const computed$ = new EventSignal('', () => {
                    return `is ${throttledValue$.get()}`;
                });

                expect(throttledValue$.get()).toBe(0);
                expect(computed$.get()).toBe('is 0');

                throttledValue$.set(1);

                expect(throttledValue$.get()).toBe(0);
                expect(computed$.get()).toBe('is 0');

                ee.emit('event');

                expect(throttledValue$.get()).toBe(1);
                expect(computed$.get()).toBe('is 1');

                throttledValue$.set(2);

                expect(throttledValue$.get()).toBe(1);
                expect(computed$.get()).toBe('is 1');

                ee.emit('event');

                expect(computed$.get()).toBe('is 2');
                expect(throttledValue$.get()).toBe(2);

                throttledValue$.destructor();
                computed$.destructor();

                expect(getEventListeners(ee, 'event')).toHaveLength(0);
            });

            it('don’t allow to EventSignal to get a new value until event in any Emitter - complex', async () => {
                const ee = new EventEmitter();
                const et = new EventTarget();
                const ignoreThisEvent = Symbol('ignoreThisEvent');
                const event2 = Symbol('event2');
                // note: replace with `using throttledValue1$`
                const throttledValue1$ = new EventSignal(0, {
                    throttle: {
                        type: 'emitter',
                        emitter: new WeakRef(ee),
                        event: [ 'event1', event2 ],
                        filter(_eventName, ...args: unknown[]) {
                            return args[0] !== ignoreThisEvent;
                        },
                        __proto__: null,
                    },
                });
                const value2_ac = new AbortController();
                // note: replace with `using throttledValue2$`
                const throttledValue2$ = new EventSignal(555, {
                    throttle: {
                        type: 'emitter',
                        emitter: new WeakRef(et),
                        event: [ 'event3', 'event4' ],
                        signal: value2_ac.signal,
                        __proto__: null,
                    },
                });
                const value3Dep = new EventSignal(0);
                // note: replace with `using throttledValue3$`
                const throttledValue3$ = new EventSignal('a', {
                    throttle: {
                        eventSignal: value3Dep,
                        __proto__: null,
                    },
                });
                const computed$ = new EventSignal('', () => {
                    return `#1 = ${throttledValue1$}; #2 = ${throttledValue2$}; #3 = ${throttledValue3$}`;
                });

                expect(computed$.get()).toBe('#1 = 0; #2 = 555; #3 = a');

                throttledValue1$.set(v => ++v);
                throttledValue2$.set(v => ++v);
                throttledValue3$.set(v => v + v);

                expect(throttledValue1$.get()).toBe(0);
                expect(throttledValue2$.get()).toBe(555);
                expect(computed$.get()).toBe('#1 = 0; #2 = 555; #3 = a');

                ee.emit('event1', ignoreThisEvent);

                expect(throttledValue1$.get()).toBe(0);
                expect(throttledValue2$.get()).toBe(555);
                expect(computed$.get()).toBe('#1 = 0; #2 = 555; #3 = a');

                ee.emit('event1');

                expect(throttledValue1$.get()).toBe(1);
                expect(throttledValue2$.get()).toBe(555);
                expect(computed$.get()).toBe('#1 = 1; #2 = 555; #3 = a');

                et.dispatchEvent(new CustomEvent('event3'));

                expect(computed$.get()).toBe('#1 = 1; #2 = 556; #3 = a');
                expect(throttledValue1$.get()).toBe(1);
                expect(throttledValue2$.get()).toBe(556);

                // fixme: [tag: SET_WITH_SETTER__QUEUES]
                //  Тут "предыдущее значение" (1) для каждого `signal.set(setter)` должно быть новым и актуальным.
                //  throttledValue1$.set(v => ++v);
                //  throttledValue1$.set(v => ++v);
                throttledValue1$.set(v => v + 2);
                throttledValue2$.set(v => ++v);

                value2_ac.abort();
                value3Dep.set(v => ++v);

                expect(computed$.get()).toBe('#1 = 1; #2 = 557; #3 = aa');
                expect(throttledValue1$.get()).toBe(1);
                expect(throttledValue2$.get()).toBe(557);

                ee.emit(event2);
                throttledValue2$.set(v => ++v);

                expect(computed$.get()).toBe('#1 = 3; #2 = 558; #3 = aa');
                expect(throttledValue1$.get()).toBe(3);
                expect(throttledValue2$.get()).toBe(558);
                throttledValue2$.set(v => ++v);
                expect(computed$.get()).toBe('#1 = 3; #2 = 559; #3 = aa');
                expect(throttledValue2$.get()).toBe(559);

                throttledValue1$.destructor();
                throttledValue2$.destructor();
                throttledValue3$.destructor();
                computed$.destructor();

                expect(getEventListeners(ee, 'event1')).toHaveLength(0);
                expect(getEventListeners(ee, event2)).toHaveLength(0);
                expect(getEventListeners(et, 'event3')).toHaveLength(0);
                expect(getEventListeners(et, 'event4')).toHaveLength(0);
                expect(getEventListeners(value2_ac.signal, 'abort')).toHaveLength(0);
                expect(getEventListeners(value3Dep, '')).toHaveLength(0);
                expect(getEventListeners(throttledValue1$, '')).toHaveLength(0);
                expect(getEventListeners(throttledValue2$, '')).toHaveLength(0);
                expect(getEventListeners(throttledValue3$, '')).toHaveLength(0);
            });
        });

        describe('with computation in throttled signal', function() {
            it('don’t allow to EventSignal to get a new value more than once every X milliseconds', async () => {
                const timerGroupId = Symbol();
                // note: replace with `using throttledValue1$`
                const throttledComputed$ = new EventSignal('', (_p, sourceValue) => {
                    return `count is ${sourceValue}`;
                }, {
                    initialSourceValue: 0,
                    throttle: {
                        timerGroupId,
                        type: 'clock',
                        ms: 2000,
                        __proto__: null,
                    },
                });

                expect(throttledComputed$.get()).toBe('count is 0');

                throttledComputed$.set(1);

                expect(throttledComputed$.get()).toBe('count is 0');

                await realSleep();
                await advanceTimersByTimeAsync(10);

                expect(throttledComputed$.get()).toBe('count is 0');

                await advanceTimersByTimeAsync(2000);

                expect(throttledComputed$.get()).toBe('count is 1');

                throttledComputed$.set(2);

                expect(throttledComputed$.get()).toBe('count is 1');

                await realSleep();
                await advanceTimersByTimeAsync(500);

                expect(throttledComputed$.get()).toBe('count is 1');

                await advanceTimersByTimeAsync(2000);

                expect(throttledComputed$.get()).toBe('count is 2');

                throttledComputed$.destructor();
            });
        });

        describe('with trigger', function() {
            it('force update signal value every X milliseconds 3 - async with subscriptions', async function() {
                /**
                 * @example Use custom date
                 * nowDate$.set(new Date('2025-12-10T00:19:48.581Z').getTime());
                 * @example Use system date
                 * nowDate$.set(null);
                 */
                const nowDate$ = new EventSignal<Date, Date | number | null>(new Date(), (prevNow, customNow, eventSignal) => {
                    if (customNow) {
                        if ((eventSignal.getStateFlags() & EventSignal.StateFlags.wasSourceSetting) !== 0) {
                            return new Date(customNow);
                        }

                        return new Date(prevNow.getTime() + 1000);
                    }

                    return new Date();
                }, {
                    trigger: {
                        type: 'clock',
                        ms: 1000,
                        // Нужно, чтобы не подключаться к существующему setInterval, который может быть заведён с другими настройками fake-timers.
                        timerGroupId: Symbol(),
                    },
                    throttle: {
                        type: 'clock',
                        ms: 1000,
                    },
                });
                const startDate = new Date('2025-12-04T09:05:00+03:00');
                const newDate = new Date('2025-12-20T02:05:00+03:00');
                let counter = 0;

                nowDate$.addListener(() => {
                    counter++;
                });

                setSystemTime(startDate);

                expect(nowDate$.computationsCount).toBe(0);
                expect(counter).toBe(0);

                await advanceTimersByTimeAsync(SECONDS);

                // Has subscription, already computed
                expect(nowDate$.computationsCount).toBe(1);
                expect(counter).toBe(1);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + SECONDS);
                expect(nowDate$.computationsCount).toBe(1);
                expect(counter).toBe(1);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(2);
                expect(counter).toBe(2);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + (SECONDS * 2));
                expect(nowDate$.computationsCount).toBe(2);
                expect(counter).toBe(2);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(3);
                expect(counter).toBe(3);
                expect(nowDate$.get().getTime()).toBe(startDate.getTime() + (SECONDS * 3));
                expect(nowDate$.computationsCount).toBe(3);
                expect(counter).toBe(3);

                const prevValue = nowDate$.get().getTime();

                // Устанавливаем новое время.
                // Нужно учитывать, что новое значение пересчитается в после следующей микротаски, т.к. есть подписчики
                //  навешанные через addListener на этот сигнал.
                nowDate$.set(newDate);

                expect(nowDate$.computationsCount).toBe(3);
                expect(counter).toBe(3);

                await realSleep(-1);

                // throttle не дал выполниться пересчету значения
                expect(nowDate$.computationsCount).toBe(3);
                expect(counter).toBe(3);
                expect(nowDate$.get().getTime()).toBe(prevValue);
                expect(nowDate$.computationsCount).toBe(3);
                expect(counter).toBe(3);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(4);
                expect(counter).toBe(4);
                // Первое значение после `nowDate$.set(newDate);` и оно будет равно newDate
                expect(nowDate$.get().getTime()).toBe(newDate.getTime());
                expect(nowDate$.computationsCount).toBe(4);
                expect(counter).toBe(4);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(5);
                expect(counter).toBe(5);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime() + SECONDS);
                expect(nowDate$.computationsCount).toBe(5);
                expect(counter).toBe(5);

                await advanceTimersByTimeAsync(SECONDS);

                expect(nowDate$.computationsCount).toBe(6);
                expect(counter).toBe(6);
                expect(nowDate$.get().getTime()).toBe(newDate.getTime() + (SECONDS * 2));
                expect(nowDate$.computationsCount).toBe(6);
                expect(counter).toBe(6);
            });
        });
    });

    // eslint-disable-next-line jest/no-commented-out-tests
    /*describe('methods', function() {
        it('common case', function() {
            const counter$ = new EventSignal(0, {
                methods: {
                    increment: (prev: number, arg = 1) => {
                        return prev + arg;
                    },
                },
            });

            counter$.__

            const _ = counter$._;

            _?.increment()

            counter$._.increment()
        });
    });*/

    //todo: test case for
    // https://eval.js.hyoo.ru/#!code=%2F%2F%20Article%20about%3A%0A%2F%2F%20https%3A%2F%2Fpage.hyoo.ru%2F%23!%3D3ia3ll_rcpl7b%0A%0Alet%20res%20%3D%20%5B%5D%0A%0Aconst%20numbers%20%3D%20Array.from(%0A%09%7B%20length%3A%205%20%7D%2C%0A%09(%20_%2C%20i%20)%3D%3E%20i%2C%0A)%0A%0Aconst%20fib%20%3D%20n%20%3D%3E%20n%20%3C%202%20%3F%201%0A%09%3A%20fib(%20n%20-%201%20)%20%2B%20fib(%20n%20-%202%20)%0A%0Aconst%20hard%20%3D%20(%20n%2C%20l%20)%3D%3E%20n%20%2B%20fib(18)%0A%0A%2F*const%20hard%20%3D%20(%20n%2C%20l%20)%3D%3E%20%7B%0A%09console.log(%20l%20)%0A%09return%20n%20%2B%20fib(18)%0A%7D*%2F%0A%0A%2F%2F%20https%3A%2F%2Fgithub.com%2FRiim%2Fcellx%2F%0Aconst%20%7B%20cellx%2C%20Cell%20%7D%20%3D%20%24mol_import.module(%0A%09'https%3A%2F%2Fesm.sh%2Fcellx'%0A)%0Aconst%20%7B%20%24mol_compare_deep%3A%20compareValues%20%7D%20%3D%20%24mol_import.module(%0A%09'https%3A%2F%2Fesm.sh%2Fmol_compare_deep%2Fweb'%0A).default%0Aconst%20A%20%3D%20cellx(0)%0Aconst%20B%20%3D%20cellx(0)%0Aconst%20C%20%3D%20cellx(%20()%3D%3E%20A()%252%20%2B%20B()%252%20)%0Aconst%20D%20%3D%20cellx(%20()%3D%3E%20numbers.map(%20i%20%3D%3E%20(%7B%20x%3A%20i%20%2B%20A()%252%20-%20B()%252%20%7D)%20)%2C%20%7B%20compareValues%20%7D%20)%0Aconst%20E%20%3D%20cellx(%20()%3D%3E%20hard(%20C()%20%2B%20A()%20%2B%20D()%5B0%5D.x%2C%20'E'%20)%20)%0Aconst%20F%20%3D%20cellx(%20()%3D%3E%20hard(%20D()%5B2%5D.x%20%7C%7C%20B()%2C%20'F'%20)%20)%0Aconst%20G%20%3D%20cellx(%20()%3D%3E%20C()%20%2B%20(%20C()%20%7C%7C%20E()%252%20)%20%2B%20D()%5B4%5D.x%20%2B%20F()%20)%0Aconst%20H%20%3D%20cellx(%20()%3D%3E%20res.push(%20hard(%20G()%2C%20'H'%20)%20)%20)%0Aconst%20I%20%3D%20cellx(%20()%3D%3E%20res.push(%20G()%20)%20)%0Aconst%20J%20%3D%20cellx(%20()%3D%3E%20res.push(%20hard(%20F()%2C%20'J'%20)%20)%20)%0AH.subscribe(%20()%3D%3E%7B%7D%20)%0AI.subscribe(%20()%3D%3E%7B%7D%20)%0AJ.subscribe(%20()%3D%3E%7B%7D%20)%0A%0Ares.length%20%3D%203%0AB(1)%3B%20A(1%2B0*2)%3B%20%2F*%2F%2F*%2F%20Cell.release()%20%2F%2F%20H%0AA(2%2B0*2)%3B%20B(2)%3B%20%2F*%2F%2F*%2F%20Cell.release()%20%2F%2F%20EH%0A%0A%24mol_assert_like(%20res%2C%0A%5B%208369%2C%204188%2C%208364%2C%208372%2C%204191%2C%208369%2C%204188%20%5D%0A)/run=true
    // see "CellX" in https://perf.js.hyoo.ru/#!bench=ho1sg2_51ho3t

    // eslint-disable-next-line jest/no-commented-out-tests
    // describe('ReactComponent', function() {
    // eslint-disable-next-line jest/no-commented-out-tests
    //     it('todo', async () => {
    //         const ReactComponent = () => {
    //             const $needToRetryMedia = new EventSignal<null | {
    //                 retryCount: number,
    //                 retryUrl: string,
    //             }>(null, {
    //                 description: 'needToRetryMedia',
    //             });
    //             const [ userName, setUserName ] = useState($needToRetryMedia.get());
    //
    //             useEffect(() => {
    //                 const fn = () => {
    //                     const needToRetryInfo = $needToRetryMedia.get();
    //
    //                     if (!needToRetryInfo) {
    //                         // Не нужен retry
    //                     }
    //                     else {
    //                         const { retryUrl } = needToRetryInfo;
    //                     }
    //                     setUserName();
    //                 };
    //
    //                 $needToRetryMedia.addListener(fn);
    //
    //                 return () => {
    //                     $needToRetryMedia.removeListener(fn);
    //                 };
    //             });
    //
    //             return <>{userName}<>;
    //         };
    //     });
    // });

    describe('Synthetic testing of React (using own fakeReact)', function() {
        const { requestAnimationFrame } = globalThis;
        const currentReact = EventSignal._React;

        beforeAll(() => {
            // @ts-expect-error
            globalThis.requestAnimationFrame = queueMicrotask;

            EventSignal.initReact(fakeReact);
        });

        afterAll(() => {
            globalThis.requestAnimationFrame = requestAnimationFrame;

            if (currentReact) {
                EventSignal.initReact(currentReact);
            }
            else {
                EventSignal.initReact(void 0);
            }
        });

        describe('#use', function() {
            it('with reducer - 1', async () => {
                const store$ = new EventSignal({
                    value: 0,
                    get isOdd() {
                        return (store$.get().value & 1) === 1;
                    },
                });

                const {
                    owner,
                    result,
                } = fakeReact.fakeRender(function() {
                    const isOdd = store$.use(v => v.isOdd);

                    return [ String(isOdd) ];
                });

                expect(owner.renders).toBe(1);
                expect(owner.lastRender).toEqual([ "false" ]);
                expect(result).toEqual(owner.lastRender);

                store$.mutate({
                    // isOdd should be false
                    value: store$.get().value + 2,
                });

                await fakeReact.awaitRender();

                expect(owner.renders).toBe(1);
                expect(owner.lastRender).toEqual([ "false" ]);

                store$.mutate({
                    // isOdd should be true
                    value: store$.get().value + 1,
                });

                await fakeReact.awaitRender();

                expect(owner.renders).toBe(2);
                expect(owner.lastRender).toEqual([ "true" ]);
            });

            it('with reducer - 2', async () => {
                type Size = {
                    height: number,
                    width: number,
                };

                const store$ = new EventSignal({
                    type: 'monitor',
                    size: {
                        height: 640,
                        width: 480,
                    } as Size,
                    isActive: true,
                });
                const sizeIsEqual = (size1: Size, size2: Size) => {
                    return size1.height === size2.height
                        && size1.width === size2.width
                    ;
                };

                const {
                    owner: owner1,
                    result: result1,
                } = fakeReact.fakeRender(function() {
                    // Subscribe only in new values in 'size'
                    const size = store$.use(v => {
                        return v.size;
                    }, sizeIsEqual);

                    return [ 'size is: ', size.height, 'x', size.width, ' px' ];
                });
                const {
                    owner: owner2,
                    result: result2,
                } = fakeReact.fakeRender(function() {
                    // Subscribe on ALL changes
                    const monitor = store$.use();

                    return [ 'monitor is: ', monitor.isActive ? 'active' : 'not active' ];
                });

                expect(owner1.renders).toBe(1);
                expect(owner1.lastRender.join('')).toBe('size is: 640x480 px');
                expect(result1).toEqual(owner1.lastRender);
                expect(owner2.renders).toBe(1);
                expect(owner2.lastRender.join('')).toBe('monitor is: active');
                expect(result2).toEqual(owner2.lastRender);

                store$.mutate({
                    isActive: false,
                });

                await fakeReact.awaitRender();

                expect(owner1.renders).toBe(1);
                expect(owner1.lastRender.join('')).toBe('size is: 640x480 px');
                expect(owner2.renders).toBe(2);
                expect(owner2.lastRender.join('')).toBe('monitor is: not active');

                const monitorSize = store$.get().size;

                monitorSize.height = 800;
                monitorSize.width = 600;

                // note: Direct mutation in monitorSize will be ignored
                store$.mutate({});

                await fakeReact.awaitRender();

                expect(owner1.renders).toBe(1);
                expect(owner1.lastRender.join('')).toBe('size is: 640x480 px');
                expect(owner2.renders).toBe(2);
                expect(owner2.lastRender.join('')).toBe('monitor is: not active');

                const monitorSize2 = store$.get().size;

                monitorSize2.height = 1280;
                monitorSize2.width = 720;

                /** note: Mutation in monitorSize will be ignored due prevValue and newValue in {@link sizeIsEqual} are the same because of {@link monitorSize2} mutation. */
                store$.mutate({
                    isActive: true,
                });

                await fakeReact.awaitRender();

                expect(owner1.renders).toBe(1);
                expect(owner1.lastRender.join('')).toBe('size is: 640x480 px');
                expect(owner2.renders).toBe(3);
                expect(owner2.lastRender.join('')).toBe('monitor is: active');

                // note:
                //  * owner1: size will be read due it is new object
                //  * owner2: will be re-rendered due it has no reducer
                store$.mutate({
                    size: {
                        height: 1920,
                        width: 1080,
                    },
                });

                await fakeReact.awaitRender();

                expect(owner1.renders).toBe(2);
                expect(owner1.lastRender.join('')).toBe('size is: 1920x1080 px');
                expect(owner2.renders).toBe(4);
                expect(owner2.lastRender.join('')).toBe('monitor is: active');

                /**
                 * note:
                 *  * owner1: size will be read due it is new object not re-rendered due {@link sizeIsEqual}
                 *  * owner2: will be re-rendered due it has no reducer
                 */
                store$.mutate({
                    size: {
                        height: 1920,
                        width: 1080,
                    },
                });

                await fakeReact.awaitRender();

                expect(owner1.renders).toBe(2);
                expect(owner1.lastRender.join('')).toBe('size is: 1920x1080 px');
                expect(owner2.renders).toBe(5);
                expect(owner2.lastRender.join('')).toBe('monitor is: active');
            });
        });

        describe('#useListener', function() {
            it('should should not cause rerender', async () => {
                const counter$ = new EventSignal(0);

                const {
                    owner,
                    result,
                } = fakeReact.fakeRender(function() {
                    const $ref = fakeReact.useRef<HTMLElement>();
                    const counter = counter$.useListener((newValue) => {
                        // eslint-disable-next-line unicorn/prefer-dom-node-dataset
                        $ref.current!.setAttribute('data-test', String(newValue));
                    });

                    return [ String(counter), { ref: $ref } ];
                });

                expect(owner.renders).toBe(1);
                expect(result).toEqual(owner.lastRender);

                const $el = result[1];

                FakeMiniHTMLElement.assertIsFakeMiniHTMLElement($el);

                expect(owner.renders).toBe(1);
                expect($el.getAttribute('data-test')).toBe('0');

                counter$.set(2);

                await fakeReact.awaitRender();

                expect(owner.renders).toBe(1);
                expect($el.getAttribute('data-test')).toBe('2');
            });
        });
    });
});

type User = {
    id: number,
    firstName: string,
    secondName: string,
    age: number,
};
type UserDTO = [
    id: number,
    firstName: User["firstName"] | undefined,
    secondName: User["secondName"] | undefined,
    age: User["age"] | undefined,
];
type UserOrNull = ReturnType<UsersStore["getUser"]>;

const defaultUsers: User[] = [
    { id: 1, firstName: 'Vasa', secondName: 'Pupkin', age: 14 },
    { id: 2, firstName: 'Jon', secondName: 'Dow', age: 21 },
    { id: 3, firstName: 'Kelvin', secondName: 'Klein', age: 84 },
];

class UsersStore {
    users: User[] = [];
    userNameSignalSignals: Record<number, EventSignal<string, number, { userId: number, computationCounter: number }>> = Object.create(null);
    usersSignals: Record<number, EventSignal<User | null, number, { userId: number }>> = Object.create(null);

    constructor(public emitter = new EventEmitterX(), users?: User[]) {
        emitter.addListener('user-add', (user: User) => {
            const { id: userId } = user;

            if (!this.getUserSync(userId)) {
                this.users.push(user);

                emitter.emit(`${userId}---username-changes`, userId);
            }
        });
        emitter.addListener('user-update', (userDTO: UserDTO) => {
            const userId = userDTO[0];
            const user = this.users.find(user => user.id === userId);

            if (user) {
                const {
                    1: new_firstName,
                    2: new_secondName,
                    3: new_age,
                } = userDTO;
                let isUserNameChanges = false;

                if (new_firstName !== void 0 && new_firstName !== user.firstName) {
                    user.firstName = new_firstName;
                    isUserNameChanges = true;
                }
                if (new_secondName !== void 0 && new_secondName !== user.secondName) {
                    user.secondName = new_secondName;
                    isUserNameChanges = true;
                }
                if (new_age !== void 0 && new_age !== user.age) {
                    user.age = new_age;
                }

                if (isUserNameChanges) {
                    emitter.emit(`${userId}---username-changes`, userId);
                }
            }
        });

        if (Array.isArray(users)) {
            this.users.push(...users);
        }
    }

    lastAsyncGetUser?: number;

    resetLastAsyncGetUser() {
        this.lastAsyncGetUser = void 0;
    }

    async getUser(userId: number | undefined, options?: {
        delay?: number,
        signal?: AbortSignal,
    }) {
        if (options?.delay) {
            await sleep(options.delay, {
                signal: options.signal,
            });
        }

        this.lastAsyncGetUser = userId;

        return userId ? this.users.find(user => user.id === userId) ?? null : null;
    }

    getUserSync(userId: number | undefined) {
        return userId ? this.users.find(user => user.id === userId) ?? null : null;
    }

    addUser(newUser: User) {
        const user = this.getUserSync(newUser.id);

        if (user) {
            throw new Error(`User with this id (${newUser.id}) is already existed`);
        }

        this.emitter.emit('user-add', newUser satisfies User);
    }

    updateUser(userId: number, userProps: Partial<Omit<User, 'id'>>) {
        const user = this.getUserSync(userId);

        if (user) {
            this.emitter.emit('user-update', [
                userId,
                userProps.firstName,
                userProps.secondName,
                userProps.age,
            ] satisfies UserDTO);
        }
    }

    getUserNameSignal(userId: number, finaleSourceValue?: number) {
        return this.userNameSignalSignals[userId] ??= new EventSignal('', (_prevValue, sourceValue, eventSignal) => {
            eventSignal.data.computationCounter++;

            if ((sourceValue ?? userId) !== userId) {
                // setting finaleValue != userId will trigger to call computation with sourceValue == finaleValue
                return '--user not found--';
            }

            const user = this.getUserSync(userId);

            if (!user) {
                return '...loading';
            }

            return `${user.firstName} ${user.secondName}`;
        }, {
            sourceEmitter: this.emitter,
            sourceEvent: `${userId}---username-changes`,
            finaleSourceValue,
            data: { userId, computationCounter: 0 },
        });
    }

    getUserSignal(userIdParameter: number) {
        let userId = userIdParameter;

        return this.usersSignals[userId] ??= new EventSignal<User | null, number, { userId: number }>(this.getUserSync(userId), (currentUser, sourceUserId, eventSignal): User | null | undefined => {
            const stateFlags = eventSignal.getStateFlags();
            const isNewSourceValue = (stateFlags & EventSignal.StateFlags.wasSourceSetting) !== 0
                && sourceUserId != null
            ;
            const user = isNewSourceValue
                ? this.getUserSync(sourceUserId)
                : currentUser
            ;

            if (isNewSourceValue && sourceUserId != null && userId !== sourceUserId) {
                userId = sourceUserId;
                eventSignal.data.userId = sourceUserId;
            }

            if (!user) {
                return null;
            }

            if ((stateFlags & EventSignal.StateFlags.wasSourceSettingFromEvent) !== 0) {
                eventSignal.markNextValueAsForced();
            }

            return user;
        }, {
            sourceEmitter: this.emitter,
            sourceEvent: [ 'user-update', 'user-add' ],
            sourceFilter(eventName: unknown, data: User | UserDTO) {
                if (eventName === 'user-update') {
                    return (data as UserDTO)[0] === userId;
                }
                else if (eventName === 'user-add') {
                    return (data as User).id === userId;
                }

                return false;
            },
            sourceMap(_eventName: unknown, _data: unknown) {
                return userId;
            },
            data: {
                userId,
            },
        });
    }
}

async function *_asyncIterator(fromNumber: number, toNumber: number) {
    const array = Array.from({ length: toNumber - fromNumber }, (_, i) => i);

    for (const index of array) {
        yield index;
    }
}
