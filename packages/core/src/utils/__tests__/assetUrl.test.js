import { describe, it, expect } from "vitest";
import { buildAssetUrl, buildAssetVersionToken } from "../assetUrl.js";

const at = (iso) => new Date(iso);

describe("buildAssetVersionToken", () => {
  it("reads as <export>-<appVersion>-<UTC stamp>", () => {
    expect(buildAssetVersionToken({ exportNumber: 3, appVersion: "0.9.10", date: at("2026-08-06T14:25:30.123Z") })).toBe(
      "3-0.9.10-20260806T142530",
    );
  });

  it("stamps in UTC regardless of the machine's offset", () => {
    const token = buildAssetVersionToken({ exportNumber: 1, appVersion: "1.0.0", date: at("2026-01-01T00:00:00.000Z") });
    expect(token).toBe("1-1.0.0-20260101T000000");
  });

  it("distinguishes two exports that share an export number (the multi-machine case)", () => {
    const machineA = buildAssetVersionToken({ exportNumber: 1, appVersion: "0.9.10", date: at("2026-08-06T14:25:30Z") });
    const machineB = buildAssetVersionToken({ exportNumber: 1, appVersion: "0.9.10", date: at("2026-08-07T09:00:00Z") });
    expect(machineA).not.toBe(machineB);
  });

  it("keeps semver prerelease versions intact", () => {
    expect(
      buildAssetVersionToken({ exportNumber: 2, appVersion: "1.0.0-beta.1", date: at("2026-08-06T14:25:30Z") }),
    ).toBe("2-1.0.0-beta.1-20260806T142530");
  });

  it("strips characters that are not URL-safe", () => {
    expect(
      buildAssetVersionToken({ exportNumber: 1, appVersion: "1.0 (dev)/x", date: at("2026-08-06T14:25:30Z") }),
    ).toBe("1-1.0devx-20260806T142530");
  });

  it("falls back to 'unknown' when the app version could not be read", () => {
    expect(buildAssetVersionToken({ exportNumber: 4, appVersion: null, date: at("2026-08-06T14:25:30Z") })).toBe(
      "4-unknown-20260806T142530",
    );
  });

  it("omits the export number when absent", () => {
    expect(buildAssetVersionToken({ appVersion: "0.9.10", date: at("2026-08-06T14:25:30Z") })).toBe(
      "0.9.10-20260806T142530",
    );
  });
});

describe("buildAssetUrl — publish mode", () => {
  const publish = (extra = {}) => ({ renderMode: "publish", ...extra });

  it("busts caches for CSS and JS", () => {
    const globals = publish({ assetVersion: "3-0.9.10-20260806T142530" });
    expect(buildAssetUrl("base.css", { globals })).toBe("assets/base.css?v=3-0.9.10-20260806T142530");
    expect(buildAssetUrl("app.js", { globals })).toBe("assets/app.js?v=3-0.9.10-20260806T142530");
  });

  it("leaves other asset types unversioned", () => {
    const globals = publish({ assetVersion: "3-0.9.10-20260806T142530" });
    expect(buildAssetUrl("hero.jpg", { globals })).toBe("assets/hero.jpg");
    expect(buildAssetUrl("doc.pdf", { globals })).toBe("assets/doc.pdf");
  });

  it("emits a bare path when no version is supplied", () => {
    expect(buildAssetUrl("base.css", { globals: publish() })).toBe("assets/base.css");
  });

  it("places the depth prefix before assets/, keeping the query last", () => {
    const globals = publish({ assetVersion: "3-0.9.10-20260806T142530", outputPathPrefix: "../" });
    expect(buildAssetUrl("base.css", { globals })).toBe("../assets/base.css?v=3-0.9.10-20260806T142530");
  });

  it("ignores the preview widget routing", () => {
    const globals = publish({ assetVersion: "1-0.9.10-20260806T142530" });
    expect(buildAssetUrl("hero.css", { globals, source: "widget", widgetType: "hero" })).toBe(
      "assets/hero.css?v=1-0.9.10-20260806T142530",
    );
  });
});

describe("buildAssetUrl — preview mode", () => {
  const globals = { renderMode: "preview", apiUrl: "http://localhost:3001", projectId: "p1" };

  it("routes shared assets through the preview API", () => {
    expect(buildAssetUrl("base.css", { globals })).toBe("http://localhost:3001/api/preview/assets/p1/assets/base.css");
  });

  it("routes widget-enqueued assets to the widget's own directory", () => {
    expect(buildAssetUrl("hero.css", { globals, source: "widget", widgetType: "hero" })).toBe(
      "http://localhost:3001/api/preview/assets/p1/widgets/hero/hero.css",
    );
  });

  it("defaults to preview when renderMode is unset", () => {
    expect(buildAssetUrl("base.css", { globals: { projectId: "p1" } })).toBe("/api/preview/assets/p1/assets/base.css");
  });
});
