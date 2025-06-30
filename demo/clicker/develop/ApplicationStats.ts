'use strict';

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

export class ApplicationStats {
    lastRequestAt = 0;
    requestsCounter = 0;
    lastErrorAt = 0;
    errorsCounter = 0;
    errors: (string|Error)[] = [];
    mainProcessChangeDataCaptureEventCounter = {
        count(eventName: unknown) {
            const key = typeof eventName === 'symbol' ? eventName : String(eventName);
            const currentValue = this.counters[key];

            this.counters[key] = (currentValue || 0) + 1;
        },
        counters: Object.create(null) as Partial<Record<string | symbol, number>>,
        __proto__: null,
    }

    constructor(public timeForRecentRequest = MINUTES) {
        //
    }

    onRequest() {
        this.lastRequestAt = Date.now();
        this.requestsCounter++;
    }

    onError(error: string | Error) {
        console.error(error);

        this.errors.push(error);
        this.lastErrorAt = Date.now();
        this.errorsCounter++;
    }

    checkWasRecentRequest() {
        const now = Date.now()
        const timePassed = now - this.lastRequestAt;

        return timePassed < this.timeForRecentRequest;
    }

    static #singleton: ApplicationStats | undefined;

    static get singleton() {
        return this.#singleton ??= new ApplicationStats();
    }
}

export const applicationStats = ApplicationStats.singleton;
