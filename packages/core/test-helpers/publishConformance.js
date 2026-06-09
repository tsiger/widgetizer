// Runner-agnostic conformance suite for the PublishAdapter contract.
// See storageConformance.js for the calling convention.
//
// `makeAdapter()` returns a fresh adapter over isolated storage/state.
// `makeScope(id)` returns a distinct Scope per id.
//
// The suite asserts the impl-agnostic contract (version/fileCount/sizeBytes and
// version monotonicity). Storage-specific effects (files on disk, db rows) are
// covered by each implementation's own tests.

export function runPublishAdapterConformance({ describe, it, assert, name, makeAdapter, makeScope }) {
  describe(`PublishAdapter conformance: ${name}`, () => {
    async function* stream(files) {
      for (const f of files) yield f;
    }

    it("returns version, fileCount and total sizeBytes", async () => {
      const a = makeAdapter();
      const result = await a.publish(
        makeScope("a"),
        stream([
          { path: "index.html", content: "12345" },
          { path: "about/index.html", content: Buffer.from("678") },
        ]),
      );
      assert.equal(result.version, 1);
      assert.equal(result.fileCount, 2);
      assert.equal(result.sizeBytes, 8);
    });

    it("increments the version on each publish of the same scope", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      const first = await a.publish(scope, stream([{ path: "index.html", content: "a" }]));
      const second = await a.publish(scope, stream([{ path: "index.html", content: "b" }]));
      assert.equal(first.version, 1);
      assert.equal(second.version, 2);
    });

    it("handles an empty render stream", async () => {
      const a = makeAdapter();
      const result = await a.publish(makeScope("a"), stream([]));
      assert.equal(result.fileCount, 0);
      assert.equal(result.sizeBytes, 0);
      assert.equal(result.version, 1);
    });

    it("versions are independent per scope", async () => {
      const a = makeAdapter();
      await a.publish(makeScope("one"), stream([{ path: "i.html", content: "x" }]));
      const other = await a.publish(makeScope("two"), stream([{ path: "i.html", content: "x" }]));
      assert.equal(other.version, 1);
    });
  });
}
