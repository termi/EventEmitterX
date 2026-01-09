// noinspection CssInvalidPropertyValue

'use strict';

import { apply, isSupported, injectStyles } from '@oddbird/popover-polyfill/fn';

if (!isSupported()) {
    // see https://github.com/oddbird/popover-polyfill/commit/5fd42a46ec4f8852290382191748bc1abadd4211
    const cssSupportsLevel = CSS.supports('selector(:where(dialog[popover][open]))')
        ? 1
        : 0
    ;

/*    document.head.insertAdjacentHTML('afterbegin', `<style>
[popover].\\:popover-open {
    display: block;
    overlay: auto !important;
}
[popover] {
    position: fixed;
    top: 0; left: 0;right: 0;bottom:0;
    width: fit-content;
    height: fit-content;
    color: canvastext;
    background-color: canvas;
    inset: 0px;
    margin: auto;
    border-width: initial;
    border-style: solid;
    border-color: initial;
    border-image: initial;
    padding: 0.25em;
    overflow: auto;
}
</style>`);*/
    if (cssSupportsLevel) {
        injectStyles(document);
    }
    else {
        document.head.insertAdjacentHTML('afterbegin', `<style>
  [popover] {
    position: fixed;
    z-index: 2147483647;
    inset: 0;
    padding: 0.25em;
    width: fit-content;
    height: fit-content;
    border-width: initial;
    border-color: initial;
    border-image: initial;
    border-style: solid;
    background-color: canvas;
    color: canvastext;
    overflow: auto;
    margin: auto;
  }

  [popover]:not(.\\:popover-open) {
    display: none;
  }

  dialog[popover].\\:popover-open {
    display: block;
  }

  dialog[popover][open] {
    display: revert;
  }

  [anchor].\\:popover-open {
    inset: auto;
  }

  /*
  [anchor]:popover-open {
    inset: auto;
  }
  */

  @supports not (background-color: canvas) {
    [popover] {
      background-color: white;
      color: black;
    }
  }

  @supports (width: -moz-fit-content) {
    [popover] {
      width: -moz-fit-content;
      height: -moz-fit-content;
    }
  }

  @supports not (inset: 0) {
    [popover] {
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
  }
</style>`);
    }

    apply();
}
