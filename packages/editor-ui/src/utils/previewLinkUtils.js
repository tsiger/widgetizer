// NOTE: the in-preview href → preview-route mapper (`getStandalonePreviewTarget`)
// lives in `@widgetizer/core/src/runtime/standalonePreviewTarget.js` — its only
// consumer is the injected preview runtime (`previewRuntime.js`, served raw to the
// preview iframe), which can't import this package.

// A language, spelled the way `LANGUAGE_CODE_RE` spells it. The namespaced routes
// insist on one: without that, `/preview/collection/a/b/c` would read as an item
// in language "a" rather than as the nonsense it is.
const LANG = "[a-z]{2}(?:-[a-z0-9]{2,8})?";

const NAVIGABLE = new RegExp(
  `^/preview/(?:` +
    // Namespaced: a page, a paginated copy of one, an item.
    `page/${LANG}/[^/?#]+(?:/page/[1-9]\\d*)?` +
    `|collection/${LANG}/[^/?#]+/[^/?#]+` +
    // The flat routes, which mean the default language.
    `|collection/[^/?#]+/[^/?#]+` +
    `|paged/[^/?#]+/[1-9]\\d*` +
    `|[^/?#]+` +
    `)$`,
);

export function isStandalonePreviewNavigationUrl(url) {
  return typeof url === "string" && NAVIGABLE.test(url);
}
