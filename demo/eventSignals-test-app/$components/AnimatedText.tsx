'use strict';

import * as React from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

import css from './AnimatedText.module.css';

export default function AnimatedText({ eventSignal }: { eventSignal: EventSignal<Promise<string> | string> }) {
    const text = eventSignal.getSync();
    const letters = text.split('');
    const textLength = text.length;

    return (<span className={css.AnimatedText}>
        {letters.map((letter, index) => {
            const animationMaxStep = 10;
            const animationBaseStep = Math.max(textLength, animationMaxStep);
            const animationMinStepTime = 0.05;
            const animationStepTime = Math.min(1 / animationBaseStep, animationMinStepTime);
            const isNegative = (index / animationMaxStep) & 1;
            const animationDelay = (isNegative ? 1 : 0) - (animationStepTime * index);

            return <span key={`${letter}_${index}`} style={{ animationDelay: `${animationDelay}s` }}>{letter === ' ' ? '\u00A0' : letter}</span>;
        })}
    </span>);
}
