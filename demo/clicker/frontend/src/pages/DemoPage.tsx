'use strict';

import { useState } from 'react';

import { EventEmitterX } from "../../../modules/EventEmitterX/events";

import reactLogo from '../assets/react.svg';
import viteLogo from '../assets/vite.svg';

import './DemoPage.css';

console.log((globalThis as unknown as { __BACKEND_PORT__?: string }).__BACKEND_PORT__);

(globalThis as unknown as { _emitter?: EventEmitterX })._emitter = new EventEmitterX();

export default function DemoPage() {
    const [ count, setCount ] = useState(0);

    return (
        <div className="page--demo">
            <span className="eyebrow">Песочница интерфейса</span>
            <h1>Vite + React</h1>
            <p className="demo-description">Небольшой интерактивный пример для проверки интерфейса.</p>
            <div className="demo-technologies">
                <a href="https://vite.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo" />
                </a>
            </div>
            <div className="demo-counter-card">
                <button onClick={() => setCount(count => count + 1)}>
                    count is {count}
                </button>
                <p>
                    Нажмите на кнопку, чтобы обновить локальный счётчик.
                </p>
            </div>
            <p className="read-the-docs">
                Логотипы ведут к документации используемых технологий.
            </p>
        </div>
    );
}
