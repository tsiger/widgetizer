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
} from "./renderEngine.js";

// Pure `menu`-type setting resolver (Collections finding #10), shared by
// collection-item rendering and — once 741abfb8 is folded in — widget rendering.
export { resolveMenuSettings, schemaHasMenuSetting } from "./menuResolver.js";
