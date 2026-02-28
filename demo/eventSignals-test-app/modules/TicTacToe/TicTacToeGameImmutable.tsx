'use strict';

import * as React from 'react';

import { EventSignal } from '@termi/eventemitterx/modules/EventEmitterEx/EventSignal';

type Player = 'O' | 'X';
type Squares = (Player | null)[];

/**
 * @see [zustand / Tutorial: Tic-Tac-Toe](https://zustand.docs.pmnd.rs/guides/tutorial-tic-tac-toe)
 */
const gameStore$ = new EventSignal({
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    history: [ Array(9).fill(null) as Squares ],
    currentMove: 0,
}, {
    description: 'tic-tac-toe game store',
    data: {
        handlePlay: (nextSquares: Squares) => {
            const {
                history,
                currentMove,
            } = gameStore$.get();
            const nextHistory = [ ...history.slice(0, currentMove + 1), nextSquares ];

            gameStore$.set({
                history: nextHistory,
                currentMove: nextHistory.length - 1,
            });
        },
        jumpTo: (nextMove: number) => {
            gameStore$.set({
                ...gameStore$.get(),
                currentMove: nextMove,
            });
        },
    },
});

function Square({ value, onSquareClick }: { value: string, onSquareClick: React.MouseEventHandler<HTMLButtonElement> }) {
    return (
        <button
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

function Board({ xIsNext, squares, onPlay }: { xIsNext: boolean, squares: Squares, onPlay: typeof gameStore$["data"]["handlePlay"] }) {
    const winner = calculateWinner(squares);
    const turns = calculateTurns(squares);
    const player: Player = xIsNext ? 'X' : 'O';
    const status = calculateStatus(winner, turns, player);

    function handleClick(i: number) {
        if (squares[i] || winner) {
            return;
        }

        onPlay(squares.with(i, player));
    }

    return (
        <>
            <div style={{ marginBottom: '0.5rem' }}>{status}</div>
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
                {squares.map((value, i) => (
                    <Square
                        key={`square-${i}`}
                        value={value}
                        onSquareClick={() => handleClick(i)}
                    />
                ))}
            </div>
        </>
    );
}

export default function TicTacToeGameImmutable() {
    const {
        history,
        currentMove,
    } = gameStore$.use();
    const {
        handlePlay,
        jumpTo,
    } = gameStore$.data;
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const xIsNext = currentMove % 2 === 0;
    const currentSquares = history[currentMove];

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                fontFamily: 'monospace',
            }}
        >
            <div>
                <Board xIsNext={xIsNext} squares={currentSquares} onPlay={handlePlay} />
            </div>
            <div style={{ marginLeft: '2rem' }}>
                <ol>
                    {history.map((_, historyIndex) => {
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
            </div>
        </div>
    );
}

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

function calculateWinner(squares: Squares) {
    for (let i = 0; i < winnerLines.length; i++) {
        const [ a, b, c ] = winnerLines[i];

        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }

    return null;
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
