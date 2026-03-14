'use strict';

import * as React from 'react';

import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

import { currentLocale$ } from "../../state/i18n";

type Player = 'O' | 'X';
type Squares = (Player | null)[];

/**
 * This is version of Tic-Tac-Toe game using **Mutable** value in Signal.
 *
 * @see [zustand / Tutorial: Tic-Tac-Toe](https://zustand.docs.pmnd.rs/guides/tutorial-tic-tac-toe)
 */
const gameStore$ = new EventSignal({
    gameHistory: [
        Array(9).fill(null) as Squares, // eslint-disable-line @typescript-eslint/no-magic-numbers
    ],
    currentMove: 0,
    get currentSquares(): Squares {
        return this.gameHistory[this.currentMove];
    },
    get currentPlayer(): Player {
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        return this.currentMove % 2 === 0 ? 'X' : 'O';
    },
    get statusInfo() {
        const squares = this.currentSquares;
        const winner = calculateWinner(squares);
        const turns = calculateTurns(squares);
        const statusText = calculateStatus(winner, turns, this.currentPlayer);

        return {
            isDraw: !winner && !turns,
            statusText,
            winner,
        };
    },
}, {
    description: 'tic-tac-toe game store',
    data: {
        onSquareClick: ((event) => {
            // note: Number(null) === 0 && Number.isNaN(Number(undefined))
            const index = Number(event.currentTarget?.getAttribute('data-index') ?? void 0);

            if (!Number.isInteger(index)) {
                return;
            }

            const {
                gameHistory,
                currentMove,
                currentSquares,
                currentPlayer,
                statusInfo,
            } = gameStore$.get();

            if (statusInfo.winner || currentSquares[index]) {
                return;
            }

            if (gameHistory.length > currentMove + 1) {
                gameHistory.length = currentMove + 1;
            }

            gameStore$.mutate({
                currentMove: gameHistory.push(currentSquares.with(index, currentPlayer)) - 1,
            });
        }) as React.MouseEventHandler,
        jumpTo: (nextMove: number) => {
            gameStore$.mutate({
                currentMove: nextMove,
            });
        },
    },
});

function Square({ index, value, onSquareClick }: { index: number, value: string, onSquareClick: React.MouseEventHandler<HTMLButtonElement> }) {
    return (
        <button
            data-index={index}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                backgroundColor: '#fff',
                border: '1px solid #999',
                outline: 0,
                borderRadius: 0,
                fontSize: '1rem',
                fontWeight: 'bold',
            }}
            onClick={onSquareClick}
        >
            {value}
        </button>
    );
}

function Board() {
    const {
        statusInfo,
        currentSquares,
    } = gameStore$.use();
    const {
        onSquareClick,
    } = gameStore$.data;

    return (
        <>
            <div style={{ marginBottom: '0.5rem' }}>{statusInfo.statusText}</div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gridTemplateRows: 'repeat(3, 1fr)',
                    width: 'calc(3 * 2.5rem)',
                    height: 'calc(3 * 2.5rem)',
                    border: '1px solid #999',
                }}
            >
                {currentSquares.map((value, i) => (
                    <Square
                        index={i}
                        key={`square-${i}`}
                        value={value}
                        onSquareClick={onSquareClick}
                    />
                ))}
            </div>
        </>
    );
}

function History() {
    const { gameHistory } = gameStore$.use();
    const { jumpTo } = gameStore$.data;

    return <div style={{ marginLeft: '2rem' }}>
        <ol>
            {gameHistory.map((_, historyIndex) => {
                const description = historyIndex > 0
                    ? `Go to move #${historyIndex}`
                    : 'Go to game start'
                ;

                return (
                    <li key={historyIndex}>
                        <button onClick={() => jumpTo(historyIndex)}>
                            {description}
                        </button>
                    </li>
                );
            })}
        </ol>
    </div>;
}

function WinnerLine() {
    WinnerLine.renderCounter++;

    const currentLocale = currentLocale$.use();
    const text = gameStore$.use(gameStore => {
        const { statusInfo } = gameStore;
        const { isDraw, winner } = statusInfo;

        if (currentLocale === 'ru-RU') {
            return isDraw ? 'Ничья' : winner ? `Победитель: ${winner}` : 'Игра продолжается';
        }

        return isDraw ? 'Draw' : winner ? `Winner: ${winner}` : 'Now playing';
    });

    return <div>{text} ({++WinnerLine.renderCounter})</div>;
}

WinnerLine.renderCounter = 0;

const TicTacToeGameMutable = React.memo(function TicTacToeGameMutable() {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                fontFamily: 'monospace',
            }}
        >
            <div>
                <Board />
                <WinnerLine />
            </div>
            <History />
        </div>
    );
});

export default TicTacToeGameMutable;

const winnerLines = [
    [ 0, 1, 2 ],
    [ 3, 4, 5 ],
    [ 6, 7, 8 ],
    [ 0, 3, 6 ],
    [ 1, 4, 7 ],
    [ 2, 5, 8 ],
    [ 0, 4, 8 ],
    [ 2, 4, 6 ],
];

function calculateWinner(squares: Squares): Player | undefined {
    for (let i = 0, len = winnerLines.length ; i < len ; i++) {
        const { 0: a, 1: b, 2: c } = winnerLines[i];

        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }

    return void 0;
}

function calculateTurns(squares: Squares) {
    return squares.filter((square) => !square).length;
}

function calculateStatus(winner: Player, turns: number, player: Player) {
    if (!winner && !turns) {
        return 'Draw';
    }
    if (winner) {
        return `Winner ${winner}`;
    }

    return `Next player: ${player}`;
}
