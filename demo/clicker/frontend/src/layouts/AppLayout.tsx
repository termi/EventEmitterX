'use strict';

import { useState, useEffect, useRef } from 'react';
import { Navigate, Outlet, NavLink } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

import './AppLayout.css';
import '../pages/_Pages.css';

function _detectBrowserDarkMode() {
    try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    catch {
        return false;
    }
}

const _localStorage_darkMode_key = 'darkMode_3865bf1381c7';

export default function AppLayout() {
    const rendersCounter = useRef(0);
    const { isAuthenticated, logout } = useAuth();
    const { 0: darkMode, 1: setDarkMode } = useState(() => {
        // Проверяем предпочтения пользователя или сохраненную тему
        const savedMode = localStorage.getItem(_localStorage_darkMode_key);

        return savedMode && savedMode === 'true' ? true : _detectBrowserDarkMode();
    });

    (globalThis as unknown as { __AppLayout__rendersCounter: number }).__AppLayout__rendersCounter = ++rendersCounter.current;

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        }
        else {
            document.documentElement.classList.remove('dark');
        }

        localStorage.setItem(_localStorage_darkMode_key, String(darkMode));
    }, [ darkMode ]);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    return (
        <div className="app-layout">
            {isAuthenticated && (
                <header className="app-header">
                    <nav className="app-nav">
                        <ul className="nav-list">
                            <li className="nav-item nav-brand">
                                <span className="app-brand"><span className="app-brand-mark" aria-hidden="true">↗</span> Clicker</span>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/" end className="nav-link">Dashboard</NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/profile" className="nav-link">Profile</NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/settings" className="nav-link">Settings</NavLink>
                            </li>
                            <li className="nav-item ml-auto">
                                <button
                                    onClick={toggleDarkMode}
                                    className="theme-toggle"
                                    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                                >
                                    {darkMode ? '☀️' : '🌙'}
                                </button>
                            </li>
                            <li className="nav-item">
                                <button onClick={logout} className="logout-button">Logout</button>
                            </li>
                        </ul>
                    </nav>
                </header>
            )}

            <main className="app-main">
                {isAuthenticated ? <Outlet /> : <Navigate to="/auth" replace />}
            </main>
        </div>
    );
}
