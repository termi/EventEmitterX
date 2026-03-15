'use strict';

import { checkSafariBrowser } from "./utils";

let _hasStyledSelectSupport: boolean | undefined;

/**
 * * [MDN / Customizable select elements](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select)
 * * [MDN / <selectedcontent>: The selected option display element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/selectedcontent)
 * * [The <select> element can now be customized with CSS](https://developer.chrome.com/blog/a-customizable-select)
 * * [Updates to the customizable select API](https://una.im/select-updates/)
 * * [The customizable select - Part one: history, trickery, and styling the select with CSS](https://utilitybend.com/blog/the-customizable-select-part-one-history-trickery-and-styling-the-select-with-css)
 * * [Customizable Select Element (Explainer)](https://open-ui.org/components/customizableselect/)
 * * [Custom Select (that comes up from the bottom on mobile)](https://frontendmasters.com/blog/custom-select-that-comes-up-from-the-bottom-on-mobile/)
 *
 * * Examples:
 *   * [Currency picker -- customizable select](https://codepen.io/una/pen/MWMmYxb)
 *   * [Custom <select> with icons](https://codepen.io/web-dot-dev/pen/zxYaXzZ)
 *   * [🌟 Custom round <select> - Potion selector using sibling-count and sibling-index (experimental)](https://codepen.io/utilitybend/pen/LEYvoNv)
 *   * [🌟 Custom round <select> - Customizable select optgroup](https://codepen.io/utilitybend/pen/jEOpwXX)
 *   * [🌟 Codepen cool collection / Stylable select](https://codepen.io/collection/qOGape)
 *   * [Codepen collection / Customizable Select](https://codepen.io/collection/BNZjPe)
 *   * [Codepen collection / customizable <select>](https://codepen.io/collection/pjMbkR)
 *   * [Animated menu via Custom Select](https://codepen.io/editor/chriscoyier/pen/01974031-b8f8-75e5-ba6e-e71adbbc7d8a)
 *
 * @see [Customise Datalist via JavaScript](https://dev.to/siddev/customise-datalist-45p0)
 */
export function hasCustomizableSelectSupport() {
    return _hasStyledSelectSupport ??= (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment,@typescript-eslint/prefer-ts-expect-error
        // @ts-ignore `TS2304: Cannot find name HTMLSelectedContentElement`
        // noinspection TypeScriptUnresolvedReference
        typeof HTMLSelectedContentElement !== 'undefined'
        && document.createElement('selectedcontent')?.constructor?.name === 'HTMLSelectedContentElement'
        && typeof CSS !== 'undefined'
        && CSS.supports('appearance: base-select')
        // note: Need to check for Safari, because it can be a bug with select elements and custom select support detection can give a false positive result in it.
        // todo: Write better detect for Safari. See also [WebKit Bugzilla / Enhanced <select>](https://bugs.webkit.org/show_bug.cgi?id=286642)
        && !checkSafariBrowser()
    );
}
