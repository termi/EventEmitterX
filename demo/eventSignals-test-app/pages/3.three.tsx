'use strict';

import * as React from 'react';
import { useState } from 'react';

import DeferredSearchResults, {
    __DeferredSearchResults__setDisabled,
    __DeferredSearchResults__setQuery,
} from '../modules/DeferredSearchResults';

import { clearCache, setUseRandomError } from "../state/requestData";
import { requestDataSignal$ } from "../modules/EventSignalSearchResults";

import css from './examples.module.css';
import { i18n$$ } from '../state/i18n';

export default function PageThree() {
    const { 0: clickCounter, 1: setClickCounter } = useState(0);

    return (
        <div className={css.lesson}>
            <header className={css.intro}>
                <span className={css.eyebrow}>EventSignal · Async comparison</span>
                <h2>{i18n$$`Два подхода к асинхронному поиску||en-US||:Two approaches to async search`}</h2>
                <p>{i18n$$`Сравните React Suspense и EventSignal на одном наборе альбомов. Меняйте запрос и наблюдайте загрузку и число рендеров.||en-US||:Compare React Suspense and EventSignal with the same album dataset. Edit a query and observe loading and render counts.`}</p>
            </header>
            <div className={css.queryGuide}>
                <p>{i18n$$`Попробуйте «a» для большой подборки, «Beatles», «Daft», «Pink», «Abbey» или «1973». Поиск работает по части названия, исполнителю и году.||en-US||:Try “a” for a large selection, “Beatles”, “Daft”, “Pink”, “Abbey” or “1973”. Search matches part of the title, artist or year.`}</p>
                <div className={css.toolbar}>
                    {['a', 'Beatles', 'Daft', 'Pink', 'Abbey', '1973'].map(query => (
                        <button key={query} type="button" onClick={() => {
                            setUseRandomError(false);
                            __DeferredSearchResults__setQuery(query);
                            requestDataSignal$.set(query);
                        }}>{query}</button>
                    ))}
                </div>
                <small>{i18n$$`Кнопки заполняют оба поля и показывают успешный сценарий. Для демонстрации ошибки введите «error».||en-US||:The buttons fill both inputs and select a successful scenario. Type “error” to demonstrate a failure.`}</small>
            </div>
            <div className={css.toolbar}>
            <button className={css.primary} onClick={_testRender}>test render</button>
            <button onClick={clearCache}>clear cache</button>
            <button onClick={() => { _reset(); setClickCounter(0); }}>reset</button>
            <button onClick={() => setClickCounter(v => ++v)}>Re-render page ({clickCounter})</button>
            </div>
            <div className={css.columns}>
                <section className={`${css.panel} ${css.searchPanel}`}>
                    <h3>React Suspense</h3>
                    <p className={css.note}>useDeferredValue · use · Suspense</p>
                    <DeferredSearchResults />
                </section>
                <section className={`${css.panel} ${css.searchPanel}`}>
                    <h3>EventSignal</h3>
                    <p className={css.note}>{i18n$$`Асинхронное вычисление и зарегистрированный компонент||en-US||:Async computation and a registered component`}</p>
                    {requestDataSignal$}
                </section>
            </div>
            <details className={css.hint}>
                <summary>Hint</summary>
                <p>Enter &quot;a&quot; in the input below, wait for the results to load, and then edit the input to &quot;ab&quot;</p>
                <p>Enter &quot;error&quot; for synthetic error</p>
            </details>
        </div>
    );
}

let testRunning = false;

async function _testRender() {
    if (testRunning) {
        return;
    }

    testRunning = true;

    requestDataSignal$.data.disabled = true;
    requestDataSignal$.set('');
    setUseRandomError(false);

    DeferredSearchResults.renderCounter = 0;
    requestDataSignal$.data.resetRenders();

    __DeferredSearchResults__setDisabled(true);
    __DeferredSearchResults__setQuery('');

    // first render after reset
    await new Promise<void>(resolve => {
        queueMicrotask(() => queueMicrotask(resolve));
    });

    DeferredSearchResults.renderCounter = 0;
    requestDataSignal$.data.resetRenders();

    for (const value of [
        'a',
        'ab',
        'abc',
        'let',
        'error',
    ]) {
        requestDataSignal$.set(value);
        __DeferredSearchResults__setQuery(value);

        await new Promise<void>(resolve => {
            setTimeout(resolve, 1500);
        });
    }

    // eslint-disable-next-line require-atomic-updates
    testRunning = false;

    // eslint-disable-next-line require-atomic-updates
    requestDataSignal$.data.disabled = false;
    requestDataSignal$.set('');
    __DeferredSearchResults__setDisabled(false);
    __DeferredSearchResults__setQuery('');

    setUseRandomError(true);
}

function _reset() {
    setUseRandomError(false);
    clearCache();

    DeferredSearchResults.renderCounter = 0;
    requestDataSignal$.data.resetRenders();

    requestDataSignal$.set('');
    __DeferredSearchResults__setQuery(a => {
        if (a === '') {
            requestDataSignal$.set('-');

            setTimeout(() => {
                _reset();
            });

            return '-';
        }

        return '';
    });
    setUseRandomError(true);
}
