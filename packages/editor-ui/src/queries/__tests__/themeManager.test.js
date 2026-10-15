import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/uploadRequest", () => ({
  uploadFormData: vi.fn(),
}));

vi.mock("../../lib/apiFetch", () => ({
  apiFetch: vi.fn(),
  apiFetchJson: vi.fn(),
  isApiError: vi.fn((error) => error?.name === "ApiError"),
  rethrowQueryError: vi.fn((error, fallbackMessage) => {
    if (error?.name === "ApiError") {
      throw error;
    }
    throw new Error(fallbackMessage);
  }),
}));

describe("themeManager uploadThemeZip", () => {
  let uploadFormData;
  let apiFetchJson;

  beforeEach(async () => {
    vi.resetModules();
    ({ uploadFormData } = await import("../../lib/uploadRequest"));
    ({ apiFetchJson } = await import("../../lib/apiFetch"));
    uploadFormData.mockReset();
    apiFetchJson.mockReset();
  });

  it("normalizes successful theme uploads into processedFiles", async () => {
    const theme = { id: "arch", name: "Arch" };
    const progress = vi.fn();
    uploadFormData.mockResolvedValue({
      status: 201,
      data: {
        message: "Theme uploaded successfully!",
        theme,
      },
    });

    const { uploadThemeZip } = await import("../themeManager");
    const file = { name: "arch.zip" };
    const result = await uploadThemeZip(file, progress);

    expect(uploadFormData).toHaveBeenCalledWith(
      "/api/themes/upload",
      expect.any(FormData),
      { onProgress: progress },
    );
    expect(result).toEqual({
      message: "Theme uploaded successfully!",
      theme,
      processedFiles: [theme],
      rejectedFiles: [],
      error: null,
      status: 201,
    });
  });

  it("preserves status and response data on upload errors", async () => {
    uploadFormData.mockRejectedValue({
      message: "Invalid theme archive",
      status: 400,
      data: { message: "Invalid theme archive" },
    });

    const { uploadThemeZip } = await import("../themeManager");

    await expect(uploadThemeZip({ name: "bad.zip" })).rejects.toMatchObject({
      message: "Invalid theme archive",
      status: 400,
      data: { message: "Invalid theme archive" },
    });
  });
});

describe("themeManager saveThemeSettings", () => {
  let apiFetchJson;

  beforeEach(async () => {
    vi.resetModules();
    ({ apiFetchJson } = await import("../../lib/apiFetch"));
    apiFetchJson.mockReset();
  });

  it("preserves PROJECT_MISMATCH metadata for saveStore guards", async () => {
    const mismatchError = {
      name: "ApiError",
      message: "The active project has changed.",
      code: "PROJECT_MISMATCH",
      status: 409,
      data: { code: "PROJECT_MISMATCH" },
    };
    apiFetchJson.mockRejectedValue(mismatchError);

    const { saveThemeSettings } = await import("../themeManager");

    await expect(saveThemeSettings("project-1", { settings: {} })).rejects.toMatchObject({
      code: "PROJECT_MISMATCH",
      status: 409,
      data: { code: "PROJECT_MISMATCH" },
    });
  });
});

describe("themeManager saveThemeSettingChanges", () => {
  let apiFetchJson;
  const changes = [{ group: "colors", id: "accent", baseValue: "#f00", value: "#00f" }];
  const draft = { version: "1.0.0", settings: { global: {} } };

  beforeEach(async () => {
    vi.resetModules();
    ({ apiFetchJson } = await import("../../lib/apiFetch"));
    apiFetchJson.mockReset();
  });

  it("PATCHes only the changes and returns the saved file with normalized warnings", async () => {
    const saved = { version: "1.0.0", settings: { global: {} } };
    apiFetchJson.mockResolvedValueOnce({ theme: saved, warnings: [{ code: "MEDIA_USAGE_STALE" }] });

    const { saveThemeSettingChanges } = await import("../themeManager");
    const result = await saveThemeSettingChanges("project-1", changes, draft);

    expect(apiFetchJson).toHaveBeenCalledWith(
      "/api/themes/project/project-1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ changes }) }),
      expect.any(Object),
    );
    expect(result).toEqual({ theme: saved, warnings: [{ code: "MEDIA_USAGE_STALE" }] });
  });

  it("falls back to the whole-file POST on a 404 without a code", async () => {
    apiFetchJson
      .mockRejectedValueOnce({ name: "ApiError", status: 404, data: "Cannot PATCH" })
      .mockResolvedValueOnce({ message: "saved", warnings: ["\"Accent\" contained an invalid value and was reset."] });

    const { saveThemeSettingChanges } = await import("../themeManager");
    const result = await saveThemeSettingChanges("project-1", changes, draft);

    expect(apiFetchJson.mock.calls[1][1]).toMatchObject({ method: "POST", body: JSON.stringify(draft) });
    expect(result).toEqual({
      theme: null,
      warnings: [{ code: "VALUE_CORRECTED", message: "\"Accent\" contained an invalid value and was reset." }],
    });
  });

  it("does not fall back on a coded 404 or on any other error", async () => {
    const { saveThemeSettingChanges } = await import("../themeManager");
    for (const error of [
      { name: "ApiError", status: 404, code: "THEME_SETTINGS_NOT_FOUND" },
      { name: "ApiError", status: 409, code: "THEME_SETTINGS_CHANGED" },
      { name: "ApiError", status: 500 },
    ]) {
      apiFetchJson.mockReset().mockRejectedValueOnce(error);
      await expect(saveThemeSettingChanges("project-1", changes, draft)).rejects.toMatchObject(error);
      expect(apiFetchJson).toHaveBeenCalledTimes(1);
    }
  });
});

// ---------------------------------------------------------------------------
// getAllThemes caching
// ---------------------------------------------------------------------------

describe("themeManager getAllThemes caching", () => {
  let apiFetchJson;
  let getAllThemes;
  let invalidateThemesListCache;

  beforeEach(async () => {
    vi.resetModules();
    ({ apiFetchJson } = await import("../../lib/apiFetch"));
    ({ getAllThemes, invalidateThemesListCache } = await import("../themeManager"));
    apiFetchJson.mockReset();
  });

  afterEach(() => {
    invalidateThemesListCache();
  });

  it("returns cached data on a second call within TTL", async () => {
    const themes = [{ id: "arch", name: "Arch" }];
    apiFetchJson.mockResolvedValue(themes);

    const first = await getAllThemes();
    const second = await getAllThemes();

    expect(first).toEqual(themes);
    expect(second).toEqual(themes);
    expect(apiFetchJson).toHaveBeenCalledTimes(1);
  });

  it("concurrent calls share one in-flight request", async () => {
    const themes = [{ id: "arch", name: "Arch" }];
    apiFetchJson.mockResolvedValue(themes);

    const [a, b] = await Promise.all([getAllThemes(), getAllThemes()]);

    expect(a).toEqual(themes);
    expect(b).toEqual(themes);
    expect(apiFetchJson).toHaveBeenCalledTimes(1);
  });

  it("failed request does not poison future retries", async () => {
    apiFetchJson.mockRejectedValueOnce(new Error("network"));
    apiFetchJson.mockResolvedValueOnce([{ id: "arch" }]);

    await expect(getAllThemes()).rejects.toThrow();
    const result = await getAllThemes();

    expect(result).toEqual([{ id: "arch" }]);
    expect(apiFetchJson).toHaveBeenCalledTimes(2);
  });

  it("invalidation forces the next call to refetch", async () => {
    apiFetchJson.mockResolvedValue([{ id: "arch" }]);

    await getAllThemes();
    expect(apiFetchJson).toHaveBeenCalledTimes(1);

    invalidateThemesListCache();
    await getAllThemes();
    expect(apiFetchJson).toHaveBeenCalledTimes(2);
  });

  it("forceRefresh bypasses valid cache", async () => {
    apiFetchJson.mockResolvedValue([{ id: "arch" }]);

    await getAllThemes();
    await getAllThemes({ forceRefresh: true });

    expect(apiFetchJson).toHaveBeenCalledTimes(2);
  });

  it("mid-flight invalidation prevents stale data from repopulating cache", async () => {
    let resolveFirst;
    const staleData = [{ id: "stale-theme" }];
    const freshData = [{ id: "fresh-theme" }];

    apiFetchJson.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFirst = resolve; }),
    );

    const firstPromise = getAllThemes();

    invalidateThemesListCache();

    apiFetchJson.mockResolvedValueOnce(freshData);
    const secondResult = await getAllThemes();
    expect(secondResult).toEqual(freshData);

    resolveFirst(staleData);
    await firstPromise;

    const thirdResult = await getAllThemes();
    expect(thirdResult).toEqual(freshData);
    expect(apiFetchJson).toHaveBeenCalledTimes(2);
  });
});
