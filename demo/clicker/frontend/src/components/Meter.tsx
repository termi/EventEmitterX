'use strict';

export default function Meter({
    value,
    displayValue = String(value),
    min,
    max,
    low,
    optimum,
    high,
    className,
}: {
    value: number,
    displayValue?: string,
    min?: number,
    max?: number,
    low?: number,
    optimum?: number,
    high?: number,
    className?: string,
}) {
    return (
        <meter className={className} low={low} high={high} optimum={optimum} min={min} max={max}
            value={value}
        >
            {displayValue}%
        </meter>
    );
}
