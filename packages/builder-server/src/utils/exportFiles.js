import path from "node:path";
import fs from "node:fs";
import { isWithinDirectory } from "./pathSecurity.js";

/**
 * Resolve a viewer request to the file to send, or null. Beyond the exact
 * path, an extensionless request also tries `<path>.html` then
 * `<path>/index.html` — projects with Clean URLs on emit links like `about`
 * that a real host resolves to `about.html`; a directory-style request
 * (`about/`) tries the flat file then its index. Every candidate is confined
 * to the selected export directory (never merely the publish root), so a
 * fallback can never reach a sibling export.
 *
 * @param {string} publishDir - the global publish directory
 * @param {string} exportDir - the export's directory name (already scope-checked)
 * @param {string} requestedPath - normalized request path, no leading slash
 * @returns {string|null} absolute path of a regular file, or null
 */
export function resolveExportFile(publishDir, exportDir, requestedPath) {
  const exportRoot = path.resolve(publishDir, exportDir);
  if (!isWithinDirectory(exportRoot, path.resolve(publishDir))) return null;

  const trailingSlash = requestedPath.endsWith("/");
  const trimmed = requestedPath.replace(/\/+$/, "");
  const base = path.resolve(exportRoot, trimmed);
  const lastSegment = trimmed.split("/").pop() || "";

  let candidates;
  if (trailingSlash) {
    candidates = [`${base}.html`, path.join(base, "index.html")];
  } else if (lastSegment.includes(".")) {
    candidates = [base];
  } else {
    candidates = [base, `${base}.html`, path.join(base, "index.html")];
  }

  for (const candidate of candidates) {
    const abs = path.resolve(candidate);
    if (!isWithinDirectory(abs, exportRoot)) continue;
    if (!fs.existsSync(abs)) continue;
    if (!fs.statSync(abs).isFile()) continue;
    return abs;
  }
  return null;
}
