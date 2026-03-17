/**
 * handleize filter
 *
 * Converts a string to a URL/form-safe handle (kebab-case).
 * Equivalent to Shopify's handleize filter.
 *
 * Usage: {{ "My Option" | handleize }} -> "my-option"
 */

export function registerHandleizeFilter(engine) {
  engine.registerFilter("handleize", (str) => {
    if (!str || typeof str !== "string") return "";
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // remove non-word chars (except spaces and hyphens)
      .replace(/[\s_]+/g, "-") // spaces/underscores to hyphens
      .replace(/-+/g, "-") // collapse multiple hyphens
      .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
  });
}
