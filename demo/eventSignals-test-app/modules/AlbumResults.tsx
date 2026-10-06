'use strict';

import * as React from 'react';
import type { Album } from '../state/requestData';
import { i18n$$ } from '../state/i18n';
import css from './AlbumResults.module.css';

export default function AlbumResults({ albums, query }: { albums: Album[], query: string }) {
    return (
        <div className={css.results}>
            {albums.length === 0 ? (
                <p className={css.empty}>{i18n$$`Нет совпадений для||en-US||:No matches for`} <strong>“{query}”</strong></p>
            ) : (
                <>
                    <p className={css.summary}>{i18n$$`Найдено альбомов||en-US||:Albums found`}: <strong>{albums.length}</strong></p>
                    <ul className={css.list}>
                        {albums.map(album => (
                            <li key={album.id} className={css.album}>
                                <span className={css.artwork} aria-hidden="true"
                                    style={{ '--album-hue': (album.id * 47) % 360 } as React.CSSProperties}
                                >
                                    <span className={css.record}></span>
                                </span>
                                <div className={css.info}>
                                    <span className={css.artist}>{album.artist}</span>
                                    <strong className={css.title}>{album.title}</strong>
                                    <span className={css.year}>{album.year}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
