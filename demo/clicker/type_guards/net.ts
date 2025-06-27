'use strict';

/**
 * The TCP protocol provides 16 bits for the port number, and this is interpreted as an unsigned integer;
 * all values are valid, apart from 0, and so the largest port number is (2^16 - 1) or 65,535.
 */
const TCP_PROTOCOL_PORT_MAX_VALUE = 65_535;

/**
 * @see [Port (computer networking)](https://en.wikipedia.org/wiki/Port_(computer_networking))
 */
export function isInValidNwtPortsRange(portNumber: unknown): portNumber is number {
    if (typeof portNumber !== 'number' || !Number.isFinite(portNumber)) {
        return false;
    }

    return portNumber >= 0 && portNumber <= TCP_PROTOCOL_PORT_MAX_VALUE;
}

export function assertIsInValidNwtPortsRange(portNumber: unknown): asserts portNumber is number {
    if (!isInValidNwtPortsRange(portNumber)) {
        throw new TypeError(`Port number value should be in range from 0 to ${TCP_PROTOCOL_PORT_MAX_VALUE} but value ${portNumber} found`);
    }
}
