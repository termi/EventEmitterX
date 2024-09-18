'use strict';

import * as React from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

document.head.insertAdjacentHTML('beforeend', `<style>
.AsyncSpinnerLoader {
    position: relative;
    display: inline-block;
}

.AsyncSpinnerLoader__spinner {
    width: 48px;
    height: 48px;
    border: 5px solid #FFF;
    border-bottom-color: #FF3D00;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: AsyncSpinnerLoader_rotation 1s linear infinite;
}

@keyframes AsyncSpinnerLoader_rotation {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

.AsyncSpinnerLoader__text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
}
</style>`);

export default function AsyncSpinner({ eventSignal }: { eventSignal: EventSignal<number, unknown, { currentUserId?: number }> }) {
    return (<span className="AsyncSpinnerLoader">
        <span className="AsyncSpinnerLoader__spinner"></span>
        <span className="AsyncSpinnerLoader__text">{eventSignal.data?.currentUserId}</span>
    </span>);
}
