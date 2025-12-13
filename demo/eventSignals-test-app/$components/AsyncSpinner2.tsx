'use strict';

import * as React from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

document.head.insertAdjacentHTML('beforeend', `<style>
.AsyncSpinner2Loader {
    position: relative;
    display: inline-block;
}

.AsyncSpinner2Loader__spinner {
    width: 48px;
    height: 48px;
    display: inline-block;
    border-radius: 50%;
    position: relative;
    animation: AsyncSpinner2Loader_rotate 1s linear infinite;
}
.AsyncSpinner2Loader__spinner::before, .AsyncSpinner2Loader__spinner::after {
    content: "";
    box-sizing: border-box;
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 5px solid #68f888;
    animation: AsyncSpinner2Loader_prixClipFix 2s linear infinite;
}
.AsyncSpinner2Loader__spinner::after {
    border-color: #FF3D00;
    animation: AsyncSpinner2Loader_prixClipFix 2s linear infinite, AsyncSpinner2Loader_rotate 0.5s linear infinite reverse;
    inset: 6px;
}

.AsyncSpinner2Loader__text {
    max-width: 100%;
    max-height: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
}

@keyframes AsyncSpinner2Loader_rotate {
    0%   {transform: rotate(0deg)}
    100%   {transform: rotate(360deg)}
}

@keyframes AsyncSpinner2Loader_prixClipFix {
    0%   {clip-path:polygon(50% 50%,0 0,0 0,0 0,0 0,0 0)}
    25%  {clip-path:polygon(50% 50%,0 0,100% 0,100% 0,100% 0,100% 0)}
    50%  {clip-path:polygon(50% 50%,0 0,100% 0,100% 100%,100% 100%,100% 100%)}
    75%  {clip-path:polygon(50% 50%,0 0,100% 0,100% 100%,0 100%,0 100%)}
    100% {clip-path:polygon(50% 50%,0 0,100% 0,100% 100%,0 100%,0 0)}
}

.AsyncSpinner2Loader__text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
}
</style>`);

export default function AsyncSpinner2({ eventSignal, hint }: { eventSignal?: EventSignal<unknown, unknown, unknown | { currentUserId?: number }>, hint?: string }) {
    return (<span className="AsyncSpinner2Loader">
        <span className="AsyncSpinner2Loader__spinner"></span>
        <span className="AsyncSpinner2Loader__text">{hint ?? eventSignal?.data?.["currentUserId"]}</span>
    </span>);
}
