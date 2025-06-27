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
            <div>
                <a href="https://vite.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo"/>
                </a>
                <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo"/>
                </a>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                <button onClick={() => setCount((count) => count + 1)}>
                    count is {count}
                </button>
                <p>
                    Edit <code>src/App.tsx</code> and save to test HMR
                </p>
            </div>
            <p className="read-the-docs">
                Click on the Vite and React logos to learn more
            </p>
        </div>
    );
}
