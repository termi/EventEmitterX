'use strict';

// @see [The dumb reason why flag emojis aren't working on your site in Chrome on Windows](https://geyer.dev/blog/windows-flag-emojis/)
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";

import twemojiCountryFlags_filepath from '../../static/fonts/TwemojiCountryFlags.woff2';

type FlagEmojisSupportedInfo = {
    timestamp: number,
    isFlagEmojisSupported: boolean,
};

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;
const WEEKS = 7 * DAYS;
const has_localStorage = typeof localStorage !== 'undefined';
let force_isFlagEmojisSupported: boolean | undefined = void 0;

if (has_localStorage) {
    try {
        const flagEmojisSupportedInfo_string = localStorage.getItem('supported.emoji.unicodeFlags');
        const flagEmojisSupportedInfo = flagEmojisSupportedInfo_string
            ? JSON.parse(flagEmojisSupportedInfo_string) as FlagEmojisSupportedInfo
            : null
        ;

        if (flagEmojisSupportedInfo
            && typeof flagEmojisSupportedInfo.timestamp === 'number'
            && typeof flagEmojisSupportedInfo.isFlagEmojisSupported === 'boolean'
        ) {
            const now = Date.now();

            if ((now - flagEmojisSupportedInfo.timestamp) < WEEKS) {
                force_isFlagEmojisSupported = flagEmojisSupportedInfo.isFlagEmojisSupported;
            }
        }
    }
    catch {
        // ignore
    }
}

if (force_isFlagEmojisSupported === false) {
    _documentHeadInsertFlagsEmojiFont("Twemoji Country Flags", twemojiCountryFlags_filepath);
}
else if (force_isFlagEmojisSupported === void 0) {
    const isPolyfillApplied = polyfillCountryFlagEmojis("Twemoji Country Flags", twemojiCountryFlags_filepath);

    if (has_localStorage) {
        const flagEmojisSupportedInfo: FlagEmojisSupportedInfo = {
            timestamp: Date.now(),
            isFlagEmojisSupported: !isPolyfillApplied,
        };

        localStorage.setItem('supported.emoji.unicodeFlags', JSON.stringify(flagEmojisSupportedInfo));
    }
}

function _documentHeadInsertFlagsEmojiFont(fontFamilyName: string, fontSrc: string) {
    if (typeof document !== "undefined" && document.head) {
        const $style = document.createElement("style");

        $style.textContent = `@font-face {
  font-family: "${fontFamilyName}";
  unicode-range: U+1F1E6-1F1FF, U+1F3F4, U+E0062-E0063, U+E0065, U+E0067, U+E006C, U+E006E, U+E0073-E0074, U+E0077, U+E007F;
  src: url('${fontSrc}') format('woff2');
  font-display: swap;
}`;

        document.head.append($style);
    }
}
