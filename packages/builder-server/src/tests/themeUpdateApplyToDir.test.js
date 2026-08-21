import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { applyThemeUpdateToDir } from "../services/themeUpdateService.js";

async function makeFixture() {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "apply-"));
  const src = path.join(base, "source");
  const proj = path.join(base, "project");
  await fs.outputJson(path.join(src, "theme.json"), {
    version: "1.3.0",
    settings: {
      global: {
        colors: [
          { id: "primary", value: "#00f", default: "#00f" },
          { id: "accent", value: "#0f0", default: "#0f0" },
        ],
      },
    },
  });
  await fs.outputFile(path.join(src, "assets", "app.css"), "new");
  await fs.outputJson(path.join(src, "menus", "footer.json"), { name: "Footer", items: [] });
  await fs.outputJson(path.join(proj, "theme.json"), {
    version: "1.0.0",
    settings: {
      global: {
        colors: [
          { id: "primary", value: "#123456", default: "#00f" },
          { id: "gone", value: "#999", default: "#999" },
        ],
      },
    },
  });
  await fs.outputFile(path.join(proj, "assets", "old.css"), "stale");
  await fs.outputJson(path.join(proj, "menus", "main.json"), { name: "Main (edited)", items: [] });
  await fs.outputJson(path.join(proj, "pages", "home.json"), { id: "home", title: "My Home" });
  return { src, proj };
}

test("applyThemeUpdateToDir: wholesale replace, add-only, merge, version", async () => {
  const { src, proj } = await makeFixture();
  const result = await applyThemeUpdateToDir({ themeSourceDir: src, projectDir: proj });
  assert.equal(result.newVersion, "1.3.0");
  assert.equal(await fs.pathExists(path.join(proj, "assets", "old.css")), false);
  assert.equal(await fs.readFile(path.join(proj, "assets", "app.css"), "utf8"), "new");
  assert.equal((await fs.readJson(path.join(proj, "menus", "main.json"))).name, "Main (edited)");
  const footer = await fs.readJson(path.join(proj, "menus", "footer.json"));
  assert.equal(footer.id, "footer");
  assert.ok(footer.uuid);
  assert.equal((await fs.readJson(path.join(proj, "pages", "home.json"))).title, "My Home");
  const merged = await fs.readJson(path.join(proj, "theme.json"));
  const ids = merged.settings.global.colors.map((c) => c.id);
  assert.deepEqual(ids, ["primary", "accent"]);
  // User's customized value survives; the new setting keeps the theme default
  assert.equal(merged.settings.global.colors[0].value, "#123456");
  assert.equal(merged.settings.global.colors[1].value, "#0f0");
});
