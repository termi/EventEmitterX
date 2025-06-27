//

interface Map<K, V> {
    /**
     * @see [Proposal Upsert]{https://github.com/tc39/proposal-upsert}
     */
    getOrInsert(key: K, defaultValue: V): V;
    /**
     * @see [Proposal Upsert]{https://github.com/tc39/proposal-upsert}
     */
    getOrInsertComputed(key: K, computation: (key: K) => V): V;
}
