// Runner-agnostic conformance suite for the AssetStorageAdapter contract.
// See storageConformance.js for the calling convention.
//
// `makeAdapter()` returns a fresh adapter over isolated storage.
// `makeScope(id)` returns a distinct Scope per id.
// `makeStream(buffer)` wraps a Buffer as the streaming upload source the
// implementation expects (e.g. Readable.from for Node, a web stream for cloud).

export function runAssetStorageAdapterConformance({
  describe,
  it,
  assert,
  name,
  makeAdapter,
  makeScope,
  makeStream,
}) {
  describe(`AssetStorageAdapter conformance: ${name}`, () => {
    async function collect(streamOrNull) {
      if (streamOrNull == null) return null;
      const chunks = [];
      for await (const c of streamOrNull) chunks.push(Buffer.from(c));
      return Buffer.concat(chunks);
    }

    it("upload then download round-trips the bytes", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      const bytes = Buffer.from("PNGDATA");
      const res = await a.upload(scope, "images/logo.png", makeStream(bytes));
      assert.equal(res.key, "images/logo.png");
      assert.equal(res.sizeBytes, bytes.byteLength);
      assert.equal(typeof res.contentType, "string");
      const got = await collect(await a.download(scope, "images/logo.png"));
      assert.equal(got.toString(), "PNGDATA");
    });

    it("download of a missing key returns null", async () => {
      const a = makeAdapter();
      assert.equal(await a.download(makeScope("a"), "nope.png"), null);
    });

    it("stat returns the byte size, or null for a missing key", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      const bytes = Buffer.from("0123456789");
      await a.upload(scope, "audio/clip.mp3", makeStream(bytes));
      const st = await a.stat(scope, "audio/clip.mp3");
      assert.equal(st.size, bytes.byteLength);
      assert.equal(await a.stat(scope, "nope.mp3"), null);
    });

    it("download honors a byte range (audio/video seek → HTTP 206)", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      await a.upload(scope, "audio/clip.mp3", makeStream(Buffer.from("0123456789")));
      // Inclusive range [2, 5] → "2345".
      const got = await collect(await a.download(scope, "audio/clip.mp3", { start: 2, end: 5 }));
      assert.equal(got.toString(), "2345");
    });

    it("delete removes the asset", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      await a.upload(scope, "x.bin", makeStream(Buffer.from("1")));
      await a.delete(scope, "x.bin");
      assert.equal(await a.download(scope, "x.bin"), null);
    });

    it("list returns keys under a prefix", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      await a.upload(scope, "images/a.png", makeStream(Buffer.from("1")));
      await a.upload(scope, "images/b.png", makeStream(Buffer.from("1")));
      await a.upload(scope, "docs/c.pdf", makeStream(Buffer.from("1")));
      const images = await a.list(scope, "images/");
      assert.deepEqual(images.sort(), ["images/a.png", "images/b.png"]);
    });

    it("getUrl returns a key-bearing string for each context", async () => {
      const a = makeAdapter();
      const scope = makeScope("a");
      const editor = a.getUrl(scope, "images/logo.png", { context: "editor" });
      const published = a.getUrl(scope, "images/logo.png", { context: "published" });
      // Both contexts must yield a usable URL containing the key. The contract
      // deliberately allows them to DIFFER (OSS serves one URL for both; the
      // cloud adapter auth-proxies the editor URL and serves a CDN URL when
      // published), so this no longer requires editor === published.
      assert.equal(typeof editor, "string");
      assert.equal(typeof published, "string");
      assert.ok(editor.includes("images/logo.png"));
      assert.ok(published.includes("images/logo.png"));
    });

    it("scopes are isolated", async () => {
      const a = makeAdapter();
      await a.upload(makeScope("one"), "s.bin", makeStream(Buffer.from("one")));
      assert.equal(await a.download(makeScope("two"), "s.bin"), null);
    });
  });
}
