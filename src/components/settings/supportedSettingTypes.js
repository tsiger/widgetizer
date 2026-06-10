/**
 * Canonical list of setting types supported by SettingsRenderer.jsx.
 *
 * This is the single source of truth shared between:
 *   - the frontend settings renderer (src/components/settings/SettingsRenderer.jsx)
 *   - backend collection-type schema validation (server/services/collectionService.js)
 *
 * Keep this in sync with the branches actually handled by SettingsRenderer.
 * Plain data only (no React) so the backend can import it safely.
 */

export const SUPPORTED_SETTING_TYPES = [
  "header",
  "text",
  "number",
  "date",
  "textarea",
  "richtext",
  "code",
  "color",
  "range",
  "select",
  "checkbox",
  "radio",
  "font_picker",
  "menu",
  "image",
  "gallery",
  "table",
  "file",
  "link",
  "youtube",
  "icon",
];

/** Fast membership lookup for validation. */
export const SUPPORTED_SETTING_TYPE_SET = new Set(SUPPORTED_SETTING_TYPES);

export function isSupportedSettingType(type) {
  return SUPPORTED_SETTING_TYPE_SET.has(type);
}
