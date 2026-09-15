import { siteUrlBase } from "../utils/internalHref.js";
import { GRAPH_BUILDERS } from "./builders.js";

function describeThrown(error) {
  try {
    return error instanceof Error ? String(error.message) : String(error);
  } catch {
    return "(unprintable thrown value)";
  }
}

/**
 * Build the page's structured-data nodes. Every node carries an absolute id
 * built from the Site URL, so without a usable Site URL the graph is empty —
 * never relative or preview addresses. A builder that throws is skipped so the
 * rest of the graph still renders.
 * @param {{ page?: object, project?: object, mediaFiles?: object }} context
 * @param {ReadonlyArray<Function>} [builders]
 * @returns {Array<object>}
 */
export function buildGraph(context = {}, builders = GRAPH_BUILDERS) {
  const siteUrl = siteUrlBase(context?.project?.siteUrl);
  if (!siteUrl) return [];

  const graphContext = { ...context, siteUrl };
  const nodes = [];
  for (const builder of builders) {
    try {
      const result = builder(graphContext);
      for (const node of Array.isArray(result) ? result : [result]) {
        if (node && typeof node === "object" && !Array.isArray(node)) nodes.push(node);
      }
    } catch (error) {
      console.warn(`Structured data builder ${builder.name || "(anonymous)"} failed: ${describeThrown(error)}`);
    }
  }
  return nodes;
}
