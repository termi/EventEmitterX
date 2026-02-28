'use strict';

import * as React from 'react';
import { useCallback, useState } from "react";

import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

import { closestElement } from "../../lib/dom";
import { i18nNumber, i18n$$, i18nString$$ } from "../../state/i18n";

import { TicTacToeLogic } from './TicTacToeLogic';

import css from './TicTacToeGameMutablePro.module.css';

/**
 * This is version of Tic-Tac-Toe game using **class instance** in Signal payload.
 *
 * @see [zustand / Tutorial: Tic-Tac-Toe](https://zustand.docs.pmnd.rs/guides/tutorial-tic-tac-toe)
 */
const gameStore$ = new EventSignal(0, {
    description: 'tic-tac-toe game store',
    data: {
        ticTacToeLogic: new TicTacToeLogic({
            onValueChanges() {
                gameStore$.set(value => ++value);
            },
            onNewGame() {
                gameStore$.set(value => ++value);
            },
            onScoreChanges() {
                gameStore$.set(value => ++value);
            },
        }),
        onDelegateSquareClick: ((event) => {
            const { currentTarget } = event;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
            // @ts-ignore `TS2345: Argument of type EventTarget is not assignable to parameter of type Element`
            const $square = closestElement(event.target ?? event.nativeEvent.target, '.cell', currentTarget);
            // note: Number(null) === 0 && Number.isNaN(Number(undefined))
            const index = Number($square?.getAttribute?.('data-index') ?? void 0);

            if (!Number.isInteger(index)) {
                return;
            }

            gameStore$.data.ticTacToeLogic.requestValueByIndex(index);
        }) as React.MouseEventHandler,
        // jumpTo: (nextMove: number) => {
        //     gameStore$.mutate({
        //         currentMove: nextMove,
        //     });
        // },
    },
});

function Info({ ticTacToeLogic }: { ticTacToeLogic: TicTacToeLogic }) {
    i18nNumber.use();

    const nextStringValue = ticTacToeLogic.getNextStringValue();
    const { score } = ticTacToeLogic;

    return (<div className={css.gameInfo} style={{
        "--now-playing-string": `'${i18nString$$('Сейчас ходит||<en-US>||:Current player').use()}'`,
    } as React.CSSProperties}>
        <div className={`${css.playerInfo} ${css.playerX} ${nextStringValue === 'X' ? css.currentPlayer : ''}`}>
            <div className="player-icon">X</div>
            <div className="player-text">
                <h3>{i18n$$`Игрок ${TicTacToeLogic.PlayerDisplay.X}`}</h3>
                <p>{i18nString$$('Ходит крестиками||<en-US>||:Move the crosses')}</p>
            </div>
        </div>

        <div className="score">
            <h3>{i18nString$$('Счёт||<en-US>||:Score')}</h3>
            <div className="score-value">{i18nNumber(score.get(TicTacToeLogic.PlayerValue.X) ?? 0)}&nbsp;:&nbsp;{i18nNumber(score.get(TicTacToeLogic.PlayerValue.O) ?? 0)}</div>
        </div>

        <div className={`${css.playerInfo} ${css.playerO} ${nextStringValue === '0' ? css.currentPlayer : ''}`}>
            <div className="player-icon">O</div>
            <div className="player-text">
                <h3>{i18n$$`Игрок ${TicTacToeLogic.PlayerDisplay.O}`}</h3>
                <p>{i18nString$$('Ходит ноликами||<en-US>||:Move the noughts')}</p>
            </div>
        </div>
    </div>);
}

function Board({ ticTacToeLogic, onDelegateSquareClick }: {
    ticTacToeLogic: TicTacToeLogic,
    onDelegateSquareClick: typeof gameStore$["data"]["onDelegateSquareClick"],
}) {
    const { vector, matrixSize, winingIndexes } = ticTacToeLogic;

    return (
        <div className={css.gameBoardContainer}>
            <div className={css.gameBoard} onClick={onDelegateSquareClick} style={{
                "--matrix-size": matrixSize,
                "--next-value": `"${ticTacToeLogic.getNextStringValue()}"`,
            } as React.CSSProperties}>
                {vector.map((value, index) => {
                    const hasValue = !!value;
                    const isWinnerCell = hasValue && winingIndexes.has(index);
                    const cellPlayerClass = value === TicTacToeLogic.PlayerValue.X ? css.cellX
                        : value === TicTacToeLogic.PlayerValue.O ? css.cellO
                        : value === TicTacToeLogic.PlayerValue.T ? css.cellT
                        : value === TicTacToeLogic.PlayerValue.S ? css.cellS
                        : ''
                    ;

                    return (<div key={index} className={`${css.cell} ${
                        hasValue ? `${css.cellValue} ${cellPlayerClass}` : ''
                    } ${isWinnerCell ? css.cellWin : ''}`} data-index={index}>
                        {ticTacToeLogic.getStringValue(value)}
                    </div>);
                })}
            </div>
        </div>
    );
}

function Controls({ ticTacToeLogic }: { ticTacToeLogic: TicTacToeLogic }) {
    return (
        <div className="controls">
            <button className="new-game" onClick={ticTacToeLogic.requestNewGame}>
                <i className="fas fa-play-circle"></i>{i18nString$$('Новая игра')}
            </button>
            <button className="reset-score" onClick={ticTacToeLogic.resetScore}>
                <i className="fas fa-redo"></i>{i18nString$$('Сбросить счёт||<en-US>||:Reset score')}
            </button>
        </div>
    );
}

const preDefinedSizes = [ 3, 4, 5, 6, 7, 8, 9 ];

type _TicTacToeLogic_Settings = {
    matrixSize: number,
    winnerLineSize: number,
};

function settingsEqual(prev: _TicTacToeLogic_Settings, current: _TicTacToeLogic_Settings) {
    return prev.matrixSize === current.matrixSize
        && prev.winnerLineSize === current.winnerLineSize
    ;
}

function Settings() {
    const ticTacToeSettings = gameStore$.use(() => {
        const { matrixSize, winnerLineSize } = gameStore$.data.ticTacToeLogic;

        return { matrixSize, winnerLineSize };
    }, settingsEqual);

    const { ticTacToeLogic } = gameStore$.data;
    const [ matrixSize, setMatrixSize ] = useState(ticTacToeSettings.matrixSize);
    const [ winnerRowSize, setWinnerRowSize ] = useState(ticTacToeSettings.winnerLineSize);
    const onFormChange = useCallback<React.FormEventHandler<HTMLFormElement>>((event) => {
        const { elements } = event.currentTarget;
        const $winnerRowSizeNumberInput = elements["winnerRowSize"] as HTMLInputElement;
        const new_matrixSize = Number(elements["matrixSize"]?.value ?? void 0);
        let new_winnerRowSize = Number($winnerRowSizeNumberInput?.value ?? void 0);

        if (Number.isInteger(new_matrixSize)) {
            setMatrixSize(new_matrixSize);

            if (new_winnerRowSize > new_matrixSize) {
                new_winnerRowSize = new_matrixSize;

                if ($winnerRowSizeNumberInput) {
                    $winnerRowSizeNumberInput.value = String(new_matrixSize);
                    $winnerRowSizeNumberInput.max = String(new_matrixSize);
                }
            }
            else {
                if ($winnerRowSizeNumberInput) {
                    $winnerRowSizeNumberInput.max = String(new_matrixSize);
                }
            }
        }
        if (Number.isInteger(new_winnerRowSize)) {
            setWinnerRowSize(new_winnerRowSize);
        }
    }, []);
    const onFormSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>((event) => {
        event.preventDefault();

        const { currentTarget } = event;
        const { elements } = currentTarget;

        ticTacToeLogic.startNewGame({
            matrixSizeNumeric: elements["matrixSize"]?.value,
            winnerLineSizeNumeric: elements["winnerRowSize"]?.value,
        });
    }, [ ticTacToeLogic ]);

    // subscribe on numberFormatOptions changes
    i18nNumber.use();

    const matrixSizeDisplay = i18nNumber(matrixSize);
    const winnerRowSizeDisplay = i18nNumber(winnerRowSize);
    const fieldDisplaySize = `${matrixSizeDisplay}x${matrixSizeDisplay}`;

    return (
        <form className="settings-panel" onChange={onFormChange} onSubmit={onFormSubmit}>
            <h3><i className="fas fa-sliders-h"></i>{i18nString$$('Настройки игры')}</h3>

            <fieldset className="setting-group">
                <legend>{i18nString$$('Размер поля')}:</legend>
                <div className="size-options">
                    {preDefinedSizes.map((matrixSizeOption) => {
                        const matrixSizeDisplay = i18nNumber(matrixSizeOption);

                        return (
                            <label className="size-btn" key={matrixSizeOption}>
                                <input type="radio" name="matrixSize" value={matrixSizeOption} defaultChecked={matrixSizeOption === matrixSize} />
                                <span>{matrixSizeDisplay}x{matrixSizeDisplay}</span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            <fieldset className="setting-group">
                <legend>{i18nString$$('Длина линии для победы')}:</legend>
                <div className="win-length">
                    <input type="number" min="3" max="9" name="winnerRowSize" defaultValue={winnerRowSize} />
                    <span>{i18nString$$('в ряд')}</span>
                </div>
                <div className="win-length-info">
                    {i18n$$`Для поля ${fieldDisplaySize} нужно ${winnerRowSizeDisplay} в ряд для победы`}
                </div>
            </fieldset>

            <button className="apply-btn" type="submit">
                <i className="fas fa-check-circle"></i>{i18nString$$('Применить настройки')}
            </button>

            <div className="game-stats">
                <div className="stat-item">
                    <div className="stat-value">{fieldDisplaySize}</div>
                    <div>{i18nString$$('Размер поля')}</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{winnerRowSizeDisplay}</div>
                    <div>{i18nString$$('Для победы')}</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{i18nNumber(matrixSize * matrixSize)}</div>
                    <div>{i18nString$$('Всего клеток')}</div>
                </div>
            </div>
        </form>
    );
}

function GameLayout() {
    gameStore$.use();

    const { ticTacToeLogic } = gameStore$.data;
    const status = ticTacToeLogic.getStatus();
    const endGameStatus$ = status === 'running' ? null
        : status === 'end' ? i18nString$$('Ничья')
        : i18n$$`Игрок ${status} победил! Поздравляем!`
    ;
    const winMessageClass = status === TicTacToeLogic.PlayerDisplay.X ? css.winMessageX
        : status === TicTacToeLogic.PlayerDisplay.O ? css.winMessageO
        : status === TicTacToeLogic.PlayerDisplay.T ? css.winMessageT
        : status === TicTacToeLogic.PlayerDisplay.S ? css.winMessageS
        : ''
    ;

    return (<>
        <div className={css.gameArea}>
            <Info ticTacToeLogic={ticTacToeLogic}/>
            <Board ticTacToeLogic={ticTacToeLogic} onDelegateSquareClick={gameStore$.data.onDelegateSquareClick}/>
            <Controls ticTacToeLogic={ticTacToeLogic} />
            <div className={`${css.message} ${endGameStatus$ ? css.messageShow : ''} ${winMessageClass}`}>
                {endGameStatus$}
            </div>
        </div>
    </>);
}

const TicTacToeGameMutablePro = React.memo(function TicTacToeGameMutablePro() {
    return (
        <div className={css.TicTacToeGameMutablePro}>
            <header>
                <h1><i className="fas fa-gamepad"></i>{i18nString$$('||en-US||:Tic tac toe PRO')}</h1>
                <p className="subtitle">{i18nString$$('Настраивай поле и правила игры по своему вкусу!')}</p>
            </header>

            <div className={css.gameLayout}>
                <Settings />
                <GameLayout />
            </div>
        </div>
    );
});

export default TicTacToeGameMutablePro;
