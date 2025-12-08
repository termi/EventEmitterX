'use strict';

// noinspection ES6UnusedImports
import type {} from 'cftools/ts_types/index';

function _fetchData(_cache: Map<string, Promise<{id: number, title: string, year: number}[]>>, url: string): ReturnType<typeof getData> {
    let isNewValue = true;
    const resultPromise = _cache.getOrInsertComputed(url, function(key) {
        isNewValue = false;

        const promise = getData(key);

        _cache.set(key, promise);

        // eslint-disable-next-line promise/prefer-await-to-then
        promise.then(() => {
            wasErrorResult = false;
        }, () => {
            _cache.delete(key);
        });

        return promise;
    });

    if (!isNewValue) {
        wasErrorResult = false;
    }

    return resultPromise;
}

const _cache1 = new Map();
const _cache2 = new Map();

export const fetchData: (url: string) => ReturnType<typeof getData> = _fetchData.bind(null, _cache1);
export const fetchData2: (url: string) => ReturnType<typeof getData> = _fetchData.bind(null, _cache2);

export function clearCache() {
    _cache1.clear();
    _cache2.clear();
    wasErrorResult = false;
}

async function getData(url: string) {
    if (url.startsWith('/search?q=')) {
        return await getSearchResults(url.slice('/search?q='.length));
    }
    else {
        throw new Error('Not implemented');
    }
}

const allAlbums: {
    id: number,
    title: string,
    year: number,
}[] = [ {
    id: 13,
    title: 'Let It Be',
    year: 1970,
}, {
    id: 12,
    title: 'Abbey Road',
    year: 1969,
}, {
    id: 11,
    title: 'Yellow Submarine',
    year: 1969,
}, {
    id: 10,
    title: 'The Beatles',
    year: 1968,
}, {
    id: 9,
    title: 'Magical Mystery Tour',
    year: 1967,
}, {
    id: 8,
    title: 'Sgt. Pepper\'s Lonely Hearts Club Band',
    year: 1967,
}, {
    id: 7,
    title: 'Revolver',
    year: 1966,
}, {
    id: 6,
    title: 'Rubber Soul',
    year: 1965,
}, {
    id: 5,
    title: 'Help!',
    year: 1965,
}, {
    id: 4,
    title: 'Beatles For Sale',
    year: 1964,
}, {
    id: 3,
    title: 'A Hard Day\'s Night',
    year: 1964,
}, {
    id: 2,
    title: 'With The Beatles',
    year: 1963,
}, {
    id: 1,
    title: 'Please Please Me',
    year: 1963,
} ];

let useRandomError = true;

export function setUseRandomError(newUseRandomError: boolean) {
    useRandomError = newUseRandomError;
}

let wasErrorResult = false;

async function getSearchResults(query) {
    // Add a fake delay to make waiting noticeable.
    await new Promise(resolve => {
        setTimeout(resolve, 500);
    });

    const lowerQuery = query.trim().toLowerCase();

    if (!wasErrorResult) {
        if (lowerQuery === 'error') {
            const error = new Error(`This is synthetic error for query="${query}"`);

            console.error(error);
            wasErrorResult = true;

            throw error;
        }

        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        if (useRandomError && Math.random() < 0.3) {
            const error = new Error(`This is random error`);

            console.error(error);
            wasErrorResult = true;

            throw error;
        }
    }

    wasErrorResult = false;

    if (!lowerQuery) {
        return [];
    }

    return allAlbums.filter(album => {
        const lowerTitle = album.title.toLowerCase();

        return (
            lowerTitle.startsWith(lowerQuery)
            || lowerTitle.includes(` ${  lowerQuery}`)
        );
    });
}
