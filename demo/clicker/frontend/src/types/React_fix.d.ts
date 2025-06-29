//
import type { AriaAttributes, DOMAttributes } from "react";

declare module 'react' {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        /**
         * Specifies the types of user actions that can be used to close the `<dialog>` element. This attribute distinguishes three methods by which a dialog might be closed:
         *
         * A light dismiss user action, in which the `<dialog>` is closed when the user clicks or taps outside it. This is equivalent to the ["light dismiss" behavior of "auto" state popovers](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using#auto_state_and_light_dismiss).
         * A platform-specific user action, such as pressing the `Esc` key on desktop platforms, or a "back" or "dismiss" gesture on mobile platforms.
         * A developer-specified mechanism such as a `<button>` with a click handler that invokes `HTMLDialogElement.close() `or a `<form>` submission.
         *
         * Possible values are:
         * * `any`: The dialog can be dismissed using any of the three methods.
         * * `closerequest`: The dialog can be dismissed with a platform-specific user action or a developer-specified mechanism.
         * * `none`: The dialog can only be dismissed with a developer-specified mechanism.
         *
         * If the `<dialog>` element does not have a valid `closedby` value specified, then
         * * if it was opened using `showModal()`, it behaves as if the value was `closerequest`
         * * otherwise, it behaves as if the value was `none`.
         *
         * @see [MDN / <dialog> / Attributes / closedby](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#closedby)
         */
        closedby?: 'none' | 'closerequest' | 'any';
    }
}
