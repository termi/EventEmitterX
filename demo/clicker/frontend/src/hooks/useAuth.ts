'use strict';

import { useSyncExternalStore } from 'react';

import { currentUserStore } from "../../../logic/currentUserStore";

export function useAuth() {
    useSyncExternalStore(currentUserStore.signal$.subscribe, currentUserStore.signal$.get);

    return currentUserStore;
}
