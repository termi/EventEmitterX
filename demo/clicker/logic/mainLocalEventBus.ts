'use strict';

import { EventEmitterX } from "../modules/EventEmitterX/events";

const mainLocalEventBus = new EventEmitterX({
    listenerOncePerEventType: true,
});

export default mainLocalEventBus;
