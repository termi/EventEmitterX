'use strict';

const _checkDirections = [
    [ 0, -1 ], // oppositeDirection = [  0,  1  ]
    [ 1, -1 ], // oppositeDirection = [ -1,  1  ]
    [ 1,  0 ], // oppositeDirection = [ -1,  0  ]
    [ 1,  1 ], // oppositeDirection = [ -1, -1  ]
];

const XAND0LogicStringTag = 'TicTacToeLogic';
const defaultMatrixSize = 5;
const defaultWinningLineSize = 3;
const minimalMatrixSize = 3;
const maximumMatrixSize = 255;

/**
 * "Tic-Tac-Toe" game logic.
 * It is also known as Noughts and Crosses or Xs and Os.
 *
 * @see [4 Player Tic-Tac-Toe](https://tictactoefree.com/tips/4-player-tic-tac-toe)
 * @see [Tic Tac Toe (React) with CSS 3D effects and animations](https://codepen.io/ykadosh/pen/mGMLXO)
 * @see [3d-tic-tac-toe](https://github.com/BrianCottrell/3d-tic-tac-toe/tree/master)
 * @see [Concept - 3D Tic Tac Toe](https://codepen.io/DeptofJeffAyer/pen/wKvzJO)
 */
export class TicTacToeLogic {
    /** Размерность квадратной матрицы. */
    private _matrixSize: number;
    /** Представление квадратной матрицы в виде вектора. */
    private _vector: (TicTacToeLogic.PlayerValue | 0)[];
    private _nextValue = TicTacToeLogic.PlayerValue.X;
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    private _playersCount = 2;
    private _freeCells = 0;
    private _winLineSize: number;
    private _isEnded = false;
    private _winningValue: TicTacToeLogic.PlayerValue | 0 = 0;
    private _winingCoords: [ x: number, y: number ][] | undefined = void 0;
    private _winingIndexesSet = new Set<number>();
    private _score = new Map<TicTacToeLogic.PlayerValue, number>();
    private readonly __onNewGame: ((this: TicTacToeLogic) => void) | null = null;
    private readonly __onEndGame: ((this: TicTacToeLogic, isWin: boolean, winingCoords: [ x: number, y: number ][]) => void) | null = null;
    private readonly __onValueChanges: ((this: TicTacToeLogic, value: TicTacToeLogic.PlayerValue, x: number, y: number) => void) | null = null;
    private readonly __onScoreChanges: ((this: TicTacToeLogic) => void) | null = null;

    constructor({
        json,
        matrixSize = json?.vector ? Math.sqrt(json.vector.length) : defaultMatrixSize,
        winningLineSize = defaultWinningLineSize,
        onNewGame = null,
        onEndGame = null,
        onValueChanges = null,
        onScoreChanges = null,
    } = {} as {
        json?: ReturnType<TicTacToeLogic["toJSON"]>,
        matrixSize?: number,
        winningLineSize?: number,
        onNewGame?: TicTacToeLogic["__onNewGame"],
        onEndGame?: TicTacToeLogic["__onEndGame"],
        onValueChanges?: TicTacToeLogic["__onValueChanges"],
        onScoreChanges?: TicTacToeLogic["__onScoreChanges"],
    }) {
        if (matrixSize < minimalMatrixSize) {
            throw new Error(`"oddSize" parameter should be $gte ${minimalMatrixSize}.`);
        }
        if (matrixSize > maximumMatrixSize) {
            throw new Error(`"oddSize" parameter should be $lte ${maximumMatrixSize}.`);
        }

        this._matrixSize = matrixSize;

        this._reset(json);

        this._winLineSize = winningLineSize;
        this.__onNewGame = onNewGame;
        this.__onEndGame = onEndGame;
        this.__onValueChanges = onValueChanges;
        this.__onScoreChanges = onScoreChanges;

        setTimeout(onNewGame);
    }

    private _reset({
        vector,
        nextValue = TicTacToeLogic.PlayerValue.X,
        playersCount = this._playersCount,
    }: {
        vector?: (TicTacToeLogic.PlayerValue)[] | TicTacToeLogic["_vector"],
        nextValue?: TicTacToeLogic.PlayerValue,
        playersCount?: TicTacToeLogic["_playersCount"],
    } = {}) {
        if (Array.isArray(vector)) {
            const matrixSize = Math.sqrt(this._vector.length);

            if (!Number.isInteger(matrixSize)) {
                throw new TypeError('Invalid vector size.');
            }

            const _vector = new Array<number>(vector.length).fill(0);

            for (let index = 0, len = vector.length ; index < len ; index++) {
                const value = vector[index];

                if (value === void 0 || value === null || Number.isNaN(value)) {
                    continue;
                }

                _vector[index] = value;
            }

            this._vector = _vector;
            this._freeCells = _vector.reduce((len, v) => {
                if (v !== void 0) {
                    len--;
                }

                return len;
            }, _vector.length);

            this._matrixSize = matrixSize;
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            this._vector = new Array<number>(Math.pow(this._matrixSize, 2)).fill(0);
            this._freeCells = this._vector.length;
        }

        this._playersCount = playersCount;
        this._nextValue = nextValue;
        this._isEnded = false;
        this._winningValue = 0;
        this._winingCoords = void 0;
        this._winingIndexesSet.clear();
    }

    /** A {@link startNewGame} method but WITHOUT any arguments */
    requestNewGame = () => {
        this.startNewGame();
    };

    startNewGame(options?: {
        matrixSize?: number,
        winnerLineSize?: number,
        matrixSizeNumeric?: string,
        winnerLineSizeNumeric?: string,
    }) {
        const {
            matrixSizeNumeric,
            winnerLineSizeNumeric,
            matrixSize = Number(matrixSizeNumeric ?? void 0),
            winnerLineSize = Number(winnerLineSizeNumeric ?? void 0),
        } = options || {};

        if (Number.isInteger(matrixSize)) {
            this._matrixSize = matrixSize;
        }
        if (Number.isInteger(winnerLineSize)) {
            this._winLineSize = winnerLineSize;
        }

        this._reset();
        this.__onNewGame?.();
    }

    resetScore = () => {
        this._score.clear();
        this.__onScoreChanges?.();
    };

    private _onValueChanges(newValue: TicTacToeLogic.PlayerValue, startX: number, startY: number/*, startIndex: number*/) {
        if (this._isEnded) {
            return;
        }

        this._freeCells--;

        const vector = this._vector;
        const winLineSize = this._winLineSize;
        const { _matrixSize } = this;

        for (const direction of _checkDirections) {
            let currentLineSize = 1;
            const winingCoords: [ x: number, y: number ][] = [
                [ startX, startY ],
            ];
            let { 0: xDiff, 1: yDiff } = direction;
            let isOppositeDirection = false;
            let x = startX + xDiff;
            let y = startY + yDiff;

            do {
                const isValidCoords = x >= 0 && x < _matrixSize && y >= 0 && y < _matrixSize;

                if (isValidCoords && vector[this._getIndexFromXY(x, y)] === newValue) {
                    currentLineSize++;
                    winingCoords.push([ x, y ]);

                    if (currentLineSize >= winLineSize) {
                        this._isEnded = true;
                        this._winningValue = newValue;
                        this._winingCoords = winingCoords.sort(_sortCoords);

                        for (const { 0: x, 1: y } of winingCoords) {
                            this._winingIndexesSet.add(this._getIndexFromXY(x, y));
                        }

                        this._score.set(newValue, 1 + (this._score.get(newValue) || 0));

                        this.__onValueChanges?.(newValue, startX, startY);
                        this.__onEndGame?.(true, winingCoords);
                        this.__onScoreChanges?.();

                        return;
                    }

                    x += xDiff;
                    y += yDiff;
                }
                else if (!isOppositeDirection) {
                    // check for 'oppositeDirection'
                    isOppositeDirection = true;
                    xDiff *= -1;
                    yDiff *= -1;

                    x = startX + xDiff;
                    y = startY + yDiff;
                }
                else {
                    break;
                }
            }
            // eslint-disable-next-line no-constant-condition
            while (true);
        }

        this.__onValueChanges?.(newValue, startX, startY);

        if (this._freeCells <= 0) {
            this._isEnded = true;
            this.__onValueChanges?.(newValue, startX, startY);
            this.__onEndGame?.(false, []);

            return;
        }
    }

    private _setNewValueIfEmpty(
        value: TicTacToeLogic.PlayerValue | '0' | 'O' | 'o' | 'S' | 's' | 'T' | 't' | 'X' | 'x' | false | true,
        x: number,
        y: number,
        onNewValue?: (() => void),
        index = this.getIndexFromXY(x, y),
    ) {
        const vector = this._vector;
        const { length } = vector;
        // const size = Math.sqrt(length);

        if (index >= length) {
            throw new Error('Invalid "index". Should be $lt then current length of vector.');
        }

        if (vector[index] !== 0) {
            return false;
        }

        let newValue: TicTacToeLogic.PlayerValue;

        if (value === TicTacToeLogic.PlayerValue.X || value === 'X' || value === 'x' || value === true) {
            newValue = TicTacToeLogic.PlayerValue.X;
        }
        else if (value === TicTacToeLogic.PlayerValue.O || value === 'O' || value === 'o' || value === '0' || value === false) {
            newValue = TicTacToeLogic.PlayerValue.O;
        }
        else if (value === TicTacToeLogic.PlayerValue.S || value === 'S' || value === 's') {
            newValue = TicTacToeLogic.PlayerValue.S;
        }
        else if (value === TicTacToeLogic.PlayerValue.T || value === 'T' || value === 't') {
            newValue = TicTacToeLogic.PlayerValue.T;
        }
        else {
            throw new Error(`Invalid "value" = ${value}.`);
        }

        vector[index] = newValue;

        onNewValue?.();

        this._onValueChanges(newValue, x, y/*, index*/);

        return true;
    }

    isAnyValue() {
        return this._freeCells !== this._vector.length;
    }

    isEnded() {
        return this.getStatus() !== 'running';
    }

    getNextStringValue() {
        if (this._isEnded) {
            return '';
        }

        return this.getStringValue(this._nextValue);
    }

    getStatus(): TicTacToeLogic.PlayerDisplay | 'end' | 'running' {
        return this._winningValue !== 0 ? TicTacToeLogic.PlayerDisplayByPlayerValue[this._winningValue]
            : this._isEnded ? 'end'
            : 'running'
        ;
    }

    getStringValue(value: TicTacToeLogic.PlayerValue | '0' | 'O' | 'o' | 'S' | 's' | 'T' | 't' | 'X' | 'x' | false | true) {// eslint-disable-line class-methods-use-this
        if (value === 'x' || value === 'X' || value === true) {
            return TicTacToeLogic.PlayerDisplay.X;
        }
        else if (value === '0' || value === false) {
            return TicTacToeLogic.PlayerDisplay.O;
        }
        else if (value === 'S' || value === 's') {
            return TicTacToeLogic.PlayerDisplay.S;
        }
        else if (value === 'T' || value === 't') {
            return TicTacToeLogic.PlayerDisplay.S;
        }

        return TicTacToeLogic.PlayerDisplayByPlayerValue[value as TicTacToeLogic.PlayerValue] ?? '';
    }

    get vector(): Readonly<typeof this._vector> {
        return this._vector;
    }

    get winnerDisplayValue() {
        const { _winningValue } = this;

        if (_winningValue === 0) {
            return;
        }

        return TicTacToeLogic.PlayerDisplayByPlayerValue[_winningValue];
    }

    get winingCoords() {
        return this._winingCoords as Readonly<typeof this._winingCoords>;
    }

    get winingIndexes() {
        return this._winingIndexesSet as Readonly<typeof this._winingIndexesSet>;
    }

    get matrixSize() {
        return this.getSize(this._vector.length);
    }

    get winnerLineSize() {
        return this._winLineSize;
    }

    get score(): Readonly<typeof this._score> {
        return this._score;
    }

    getSize(vectorLength = this._vector.length) {
        return Math.sqrt(vectorLength);
    }

    getFreeCellsLeft() {
        return this._freeCells;
    }

    private _getIndexFromXY(x: number, y: number, size = this.matrixSize) {
        return (y * size) + x;
    }

    getIndexFromXY(x: number, y: number) {
        const size = this.getSize();

        if (!(x < size) || x < 0) {
            throw new Error(`Invalid "x" coordinate (${x}). Should be $lte then Math.sqrt(current size) and $gte 0.`);
        }
        if (!(y < size) || y < 0) {
            throw new Error(`Invalid "y" coordinate (${y}). Should be $lte then Math.sqrt(current size) and $gte 0.`);
        }

        return this._getIndexFromXY(x, y, size);
    }

    isEmptyByXY(x: number, y: number) {
        const index = this.getIndexFromXY(x, y);

        return this._vector[index] !== 0;
    }

    private _switchToNextPlayer = () => {
        let nextPlayer = this._nextValue + 1;

        if (nextPlayer > this._playersCount) {
            nextPlayer = TicTacToeLogic.PlayerValue.X;
        }

        this._nextValue = nextPlayer;
    };

    requestValueByIndex(index: number) {
        if (this._winningValue !== 0) {
            return false;
        }

        const { _matrixSize } = this;
        const y = Math.trunc(index / _matrixSize);
        const x = index - y * _matrixSize;

        return this._setNewValueIfEmpty(this._nextValue, x, y, this._switchToNextPlayer);
    }

    setNextValueByXYIfEmpty(x: number, y: number) {
        return this._setNewValueIfEmpty(this._nextValue, x, y, this._switchToNextPlayer);
    }

    setValueByXYIfEmpty(value: TicTacToeLogic.PlayerValue | '0' | 'O' | 'o' | 'X' | 'x' | false | true, x: number, y: number) {
        return this._setNewValueIfEmpty(value, x, y);
    }

    [Symbol.toStringTag] = XAND0LogicStringTag;

    toJSON() {
        return {
            type: XAND0LogicStringTag,
            version: 2,
            vector: this._vector,
            nextValue: this._nextValue,
            playersCount: this._playersCount,
        };
    }

    static fromJSON(json: ReturnType<TicTacToeLogic["toJSON"]>) {
        if (!json || typeof json !== 'object' || json.type !== XAND0LogicStringTag) {
            throw new Error('Invalid JSON data');
        }

        return new TicTacToeLogic({
            json,
        });
    }
}

export namespace TicTacToeLogic {
    export const enum PlayerValue {
        X = 1,
        O = 2,
        T = 3,
        S = 4,
    }

    export const enum PlayerDisplay {
        X = 'X',
        // or '0'
        O = '0',
        T = '△',
        S = '▢',
    }

    export const PlayerDisplayByPlayerValue: Record<PlayerValue, PlayerDisplay> = {
        [PlayerValue.X]: PlayerDisplay.X,
        [PlayerValue.O]: PlayerDisplay.O,
        [PlayerValue.T]: PlayerDisplay.T,
        [PlayerValue.S]: PlayerDisplay.S,
    };
}

Object.freeze(Object.setPrototypeOf(TicTacToeLogic.PlayerDisplayByPlayerValue, null));

/**
 * @private
 */
function _sortCoords(coord1: [ x: number, y: number ], coord2: [ x: number, y: number ]) {
    const { 0: x1, 1: y1 } = coord1;
    const { 0: x2, 1: y2 } = coord2;

    if (x1 === x2) {
        return y1 - y2;
    }

    return x1 - x2;
}
