'use strict';

import * as React from 'react';
import { useState } from 'react';

import DeferredSearchResults, {
    __DeferredSearchResults__setDisabled,
    __DeferredSearchResults__setQuery,
} from '../modules/DeferredSearchResults';

import { clearCache, setUseRandomError } from "../state/requestData";
import { requestDataSignal$ } from "../modules/EventSignalSearchResults";

import css from './3.three.module.css';

export default function PageThree() {
    const { 0: clickCounter, 1: setClickCounter } = useState(0);

    return (
        <div className={css.PageThree}>
            <details>
                <summary>Hint</summary>
                <p>Enter &quot;a&quot; in the input below, wait for the results to load, and then edit the input to &quot;ab&quot;</p>
                <p>Enter &quot;error&quot; for synthetic error</p>
            </details>
            <button onClick={_testRender}>test render</button>
            <button onClick={clearCache}>clear cache</button>
            <button onClick={() => { _reset(); setClickCounter(0); }}>reset</button>
            <button onClick={() => setClickCounter(v => ++v)}>Re-render page ({clickCounter})</button>
            <hr />
            <DeferredSearchResults />
            <hr />
            {requestDataSignal$}
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
