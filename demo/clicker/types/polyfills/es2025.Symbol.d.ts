//

interface SymbolConstructor {
    /**
     * @see [Symbol Predicates Proposal]{@link https://github.com/tc39/proposal-symbol-predicates}
     */
    isRegistered: (sym: symbol) => boolean;
    /**
     * @see [Symbol Predicates Proposal]{@link https://github.com/tc39/proposal-symbol-predicates}
     */
    isWellKnown: (sym: symbol) => boolean;
}
