//
interface ObjectConstructor {
    /**
     * @see [MDN / Object.groupBy()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy}
     * @see [proposal-array-grouping]{@link https://github.com/tc39/proposal-array-grouping}
     */
    groupBy<K extends number | string | symbol, V>(list: V[], predicate: (value: V, index: number) => K): Record<K, V[]>;
}
