'use strict';

export type Album = {
    id: number,
    title: string,
    artist: string,
    year: number,
};

function _fetchData(_cache: Map<string, Promise<Album[]>>, url: string): ReturnType<typeof getData> {
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

const allAlbums: Album[] = [ {
    id: 13,
    title: 'Let It Be',
    artist: 'The Beatles',
    year: 1970,
}, {
    id: 12,
    title: 'Abbey Road',
    artist: 'The Beatles',
    year: 1969,
}, {
    id: 11,
    title: 'Yellow Submarine',
    artist: 'The Beatles',
    year: 1969,
}, {
    id: 10,
    title: 'The Beatles',
    artist: 'The Beatles',
    year: 1968,
}, {
    id: 9,
    title: 'Magical Mystery Tour',
    artist: 'The Beatles',
    year: 1967,
}, {
    id: 8,
    title: 'Sgt. Pepper\'s Lonely Hearts Club Band',
    artist: 'The Beatles',
    year: 1967,
}, {
    id: 7,
    title: 'Revolver',
    artist: 'The Beatles',
    year: 1966,
}, {
    id: 6,
    title: 'Rubber Soul',
    artist: 'The Beatles',
    year: 1965,
}, {
    id: 5,
    title: 'Help!',
    artist: 'The Beatles',
    year: 1965,
}, {
    id: 4,
    title: 'Beatles For Sale',
    artist: 'The Beatles',
    year: 1964,
}, {
    id: 3,
    title: 'A Hard Day\'s Night',
    artist: 'The Beatles',
    year: 1964,
}, {
    id: 2,
    title: 'With The Beatles',
    artist: 'The Beatles',
    year: 1963,
}, {
    id: 1,
    title: 'Please Please Me',
    artist: 'The Beatles',
    year: 1963,
}, {
    id: 14, title: 'Homework', artist: 'Daft Punk', year: 1997,
}, {
    id: 15, title: 'Discovery', artist: 'Daft Punk', year: 2001,
}, {
    id: 16, title: 'Human After All', artist: 'Daft Punk', year: 2005,
}, {
    id: 17, title: 'Random Access Memories', artist: 'Daft Punk', year: 2013,
}, {
    id: 18, title: 'Meddle', artist: 'Pink Floyd', year: 1971,
}, {
    id: 19, title: 'Obscured by Clouds', artist: 'Pink Floyd', year: 1972,
}, {
    id: 20, title: 'The Dark Side of the Moon', artist: 'Pink Floyd', year: 1973,
}, {
    id: 21, title: 'Wish You Were Here', artist: 'Pink Floyd', year: 1975,
}, {
    id: 22, title: 'Animals', artist: 'Pink Floyd', year: 1977,
}, {
    id: 23, title: 'The Wall', artist: 'Pink Floyd', year: 1979,
} ];

let useRandomError = true;

export function setUseRandomError(newUseRandomError: boolean) {
    useRandomError = newUseRandomError;
}

let wasErrorResult = false;

async function getSearchResults(query: string) {
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

    return searchAlbums(query);
}

/** Shared local matching contract for both asynchronous search implementations. */
export function searchAlbums(query: string): Album[] {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return [];
    }

    return allAlbums.filter(album => (
        album.title.toLowerCase().includes(normalizedQuery)
        || album.artist.toLowerCase().includes(normalizedQuery)
        || String(album.year).includes(normalizedQuery)
    ));
}
