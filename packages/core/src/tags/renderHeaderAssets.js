/**
 * {% header_assets %} Liquid Tag
 *
 * Outputs all enqueued CSS and JS files marked for header, sorted by priority.
 * Should be placed in layout.liquid <head> section.
 *
 * Usage:
 * {% header_assets %}
 */
import { prefixInternalHref } from "../utils/linkPrefixer.js";
import { buildAssetUrl, splitAssetRef } from "../utils/assetUrl.js";

/**
 * Prefix every candidate URL in a srcset/imagesrcset string for the given
 * output depth, preserving each `<url> <descriptor>` pair. At the export root
 * (empty prefix) the original string is returned byte-for-byte.
 */
/**
 * Depth-prefix a preload href the author supplied as-is. `{% image … output:
 * 'path' %}` already emits `<outputPathPrefix>assets/images/…` in publish mode,
 * so a src that starts with the current prefix is left alone rather than
 * prefixed a second time (`../../assets/…` on a collection item page).
 */
function prefixPreloadHref(href, outputPathPrefix) {
  if (outputPathPrefix && typeof href === "string" && href.startsWith(outputPathPrefix)) return href;
  return prefixInternalHref(href, outputPathPrefix);
}

function prefixSrcset(srcset, outputPathPrefix) {
  if (!outputPathPrefix || typeof srcset !== "string") return srcset;
  return srcset
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      const spaceIdx = trimmed.indexOf(" ");
      if (spaceIdx === -1) return prefixPreloadHref(trimmed, outputPathPrefix);
      const url = trimmed.slice(0, spaceIdx);
      const descriptor = trimmed.slice(spaceIdx); // leading space + e.g. "320w"
      return `${prefixPreloadHref(url, outputPathPrefix)}${descriptor}`;
    })
    .join(", ");
}

export const RenderHeaderAssetsTag = {
  parse(tagToken) {
    this.tagName = tagToken.name;
  },

  render(context) {
    try {
      const styles = context.globals?.enqueuedStyles;
      const scripts = context.globals?.enqueuedScripts;

      const globals = context.globals || {};
      // Depth-aware prefix for nested item pages ("" at the export root).
      const outputPathPrefix = globals.outputPathPrefix || "";

      let output = "";

      // Render preloads first
      const preloads = globals.enqueuedPreloads;
      if (preloads && preloads.size > 0) {
        preloads.forEach((options, src) => {
          // A preload only helps when its href is byte-identical to the request
          // it warms, so scripts, styles and fonts given as a path relative to
          // the theme's assets/ folder resolve through the same builder the real
          // request uses — assets/ path, depth prefix, ?v= token (CSS/JS only),
          // or the preview API route. Scripts/styles follow enqueue_script's
          // origin rule (the widget's own folder inside a widget, unless
          // theme: true); fonts always resolve against the theme's assets/,
          // because the export never ships widget-folder fonts. Anything that
          // is already a URL — a scheme, a leading "/", an explicit assets/
          // prefix — is the author's own and is only depth-prefixed, which is
          // how image preloads (fed by {% image … output: 'path' %}) work.
          const as = String(options.as || "").toLowerCase(); // browsers match `as` case-insensitively
          // Classify on the path alone: an author query may legitimately contain
          // "/" or ":" (`?next=/dashboard`) and must not demote a relative path.
          const srcPath = splitAssetRef(src).path;
          // Scheme match is case-insensitive (`HTTPS:`); the `assets/` prefix is
          // exact — `Assets/x.js` is a sub-folder of the theme's assets/, not the prefix.
          const isThemeRelative =
            srcPath !== "" &&
            !/^[a-z][a-z0-9+.-]*:/i.test(srcPath) &&
            !/^(?:\/|assets\/)/.test(srcPath) &&
            !srcPath.includes("\\");
          let assetUrl;
          if (isThemeRelative && (as === "script" || as === "style")) {
            assetUrl = buildAssetUrl(src, { globals, source: options.source, widgetType: options.widgetType });
          } else if (isThemeRelative && as === "font") {
            assetUrl = buildAssetUrl(src, { globals });
          } else {
            assetUrl = prefixPreloadHref(src, outputPathPrefix);
          }

          // Construct the link tag
          const attrs = [`<link rel="preload" href="${assetUrl}"`];

          if (options.as) attrs.push(`as="${options.as}"`);
          if (options.type) attrs.push(`type="${options.type}"`);
          if (options.fetchpriority) attrs.push(`fetchpriority="${options.fetchpriority}"`);
          if (options.media) attrs.push(`media="${options.media}"`);
          if (options.imagesrcset) attrs.push(`imagesrcset="${prefixSrcset(options.imagesrcset, outputPathPrefix)}"`);
          if (options.imagesizes) attrs.push(`imagesizes="${options.imagesizes}"`);
          if (options.crossorigin) attrs.push(`crossorigin`);

          attrs.push(">");
          output += attrs.join(" ") + "\n";
        });
      }

      // Collect header styles
      const headerStyles = [];
      if (styles && styles.size > 0) {
        styles.forEach((options, filepath) => {
          if (options.location === "header") {
            headerStyles.push({ filepath, options });
          }
        });
      }

      // Collect header scripts
      const headerScripts = [];
      if (scripts && scripts.size > 0) {
        scripts.forEach((options, filepath) => {
          if (options.location === "header") {
            headerScripts.push({ filepath, options });
          }
        });
      }

      // Sort by priority (ascending - lower numbers first)
      headerStyles.sort((a, b) => a.options.priority - b.options.priority);
      headerScripts.sort((a, b) => a.options.priority - b.options.priority);

      // Render styles first (sorted)
      headerStyles.forEach(({ filepath, options }) => {
        const assetUrl = buildAssetUrl(filepath, {
          globals,
          source: options.source,
          widgetType: options.widgetType,
        });

        let tag = `<link rel="stylesheet" href="${assetUrl}"`;
        if (options.media) tag += ` media="${options.media}"`;
        if (options.id) tag += ` id="${options.id}"`;
        tag += ">";

        output += tag + "\n";
      });

      // Render scripts second (sorted)
      headerScripts.forEach(({ filepath, options }) => {
        const assetUrl = buildAssetUrl(filepath, {
          globals,
          source: options.source,
          widgetType: options.widgetType,
        });

        let tag = `<script src="${assetUrl}"`;
        if (options.defer === true) tag += " defer";
        if (options.async === true) tag += " async";
        tag += "></script>";

        output += tag + "\n";
      });

      return output;
    } catch (error) {
      console.error("Error in header_assets tag:", error);
      return `<!-- Error rendering header assets: ${error.message} -->`;
    }
  },
};
