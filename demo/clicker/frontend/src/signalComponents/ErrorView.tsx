/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

import { useRef, useState } from "react";

import type { EventSignal } from "../../../modules/EventEmitterX/EventSignal";

import { stringifyError } from "../../../utils/error";
import { SyntheticError } from "../../../utils/SyntheticError";

import './ErrorView.css';

export default function ErrorView({ eventSignal, children, childrenRender, addRetry }: {
    eventSignal: EventSignal<any, any, any>,
    childrenRender?: ({ eventSignal }: { eventSignal: EventSignal<any, any, any> }) => React.ReactNode,
    children: React.ReactNode,
    addRetry?: boolean
}) {
    const popoverRef = useRef<HTMLDialogElement>(null);
    const { lastError } = eventSignal;

    if (!lastError) {
        return null;
    }

    const isInstanceOfError = lastError instanceof Error;
    const hint = String((isInstanceOfError ? lastError.stack : void 0) || '');
    const $popoverHist = hint ? (
        <dialog className="ErrorView__detailed-dialog" ref={popoverRef} closedby="any">
            <ErrorDetails error={lastError} usingErrorsSet={new Set()} />
        </dialog>
    ) : '';

    return (<div className="ErrorView" style={{ color: 'red' }}>
        <p className="ErrorView__error" onClick={() => { popoverRef.current?.showModal(); }} title={hint}>
            <span className="ErrorView__error__sign">⚠️</span><span className="ErrorView__error__text">{stringifyError(lastError)}</span>
        </p>
        {$popoverHist}
        {addRetry ? (<button className="ErrorView__retry" onClick={eventSignal.retry}>Retry</button>) : null}
        {children ? (<span className="ErrorView__children">️{children}</span>) : null}
        {childrenRender ? childrenRender({ eventSignal }) : null}
    </div>);
}

function ErrorDetails({
    error,
    currentDeep = 1,
    usingErrorsSet = new Set(),
}: {
    error: Error | unknown,
    currentDeep?: number,
    usingErrorsSet?: Set<unknown>,
}) {
    if (!error) {
        return '';
    }

    if (typeof error !== 'object') {
        error = {
            message: String(error || ''),
            __proto__: null,
        };
    }

    const { message, stack, cause } = (error as Error);
    const constructorName = error?.constructor?.name;
    const messageLines = message.split('\n');
    const stackLines = String(((error as unknown) instanceof Error ? stack : void 0) || '').split('\n');
    /**
     * Предотвращает "зацикленный ре-рендер" если у error.cause.cause ссылается на error.
     *
     * Проверка на `usingErrorsSet.size !== currentDeep` добавлена для рендера в StrictMode.
     *
     * todo: Протестировать.
     */
    const hasCause = !!cause
        && (!usingErrorsSet.has(cause) || usingErrorsSet.size !== currentDeep)
    ;
    const hasStack = !!stack && stackLines.length > 0;

    return (
        <div>
            {constructorName ? <p>Type: {error?.constructor?.name}</p> : ''}
            {messageLines.length > 1
                ? (<div>Message: <pre dangerouslySetInnerHTML={{ __html: messageLines.map((line) => {
                        return `${line}<br />`;
                    }).join('') }}/></div>)
                : <p>Message: {message}</p>
            }
            {hasStack ? <div>
                <p>Stack:</p>
                <pre dangerouslySetInnerHTML={{ __html: stackLines.map((line) => {
                    return `${line}<br />`;
                }).join('') }} />
            </div> : ''}
            {hasCause ? (<div>
                <p>Cause:</p>
                <ErrorDetails error={cause} usingErrorsSet={usingErrorsSet} currentDeep={currentDeep + 1} />
            </div>) : ''}
        </div>
    );
}

export function NoMoreSyntheticErrorsPlease({ eventSignal }: { eventSignal: EventSignal<any, any, any> }) {
    const reRenderState = useState(0);
    const { lastError } = eventSignal;

    if (!lastError
        || !(lastError instanceof SyntheticError)
        || localStorage.getItem('DO_NOT_THROW_ERROR_ON_FIRST_TRY') === 'true'
    ) {
        return null;
    }

    return (<div>
        <button onClick={() => {
            localStorage.setItem('DO_NOT_THROW_ERROR_ON_FIRST_TRY', 'true');
            reRenderState[1](a => ++a);
        }}>Не эмулировать ошибку больше</button>
    </div>)
}
