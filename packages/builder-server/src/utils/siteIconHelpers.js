import fs from "fs-extra";
import path from "path";
import sharp from "sharp";

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
    serpIconHref: "",
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

export function buildRuntimeSiteIcons(siteIconSrc, mediaFiles, imageBasePath) {
  const siteIcon = getSiteIconMetadata(siteIconSrc, mediaFiles);
  if (!siteIcon || !imageBasePath) return emptySiteIcons();

  const sourceHref = `${imageBasePath}/${siteIcon.sourceFilename}`;

  return {
    primaryIconHref: sourceHref,
    primaryIconType: siteIcon.mimeType,
    primaryIconSizes: siteIcon.isSvg ? "any" : "",
    legacyIconHref: siteIcon.isSvg ? "" : sourceHref,
    serpIconHref: "", // derived sizes exist only in exports; runtime serves the source file
    appleTouchIconHref: sourceHref,
    manifestHref: "",
  };
}

function pngVariantPipeline(sourcePath, size) {
  return sharp(sourcePath, { limitInputPixels: 100_000_000 })
    .resize({
      width: size,
      height: size,
      fit: "cover",
      position: "centre",
    })
    .png();
}

async function writePngVariant(sourcePath, outputPath, size) {
  await pngVariantPipeline(sourcePath, size).toFile(outputPath);
}

// Wrap a PNG in a single-entry .ico container: 6-byte ICONDIR + 16-byte
// ICONDIRENTRY + the PNG bytes verbatim at offset 22. PNG-compressed entries
// are valid ICO and understood by every current browser and crawler, which
// spares us a dedicated ico-encoder dependency (sharp cannot write .ico).
function icoFromPng(pngBuffer, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // resource type: icon
  header.writeUInt16LE(1, 4); // image count
  header.writeUInt8(size >= 256 ? 0 : size, 6); // width (0 encodes 256)
  header.writeUInt8(size >= 256 ? 0 : size, 7); // height
  header.writeUInt8(0, 8); // palette size (none)
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // color planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(pngBuffer.length, 14); // image data length
  header.writeUInt32LE(22, 18); // image data offset
  return Buffer.concat([header, pngBuffer]);
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

    const png32 = await pngVariantPipeline(sourcePath, 32).toBuffer();
    await fs.writeFile(path.join(outputDir, "favicon-32.png"), png32);
    // favicon.ico is written for agents that request /favicon.ico directly
    // (Google, legacy browsers) but deliberately never linked in the HTML —
    // a <link> to it would make browsers prefer the 32px ico over the
    // higher-resolution PNG/SVG icons.
    await fs.writeFile(path.join(outputDir, "favicon.ico"), icoFromPng(png32, 32));
    await writePngVariant(sourcePath, path.join(outputDir, "apple-touch-icon.png"), 180);
    await writePngVariant(sourcePath, path.join(outputDir, "icon-192.png"), 192);
    await writePngVariant(sourcePath, path.join(outputDir, "icon-512.png"), 512);

    icons.serpIconHref = "icon-192.png";
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
