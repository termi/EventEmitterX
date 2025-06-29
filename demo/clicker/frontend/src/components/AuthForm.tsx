'use strict';

import React, { useState } from 'react';
import { Navigate } from "react-router-dom";

import FormFromSchema from "./FormFromSchema";

import { useAuth } from '../hooks/useAuth';

import { stringifyError } from "../../../utils/error";

import './AuthForm.css';

export default function AuthForm() {
    const { 0: isRegistration, 1: setIsRegistration } = useState(false);
    const currentUserStore = useAuth();
    const { isAuthenticated, lastError, isPending, login, register } = currentUserStore;
    const elementsList = isRegistration
        ? register.elementsList
        : login.elementsList
    ;

    if (isAuthenticated) {
        // console.warn('Something went wrong: AuthForm rendered with already isAuthenticated', currentUserStore);
        return <Navigate to="/" replace/>;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const targetForm = e.currentTarget as HTMLFormElement;
        const email = (targetForm.elements.namedItem(login.elements.email.name) as HTMLInputElement).value;
        const password = (targetForm.elements.namedItem(login.elements.password.name) as HTMLInputElement).value;
        const name = isRegistration
            ? (targetForm.elements.namedItem(register.elements.name.name) as HTMLInputElement).value
            : ''
        ;

        if (isRegistration) {
            register({
                email,
                name,
                password,
            }, { doNotThrowError: true }).catch(console.error);
        }
        else {
            login({
                email,
                password,
            }, { doNotThrowError: true }).catch(console.error);
        }
    };

    return (
        <div className="auth-card">
            <h2 className="auth-title">{isRegistration ? 'Register' : 'Login'}</h2>
            {lastError && <div style={{ color: 'red' }}>{stringifyError(lastError)}</div>}
            <FormFromSchema
                className="auth-form" onSubmit={handleSubmit} aria-disabled={isPending}
                elements={elementsList}
                buttons={[
                    {
                        id: 'submit',
                        label: isPending ? 'Processing...' : isRegistration ? 'Register' : 'Login',
                        type: 'submit',
                        className: 'auth-button',
                        disabled: isPending,
                    }
                ]}
            />
            <div className="auth-switch">
                {isRegistration
                    ? (<span>Already have an account?{' '}
                        <button className="switch-button"
                                onClick={() => setIsRegistration(!isRegistration)}>Login</button>
                        </span>)
                    : (<span>Don't have an account?{' '}
                        <button className="switch-button"
                                onClick={() => setIsRegistration(!isRegistration)}>Register</button>
                        </span>)
                }
            </div>
        </div>
    );
}
