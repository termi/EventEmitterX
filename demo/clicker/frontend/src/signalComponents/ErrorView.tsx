/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

import { useRef, useState } from "react";

import type { EventSignal } from "../../../modules/EventEmitterX/EventSignal";

import { stringifyError } from "../../../utils/error";
import { SyntheticError } from "../../../utils/SyntheticError";

import './ErrorView.css';

export default function ErrorView({ eventSignal, children, childrenRender, addRetry }: {
    eventSignal: EventSignal<any, any, any>,
    childrenRender?: (props: { eventSignal: EventSignal<any, any, any>, className?: string }) => React.ReactNode,
    children: React.ReactNode,
    addRetry?: boolean
}) {
    const $popoverRef = useRef<HTMLDialogElement>(null);
    const { lastError } = eventSignal;

    if (!lastError) {
        return null;
    }

    const isInstanceOfError = lastError instanceof Error;
    const hint = String((isInstanceOfError ? lastError.stack : void 0) || '');
    const $popoverHist = hint ? (
        <dialog className="ErrorView__detailed-dialog" ref={$popoverRef} closedby="any">
            <ErrorDetails error={lastError} doClose={() => { $popoverRef.current?.close(); }} />
        </dialog>
    ) : '';

    return (<div className="ErrorView" style={{ color: 'red' }}>
        <p className="ErrorView__error" onClick={() => { $popoverRef.current?.showModal(); }} title={hint}>
            <span className="ErrorView__error__sign">⚠️</span><span className="ErrorView__error__text">{stringifyError(lastError)}</span>
        </p>
        {$popoverHist}
        {addRetry ? (<button className="ErrorView__retry" onClick={eventSignal.retry}>Retry</button>) : null}
        {children ? (<span className="ErrorView__children">️{children}</span>) : null}
        {childrenRender ? childrenRender({ eventSignal, className: 'ErrorView__children' }) : null}
    </div>);
}

function ErrorDetails({
    error,
    usingErrorsMap,
    doClose,
}: {
    error: Error | unknown,
    usingErrorsMap?: Map<unknown, number>,
    doClose?: () => void,
}) {
    if (!error) {
        return '';
    }

    const showCloseBtn = !!doClose;

    if (typeof error !== 'object') {
        error = {
            message: String(error || ''),
            __proto__: null,
        };
    }

    const { message, stack, cause } = (error as Error);
    const constructorName = error?.constructor?.name;
    const messageLines = message.trim().split('\n');
    const stackLines = String(((error as unknown) instanceof Error ? stack : void 0) || '')
        .trim()
        .split('\n')
    ;
    const renderCount = usingErrorsMap?.get(cause) || 0;
    /**
     * Предотвращает "зацикленный ре-рендер" если у error.cause.cause ссылается на error.
     *
     * Проверяется значение 2 из-за рендера в StrictMode. Если научиться определять включенность StrictMode, то
     *  по-умолчанию нужно проверять на значение 1 и только в StrictMode на значение 2.
     *
     * @see [Provide a way to detect infinite component rendering recursion in development #12525](https://github.com/facebook/react/issues/12525)
     */
    const hasCyclicLinks = renderCount >= 2;
    const hasCause = !!cause && !hasCyclicLinks;
    const hasStack = !!stack && stackLines.length > 0;

    if (hasCause) {
        usingErrorsMap ??= new Map<unknown, number>();

        usingErrorsMap.set(error, (usingErrorsMap.get(error) || 0) + 1);
        usingErrorsMap.set(cause, renderCount + 1);
    }

    return (
        <div className="ErrorView__details">
            {showCloseBtn ? <button className="ErrorView__details__closeBtn" onClick={doClose}>X</button> : ''}
            {constructorName ? <p>Type: {error?.constructor?.name}</p> : ''}
            {messageLines.length > 1
                ? (<div>Message: <pre dangerouslySetInnerHTML={{ __html: messageLines.map((line) => {
                    return `${line}<br />`;
                }).join('') }} /></div>)
                : <p>Message: {message}</p>
            }
            {hasStack ? (<div>
                <p>Stack:</p>
                <pre dangerouslySetInnerHTML={{ __html: stackLines.map((line) => {
                    return `${line}<br />`;
                }).join('') }} />
            </div>) : ''}
            {hasCause ? (<div>
                <hr />
                <h4>error.cause</h4>
                <ErrorDetails error={cause} usingErrorsMap={usingErrorsMap} />
            </div>) : ''}
            {hasCyclicLinks ? <p style={{ color: 'red' }}>Циклический ре-рендер предотвращён (свойство <code>error.cause</code> ссылается на объект который уже отрендерен выше по цепочке компонентов</p> : ''}
        </div>
    );
}

export function NoMoreSyntheticErrorsPlease({ eventSignal, className }: { eventSignal: EventSignal<any, any, any>, className?: string }) {
    const reRenderState = useState(0);
    const { lastError } = eventSignal;

    if (!lastError
        || !(lastError instanceof SyntheticError)
        || localStorage.getItem('DO_NOT_THROW_ERROR_ON_FIRST_TRY') === 'true'
    ) {
        return null;
    }

    return (<div className={className}>
        <button onClick={() => {
            localStorage.setItem('DO_NOT_THROW_ERROR_ON_FIRST_TRY', 'true');
            reRenderState[1](a => ++a);
        }}>Не эмулировать ошибку больше</button>
    </div>);
}
