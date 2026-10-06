import { searchAlbums } from '../../demo/eventSignals-test-app/state/requestData';

describe('demo album search', () => {
    it('matches artists case-insensitively and trims the query', () => {
        expect(searchAlbums('  dAfT  ')).toHaveLength(4);
        expect(searchAlbums('Beatles')).toHaveLength(13);
        expect(searchAlbums('Pink')).toHaveLength(6);
    });

    it('matches title fragments and release years', () => {
        expect(searchAlbums('side of')).toEqual([
            { id: 20, title: 'The Dark Side of the Moon', artist: 'Pink Floyd', year: 1973 },
        ]);
        expect(searchAlbums('1973')).toEqual(searchAlbums('side of'));
        expect(searchAlbums('Abbey').map(album => album.title)).toEqual(['Abbey Road']);
    });

    it('returns no albums for empty or unknown queries', () => {
        expect(searchAlbums('   ')).toEqual([]);
        expect(searchAlbums('no-such-album')).toEqual([]);
    });

    it('provides unique identifiers across the complete collection', () => {
        const albums = ['Beatles', 'Daft', 'Pink'].flatMap(searchAlbums);

        expect(albums).toHaveLength(23);
        expect(new Set(albums.map(album => album.id)).size).toBe(23);
    });
});
