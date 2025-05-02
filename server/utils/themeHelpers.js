/**
 * Transforms raw theme settings from theme.json into a more accessible object
 * keyed by category and setting ID. Also handles potential missing values.
 *
 * Example Input (themeData.settings.global):
 * {
 *   colors: [ { id: 'bg', value: '#fff', default: '#eee' }, ... ],
 *   layout: [ { id: 'boxed', value: true, default: false } ]
 * }
 *
 * Example Output:
 * {
 *   colors: { bg: '#fff', ... },
 *   layout: { boxed: true }
 * }
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
