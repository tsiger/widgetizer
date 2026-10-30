// The preview's media URLs follow the base the shell passes in `sharedGlobals.apiUrl`
// (theme and widget asset URLs already did); with none they stay root-relative.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { renderPageLayout } from "./renderEngine.js";

const PROJECT_ID = "p1";
let root;
let iconBases;

const deps = () => ({
  projectId: PROJECT_ID,
  projectDir: path.join(root, "project"),
  coreWidgetsDir: path.join(root, "core-widgets"),
  coreSnippetsDir: path.join(root, "core-snippets"),
  getProjectData: () => null,
  getMediaFiles: async () => ({ files: [] }),
  listPages: async () => [],
  sanitizeWidgetData: () => {},
  preprocessThemeSettings: (raw) => raw,
  buildRuntimeSiteIcons: (_src, _media, imageBasePath) => {
    iconBases.push(imageBasePath);
    return {};
  },
});

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "wz-media-base-"));
  for (const dir of ["project", "core-widgets", "core-snippets"]) mkdirSync(path.join(root, dir));
  writeFileSync(
    path.join(root, "project", "layout.liquid"),
    `{{ imagePath }}|{{ filePath }}|{% image src: "/uploads/images/hero.jpg" %}`,
  );
  iconBases = [];
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

const render = (sharedGlobals, renderMode = "preview") =>
  renderPageLayout(deps(), { mainContent: "" }, { slug: "index" }, {}, renderMode, sharedGlobals);

describe("preview media bases", () => {
  it("follow an absolute base the shell passes", async () => {
    const sharedGlobals = { apiUrl: "http://x/s/abc" };
    const html = await render(sharedGlobals);
    const media = `http://x/s/abc/api/media/projects/${PROJECT_ID}/uploads`;
    expect(html).toBe(`${media}/images|${media}/files|<img src="${media}/images/hero.jpg" alt="" loading="lazy">`);
    expect(sharedGlobals.imagePath).toBe(`${media}/images`);
    expect(sharedGlobals.formSubmitUrl).toBe("http://x/s/abc/api/forms/submit");
    expect(iconBases).toEqual([`${media}/images`]);
  });

  it("stay root-relative with no base", async () => {
    const media = `/api/media/projects/${PROJECT_ID}/uploads`;
    for (const sharedGlobals of [null, {}, { apiUrl: "" }]) {
      expect(await render(sharedGlobals)).toBe(
        `${media}/images|${media}/files|<img src="${media}/images/hero.jpg" alt="" loading="lazy">`,
      );
    }
  });

  it("leave publish output alone", async () => {
    expect(await render({ apiUrl: "http://x/s/abc" }, "publish")).toBe(
      `assets/images|assets/files|<img src="assets/images/hero.jpg" alt="" loading="lazy">`,
    );
  });
});
