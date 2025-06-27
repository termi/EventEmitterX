//

interface ErrorConstructor {
    /**
     * Returns `true` if the value is an instance of a built-in `Error` type.
     *
     * ```js
     * isError(new Error());  // Returns true
     * isError(new TypeError());  // Returns true
     * isError(new RangeError());  // Returns true
     * isError({});  // Returns false
     * ```
     *
     * @see [Error.isError proposal]{@link https://github.com/tc39/proposal-is-error}
     */
    isError(arg: unknown): arg is Error;
}
