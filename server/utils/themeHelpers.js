/**
 * Transforms raw theme settings from theme.json into a flattened object for Liquid templates.
 * Converts array-based settings groups into key-value objects keyed by setting ID.
 * Uses the current value if set, otherwise falls back to default value.
 * @param {object} themeData - Raw theme data from theme.json
 * @param {object} themeData.settings - Settings container
 * @param {object} themeData.settings.global - Global settings groups
 * @returns {object} Processed settings object keyed by category, then by setting ID
 * @example
 * // Input (themeData.settings.global):
 * { colors: [{ id: 'bg', value: '#fff', default: '#eee' }] }
 * // Output:
 * { colors: { bg: '#fff' } }
 */
export function preprocessThemeSettings(themeData) {
  const processed = {};
  const globalSettings = themeData?.settings?.global;

  if (!globalSettings) {
    console.warn("No global settings found in theme data for preprocessing.");
    return processed;
  }

  Object.entries(globalSettings).forEach(([category, items]) => {
    if (Array.isArray(items)) {
      processed[category] = {};
      items.forEach((item) => {
        if (item.id) {
          // Use the current value if it's defined, otherwise use the default value.
          // Ensure we handle cases where neither value nor default might exist.
          processed[category][item.id] =
            item.value !== undefined ? item.value : item.default !== undefined ? item.default : null;
        } else {
          console.warn(`Setting in category '${category}' is missing an 'id'.`, item);
        }
      });
    } else {
      console.warn(`Expected array for settings category '${category}', but got:`, typeof items);
    }
  });

  return processed;
}
