// @widgetizer/render-engine — package entry point.
//
// Pure LiquidJS rendering engine. The functions take a resolved per-project
// `deps` bag (see the RenderDeps typedef in renderEngine.js) and never resolve
// projects, touch SQLite, or construct absolute data paths themselves — the
// shell (OSS or hosted) supplies those. This keeps the engine reusable across
// OSS (local FS) and hosted (cloud adapters).
export {
  renderWidget,
  renderPageLayout,
  renderCollectionItemPage,
  renderEnqueuedAssetTags,
  widgetSupportsTransparentHeader,
  planPagination,
} from "./renderEngine.js";

// Pure `menu`-type setting resolver shared by widget and collection-item rendering.
export { resolveMenuSettings, schemaHasMenuSetting } from "./menuResolver.js";

// Resolves the `link` and `menu` selections a theme declares in its SITE-WIDE
// settings, which are edited with the same inputs widgets use and so carry the same
// references. Exported for the shells that assemble their own render context, and
// so the behaviour can be tested without standing up a full render.
export { resolveThemeSettingReferences } from "./renderEngine.js";
