const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);
const SCRIPT_UNSAFE = new RegExp(`[<>&${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`, "g");

function unicodeEscape(char) {
  return "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0");
}

/**
 * Drop empty values recursively: undefined, null, blank strings, and arrays or
 * objects left empty after pruning. Numbers and booleans are kept.
 * @param {*} value
 * @returns {*} The pruned value, or undefined when nothing is left.
 */
export function pruneEmpty(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.trim() ? value : undefined;
  if (Array.isArray(value)) {
    const items = value.map(pruneEmpty).filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, child]) => [key, pruneEmpty(child)])
      .filter(([, child]) => child !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value;
}

/**
 * The JSON-LD document for a graph, safe to place inside a `<script>` element:
 * `<`, `>`, `&` and the two Unicode line separators are written as \u escapes,
 * so no user text can close the element or open a comment. "" when the graph is
 * empty after pruning.
 * @param {Array<object>} nodes
 * @returns {string}
 */
export function serializeJsonLd(nodes) {
  const graph = pruneEmpty(Array.isArray(nodes) ? nodes : []);
  if (!graph) return "";
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
  return json.replace(SCRIPT_UNSAFE, unicodeEscape);
}

/**
 * @param {Array<object>} nodes
 * @returns {string} A `<script type="application/ld+json">` element, or "" for an empty graph.
 */
export function jsonLdScript(nodes) {
  const json = serializeJsonLd(nodes);
  return json ? `<script type="application/ld+json">${json}</script>` : "";
}
