import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { resolveSeedThemeDir, listSeedThemeIds } from "../utils/themeSeedRoots.js";

async function makeRoot(themes) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "seed-root-"));
  for (const id of themes) {
    await fs.outputJson(path.join(root, id, "theme.json"), { name: id, version: "1.0.0" });
  }
  return root;
}

test("resolveSeedThemeDir: single root finds the theme", async () => {
  const a = await makeRoot(["arch"]);
  assert.equal(await resolveSeedThemeDir("arch", [a]), path.join(a, "arch"));
  assert.equal(await resolveSeedThemeDir("nope", [a]), null);
});

test("resolveSeedThemeDir: first root wins (whole-dir shadow)", async () => {
  const extra = await makeRoot(["arch"]);
  const main = await makeRoot(["arch", "other"]);
  assert.equal(await resolveSeedThemeDir("arch", [extra, main]), path.join(extra, "arch"));
  assert.equal(await resolveSeedThemeDir("other", [extra, main]), path.join(main, "other"));
});

test("resolveSeedThemeDir: dir without theme.json does not shadow", async () => {
  const extra = await makeRoot([]);
  await fs.ensureDir(path.join(extra, "arch")); // no theme.json
  const main = await makeRoot(["arch"]);
  assert.equal(await resolveSeedThemeDir("arch", [extra, main]), path.join(main, "arch"));
});

test("listSeedThemeIds: union across roots, deduped, missing root ignored", async () => {
  const extra = await makeRoot(["arch", "hostedonly"]);
  const main = await makeRoot(["arch", "other"]);
  const ids = await listSeedThemeIds([extra, main, "/nonexistent/root"]);
  assert.deepEqual(ids.sort(), ["arch", "hostedonly", "other"]);
});
