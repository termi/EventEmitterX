'use strict';

import * as React from "react";
import type { ChangeEvent } from "react";

import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

import ErrorView from "../$components/ErrorView";
import AsyncSpinner from "../$components/AsyncSpinner";
import { fetchData2 } from "../state/requestData";

export const requestDataSignal$ = new EventSignal([] as unknown as ReturnType<typeof fetchData2>, async function(_prev, searchQuery) {
    const query = searchQuery || '';

    if (!query) {
        return [];
    }

    return fetchData2(`/search?q=${searchQuery || ''}`);
}, {
    finaleSourceValue: '',
    data: {
        title: 'Search albums:',
        disabled: false,
        onChanges: (event: ChangeEvent<HTMLInputElement>) => {
            requestDataSignal$.set(String(event.target.value || ''));
        },
        resetRenders: () => {
            EventSignalSearchResults.rendersCounter = 0;
        },
    },
    componentType: Symbol('albumsSearchResults'),
});

globalThis.__requestDataSignal$ = requestDataSignal$;

EventSignal.registerReactComponentForComponentType(requestDataSignal$.componentType, EventSignalSearchResults);

function EventSignalSearchResults({ current$, current$Value }: { current$: typeof requestDataSignal$, current$Value: typeof requestDataSignal$.value }) {
    const { status } = current$;
    const query = current$.getSourceValue() || '';
    const albums = current$Value;
    const content = status === 'error' ? <ErrorView current$={current$}><button onClick={current$.retry}>retry</button></ErrorView>
        : status === 'pending' ? <AsyncSpinner hint={query} />
        : query === '' ? null
        : albums.length === 0 ? <p>No matches for <i>&quot;{query}&quot;</i></p>
        : (albums.map(album => (
            <li key={album.id}>
                {album.title} ({album.year})
            </li>
        )))
    ;

    return (<div>
        <div>
            <h4>EventSignal (renders count: {++EventSignalSearchResults.rendersCounter})</h4>
            <label>
                <span>{current$.data.title}</span>
                <input value={query} onChange={current$.data.onChanges} disabled={current$.data.disabled} />
            </label>
        </div>
        <div>
            {content}
        </div>
    </div>);
}

EventSignalSearchResults.rendersCounter = 0;
