'use strict';

import React from "react";

import { EventSignal } from "../../modules/EventEmitterX/EventSignal";
import { componentTypeForActiveRoundsStore, componentTypeForSelectedRounds } from "../../logic/activeRoundsStore";
import { componentTypeForRoundModel } from "../../logic/RoundModel";

import AsyncSpinner from "./components/AsyncSpinner";
import ErrorView from "./signalComponents/ErrorView";
import RoundsList from "./signalComponents/RoundsList";
import RoundsListItem from "./signalComponents/RoundListItem";
import SelectedRound from "./signalComponents/SelectedRound";

EventSignal.initReact({
    useSyncExternalStore: React.useSyncExternalStore,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    createElement: React.createElement,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    memo: React.memo,
});

EventSignal.registerReactComponentForComponentType(componentTypeForActiveRoundsStore, RoundsList);
EventSignal.registerReactComponentForComponentType(componentTypeForActiveRoundsStore, AsyncSpinner, 'pending');
EventSignal.registerReactComponentForComponentType(componentTypeForActiveRoundsStore, ErrorView, 'error');
EventSignal.registerReactComponentForComponentType(componentTypeForRoundModel, RoundsListItem);
EventSignal.registerReactComponentForComponentType(componentTypeForSelectedRounds, SelectedRound);
