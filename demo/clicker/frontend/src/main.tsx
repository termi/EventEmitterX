'use strict';

import '../../polyfills';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './config/globals';

import mainProcessChangeDataCapture from "../../logic/mainProcessChangeDataCapture";
import { applicationStats} from '../../develop/ApplicationStats';

import App from './App';

import './index.css';

(globalThis as unknown as { __applicationStats: typeof applicationStats }).__applicationStats = applicationStats;
(globalThis as unknown as { __mainProcessChangeDataCapture: typeof mainProcessChangeDataCapture }).__mainProcessChangeDataCapture = mainProcessChangeDataCapture;

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App/>
    </StrictMode>,
);
