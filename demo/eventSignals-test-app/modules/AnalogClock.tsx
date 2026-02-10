/* eslint-disable @typescript-eslint/no-magic-numbers */
'use strict';

import * as React from "react";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';

const AnalogClockM = React.memo(AnalogClock);

export default AnalogClockM;

function AnalogClock({ current$, onManualTime, onResetClick }: {
    current$: EventSignal<Date, Date | number | null, unknown>,
    onManualTime?: AnalogClockCanvas["_onManualTime"],
    onResetClick?: React.MouseEventHandler<any>,
}) {
    const $canvasRef = useRef<HTMLCanvasElement>();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const canvasController = useMemo(AnalogClockCanvas.factory, [ current$, onManualTime ]);
    const onReset = useCallback<React.MouseEventHandler>((event) => {
        canvasController.resetManualDate();
        onResetClick?.(event);
    }, [ canvasController, onResetClick ]);

    useLayoutEffect(() => {
        const subscription = current$.addListener(canvasController.updateCurrentDate);

        canvasController.start($canvasRef.current, current$.get(), {
            onManualTime,
        });

        return () => {
            subscription.unsubscribe();
            canvasController[Symbol.dispose]();
        };
    }, [ canvasController, current$, onManualTime ]);

    return <canvas
        ref={$canvasRef}
        style={{ width: '100%', height: '100%' }}
        onDoubleClick={onReset}
    ></canvas>;
}

const TWICE = 2;
const ClockRadiusReducer = 0.9;
const ClockGradientReducer = 0.7;
const ClockDialBezelSize = 0.02;
const ClockDivisionsOfHoursDistance = 0.1;
const ClockDivisionsOfMinutesDistance = 0.005;
const ClockHoursLength = 12;
const ClockMinutesLength = 60;
/** `30` */
const ClockHalfMinutesLength = ClockMinutesLength / 2;
const Clock360Degrees = 360;
/** `21600` */
const Clock360DegreesMultiplyByMinutesLength = Clock360Degrees * ClockMinutesLength;
const { PI } = Math;

class AnalogClockCanvas {
    private _canvas: HTMLCanvasElement | null = null;
    private _ctx: CanvasRenderingContext2D | null = null;
    private _states: AnalogClockCanvas.States = 0;
    private _centerX = 0;
    private _centerY = 0;
    private _clockRadius = 0;
    private _currentDate: Date;
    private _manualDate: Date | null = null;
    private _onManualTime: ((newManualTime: number) => void) | null = null;

    constructor() {
        this._currentDate = new Date();
    }

    destructor() {
        this._reset();
    }

    [Symbol.dispose] = () => {
        this.destructor();
    };

    private _reset() {
        this._unsubscribeEvens();
        this._canvas = null;
        this._ctx = null;
        this._manualDate = null;
        this._onManualTime = null;
    }

    public start(canvas: HTMLCanvasElement | null | undefined, currentDate: Date, options?: {
        onManualTime?: AnalogClockCanvas["_onManualTime"],
    }) {
        if (this._canvas && this._canvas !== canvas) {
            this._reset();
        }

        if (!canvas) {
            return;
        }

        this._canvas = canvas;

        if (!this._updateCanvasSize()) {
            this._reset();

            return;
        }

        this._ctx = canvas.getContext('2d');

        this._subscribeEvents();
        this._onManualTime = options?.onManualTime;
        this.updateCurrentDate(currentDate);
    }

    private _updateCanvasSize(width?: number, height?: number) {
        const { _canvas: canvas } = this;

        if (!width || !height) {
            const container = canvas.parentElement;

            if (!container) {
                return false;
            }

            if (!width) {
                width = canvas.width = container.clientWidth;
            }
            else {
                canvas.width = width;
            }

            if (!height) {
                height = canvas.height = container.clientHeight;
            }
            else {
                canvas.height = height;
            }
        }

        this._centerX = width / TWICE;
        this._centerY = height / TWICE;
        this._clockRadius = (Math.min(width, height) / TWICE) * ClockRadiusReducer;

        return true;
    }

    private updateCanvasSize(width: number, height: number) {
        this._canvas.width = width;
        this._canvas.height = height;

        this._updateCanvasSize(width, height);
    }

    updateCurrentDate = (newCurrentDate: Date) => {
        this._currentDate = newCurrentDate;
        this.drawClock();
    };

    resetManualDate() {
        this._manualDate = null;
    }

    drawClock = () => {
        const {
            _ctx: context,
            _canvas: canvas,
            _currentDate,
            _manualDate: manualTime,
            _centerX: centerX,
            _centerY: centerY,
            _clockRadius: clockRadius,
        } = this;

        if (!context || !canvas) {
            return;
        }

        const isManualMode = (this._states & AnalogClockCanvas.States.isManualMode) !== 0;

        // Очистка canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Определяем время для отображения
        const now = isManualMode && manualTime ? manualTime : _currentDate;
        const hours = now.getHours() % 12;
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        // Рисуем фон циферблата
        context.beginPath();
        context.arc(centerX, centerY, clockRadius, 0, TWICE * PI);

        const gradient = context.createRadialGradient(centerX, centerY, clockRadius * ClockGradientReducer, centerX, centerY, clockRadius);

        gradient.addColorStop(0, '#0f3460');
        gradient.addColorStop(1, '#16213e');
        context.fillStyle = gradient;
        context.fill();

        // Рисуем ободок циферблата
        context.lineWidth = clockRadius * ClockDialBezelSize;
        context.strokeStyle = '#4dccbd';
        context.stroke();

        // Рисуем деления часов
        context.font = `bold ${clockRadius * ClockDivisionsOfHoursDistance}px Arial`;
        context.fillStyle = '#e6e6e6';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        for (let i = 1; i <= ClockHoursLength; i++) {
            // На часах 12 часов вверху, 3 часа справа, 6 часов внизу, 9 часов слева
            const angle = (i * PI) / 6 - PI / TWICE;
            const x = centerX + Math.cos(angle) * (clockRadius * 0.8);
            const y = centerY + Math.sin(angle) * (clockRadius * 0.8);

            context.fillText(i.toString(), x, y);
        }

        // Рисуем маленькие деления минут
        context.lineWidth = clockRadius * ClockDivisionsOfMinutesDistance;
        context.strokeStyle = '#a0a0c0';

        for (let i = 0; i < ClockMinutesLength; i++) {
            const angle = (i * PI) / ClockHalfMinutesLength - PI / TWICE;
            const isHourMark = i % 5 === 0;
            const innerRadius = clockRadius * (isHourMark ? 0.85 : 0.9);
            const outerRadius = clockRadius * 0.95;

            context.beginPath();
            context.moveTo(
                centerX + Math.cos(angle) * innerRadius,
                centerY + Math.sin(angle) * innerRadius
            );
            context.lineTo(
                centerX + Math.cos(angle) * outerRadius,
                centerY + Math.sin(angle) * outerRadius
            );
            context.stroke();
        }

        // Рисуем секундную стрелку
        const secondAngle = (seconds * PI) / 30 - PI / 2;

        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(
            centerX + Math.cos(secondAngle) * (clockRadius * 0.9),
            centerY + Math.sin(secondAngle) * (clockRadius * 0.9)
        );
        context.lineWidth = clockRadius * ClockDivisionsOfMinutesDistance;
        context.strokeStyle = '#ff4757';
        context.stroke();

        // Рисуем минутную стрелку
        const minuteAngle = (minutes * PI) / 30 + (seconds * PI) / 1800 - PI / TWICE;

        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(
            centerX + Math.cos(minuteAngle) * (clockRadius * 0.7),
            centerY + Math.sin(minuteAngle) * (clockRadius * 0.7)
        );
        context.lineWidth = clockRadius * 0.015;
        context.strokeStyle = '#4dccbd';
        context.stroke();

        // Рисуем часовую стрелку
        const hourAngle = (hours * PI) / 6 + (minutes * PI) / Clock360Degrees + (seconds * PI) / Clock360DegreesMultiplyByMinutesLength - PI / TWICE;

        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(
            centerX + Math.cos(hourAngle) * (clockRadius * 0.5),
            centerY + Math.sin(hourAngle) * (clockRadius * 0.5)
        );
        context.lineWidth = clockRadius * 0.025;
        context.strokeStyle = '#e6e6e6';
        context.stroke();

        // Рисуем центр циферблата
        context.beginPath();
        context.arc(centerX, centerY, clockRadius * 0.04, 0, TWICE * PI);
        context.fillStyle = '#4dccbd';
        context.fill();

        // Рисуем ободок центра
        context.beginPath();
        context.arc(centerX, centerY, clockRadius * 0.04, 0, TWICE * PI);
        context.lineWidth = clockRadius * 0.01;
        context.strokeStyle = '#fff';
        context.stroke();
    };

    private _onDocumentKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Shift') {
            this._states |= AnalogClockCanvas.States.shiftPressed;
            // this.updateStatus();
        }
    };
    private _onDocumentKeyup = (event: KeyboardEvent) => {
        if (event.key === 'Shift') {
            this._states &= ~AnalogClockCanvas.States.shiftPressed;
            // this.updateStatus();
        }
    };

    // Обработчики событий мыши
    private _onCanvasMousedown = (event: PointerEvent) => {
        this._states |= (AnalogClockCanvas.States.isMouseDown | AnalogClockCanvas.States.isManualMode);

        this.handleMousePosition(event);
        // this.updateStatus();
    };
    private _onCanvasMouseup = () => {
        this._states &= ~AnalogClockCanvas.States.isMouseDown;
        // this.updateStatus();

        // На данный момент, просто отпускаем isManualMode. Значение текущего времени всё равно берётся из nowDate$
        //  в котором будет уже выставленное новое значение.
        this._states &= ~AnalogClockCanvas.States.isManualMode;
    };
    private _onCanvasMousemove = (event: PointerEvent) => {
        if ((this._states & AnalogClockCanvas.States.isMouseDown) !== 0) {
            this.handleMousePosition(event);
        }
    };

    private _subscribeEvents() {
        const { _canvas: canvas } = this;

        if (!canvas) {
            return;
        }

        // Отслеживание нажатия Shift
        document.addEventListener('keydown', this._onDocumentKeydown, { passive: true });
        document.addEventListener('keyup', this._onDocumentKeyup, { passive: true });
        canvas.addEventListener('mousedown', this._onCanvasMousedown, { passive: true });
        canvas.addEventListener('mouseup', this._onCanvasMouseup, { passive: true });
        canvas.addEventListener('mousemove', this._onCanvasMousemove, { passive: true });
    }

    private _unsubscribeEvens() {
        // Отслеживание нажатия Shift
        document.removeEventListener('keydown', this._onDocumentKeydown);
        document.removeEventListener('keyup', this._onDocumentKeyup);

        const { _canvas: canvas } = this;

        if (canvas) {
            canvas.removeEventListener('mousedown', this._onCanvasMousedown);
            canvas.removeEventListener('mouseup', this._onCanvasMouseup);
            canvas.removeEventListener('mousemove', this._onCanvasMousemove);
        }
    }

    // Обработка позиции мыши при зажатой кнопке
    private handleMousePosition(event: PointerEvent) {
        const {
            _canvas: canvas,
            _currentDate,
            _manualDate: manualTime,
            _centerX: centerX,
            _centerY: centerY,
        } = this;

        if (!canvas) {
            return;
        }

        const shiftPressed = (this._states & AnalogClockCanvas.States.shiftPressed) !== 0;
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Вычисляем вектор от центра к курсору
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;

        // Вычисляем угол в радианах в системе координат Canvas
        // В Canvas: 0° направлен вправо, угол увеличивается против часовой стрелки
        let angle = Math.atan2(dy, dx);

        // Преобразуем угол в часовую систему:
        // - На часах 0° (12 часов) должен быть вверху
        // - Угол должен увеличиваться по часовой стрелке
        // - В математической системе: 0° вправо, +90° вверх
        // - На часах: 0° вверх, +90° вправо (по часовой стрелке)

        // Правильное преобразование:
        // 1. Сдвигает начало отсчета на 90° (Math.PI/2), чтобы 0° был вверху
        // 2. Сохраняет направление увеличения угла (в Canvas углы увеличиваются против часовой стрелки, что совпадает с направлением движения часов)
        angle = angle + PI / TWICE;

        // Нормализуем угол в диапазон [0, 2π)
        if (angle < 0) {
            angle += TWICE * Math.PI;
        }

        // Получаем текущее время (системное или ручное)
        const nowDate = manualTime || _currentDate;
        let hours = nowDate.getHours();
        const prevMinutes = nowDate.getMinutes();
        let minutes = prevMinutes;
        const seconds = nowDate.getSeconds();

        if (shiftPressed) {
            // Изменяем часовую стрелку
            // 12 часов = 0°, каждый час = 30° (360° / 12)
            hours = angle / (TWICE * PI) * ClockHoursLength;

            const integerHours = Math.round(hours);
            const valueForMinutes = hours - integerHours;

            hours = integerHours % ClockHoursLength;

            // Преобразуем в 24-часовой формат
            const current24Hour = nowDate.getHours();
            const wasPM = current24Hour >= ClockHoursLength;

            if (hours === 0) {
                hours = wasPM ? ClockHoursLength : 0;
            }
            else if (wasPM) {
                hours += ClockHoursLength;
            }

            minutes = valueForMinutes * ClockMinutesLength;
        }
        else {
            // Изменяем минутную стрелку
            // 0 минут = 0°, каждая минута = 6° (360° / 60)
            minutes = Math.round(angle / (TWICE * PI) * ClockMinutesLength);
            minutes = minutes % ClockMinutesLength;

            // todo: Это очень грубая реализация. Для "плавной" нужно сохранять "тренд" (направление предыдущего изменения)
            //  на несколько миллисекунд.
            if (prevMinutes > 30 && minutes < 30) {
                hours++;
            }
            else if (prevMinutes < 30 && minutes > 30) {
                hours--;
            }
        }

        // Создаем новое время с установленными часами и минутами
        const new_manualTime = this._manualDate = new Date(_currentDate);

        new_manualTime.setHours(hours);
        new_manualTime.setMinutes(minutes);
        new_manualTime.setSeconds(seconds);

        this._onManualTime?.(new_manualTime.getTime());

        this.drawClock();
    }

    static factory = () => {
        return new AnalogClockCanvas();
    };
}

namespace AnalogClockCanvas {
    export const enum States {
        isMouseDown = 1 << 1,
        shiftPressed = 1 << 2,
        isManualMode = 1 << 3,
    }
}
