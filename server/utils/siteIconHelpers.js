import fs from "fs-extra";
import path from "path";
import sharp from "sharp";
import { prefixInternalHref } from "./linkPrefixer.js";

function getMimeTypeFromFilename(filename = "") {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "";
  }
}

function emptySiteIcons() {
  return {
    primaryIconHref: "",
    primaryIconType: "",
    primaryIconSizes: "",
    legacyIconHref: "",
    appleTouchIconHref: "",
    manifestHref: "",
  };
}

function getSiteIconMetadata(siteIconSrc, mediaFiles = {}) {
  if (!siteIconSrc) return null;

  const filename = path.basename(siteIconSrc);
  const mediaFile = mediaFiles?.[filename] || null;
  const sourceFilename = mediaFile?.path ? path.basename(mediaFile.path) : filename;
  const mimeType = mediaFile?.type || getMimeTypeFromFilename(sourceFilename);
  const isSvg = mimeType === "image/svg+xml" || sourceFilename.toLowerCase().endsWith(".svg");

  return {
    filename,
    sourceFilename,
    mimeType,
    isSvg,
  };
}

/**
 * Return a shallow copy of a site_icons object with every href field rewritten
 * for the given output depth. Used when icon hrefs were generated at the export
 * root (bare filenames) but are rendered into a nested item page. Non-href
 * fields (type/sizes) and empty hrefs are left untouched; at the root (prefix
 * "") the copy is byte-identical to the input.
 * @param {object} siteIcons
 * @param {string} outputPathPrefix - "" at the root, "../" one level deep
 * @returns {object}
 */
export function prefixSiteIcons(siteIcons, outputPathPrefix) {
  if (!siteIcons) return siteIcons;
  return {
    ...siteIcons,
    primaryIconHref: prefixInternalHref(siteIcons.primaryIconHref, outputPathPrefix),
    legacyIconHref: prefixInternalHref(siteIcons.legacyIconHref, outputPathPrefix),
    appleTouchIconHref: prefixInternalHref(siteIcons.appleTouchIconHref, outputPathPrefix),
    manifestHref: prefixInternalHref(siteIcons.manifestHref, outputPathPrefix),
  };
}

export function buildRuntimeSiteIcons(siteIconSrc, mediaFiles, imageBasePath) {
  const siteIcon = getSiteIconMetadata(siteIconSrc, mediaFiles);
  if (!siteIcon || !imageBasePath) return emptySiteIcons();

  const sourceHref = `${imageBasePath}/${siteIcon.sourceFilename}`;

  return {
    primaryIconHref: sourceHref,
    primaryIconType: siteIcon.mimeType,
    primaryIconSizes: siteIcon.isSvg ? "any" : "",
    legacyIconHref: siteIcon.isSvg ? "" : sourceHref,
    appleTouchIconHref: sourceHref,
    manifestHref: "",
  };
}

async function writePngVariant(sourcePath, outputPath, size) {
  await sharp(sourcePath, { limitInputPixels: 100_000_000 })
    .resize({
      width: size,
      height: size,
      fit: "cover",
      position: "centre",
    })
    .png()
    .toFile(outputPath);
}

export async function generateExportSiteIcons({ outputDir, projectDir, projectName, siteTitle, siteIconSrc }) {
  if (!siteIconSrc) return emptySiteIcons();

  const sourcePath = path.join(projectDir, "uploads", "images", path.basename(siteIconSrc));
  if (!(await fs.pathExists(sourcePath))) {
    console.warn(`Site icon source file not found: ${sourcePath}`);
    return emptySiteIcons();
  }

  const isSvg = path.extname(sourcePath).toLowerCase() === ".svg";
  const icons = emptySiteIcons();

  try {
    if (isSvg) {
      await fs.copy(sourcePath, path.join(outputDir, "favicon.svg"));
      icons.primaryIconHref = "favicon.svg";
      icons.primaryIconType = "image/svg+xml";
      icons.primaryIconSizes = "any";
      icons.legacyIconHref = "favicon-32.png";
    } else {
      icons.primaryIconHref = "favicon-32.png";
      icons.primaryIconType = "image/png";
      icons.primaryIconSizes = "32x32";
      icons.legacyIconHref = "favicon-32.png";
    }

    await writePngVariant(sourcePath, path.join(outputDir, "favicon-32.png"), 32);
    await writePngVariant(sourcePath, path.join(outputDir, "apple-touch-icon.png"), 180);
    await writePngVariant(sourcePath, path.join(outputDir, "icon-192.png"), 192);
    await writePngVariant(sourcePath, path.join(outputDir, "icon-512.png"), 512);

    icons.appleTouchIconHref = "apple-touch-icon.png";
    icons.manifestHref = "site.webmanifest";

    const manifest = {
      name: siteTitle || projectName || "Widgetizer Site",
      short_name: siteTitle || projectName || "Widgetizer",
      icons: [
        {
          src: "icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      display: "standalone",
    };

    await fs.writeJson(path.join(outputDir, "site.webmanifest"), manifest, { spaces: 2 });
  } catch (error) {
    console.warn(`Could not generate site icon assets: ${error.message}`);
    return emptySiteIcons();
  }

  return icons;
}
