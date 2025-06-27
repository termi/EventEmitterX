'use strict';

import { setDefaultBaseURI } from "../../../api/methods";

const globalWithEnv = (globalThis as unknown as {
    __BACKEND_PORT__?: string
});
const protocol = location.protocol;
const hostname = location.hostname;
const port = globalWithEnv.__BACKEND_PORT__ ?? location.port;
const host = port ? `${hostname}:${port}` : hostname;
const pathname = '/';
const _baseURI = `${protocol}//${host}${pathname}`;
const baseURI = _baseURI === location.origin || _baseURI === `${location.origin}/`
    ? ''
    : _baseURI
;

setDefaultBaseURI(baseURI);

export const requestConfig = {
    baseURI,
    protocol,
    hostname,
    port,
    host,
    pathname,
    __proto__: null,
};
