/**
 * Tests for the custom ESLint rule `local/require-scope-arg`, which enforces
 * that every scope-aware storage / assetStorage adapter call threads `scope`
 * as its first argument. Run with: node --test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Linter } from "eslint";

const rule = (await import("../../../../eslint-rules/require-scope-arg.js")).default;

const linter = new Linter();
const config = {
  plugins: { local: { rules: { "require-scope-arg": rule } } },
  rules: { "local/require-scope-arg": "error" },
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
};

/** Lint a snippet and return the rule's messages. */
function lint(code) {
  return linter.verify(code, config);
}

describe("local/require-scope-arg", () => {
  it("accepts a storage call with scope first", () => {
    assert.deepEqual(lint(`storage.read(scope, "pages/x.json");`), []);
  });

  it("accepts the member form (req.adapters.storage)", () => {
    assert.deepEqual(lint(`req.adapters.storage.write(scope, "pages/x.json", body);`), []);
  });

  it("accepts an assetStorage call with scope first", () => {
    assert.deepEqual(lint(`assetStorage.getUrl(scope, key, { context: "editor" });`), []);
  });

  it("flags a storage call missing scope", () => {
    const messages = lint(`storage.read("pages/x.json");`);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].ruleId, "local/require-scope-arg");
  });

  it("flags a storage call whose first arg is not `scope`", () => {
    const messages = lint(`storage.write(folderName, "pages/x.json", body);`);
    assert.equal(messages.length, 1);
  });

  it("flags an assetStorage call passing a non-scope first arg", () => {
    const messages = lint(`assetStorage.upload(folderName, key, stream);`);
    assert.equal(messages.length, 1);
  });

  it("ignores unrelated objects with same-named methods", () => {
    assert.deepEqual(lint(`fs.readFile(p); res.write(html); localStorage.getItem("k");`), []);
  });

  it("ignores methods that are not scope-aware", () => {
    assert.deepEqual(lint(`storage.configure(options); assetStorage.init();`), []);
  });
});
