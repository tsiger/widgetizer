// @widgetizer/adapters-local — OSS implementations of the @widgetizer/core
// adapter contracts. Consumed ONLY by the OSS shells (web + electron); hosted
// never imports this package. That structural separation protects the
// OSS/hosted boundary.
//
export { LocalStorageAdapter } from "./LocalStorageAdapter.js";
export { LocalAssetStorageAdapter } from "./LocalAssetStorageAdapter.js";
export { LocalScopeResolver, LocalPreviewScopeResolver } from "./LocalScopeResolver.js";
export { LocalPublishAdapter } from "./LocalPublishAdapter.js";
export { LocalLimitsAdapter } from "./LocalLimitsAdapter.js";
