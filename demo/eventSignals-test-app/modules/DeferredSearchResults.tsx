'use strict';

import * as React from 'react';
import { Suspense, useDeferredValue, useState } from "react";

import { fetchData } from '../state/requestData';

// Note: this component is written using an experimental API
// that's not yet available in stable versions of React.

// For a realistic example you can follow today, try a framework
// that's integrated with Suspense, like Relay or Next.js.

export let __DeferredSearchResults__setQuery: (query: string | ((prevValue: string) => string)) => void;
export let __DeferredSearchResults__setDisabled: (disabled: boolean | ((prevValue: boolean) => boolean)) => void;

export default function DeferredSearchResults() {
    const { 0: query, 1: setQuery } = useState('');
    const { 0: disabled, 1: setDisabled } = useState(false);
    // https://react.dev/reference/react/useDeferredValue
    const deferredQuery = useDeferredValue(query);
    const isStale = query !== deferredQuery;

    __DeferredSearchResults__setQuery = setQuery;
    __DeferredSearchResults__setDisabled = setDisabled;

    return (<div>
        <h4>React useDeferredValue/Suspense (renders count: {++DeferredSearchResults.renderCounter})</h4>
        <label>
            <span>Search albums:</span>
            <input value={query} onChange={event => setQuery(event.target.value)} disabled={disabled} />
        </label>
        <Suspense fallback={<h2>Loading...</h2>}>
            <div style={{
                // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                opacity: isStale ? 0.5 : 1,
                transition: isStale ? 'opacity 0.2s 0.2s linear' : 'opacity 0s 0s linear',
            }}>
                <SearchResults query={deferredQuery} />
            </div>
        </Suspense>
    </div>);
}

DeferredSearchResults.renderCounter = 0;

function SearchResults({ query }: { query: string }) {
    if (query === '') {
        return null;
    }

    const albums = use(fetchData(`/search?q=${query}`));

    if (albums.length === 0) {
        // eslint-disable-next-line react/no-unescaped-entities
        return <p>No matches for <i>"{query}"</i></p>;
    }

    return (
        <ul>
            {albums.map(album => (
                <li key={album.id}>
                    {album.title} ({album.year})
                </li>
            ))}
        </ul>
    );
}

// This is a workaround for a bug to get the demo running.
// TODO: replace with real implementation when the bug is fixed.
function use<T>(promise: Promise<T> & { status?: string, value?: T, reason?: string }): T {
    if (promise.status === 'fulfilled') {
        return promise.value;
    }
    else if (promise.status === 'rejected') {
        throw promise.reason;
    }
    else if (promise.status === 'pending') {
        throw promise;
    }
    else {
        promise.status = 'pending';
        // eslint-disable-next-line promise/prefer-await-to-then
        promise.then(
            result => {
                promise.status = 'fulfilled';
                promise.value = result;
            },
            // eslint-disable-next-line promise/prefer-await-to-callbacks
            error => {
                promise.status = 'rejected';
                promise.reason = error;
            },
        );

        throw promise;
    }
}
