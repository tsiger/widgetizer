import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applySettingsOverrides, syncPresetProject } from "../preset-sync.js";

const cleanupPaths = [];

async function makeTempDir(prefix) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  cleanupPaths.push(dir);
  return dir;
}

async function makeProjectDir(projectName) {
  const projectDir = path.join(process.cwd(), "data", "projects", projectName);
  cleanupPaths.push(projectDir);
  await fs.ensureDir(projectDir);
  return projectDir;
}

afterEach(async () => {
  while (cleanupPaths.length > 0) {
    const target = cleanupPaths.pop();
    await fs.remove(target);
  }
});

describe("preset-sync", () => {
  it("applies preset settings overrides to matching theme defaults only", () => {
    const themeJson = {
      settings: {
        global: {
          colors: [
            { id: "standard_accent", default: "#000000" },
            { id: "standard_text_heading", default: "#111111" },
          ],
          style: [{ id: "spacing_density", default: "default" }],
        },
      },
    };

    const result = applySettingsOverrides(themeJson, {
      standard_accent: "#ff0000",
      spacing_density: "compact",
      unknown_setting: "ignored",
    });

    expect(result.settings.global.colors[0].default).toBe("#ff0000");
    expect(result.settings.global.colors[1].default).toBe("#111111");
    expect(result.settings.global.style[0].default).toBe("compact");
    expect(themeJson.settings.global.colors[0].default).toBe("#000000");
  });

  it("syncs preset-backed pages, menus, and theme settings into a dev project", async () => {
    const srcDir = await makeTempDir("preset-sync-theme-");
    const projectName = `preset-sync-${Date.now()}`;
    const projectDest = await makeProjectDir(projectName);

    await fs.outputJson(path.join(srcDir, "theme.json"), {
      name: "Test Theme",
      version: "1.0.0",
      settings: {
        global: {
          colors: [{ id: "standard_accent", default: "#000000" }],
        },
      },
    });

    await fs.outputJson(path.join(srcDir, "presets", "corkwell", "preset.json"), {
      settings: {
        standard_accent: "#1d5e6e",
      },
    });

    await fs.outputJson(path.join(srcDir, "presets", "corkwell", "templates", "index.json"), {
      name: "Home",
      slug: "index",
      widgets: {},
      widgetsOrder: [],
    });

    await fs.outputJson(path.join(srcDir, "presets", "corkwell", "templates", "about.json"), {
      name: "About",
      slug: "about",
      widgets: {},
      widgetsOrder: [],
    });

    await fs.outputJson(path.join(srcDir, "presets", "corkwell", "menus", "main-menu.json"), {
      name: "Main Menu",
      items: [{ label: "Home", link: "index.html", items: [] }],
    });

    await fs.outputJson(path.join(projectDest, "pages", "index.json"), {
      name: "Old Home",
      slug: "index",
      id: "index",
      uuid: "existing-index-uuid",
      created: "2026-01-01T00:00:00.000Z",
      updated: "2026-01-01T00:00:00.000Z",
      widgets: {},
      widgetsOrder: [],
    });

    await fs.outputJson(path.join(projectDest, "pages", "obsolete.json"), {
      name: "Obsolete",
      slug: "obsolete",
      id: "obsolete",
      uuid: "obsolete-uuid",
      created: "2026-01-01T00:00:00.000Z",
      updated: "2026-01-01T00:00:00.000Z",
      widgets: {},
      widgetsOrder: [],
    });

    await fs.outputJson(path.join(projectDest, "menus", "main-menu.json"), {
      name: "Main Menu",
      uuid: "existing-menu-uuid",
      items: [],
    });

    await syncPresetProject({
      srcDir,
      presetId: "corkwell",
      project: projectName,
      projectDest,
    });

    const themeJson = await fs.readJson(path.join(projectDest, "theme.json"));
    const indexPage = await fs.readJson(path.join(projectDest, "pages", "index.json"));
    const aboutPage = await fs.readJson(path.join(projectDest, "pages", "about.json"));
    const mainMenu = await fs.readJson(path.join(projectDest, "menus", "main-menu.json"));

    expect(themeJson.settings.global.colors[0].default).toBe("#1d5e6e");
    expect(indexPage.uuid).toBe("existing-index-uuid");
    expect(indexPage.created).toBe("2026-01-01T00:00:00.000Z");
    expect(aboutPage.uuid).toBeDefined();
    expect(await fs.pathExists(path.join(projectDest, "pages", "obsolete.json"))).toBe(false);
    expect(mainMenu.uuid).toBe("existing-menu-uuid");
    expect(mainMenu.items[0].pageUuid).toBe("existing-index-uuid");
  });
});
