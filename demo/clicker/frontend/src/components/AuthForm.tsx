'use strict';

import { useState } from 'react';
import { Navigate } from "react-router-dom";

import { stringifyError } from "../../../utils/error";
import { useAuth } from '../hooks/useAuth';
import { handleAuthFormSubmit } from "../eventHandlers/forms";

import FormFromSchema from "./FormFromSchema";

import './AuthForm.css';

export default function AuthForm() {
    const { 0: isRegistration, 1: setIsRegistration } = useState(false);
    const { isAuthenticated, lastError, isPending, login, register } = useAuth();

    if (isAuthenticated) {
        // console.warn('Something went wrong: AuthForm rendered with already isAuthenticated', currentUserStore);
        return <Navigate to="/" replace/>;
    }

    return (
        <div className="auth-card">
            <h2 className="auth-title">{isRegistration ? 'Register' : 'Login'}</h2>
            {lastError && <div style={{ color: 'red' }}>{stringifyError(lastError)}</div>}
            <FormFromSchema
                onSubmit={handleAuthFormSubmit} data-is-registration={isRegistration}
                className="auth-form" disabled={isPending}
                elements={isRegistration
                    ? register.elementsList
                    : login.elementsList
                }
                buttons={[
                    {
                        id: 'submit',
                        label: isPending ? 'В процессе...' : isRegistration ? 'Регистрация' : 'Войти',
                        type: 'submit',
                        className: 'auth-button',
                        disabled: isPending,
                    }
                ]}
            />
            <div className="auth-switch">
                {isRegistration
                    ? (<span>Уже зарегистрированы?{' '}
                        <button className="switch-button"
                                onClick={() => setIsRegistration(!isRegistration)}>Войти</button>
                        </span>)
                    : (<span>Не зарегистрированы?{' '}
                        <button className="switch-button"
                                onClick={() => setIsRegistration(!isRegistration)}>Регистрация</button>
                        </span>)
                }
            </div>
        </div>
    );
}
