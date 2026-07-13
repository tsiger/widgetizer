// Runner-agnostic conformance suite for the ScopeResolver contract.
// See storageConformance.js for the calling convention.
//
// This pins the SHAPE contract that every resolver must satisfy on a successful
// resolution. Implementation-specific behaviour (auth flows, error cases) is
// covered by each implementation's own tests.
//
// `makeResolver()` returns `{ resolver, req }` where resolving `req` succeeds.

export function runScopeResolverConformance({ describe, it, assert, name, makeResolver }) {
  describe(`ScopeResolver conformance: ${name}`, () => {
    it("resolveActor returns an { id, kind } actor", async () => {
      const { resolver, req } = makeResolver();
      const actor = await resolver.resolveActor(req);
      assert.equal(typeof actor.id, "string");
      assert.ok(["local", "cloud"].includes(actor.kind));
    });

    it("resolveScope returns { actor, projectId, folderName }", async () => {
      const { resolver, req } = makeResolver();
      const scope = await resolver.resolveScope(req);
      assert.equal(typeof scope.projectId, "string");
      assert.equal(typeof scope.folderName, "string");
      assert.equal(typeof scope.actor?.id, "string");
      assert.ok(["local", "cloud"].includes(scope.actor.kind));
    });
  });
}
