// @widgetizer/core — shared frontend/backend code.
//
// This barrel ("." entry) re-exports the server-side Liquid tags and filters
// used by the render engine. It intentionally does NOT re-export the
// browser-facing helpers (fonts data, YouTube helpers): those are exposed as
// dedicated subpath exports so the frontend can import them without pulling
// LiquidJS and the tag classes into the browser bundle.
//
//   server:   import { SeoTag, registerHandleizeFilter } from '@widgetizer/core'
//   browser:  import fonts from '@widgetizer/core/config/fonts.json' with { type: 'json' }
//             import { validateYouTubeUrl } from '@widgetizer/core/youtube'

// ---- Liquid tags ----
export * from "./tags/assetTag.js";
export * from "./tags/customCssTag.js";
export * from "./tags/customFooterScriptsTag.js";
export * from "./tags/customHeadScriptsTag.js";
export * from "./tags/enqueuePreload.js";
export * from "./tags/enqueueScript.js";
export * from "./tags/enqueueStyle.js";
export * from "./tags/FontsTag.js";
export * from "./tags/imageTag.js";
export * from "./tags/placeholderImageTag.js";
export * from "./tags/renderFooterAssets.js";
export * from "./tags/renderHeaderAssets.js";
export * from "./tags/SeoTag.js";
export * from "./tags/themeSettings.js";
export * from "./tags/youtubeTag.js";

// ---- Liquid filters ----
export * from "./filters/handleizeFilter.js";
export * from "./filters/mediaMetaFilter.js";
export * from "./filters/safeUrlFilter.js";
export * from "./filters/rteFilter.js";
export * from "./filters/dateFilter.js";
export * from "./filters/collectionFilter.js";
