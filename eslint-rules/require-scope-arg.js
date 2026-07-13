// Custom ESLint rule: require an explicit `scope` first argument on every
// scope-aware storage / assetStorage adapter call.
//
// Why: in the package architecture, project-scoped data access flows through
// the StorageAdapter / AssetStorageAdapter, whose methods all take `scope` as
// their first argument (e.g. `storage.read(scope, "pages/x.json")`). The SQLite
// repos are keyed by projectId, not scope — so the "scope-required" guard the
// design doc calls for applies to the adapter surface, which is the thing that
// must stay shell-agnostic (OSS local FS vs hosted cloud). This rule fails CI if
// a developer forgets to thread `scope` into one of those calls.
//
// Convention enforced: the adapter is referenced as a variable/property named
// `storage` or `assetStorage`, and the first argument is the `scope` identifier.
// A genuinely different scope variable (rare; e.g. a hosted preview scope) can
// opt out with an inline `// eslint-disable-next-line local/require-scope-arg`.

const SCOPE_AWARE_METHODS = {
  storage: new Set(["read", "write", "delete", "list", "exists", "stat"]),
  assetStorage: new Set(["upload", "download", "delete", "list", "getUrl"]),
};

/**
 * Resolve the adapter "name" for a callee object, matching both the bare form
 * (`storage.read(...)`) and the member form (`req.adapters.storage.read(...)`).
 */
function adapterName(objectNode) {
  if (objectNode.type === "Identifier") return objectNode.name;
  if (objectNode.type === "MemberExpression" && objectNode.property.type === "Identifier") {
    return objectNode.property.name;
  }
  return null;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Require an explicit `scope` first argument on storage/assetStorage adapter calls.",
    },
    schema: [],
    messages: {
      missingScope:
        "Scope-aware `{{adapter}}.{{method}}()` must take `scope` as its first argument (thread req.scope through).",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== "MemberExpression" || callee.property.type !== "Identifier") return;

        const method = callee.property.name;
        const obj = adapterName(callee.object);
        // Object.hasOwn (not a bare index) so an object named like an
        // Object.prototype member (`toString`, `hasOwnProperty`, …) resolves to
        // undefined instead of an inherited function — bracket-indexing those
        // would return a function with no `.has`, crashing the whole lint run.
        if (!obj || !Object.hasOwn(SCOPE_AWARE_METHODS, obj) || !SCOPE_AWARE_METHODS[obj].has(method)) return;

        const first = node.arguments[0];
        if (!first || first.type !== "Identifier" || first.name !== "scope") {
          context.report({ node, messageId: "missingScope", data: { adapter: obj, method } });
        }
      },
    };
  },
};
