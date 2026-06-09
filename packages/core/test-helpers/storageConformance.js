// Runner-agnostic conformance suite for the StorageAdapter contract.
//
// Every StorageAdapter implementation (LocalStorageAdapter now, a cloud
// implementation in hosted later) must pass this same suite. It takes the test
// runner's primitives as arguments so it works under Vitest (this repo) and the
// Node test runner (hosted) alike — pass `describe`/`it` from the runner and
// `assert` from "node:assert/strict".
//
//   import { describe, it } from "vitest";
//   import assert from "node:assert/strict";
//   runStorageAdapterConformance({ describe, it, assert, name: "local",
//     makeAdapter, makeScope });
//
// `makeAdapter()` must return a FRESH adapter backed by isolated storage.
// `makeScope(id)` must return a distinct Scope per id (so isolation is testable).

export function runStorageAdapterConformance({ describe, it, assert, name, makeAdapter, makeScope }) {
  describe(`StorageAdapter conformance: ${name}`, () => {
    const enc = (s) => Buffer.from(s, "utf8");

    it("write then read round-trips the bytes", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      await a.write(scope, "pages/home.json", enc('{"x":1}'));
      const buf = await a.read(scope, "pages/home.json");
      assert.equal(buf?.toString("utf8"), '{"x":1}');
    });

    it("write accepts a string and reads back as bytes", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      await a.write(scope, "theme.json", "hello");
      assert.equal((await a.read(scope, "theme.json"))?.toString("utf8"), "hello");
    });

    it("read of a missing file returns null", async () => {
      const a = makeAdapter();
      assert.equal(await a.read(makeScope("a"), "nope.json"), null);
    });

    it("write creates intermediate directories", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      await a.write(scope, "menus/deep/nested/m.json", enc("[]"));
      assert.equal(await a.exists(scope, "menus/deep/nested/m.json"), true);
    });

    it("exists reflects presence", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      assert.equal(await a.exists(scope, "p.json"), false);
      await a.write(scope, "p.json", enc("1"));
      assert.equal(await a.exists(scope, "p.json"), true);
    });

    it("delete removes a file and is a no-op when absent", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      await a.write(scope, "p.json", enc("1"));
      await a.delete(scope, "p.json");
      assert.equal(await a.exists(scope, "p.json"), false);
      await a.delete(scope, "p.json"); // must not throw
    });

    it("list returns entries in a directory and [] when missing", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      assert.deepEqual(await a.list(scope, "pages"), []);
      await a.write(scope, "pages/a.json", enc("1"));
      await a.write(scope, "pages/b.json", enc("1"));
      const entries = (await a.list(scope, "pages")).sort();
      assert.deepEqual(entries, ["a.json", "b.json"]);
    });

    it("stat reports size and mtime, null when missing", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      assert.equal(await a.stat(scope, "p.json"), null);
      await a.write(scope, "p.json", enc("12345"));
      const s = await a.stat(scope, "p.json");
      assert.equal(s.size, 5);
      assert.ok(s.mtime instanceof Date);
    });

    it("scopes are isolated from one another", async () => {
      const a = makeAdapter();
      const one = makeScope("one");
      const two = makeScope("two");
      await a.write(one, "secret.json", enc("one"));
      assert.equal(await a.exists(two, "secret.json"), false);
      assert.equal(await a.read(two, "secret.json"), null);
    });

    it("rejects path traversal outside the project directory", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      await assert.rejects(() => a.read(scope, "../../etc/passwd"));
      await assert.rejects(() => a.write(scope, "../escape.json", enc("x")));
    });
  });
}
