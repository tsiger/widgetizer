import { websiteNode, identityNode, webPageNode } from "./siteNodes.js";
import { articleNode } from "./articleNode.js";

/**
 * The node builders `buildGraph` runs, in output order. Each receives the graph
 * context and returns a node, a list of nodes, or nothing.
 * @type {ReadonlyArray<(context: object) => (object|object[]|null|undefined)>}
 */
export const GRAPH_BUILDERS = Object.freeze([websiteNode, identityNode, webPageNode, articleNode]);
