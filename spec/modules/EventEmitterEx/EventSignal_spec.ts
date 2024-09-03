/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment, promise/no-nesting,jest/prefer-expect-resolves */
/* globals describe, xdescribe, it, xit, expect */
'use strict';

import {
    EventEmitter,
    on as nodeOn,
    once as nodeOnce,
} from "node:events";
import { assertIsDefined, assertIsString } from 'termi@type_guards';
import { assertIsNumber } from 'termi@type_guards';

require('termi@polyfills');

import {
    EventSignal,
    __test__get_signalEventsEmitter,
    __test__get_subscribersEventsEmitter,
} from "../../../modules/EventEmitterEx/EventSignal";
// import { isAbortError } from "../../../common/AbortController";
import { EventEmitterEx, once, on } from "../../../modules/events";
import { ProgressControllerX } from 'termi@ProgressControllerX';
import {
    getEventListeners,
} from '../../../spec_utils/EventTarget_helpers';

const { createSignal } = EventSignal;

const __test__signalEventsEmitter = __test__get_signalEventsEmitter();
const __test__subscribersEventsEmitter = __test__get_subscribersEventsEmitter();

describe('EventSignal', () => {
    const _isEvenNumber = (num: number) => {
        return (num & 1) === 0;
    };

    describe('common cases', () => {
        it('basic case', async function() {
            const $signal1 = new EventSignal(0, {
                description: 'signal1',
            });
            const $signal2 = new EventSignal(100, {
                description: 'signal2',
            });
            const $computedSignal1 = new EventSignal(0, (prev) => {
                void prev;

                const value = $signal1.get();

                if (_isEvenNumber(value)) {
                    return value + $signal2.get();
                }

                return $signal1.get() + 1000;
            }, {
                description: 'computedSignal1',
                deps: [ $signal2 ],
            });

            const value = $signal1.get();

            $signal1.set(value + 1);

            const computedValue = $computedSignal1.get();

            expect(computedValue).toBe(1001);
            expect($computedSignal1.get()).toBe(1001);
            expect($computedSignal1.version).toBe(1);

            $signal1.set($signal1.get() + 1);
            $signal2.set(200);

            expect($computedSignal1.get()).toBe(202);
            expect($computedSignal1.get()).toBe(202);
            expect($computedSignal1.version).toBe(2);

            $signal1.set($signal1.get() + 101);

            expect($computedSignal1.get()).toBe(1103);
            expect($computedSignal1.get()).toBe(1103);
            expect($computedSignal1.version).toBe(3);
        });

        it('show how dependency works', async function() {
            const $numericValue = new EventSignal(0, {
                description: '$numericValue',
            });
            const $numericValueWasEvent1 = new EventSignal(0, (prev) => {
                const value = $numericValue.get();

                if (_isEvenNumber(value)) {
                    return ++prev;
                }

                return prev;
            }, {
                description: '$numericValueWasEvent1',
            });
            const $numericValueIfEvent = new EventSignal(0, (prev) => {
                const value = $numericValue.get();

                if (_isEvenNumber(value)) {
                    return value;
                }

                return prev;
            }, {
                description: '$numericValueIfEvent',
            });
            const $numericValueIfEvent2 = $numericValueIfEvent.map((value) => {
                return value.toString(10);
            });
            //todo: Сейчас этот сигнал работает не так, как хотелось бы:
            // 1. computation срабатывает первый раз даже без изменения зависимостей. Пока ставим -1 в качестве initialValue.
            // 2. computation срабатывает каждый раз, когда зависимости зависимостей изменяются, даже если значение зависимости НЕ изменилось
            const $numericValueWasEvent2 = new EventSignal(-1, (prev) => {
                return ++prev;
            }, {
                description: '$numericValueWasEvent2',
                // todo: Читать флаг isDirty (isNeedToCompute) у deps и выставлять isDirty у текущего EventSignal, только если хотя бы один isDirty
                deps: [ $numericValueIfEvent ],
                // todo: Вызов computation только после получения нового значения в $numericValueIfEvent можно было бы
                //  реализовать через ещё один вид подписки: "triggers" - в этом случае, в обработчик сигнала
                //  signalEventsEmitter могли бы эмититься newValue и prevValue и инвалидация кеша текущего сигнала
                //  происходила только если newValue != prevValue.
                // triggers: [ $numericValueIfEvent ],
            });

            const $numericValue_inc = $numericValue.createMethod<number | void>(function(sourceValue, input = 1) {
                return sourceValue + input;
            });

            $numericValue_inc();

            expect($numericValue.get()).toBe(1);
            expect($numericValueIfEvent.get()).toBe(0);
            expect($numericValueIfEvent2.get()).toBe('0');
            expect($numericValueIfEvent2.version).toBe($numericValueIfEvent.version + 1);
            expect($numericValueWasEvent1.get()).toBe(0);
            expect($numericValueWasEvent2.get()).toBe(0);

            $numericValue_inc();

            expect($numericValue.get()).toBe(2);
            expect($numericValueIfEvent.get()).toBe(2);
            expect($numericValueIfEvent2.get()).toBe('2');
            expect($numericValueIfEvent2.version).toBe($numericValueIfEvent.version + 1);
            expect($numericValueWasEvent1.get()).toBe(1);
            expect($numericValueWasEvent2.get()).toBe(1);

            $numericValue_inc(4);

            expect($numericValue.get()).toBe(6);
            expect($numericValueIfEvent.get()).toBe(6);
            expect($numericValueIfEvent2.get()).toBe('6');
            expect($numericValueIfEvent2.version).toBe($numericValueIfEvent.version + 1);
            expect($numericValueWasEvent1.get()).toBe(2);
            expect($numericValueWasEvent2.get()).toBe(2);

            const _$numericValueIfEvent_version = $numericValueIfEvent.version;

            $numericValue_inc(3);

            expect($numericValue.get()).toBe(9);
            expect($numericValueIfEvent.get()).toBe(6);
            expect($numericValueIfEvent.version).toBe(_$numericValueIfEvent_version);
            expect($numericValueIfEvent2.get()).toBe('6');
            expect($numericValueIfEvent2.version).toBe($numericValueIfEvent.version + 1);
            expect($numericValueWasEvent1.get()).toBe(2);
            //todo: Из-за текущей логики инвалидации кеша из-за изменения зависимости зависимостей, computation вызовить,
            // даже если фактически значение $numericValueIfEvent не изменилось.
            expect($numericValueWasEvent2.get()).toBe(3);

            $numericValue.set(100);

            expect($numericValue.get()).toBe(100);
            expect($numericValueIfEvent.get()).toBe(100);
            expect($numericValueIfEvent.version).toBe(3);
            expect($numericValueIfEvent2.get()).toBe('100');
            expect($numericValueIfEvent2.version).toBe(4);
            expect($numericValueWasEvent1.get()).toBe(3);
            expect($numericValueWasEvent2.get()).toBe(4);
        });

        it('common case with events-updated Store: simple', async function() {
            const ee = new EventEmitterEx();
            const usersStore = new UsersStore(ee);
            // Firstly unknown user
            const $userName = usersStore.getUserNameSignal(1);

            expect($userName.get()).toBe('...loading');
            expect(String($userName)).toBe('...loading');
            expect($userName.version).toBe(1);
            expect($userName.data.userId).toBe(1);

            // add new user with id=9
            ee.emit('user-add', { id: 1, firstName: 'Joe', secondName: 'Bloggs', age: 55 } satisfies User);

            expect($userName.get()).toBe('Joe Bloggs');
            expect($userName.version).toBe(2);

            // update to same name to user with id=1: should be ignored
            ee.emit('user-update', [ 1, 'Joe', 'Bloggs', 24 ] satisfies UserDTO);

            expect($userName.get()).toBe('Joe Bloggs');
            expect($userName.version).toBe(2);

            // update to new name to user with id=1
            ee.emit('user-update', [ 1, 'Josef', void 0, void 0 ] satisfies UserDTO);

            expect($userName.get()).toBe('Josef Bloggs');
            expect($userName.version).toBe(3);

            $userName.destructor();

            // update of name to user with id=1 after signal destroyed: should be ignored
            ee.emit('user-update', [ 1, 'Test', 'Testovsky', void 0 ] satisfies UserDTO);

            expect($userName.get()).toBe('Josef Bloggs');
            expect($userName.version).toBe(3);
        });

        it('common case with events-updated Store: complex', async function() {
            const ee = new EventEmitterEx();
            const usersStore = new UsersStore(ee, defaultUsers);
            const $user1Name = usersStore.getUserNameSignal(1);
            const $user2Name = usersStore.getUserNameSignal(2);
            const $user3Name = usersStore.getUserNameSignal(3, 0);
            // Firstly unknown user
            const $user9Name = usersStore.getUserNameSignal(9);

            for (const { data: { userId } } of [ $user1Name, $user2Name, $user3Name, $user9Name ]) {
                assertIsNumber(userId);

                expect(ee.listenerCount(`${userId}---username-changes`)).toBe(1);
            }

            expect($user1Name.get()).toBe('Vasa Pupkin');
            expect(String($user1Name)).toBe('Vasa Pupkin');
            expect($user1Name.version).toBe(1);
            expect($user1Name.data.userId).toBe(1);
            expect($user2Name.get()).toBe('Jon Dow');
            expect($user2Name.data.userId).toBe(2);
            expect($user3Name.get()).toBe('Kelvin Klein');
            expect($user3Name.data.userId).toBe(3);
            expect($user9Name.get()).toBe('...loading');
            expect(String($user9Name)).toBe('...loading');
            expect($user9Name.version).toBe(1);
            expect($user9Name.data.userId).toBe(9);

            {// user1
                // update secondName user with id=1
                ee.emit('user-update', [ 1, void 0, 'Kapustin', void 0 ] satisfies UserDTO);

                expect($user1Name.get()).toBe('Vasa Kapustin');
                expect($user1Name.version).toBe(2);

                // update age user with id=1
                ee.emit('user-update', [ 1, void 0, void 0, 22 ] satisfies UserDTO);

                expect($user1Name.get()).toBe('Vasa Kapustin');
                expect($user1Name.version).toBe(2);
            }

            {// user9 - previously unknown
                // add new user with id=9
                ee.emit('user-add', { id: 9, firstName: 'Joe', secondName: 'Bloggs', age: 55 } satisfies User);

                expect($user9Name.get()).toBe('Joe Bloggs');
                expect($user9Name.version).toBe(2);
                expect($user9Name.computationsCount).toBe(2);
                expect($user9Name.data.computationCounter).toBe(2);

                // update to same name to user with id=9: should be ignored
                ee.emit('user-update', [ 9, 'Joe', 'Bloggs', 24 ] satisfies UserDTO);

                expect($user9Name.get()).toBe('Joe Bloggs');
                expect($user9Name.version).toBe(2);
                expect($user9Name.computationsCount).toBe(2);
                expect($user9Name.data.computationCounter).toBe(2);

                // explicitly trigger computation
                ee.emit(`${$user9Name.data.userId}---username-changes`, $user9Name.data.userId);

                expect($user9Name.get()).toBe('Joe Bloggs');
                expect($user9Name.version).toBe(2);
                expect($user9Name.computationsCount).toBe(3);
                expect($user9Name.data.computationCounter).toBe(3);

                // update to new name to user with id=9
                ee.emit('user-update', [ 9, 'Josef', void 0, void 0 ] satisfies UserDTO);

                expect($user9Name.get()).toBe('Josef Bloggs');
                expect($user9Name.version).toBe(3);
                expect($user9Name.computationsCount).toBe(4);
                expect($user9Name.data.computationCounter).toBe(4);
            }

            $user1Name.destructor();
            $user2Name.destructor();
            $user3Name.destructor();
            $user9Name.destructor();

            expect($user3Name.get()).toBe('--user not found--');
            expect($user3Name.version).toBe(2);

            for (const { data: { userId } } of [ $user1Name, $user2Name, $user3Name, $user9Name ]) {
                expect(ee.listenerCount(`${userId}---username-changes`)).toBe(0);
            }

            // update of name to user with id=9 after signal destroyed: should be ignored
            ee.emit('user-update', [ 9, 'Test', 'Testovsky', void 0 ] satisfies UserDTO);

            expect($user9Name.get()).toBe('Josef Bloggs');
            expect($user9Name.version).toBe(3);
            expect($user9Name.computationsCount).toBe(4);
        });
    });

    describe('detect problems', function() {
        it('cycles dep', async function() {
            const computedSignal1: EventSignal<number> = new EventSignal(0, () => {
                return computedSignal1.get() + 1;
            }, {
                description: 'computedSignal1',
            });

            expect(() => {
                computedSignal1.get();
            }).toThrow('Depends on own value');
        });

        it('detects slightly larger cycles', () => {
            const computedSignal1: EventSignal<number> = EventSignal.createSignal(0, () => computedSignal2.get());
            const computedSignal2: EventSignal<number> = createSignal(0, () => computedSignal1.get());
            const computedSignal3 = createSignal(0, () => computedSignal2.get());

            expect(() => {
                computedSignal3.get();
            }).toThrow('Now in computing state (cycle deps?)');
        });
    });

    describe('with options.[sourceMap/sourceFilter]', function() {
        it('EventEmitter - with map', async function() {
            const ee = new EventEmitterEx();
            const $signal1 = new EventSignal(0, {
                description: 'signal from another emitter',
                sourceEmitter: ee,
                sourceEvent: 'test',
                sourceMap(eventName, value: { data: number }) {
                    return value.data;
                },
            });

            expect($signal1.get()).toBe(0);

            ee.emit('test', { data: 1 });

            expect($signal1.get()).toBe(1);

            $signal1.destructor();

            expect(ee.listenerCount('test')).toBe(0);

            expect($signal1.get()).toBe(1);
        });

        it('EventTarget - with map', async function() {
            const $inputElement = document.createElement('input');

            $inputElement.value = 'placeholder';

            const $signal1 = new EventSignal($inputElement.value, {
                description: 'signal from another emitter',
                sourceEmitter: $inputElement,
                sourceEvent: 'change',
                sourceMap(eventName, event: { target: { value: string } }) {
                    return event.target.value;
                },
            });

            expect(getEventListeners($inputElement, 'change')).toHaveLength(1);

            expect($signal1.get()).toBe('placeholder');

            $inputElement.value = 'string 1';
            $inputElement.dispatchEvent(new Event('change'));

            expect($signal1.get()).toBe('string 1');

            $signal1.destructor();

            expect(getEventListeners($inputElement, 'change')).toHaveLength(0);

            expect($signal1.get()).toBe('string 1');
        });

        it('EventEmitter - with filter', async function() {
            const ee = new EventEmitterEx();
            const $signal1 = new EventSignal(0, {
                description: 'signal from another emitter',
                sourceEmitter: ee,
                sourceEvent: 'test',
                sourceFilter(eventName, value: number) {
                    return value % 2 === 0;
                },
            });

            expect($signal1.get()).toBe(0);

            ee.emit('test', 1);

            expect($signal1.get()).toBe(0);

            ee.emit('test', 2);

            expect($signal1.get()).toBe(2);

            ee.emit('test', 3);

            expect($signal1.get()).toBe(2);

            ee.emit('test', 4);

            expect($signal1.get()).toBe(4);

            $signal1.destructor();

            expect(ee.listenerCount('test')).toBe(0);
        });

        it('EventEmitter - with map and filter', async function() {
            const ee = new EventEmitterEx();
            const $signal1 = new EventSignal(0, {
                description: 'signal from another emitter',
                sourceEmitter: ee,
                sourceEvent: [ 'test1', 'test2' ],
                sourceFilter(eventName, value: { data: number }) {
                    if (eventName === 'test1') {
                        return value.data % 2 === 0;
                    }

                    return value.data % 2 === 1;
                },
                sourceMap(eventName, value: { data: number }) {
                    return value.data;
                },
            });

            expect($signal1.get()).toBe(0);

            {
                ee.emit('test1', { data: 1 });

                expect($signal1.get()).toBe(0);

                ee.emit('test2', { data: 1 });

                expect($signal1.get()).toBe(1);
            }
            {
                ee.emit('test2', { data: 2 });

                expect($signal1.get()).toBe(1);

                ee.emit('test1', { data: 2 });

                expect($signal1.get()).toBe(2);
            }
            {
                ee.emit('test1', { data: 3 });

                expect($signal1.get()).toBe(2);

                ee.emit('test2', { data: 3 });

                expect($signal1.get()).toBe(3);
            }

            $signal1.destructor();

            expect(ee.listenerCount('test1')).toBe(0);
            expect(ee.listenerCount('test2')).toBe(0);
        });
    });

    describe('with computation', function() {
        it('computation value', function() {
            const $number = new EventSignal(0);
            const $template = new EventSignal('Number value is #{number}');
            const $string = new EventSignal('', () => {
                return $template.get().replaceAll('#{number}', $number.get().toString());
            });

            expect($string.get()).toBe('Number value is 0');

            $number.set(1);

            expect($string.get()).toBe('Number value is 1');
            expect($string.version).toBe(2);
            expect($string.get()).toBe('Number value is 1');
            expect($string.version).toBe(2);

            $template.set('Value is: #{number}');

            expect($string.get()).toBe('Value is: 1');
        });

        it('EventEmitter - complex: computation with options.[sourceMap/sourceFilter]', async function() {
            const ee = new EventEmitterEx();
            const kSomeEvent = Symbol('kSomeEvent');
            const $signal = new EventSignal(0, {
                description: '$signal',
            });
            const $complexSignal = new EventSignal<string, number>('', (prevValue, sourceValue) => {
                void prevValue;
                void sourceValue;

                if (typeof sourceValue === 'number' && sourceValue % 2 === 0) {
                    return `was even, new value is ${$signal.get()}, sourceValue is ${sourceValue}`;
                }

                return String($signal.get());
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

            expect($complexSignal.get()).toBe('0');

            // should ignore this event
            ee.emit('test1', { data: 1 });

            expect($complexSignal.get()).toBe('0');

            ee.emit('test1', { data: 2 });

            expect($complexSignal.get()).toBe('was even, new value is 0, sourceValue is 2');

            $signal.set(1);

            expect($complexSignal.get()).toBe('was even, new value is 1, sourceValue is 2');

            ee.emit(2, 222);

            expect($complexSignal.get()).toBe('was even, new value is 1, sourceValue is 222');

            ee.emit(2, 3);

            expect($complexSignal.get()).toBe('was even, new value is 1, sourceValue is 222');

            ee.emit(2, 8);

            expect($complexSignal.get()).toBe('was even, new value is 1, sourceValue is 8');

            ee.emit(kSomeEvent, (562).toString(16));

            expect($complexSignal.get()).toBe('was even, new value is 1, sourceValue is 562');

            ee.emit('test1', { data: 2 });

            expect($complexSignal.get()).toBe('was even, new value is 1, sourceValue is 2');

            $signal.set(32);

            expect($complexSignal.get()).toBe('was even, new value is 32, sourceValue is 2');

            const currentVersion = $complexSignal.version;

            $complexSignal.set(400);

            expect($complexSignal.version).toBe(currentVersion);
            expect($complexSignal.get()).toBe('was even, new value is 32, sourceValue is 400');
            expect($complexSignal.version).toBe(currentVersion + 1);

            $complexSignal.destructor();

            ee.emit(2, 8);
            $signal.set(100);

            expect($complexSignal.get()).toBe('was even, new value is 32, sourceValue is 400');

            expect(ee.listenerCount('test1')).toBe(0);
            expect(ee.listenerCount(2)).toBe(0);
            expect(ee.listenerCount(kSomeEvent)).toBe(0);
            expect(__test__signalEventsEmitter.listenerCount($signal.eventName)).toBe(0);
        });

        it('computation value - return object', function() {
            const $object = new EventSignal<{ numericValue: number }, number>({ numericValue: 0 }, (object, sourceValue) => {
                if (sourceValue != null) {
                    object.numericValue = sourceValue;

                    return object;
                }
            });

            expect($object.get().numericValue).toBe(0);
            expect($object.version).toBe(0);
            expect($object.computationsCount).toBe(1);

            $object.set(1);

            expect($object.get().numericValue).toBe(1);
            expect($object.version).toBe(1);
            expect($object.computationsCount).toBe(2);
            expect($object.get().numericValue).toBe(1);

            $object.set(1);

            expect($object.get().numericValue).toBe(1);
            expect($object.version).toBe(1);
            expect($object.computationsCount).toBe(2);
        });
    });

    // todo: Async computation is experimental!
    describe('with async computation', function() {
        it('async computation1', async function() {
            const usersStore = new UsersStore(new EventEmitterEx(), defaultUsers);
            const user1 = usersStore.getUserSync(1);
            const user2 = usersStore.getUserSync(2);

            usersStore.resetLastAsyncGetUser();

            expect(user1).toBeDefined();
            expect(user2).toBeDefined();

            const $currentUser = new EventSignal<UserOrNull, number>(Promise.resolve(null), async (_, userId) => {
                expect(_?.then).toBeUndefined();

                return await usersStore.getUser(userId);
            });

            expect(usersStore.lastAsyncGetUser).toBeUndefined();

            await Promise.resolve();
            await Promise.resolve();

            expect(usersStore.lastAsyncGetUser).toBeUndefined();

            const promise = $currentUser.get();

            expect(await promise).toBeNull();

            expect(usersStore.lastAsyncGetUser).toBeUndefined();

            $currentUser.set(1);

            expect(await $currentUser.get()).toBe(user1);
            expect(usersStore.lastAsyncGetUser).toBe(1);
            expect($currentUser.computationsCount).toBe(2);

            usersStore.resetLastAsyncGetUser();

            expect(await $currentUser.get()).toBe(user1);
            expect(usersStore.lastAsyncGetUser).toBeUndefined();
            expect($currentUser.computationsCount).toBe(2);
            expect($currentUser.version).toBe(2);

            // set to same value
            $currentUser.set(1);

            expect(await $currentUser.get()).toBe(user1);
            expect($currentUser.computationsCount).toBe(2);
            expect($currentUser.version).toBe(2);

            queueMicrotask(() => {
                queueMicrotask(() => {
                    $currentUser.set(2);
                });
            });

            expect(await $currentUser.toPromise()).toBe(user2);
            expect($currentUser.computationsCount).toBe(3);
            expect($currentUser.version).toBe(3);
        });

        it('async computation2', async function() {
            const usersStore = new UsersStore(new EventEmitterEx(), defaultUsers);
            const $currentUser = new EventSignal<UserOrNull, number>(null, (_, userId) => {
                if ($currentUser.computationsCount < 2) {
                    if (_ !== null) {
                        throw new Error('On first computation in this case, prev value should be null');
                    }
                }
                else {
                    assertIsDefined(_);
                }

                return usersStore.getUser(userId);
            });
            const user1 = usersStore.getUserSync(1);
            const user2 = usersStore.getUserSync(2);

            expect(user1).toBeDefined();
            expect(user2).toBeDefined();

            const promise = $currentUser.get();

            expect(await promise).toBeNull();

            $currentUser.set(1);

            expect(await $currentUser.get()).toBe(user1);

            $currentUser.set(2);

            expect(await $currentUser.get()).toBe(user2);
        });
    });

    it('Dynamic dependencies', () => {
        const states = Array.from('abcdefgh').map((s) => createSignal(s));
        const sources = createSignal(states);
        const computed = createSignal('', () => {
            let str = '';

            for (const state of sources.get()) {
                str += state.get();
            }

            return str;
        });

        expect(computed.get()).toBe('abcdefgh');

        sources.set(states.slice(0, 5));
        expect(computed.get()).toBe('abcde');

        sources.set(states.slice(3));
        expect(computed.get()).toBe('defgh');
    });

    describe('destructor', function() {
        it('seal last value after destruction', () => {
            const $source = createSignal(0);
            const $computed = createSignal('', () => {
                return `Value is: ${$source.get()}`;
            });

            expect($computed.get()).toBe('Value is: 0');

            $source.set(1);
            expect($computed.get()).toBe('Value is: 1');

            $source.destructor();

            $source.set(2);
            expect($computed.get()).toBe('Value is: 1');
            expect($source.get()).toBe(1);
        });

        it('set finaleValue value after destruction #1', () => {
            const $source = new EventSignal('', {
                description: '$source',
                finaleValue: '',
            });
            const $otherSource = new EventSignal(0, (prev, sourceValue) => {
                return sourceValue ?? prev;
            }, {
                description: '$otherSource',
            });
            const $computed = new EventSignal('', () => {
                return `Source value is: "${$source.get()}" and other source is: ${$otherSource.get()}`;
            }, {
                description: '$computed',
            });

            expect($computed.get()).toBe('Source value is: "" and other source is: 0');

            $otherSource.set(1);
            $source.set('test');

            expect($computed.get()).toBe('Source value is: "test" and other source is: 1');

            $source.destructor();

            expect($computed.get()).toBe('Source value is: "" and other source is: 1');
            expect($source.get()).toBe('');

            $source.set('test');
            $otherSource.set(2);

            expect($computed.get()).toBe('Source value is: "" and other source is: 2');
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

            const $user = new EventSignal<User | null>(user, {
                description: '$user',
                finaleValue: null,
            });
            const $userAge = new EventSignal(24, {
                description: '$userAge',
            });
            const $computed = createSignal('', () => {
                return `Person name is: ${$user.get()} with age=${$userAge.get()}`;
            }, {
                description: '$computed',
            });

            expect($computed.get()).toBe('Person name is: John Doe with age=24');
            expect($computed.version).toBe(1);

            $user.set({
                firstName: 'Joe',
                lastName: 'Blow',
                toString() {
                    return `${this.firstName} ${this.lastName}`;
                },
            });
            $userAge.set(36);

            expect($computed.get()).toBe('Person name is: Joe Blow with age=36');
            expect($computed.version).toBe(2);

            $user.destructor();

            expect($computed.get()).toBe('Person name is: null with age=36');
            expect($user.get()).toBeNull();
            expect($computed.version).toBe(3);

            // this set will be ignored
            $user.set(user);

            expect($computed.get()).toBe('Person name is: null with age=36');
            expect($user.get()).toBeNull();
            expect($computed.version).toBe(3);

            // this set will be ignored
            $user.set(user);
            $userAge.set(17);

            expect($computed.get()).toBe('Person name is: null with age=17');
            expect($computed.version).toBe(4);
        });
    });

    describe('working with EventEmitter api', function() {
        describe('addListener', function() {
            it('should call listener - sync mode', async () => {
                const $firstName = new EventSignal('...', {
                    description: '$firstName',
                });
                const $secondName = new EventSignal('...', {
                    description: '$secondName',
                });
                const $fullName = new EventSignal('', () => {
                    return `${$firstName} ${$secondName}`;
                }, {
                    description: '$fullName',
                    // subscribe to deps
                    deps: [ $firstName, $secondName ],
                    data: 0,
                });
                const names = [
                    { firstName: 'Jon', secondName: 'Dow' },
                    { firstName: 'Rose', secondName: 'Crown' },
                    { firstName: 'Steve', secondName: 'King' },
                ];
                const values: (ReturnType<typeof $fullName.get>)[] = [];
                const listener: Parameters<typeof $fullName.addListener>[0] = newValue => {
                    values.push(newValue);
                };

                $fullName.addListener(listener);

                for (let index = 0 ; index < 3 ; index++) {
                    const { firstName, secondName } = names.at(index)!;

                    $firstName.set(firstName);
                    $secondName.set(secondName);
                }

                // values SHOULD BE empty error due listeners is calling in next microtask
                expect(values).toEqual([]);

                // await next microtask
                await Promise.resolve();

                const lasNameItem = names.at(-1)!;

                expect(values).toEqual([
                    `${lasNameItem.firstName} ${lasNameItem.secondName}`,
                ]);

                $fullName.removeListener(listener);

                expect(__test__subscribersEventsEmitter.listenerCount($fullName.eventName)).toBe(0);
            });

            it('should call listener - async mode', async () => {
                const $firstName = new EventSignal('...', {
                    description: '$firstName',
                });
                const $secondName = new EventSignal('...', {
                    description: '$secondName',
                });
                const $fullName = new EventSignal('', () => {
                    return `${$firstName} ${$secondName}`;
                }, {
                    description: '$fullName',
                    // subscribe to deps
                    deps: [ $firstName, $secondName ],
                    data: 0,
                });
                const names = [
                    { firstName: 'Jon', secondName: 'Dow' },
                    { firstName: 'Rose', secondName: 'Crown' },
                    { firstName: 'Steve', secondName: 'King' },
                ];
                const values: (ReturnType<typeof $fullName.get>)[] = [];

                $fullName.addListener(newValue => {
                    values.push(newValue);
                });

                for await (const index of _asyncIterator(0, 3)) {
                    const { firstName, secondName } = names.at(index)!;

                    $firstName.set(firstName);
                    $secondName.set(secondName);
                }

                expect(values).toEqual(names.map(({ firstName, secondName }) => {
                    return `${firstName} ${secondName}`;
                }));
            });

            it('should remove all listeners after destroyed', async () => {
                const $counter = new EventSignal(0);
                const $computed = new EventSignal('', () => {
                    return `Counter is: ${$counter.get()}`;
                }, {
                    finaleValue: `Counter is: destroyed`,
                });
                const values: (ReturnType<typeof $computed.get>)[] = [];

                expect(__test__signalEventsEmitter.listenerCount($computed.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount($computed.eventName)).toBe(0);
                expect(__test__signalEventsEmitter.listenerCount($counter.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount($counter.eventName)).toBe(0);

                $computed.addListener(newValue => {
                    values.push(newValue);
                });

                expect(__test__signalEventsEmitter.listenerCount($computed.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount($computed.eventName)).toBe(1);
                expect(__test__signalEventsEmitter.listenerCount($counter.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount($counter.eventName)).toBe(0);

                // add `Counter is: 0` to values and subscribe to $counter
                $computed.get();

                $counter.set(prev => prev + 1);

                expect($counter.get()).toBe(1);
                expect(values).toEqual([ `Counter is: 0` ]);

                // add `Counter is: 1` to values
                await Promise.resolve();

                expect(__test__signalEventsEmitter.listenerCount($computed.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount($computed.eventName)).toBe(1);
                expect(__test__signalEventsEmitter.listenerCount($counter.eventName)).toBe(1);
                expect(__test__subscribersEventsEmitter.listenerCount($counter.eventName)).toBe(0);

                expect($counter.get()).toBe(1);
                expect(values).toEqual([ `Counter is: 0`, `Counter is: 1` ]);

                // add `Counter is: destroyed` to values synchronously
                $computed.destructor();

                expect(__test__signalEventsEmitter.listenerCount($computed.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount($computed.eventName)).toBe(0);
                expect(__test__signalEventsEmitter.listenerCount($counter.eventName)).toBe(0);
                expect(__test__subscribersEventsEmitter.listenerCount($counter.eventName)).toBe(0);

                // `Counter is: destroyed` already should be in values BEFORE calling $computed.get()
                expect(values).toEqual([ `Counter is: 0`, `Counter is: 1`, `Counter is: destroyed` ]);
                expect($computed.get()).toBe(`Counter is: destroyed`);
            });
        });

        describe('once', function() {
            it('should work with once', async () => {
                const $source = new EventSignal(0);
                const $computed = new EventSignal('', () => {
                    return `Value is: ${$source.get()}`;
                });
                const promise_for_$source = nodeOnce($source, '');
                const promise_for_$computed = once($computed, '');

                expect($computed.get()).toBe('Value is: 0');

                const [ valueFromCompute ] = await promise_for_$computed;

                expect(valueFromCompute).toBe('Value is: 0');

                $source.set(1);
                expect($computed.get()).toBe('Value is: 1');

                const [ valueFromSource ] = await promise_for_$source;

                expect(valueFromSource).toBe(1);

                $source.destructor();

                $source.set(2);
                expect($computed.get()).toBe('Value is: 1');
                expect($source.get()).toBe(1);
            });
        });

        describe('on', function() {
            it('should work with nodejs.events.on *1', async () => {
                const $source = new EventSignal(0, {
                    description: '$source',
                });
                const $computed = new EventSignal('', () => {
                    return `Value is: ${$source.get()}`;
                }, {
                    description: '$computed',
                });

                // subscribe to deps
                $computed.get();

                queueMicrotask(async () => {
                    for await (const index of _asyncIterator(0, 3)) {
                        $source.set(index);
                    }

                    $computed.destructor();
                });

                let index = 1;

                for await (const [ value ] of nodeOn($computed as unknown as EventEmitter, '')) {
                    expect(value).toBe(`Value is: ${index++}`);

                    // todo: Сейчас нет "правильного" способа остановить asyncIterator генерируемый events.on.
                    //  Нужно что-то придумать.
                    if (index === 2) {
                        break;
                    }
                }
            });

            it('should work with nodejs.events.on *2', async () => {
                const $firstName = new EventSignal('...', {
                    description: '$firstName',
                });
                const $secondName = new EventSignal('...', {
                    description: '$secondName',
                });
                const $fullName = new EventSignal('', () => {
                    return `${$firstName} ${$secondName}`;
                }, {
                    description: '$fullName',
                    // subscribe to deps
                    deps: [ $firstName, $secondName ],
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

                        $firstName.set(firstName);
                        $secondName.set(secondName);
                    }

                    $fullName.destructor();
                });

                const values: (ReturnType<typeof $fullName.get>)[] = [];

                for await (const [ value ] of nodeOn($fullName as unknown as EventEmitter, '')) {
                    assertIsString(value);

                    values.push(value);

                    $fullName.data++;

                    // todo: Сейчас нет "правильного" способа остановить asyncIterator генерируемый events.on.
                    //  Нужно что-то придумать.
                    if ($fullName.data === 3) {
                        break;
                    }
                }

                expect(values).toEqual(names.map(({ firstName, secondName }) => {
                    return `${firstName} ${secondName}`;
                }));
            });

            it('should work with EventEmitterEx.on *1', async () => {
                const $source = new EventSignal(0, {
                    description: '$source',
                });
                const $computed = new EventSignal('', () => {
                    return `Value is: ${$source.get()}`;
                }, {
                    description: '$computed',
                });

                // subscribe to deps
                $computed.get();

                queueMicrotask(async () => {
                    for await (const index of _asyncIterator(0, 5)) {
                        $source.set(index);
                    }

                    $computed.destructor();
                });

                const values: string[] = [];
                let index = 1;

                for await (const [ value ] of on($computed, '')) {
                    expect(value).toBe(`Value is: ${index++}`);

                    assertIsString(value);

                    values.push(value);

                    // todo: Сейчас нет "правильного" способа остановить asyncIterator генерируемый EventEmitterEx.on.
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

            it('should work with EventEmitterEx.on *2', async () => {
                const $firstName = new EventSignal('...', {
                    description: '$firstName',
                });
                const $secondName = new EventSignal('...', {
                    description: '$secondName',
                });
                const $fullName = new EventSignal('', () => {
                    return `${$firstName} ${$secondName}`;
                }, {
                    description: '$fullName',
                    // subscribe to deps
                    deps: [ $firstName, $secondName ],
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

                        $firstName.set(firstName);
                        $secondName.set(secondName);
                    }

                    $fullName.destructor();
                });

                const values: (ReturnType<typeof $fullName.get>)[] = [];

                for await (const [ value ] of on($fullName, '')) {
                    assertIsString(value);

                    values.push(value);

                    $fullName.data++;

                    // todo: Сейчас нет "правильного" способа остановить asyncIterator генерируемый events.on.
                    //  Нужно что-то придумать.
                    if ($fullName.data === 3) {
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
            const ab = new AbortController();
            const $source = new EventSignal(0);
            const $computed = new EventSignal('', () => {
                return `Value is: ${$source.get()}`;
            }, {
                signal: ab.signal,
            });

            expect(getEventListeners(ab.signal, 'abort')).toHaveLength(1);

            expect($computed.get()).toBe('Value is: 0');

            $source.set(1);

            expect($computed.get()).toBe('Value is: 1');
            expect($source.get()).toBe(1);

            ab.abort(null);

            $source.set(2);

            expect($computed.get()).toBe('Value is: 1');
            expect($source.get()).toBe(2);

            expect(getEventListeners(ab.signal, 'abort')).toHaveLength(0);
        });

        it('ProgressControllerX#abort() should lead to call EventSignal#destructor', async () => {
            const ab = new ProgressControllerX();
            const $source = new EventSignal(0);
            const $computed = new EventSignal('', () => {
                return `Value is: ${$source.get()}`;
            }, {
                signal: ab.signal,
            });

            expect(getEventListeners(ab.signal, 'abort')).toHaveLength(1);

            expect($computed.get()).toBe('Value is: 0');

            $source.set(1);

            expect($computed.get()).toBe('Value is: 1');
            expect($source.get()).toBe(1);

            ab.abort(null);

            $source.set(2);

            expect($computed.get()).toBe('Value is: 1');
            expect($source.get()).toBe(2);

            expect(getEventListeners(ab.signal, 'abort')).toHaveLength(0);
        });
    });

    describe('working as AsyncIterable', function() {
        it('should work with for-await-of', async () => {
            const $source = new EventSignal(0, {
                description: '$source',
            });
            const $computed = new EventSignal('', () => {
                return `Value is: ${$source.get()}`;
            }, {
                description: '$computed',
            });

            // subscribe to deps
            $computed.get();

            queueMicrotask(async () => {
                for await (const index of _asyncIterator(0, 5)) {
                    // index === 0 will not trigger change event due it's the same value as initial
                    $source.set(index);

                    // Если не будет столько ожидания `Promise.resolve()`, то `$computed.destructor()` выполниться
                    //  слишком рано относительно `for await (const value of $computed)`.
                    await Promise.resolve();
                    await Promise.resolve();
                    await Promise.resolve();
                }

                $computed.destructor();
            });

            const values: string[] = [];

            for await (const value of $computed) {
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
            const $source = new EventSignal(0, {
                description: '$source',
            });
            const $computed = new EventSignal('', () => {
                return `Value is: ${$source.get()}`;
            }, {
                description: '$computed',
            });

            // subscribe to deps
            $computed.get();

            queueMicrotask(async () => {
                for await (const index of _asyncIterator(0, 5)) {
                    $source.set(index);
                }

                $computed.destructor();
                /*
                todo: В такой конфигурации:
                 1. Если $computed резолвит промисы при закрытии: `for await` ниже получит дубликат 'Value is: 3'
                 2. Если $computed реджектит промисы при закрытии: `for await` упадёт с ошибкой
                queueMicrotask(() => {
                    $computed.destructor();
                });
                */
            });

            const values: string[] = [];

            for await (const value of $computed) {
                assertIsString(value);

                values.push(value);
            }

            // Тут наблюдается эффект "пропуска кадров", когда некоторые изменения значения не попадают в результат
            expect(values).toEqual([
                'Value is: 1',
                'Value is: 4',
            ]);
            // $computed закрылся ДО запроса самого последнего обновления, поэтому в нём НЕ самое последнее значение из $source
            expect($computed.get()).toBe('Value is: 4');
            expect($source.get()).toBe(4);
        });

        it('should handle destructor as iterator stop with for-await-of *2', async () => {
            const $source = new EventSignal(0, {
                description: '$source',
            });
            const $computed1 = new EventSignal('', () => {
                return `Value is: ${$source.get()}`;
            }, {
                description: '$computed1',
            });
            const $computed2 = new EventSignal('', () => {
                return `(2) Value is: ${$source.get()}`;
            }, {
                description: '$computed2',
                deps: [ $source ],
            });

            // subscribe to deps
            $computed1.get();

            queueMicrotask(async () => {
                for await (const index of _asyncIterator(0, 5)) {
                    $source.set(index);
                }

                $computed1.destructor();
                $computed2.destructor();
            });

            const values1: string[] = [];
            const values2: string[] = [];

            await Promise.all([
                (async () => {
                    for await (const value of $computed1) {
                        expect(value).toContain(`Value is: `);

                        assertIsString(value);

                        values1.push(value);
                    }
                })(),
                (async () => {
                    for await (const value of $computed2) {
                        expect(value).toContain(`(2) Value is: `);

                        assertIsString(value);

                        values2.push(value);
                    }
                })(),
            ]);

            expect(values1).toEqual([
                'Value is: 1',
                'Value is: 4',
            ]);

            expect(values2).toEqual([
                '(2) Value is: 0',
                '(2) Value is: 3',
            ]);

            // $computed1 закрылся ДО запроса самого последнего обновления, поэтому в нём НЕ самое последнее значение из $source
            expect($computed1.get()).toBe('Value is: 4');
            // $computed2 закрылся ПОСЛЕ самого последнего обновления, поэтому в нём самое последнее значение из $source (почему так, хз и ещё предстоит выяснить)
            expect($computed2.get()).toBe('(2) Value is: 3');
            expect($source.get()).toBe(4);
        });

        it('should handle destructor as iterator stop with for-await-of *3', async () => {
            const $firstName = new EventSignal('...', {
                description: '$firstName',
            });
            const $secondName = new EventSignal('...', {
                description: '$secondName',
            });
            const $fullName = new EventSignal('', () => {
                return `${$firstName} ${$secondName}`;
            }, {
                description: '$fullName',
                // subscribe to deps
                deps: [ $firstName, $secondName ],
            });
            const names = [
                { firstName: 'Jon', secondName: 'Dow' },
                { firstName: 'Rose', secondName: 'Crown' },
                { firstName: 'Steve', secondName: 'King' },
            ];

            queueMicrotask(async () => {
                for await (const index of _asyncIterator(0, 3)) {
                    const { firstName, secondName } = names.at(index)!;

                    $firstName.set(firstName);
                    $secondName.set(secondName);
                }

                $fullName.destructor();
            });

            const values: (ReturnType<typeof $fullName.get>)[] = [];

            for await (const value of $fullName) {
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
                const $firstName = new EventSignal('Jon');
                const $secondName = new EventSignal('Dow');
                const $fullName = new EventSignal('', () => {
                    return `${$firstName.get()} ${$secondName.get()}`;
                });

                // get first value and subscribe to deps
                expect($fullName.get()).toBe('Jon Dow');

                queueMicrotask(() => {
                    // inner queueMicrotask is required!!!
                    // microtask queue: queueMicrotask#1, await $computed (calling $computed.then), queueMicrotask#2
                    queueMicrotask(() => {
                        $firstName.set('Vasa');
                        $secondName.set('Pupkin');
                    });
                });

                const newValue = await $fullName.toPromise();

                expect(newValue).toBe('Vasa Pupkin');
            });

            it('should resolved with new value - using await', async () => {
                const $store = new EventSignal(0);
                const $computed = new EventSignal('', function() {
                    return `Value is: ${$store.get()}`;
                });

                expect($computed.get()).toBe('Value is: 0');

                queueMicrotask(() => {
                    // inner queueMicrotask is required!!!
                    // microtask queue: queueMicrotask#1, await $computed (calling $computed.then), queueMicrotask#2
                    queueMicrotask(() => {
                        $store.set(1);
                    });
                });

                const newValue = await $computed.toPromise();

                expect(newValue).toBe('Value is: 1');
            });

            it('should resolved with new value - using Promise.resolve', async () => {
                const $store = new EventSignal(0);
                const $computed = new EventSignal('', function() {
                    return `Value is: ${$store.get()}`;
                });

                expect($computed.get()).toBe('Value is: 0');

                queueMicrotask(() => {
                    // inner queueMicrotask is required!!!
                    // microtask queue: queueMicrotask#1, Promise.resolve($computed) (calling $computed.then), queueMicrotask#2
                    queueMicrotask(() => {
                        $store.set(1);
                    });
                });

                const promise = Promise.resolve($computed.toPromise());

                const newValue = await promise;

                expect(newValue).toBe('Value is: 1');
            });

            it('should resolved with new value - using then', async () => {
                const $store = new EventSignal(0);
                const $computed = new EventSignal('', function() {
                    return `Value is: ${$store.get()}`;
                });

                expect($computed.get()).toBe('Value is: 0');

                queueMicrotask(() => {
                    $store.set(1);
                });

                const promise = $computed.toPromise();

                const newValue = await promise;

                expect(newValue).toBe('Value is: 1');
            });

            describe('rejection', function() {
                it('should rejected after destroying - using await', async () => {
                    const $store = new EventSignal(0);
                    const $computed = new EventSignal('', function() {
                        return `Value is: ${$store.get()}`;
                    });
                    let error;

                    queueMicrotask(() => {
                        // inner queueMicrotask is required!!!
                        // microtask queue: queueMicrotask#1, await $computed (calling $computed.then), queueMicrotask#2
                        queueMicrotask(() => {
                            $computed.destructor();
                        });
                    });

                    try {
                        await $computed.toPromise();
                    }
                    catch (err) {
                        error = err;
                    }

                    expect(String(error)).toContain('EventSignal object is destroyed');

                    error = void 0;

                    try {
                        await $computed.toPromise();
                    }
                    catch (err) {
                        error = err;
                    }

                    expect(String(error)).toContain('EventSignal object is destroyed');
                });

                it('sshould rejected after destroying - using Promise.resolve', async () => {
                    const $store = new EventSignal(0);
                    const $computed = new EventSignal('', function() {
                        return `Value is: ${$store.get()}`;
                    });
                    let error;

                    queueMicrotask(() => {
                        // inner queueMicrotask is required!!!
                        // microtask queue: queueMicrotask#1, Promise.resolve($computed) (calling $computed.then), queueMicrotask#2
                        queueMicrotask(() => {
                            $computed.destructor();
                        });
                    });

                    try {
                        await Promise.resolve($computed.toPromise());
                    }
                    catch (err) {
                        error = err;
                    }

                    expect(String(error)).toContain('EventSignal object is destroyed');

                    error = void 0;

                    try {
                        await Promise.resolve($computed.toPromise());
                    }
                    catch (err) {
                        error = err;
                    }

                    expect(String(error)).toContain('EventSignal object is destroyed');
                });

                it('should rejected after destroying - using then', async () => {
                    const $store = new EventSignal(0);
                    const $computed = new EventSignal('', function() {
                        return `Value is: ${$store.get()}`;
                    });
                    let error;

                    queueMicrotask(() => {
                        $computed.destructor();
                    });

                    try {
                        await $computed.toPromise();
                    }
                    catch (err) {
                        error = err;
                    }

                    expect(String(error)).toContain('EventSignal object is destroyed');

                    error = void 0;

                    try {
                        await $computed.toPromise();
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
            const $store = new EventSignal(0, {
                description: '$store',
            });
            const $computedStore1 = new EventSignal('', function() {
                const value = $store.get();

                if (value % 2 === 0) {
                    throw new TypeError('Invalid value');
                }

                return `value=${value}`;
            }, {
                description: '$computedStore1',
            });
            const $computedStore2 = new EventSignal<[ key: string, value: string ]>([ '', '' ], function() {
                const { 0: key, 1: value } = String($computedStore1).split('=');

                assertIsString(key);
                assertIsString(value);

                return [ key, value ];
            }, {
                description: '$computedStore2',
            });

            // const fn = $computedStore1.createEvent<number>((a, d, b) => {
            //     return b.toString();
            // });
            //
            // fn(2);

            $store.set(1);

            expect($computedStore2.get()).toEqual([ 'value', '1' ]);
            expect($computedStore2.version).toBe(1);

            $store.set(2);

            expect($computedStore2.get()).toEqual([ 'value', '1' ]);
            expect($computedStore2.version).toBe(1);

            $store.set(3);

            expect($computedStore2.get()).toEqual([ 'value', '3' ]);
            expect($computedStore2.version).toBe(2);
        });
    });

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

    constructor(public emitter: EventEmitterEx, users?: User[]) {
        emitter.addListener('user-add', (user: User) => {
            const { id } = user;

            if (!this.getUserSync(id)) {
                this.users.push(user);

                emitter.emit(`${id}---username-changes`, id);
            }
        });
        emitter.addListener('user-update', (userDTO: UserDTO) => {
            const userId = userDTO[0];
            const user = this.users.find(user => user.id === userId);

            if (user) {
                const [
                    ,
                    new_firstName,
                    new_secondName,
                    new_age,
                ] = userDTO;
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

    async getUser(userId: number | undefined) {
        this.lastAsyncGetUser = userId;

        return userId ? this.users.find(user => user.id === userId) : null;
    }

    getUserSync(userId: number | undefined) {
        return userId ? this.users.find(user => user.id === userId) : null;
    }

    getUserNameSignal(userId: number, finaleSourceValue?: number) {
        return this.userNameSignalSignals[userId] ??= new EventSignal('', (prevValue, sourceValue, data) => {
            data.computationCounter++;

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
}

async function *_asyncIterator(fromNumber: number, toNumber: number) {
    const array = Array.from({ length: toNumber - fromNumber }, (_, i) => i);

    for (const index of array) {
        yield index;
    }
}
