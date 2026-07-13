/**
 * Render-time resolution of embedded media paths in richtext HTML.
 *
 * Inserted images/files are stored as portable `/uploads/images|files/…` paths (what
 * the sanitizer, usage tracker, and exporter all expect). The browser can't load those
 * directly — media is served under `/api/media/projects/{id}/…` — so at render time the
 * path is rewritten to the active mode's served base, taken from the `imagePath` /
 * `filePath` render globals:
 *
 *   - Preview:  `{apiUrl}/api/media/projects/{id}/uploads/images/…`  (live media route)
 *   - Publish:  `{prefix}assets/images/…`                            (exported asset)
 *
 * This is the richtext analogue of what the `{% image %}` tag does for `image` settings,
 * and it runs automatically in the render pipeline so theme authors never wire anything
 * per template. It only ever touches the per-render clone — stored values keep the
 * portable path. Lives under src/core so it imports no backend-only code.
 */

// Match a `src="`/`href="` (group 1) immediately followed by an `/uploads/{images,files}/`
// path — i.e. an attribute whose value *starts with* the upload path, not a coincidental
// `/uploads/` substring elsewhere (a longer URL, prose, or another attribute like class).
const UPLOAD_IMAGE_ATTR_RE = /((?:src|href)=")\/uploads\/images\//g;
const UPLOAD_FILE_ATTR_RE = /((?:src|href)=")\/uploads\/files\//g;

/**
 * Rewrite embedded `/uploads/images|files/…` paths in one richtext HTML string to the
 * given mode-aware bases. Non-string / empty values pass through.
 * @param {*} html - The richtext HTML value.
 * @param {string} imagePath - Base for `/uploads/images/` (the `imagePath` render global).
 * @param {string} filePath - Base for `/uploads/files/` (the `filePath` render global).
 * @returns {*} The rewritten string (or the input unchanged when not a non-empty string).
 */
export function resolveRichtextMediaPaths(html, imagePath, filePath) {
  if (typeof html !== "string" || html === "") return html;
  let out = html;
  // Only a `src`/`href` value that IS an upload path is rewritten — never a `/uploads/`
  // substring inside a longer URL (`https://host/uploads/…`), in prose, or in another
  // attribute. The value has already passed through DOMPurify (double-quoted attrs), so
  // anchoring on `src="`/`href="` is reliable. The function replacement sidesteps
  // `$`-pattern handling if a base path contains `$`.
  if (imagePath) out = out.replace(UPLOAD_IMAGE_ATTR_RE, (_m, attr) => `${attr}${imagePath}/`);
  if (filePath) out = out.replace(UPLOAD_FILE_ATTR_RE, (_m, attr) => `${attr}${filePath}/`);
  return out;
}

/**
 * Resolve richtext media paths in place for every `richtext`-typed field of a flat
 * settings object, driven by the schema's settings array.
 * @param {object} settings - A settings object (mutated in place).
 * @param {Array} schemaSettings - The schema's `settings` array (id + type per field).
 * @param {string} imagePath - The `imagePath` render global.
 * @param {string} filePath - The `filePath` render global.
 */
export function resolveRichtextMediaInSettings(settings, schemaSettings, imagePath, filePath) {
  if (!settings || !Array.isArray(schemaSettings)) return;
  for (const setting of schemaSettings) {
    if (setting.type === "richtext" && setting.id && typeof settings[setting.id] === "string") {
      settings[setting.id] = resolveRichtextMediaPaths(settings[setting.id], imagePath, filePath);
    }
  }
}

/**
 * Resolve richtext media paths in place across a widget's top-level settings and every
 * block's settings, driven by the widget schema (`settings` + `blocks[].settings`).
 * @param {object} widgetData - Object with `.settings` and optional `.blocks` (mutated in place).
 * @param {object} schema - Widget schema with `.settings` and optional `.blocks` arrays.
 * @param {string} imagePath - The `imagePath` render global.
 * @param {string} filePath - The `filePath` render global.
 */
export function resolveRichtextMediaInWidgetData(widgetData, schema, imagePath, filePath) {
  if (!widgetData || !schema) return;
  resolveRichtextMediaInSettings(widgetData.settings, schema.settings, imagePath, filePath);
  if (widgetData.blocks && Array.isArray(schema.blocks)) {
    const settingsByType = new Map(schema.blocks.filter((b) => b.type).map((b) => [b.type, b.settings]));
    for (const block of Object.values(widgetData.blocks)) {
      if (block && block.type && block.settings && settingsByType.has(block.type)) {
        resolveRichtextMediaInSettings(block.settings, settingsByType.get(block.type), imagePath, filePath);
      }
    }
  }
}
