/**
 * Arch's newest update folder must ship the base theme's current files.
 *
 * A theme change lands in two places: the base theme (new projects) and the
 * newest `updates/<version>/` folder (existing projects applying the update).
 * Forgetting the second copy leaves existing projects on stale files with no
 * other test noticing, so every file in the newest update is compared byte for
 * byte with its base counterpart.
 *
 * Run with: node --test packages/builder-server/src/tests/themeUpdateCopies.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const THEME_DIR = path.join(REPO_ROOT, "themes", "arch");

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let index = 0; index < Math.max(pa.length, pb.length); index++) {
    const diff = (pa[index] || 0) - (pb[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function filesUnder(dir) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(full)));
    else files.push(full);
  }
  return files;
}

describe("Arch newest theme update", () => {
  it("ships every file identical to the base theme", async () => {
    const versions = (await fs.readdir(path.join(THEME_DIR, "updates"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^\d+(\.\d+)*$/.test(entry.name))
      .map((entry) => entry.name)
      .sort(compareVersions);
    const newest = versions.at(-1);
    assert.ok(newest, "Arch should have at least one update folder");

    const updateDir = path.join(THEME_DIR, "updates", newest);
    const mismatched = [];
    for (const file of await filesUnder(updateDir)) {
      const relative = path.relative(updateDir, file);
      const base = path.join(THEME_DIR, relative);
      if (!(await fs.pathExists(base))) continue;
      const [updateBytes, baseBytes] = await Promise.all([fs.readFile(file), fs.readFile(base)]);
      if (!updateBytes.equals(baseBytes)) mismatched.push(relative.split(path.sep).join("/"));
    }

    assert.deepEqual(mismatched, [], `updates/${newest} differs from the base theme in: ${mismatched.join(", ")}`);
  });
});
