import { buildGraph } from "./graph.js";
import { jsonLdScript } from "./serialize.js";

export { buildGraph } from "./graph.js";
export { GRAPH_BUILDERS } from "./builders.js";
export { siteNodeId, urlNodeId } from "./ids.js";
export { pruneEmpty, serializeJsonLd, jsonLdScript } from "./serialize.js";
export { COLLECTION_STRUCTURED_DATA_TYPES, validateCollectionStructuredData } from "./collectionTypes.js";

/**
 * The JSON-LD `<script>` for a page render, or "" when there is nothing to emit.
 * @param {{ page?: object, project?: object, mediaFiles?: object }} context
 */
export function structuredDataScript(context) {
  return jsonLdScript(buildGraph(context));
}
