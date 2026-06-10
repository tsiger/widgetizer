import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

vi.mock("../../lib/uploadRequest", () => ({
  uploadFormData: vi.fn(),
}));

vi.mock("../../lib/apiFetch", () => ({
  apiFetch: vi.fn(),
  apiFetchJson: vi.fn(),
  throwApiError: vi.fn(),
  isApiError: vi.fn((error) => error?.name === "ApiError"),
  rethrowQueryError: vi.fn((error, fallbackMessage) => {
    if (error?.name === "ApiError") {
      throw error;
    }
    throw new Error(fallbackMessage);
  }),
}));

describe("projectManager importProject", () => {
  let uploadFormData;

  beforeEach(async () => {
    vi.resetModules();
    ({ uploadFormData } = await import("../../lib/uploadRequest"));
    uploadFormData.mockReset();
  });

  it("normalizes successful project imports into processedFiles", async () => {
    const project = { id: "project-1", name: "Imported Project" };
    const progress = vi.fn();
    uploadFormData.mockResolvedValue({
      status: 201,
      data: project,
    });

    const { importProject } = await import("../projectManager");
    const result = await importProject({ name: "project.zip" }, progress);

    expect(uploadFormData).toHaveBeenCalledWith(
      "/api/projects/import",
      expect.any(FormData),
      { onProgress: progress, signal: undefined },
    );
    expect(result).toEqual({
      ...project,
      processedFiles: [project],
      rejectedFiles: [],
      error: null,
      status: 201,
    });
  });

  it("preserves error metadata for handled import failures", async () => {
    uploadFormData.mockRejectedValue({
      message: "Invalid project export",
      status: 400,
      data: { error: "Invalid project export" },
    });

    const { importProject } = await import("../projectManager");

    await expect(importProject({ name: "bad-project.zip" })).rejects.toMatchObject({
      message: "Invalid project export",
      status: 400,
      data: { error: "Invalid project export" },
    });
  });

  it("passes abort signals through to the upload request", async () => {
    const project = { id: "project-1", name: "Imported Project" };
    const signal = new AbortController().signal;
    uploadFormData.mockResolvedValue({
      status: 201,
      data: project,
    });

    const { importProject } = await import("../projectManager");
    await importProject({ name: "project.zip" }, { signal });

    expect(uploadFormData).toHaveBeenCalledWith(
      "/api/projects/import",
      expect.any(FormData),
      { onProgress: undefined, signal },
    );
  });
});

// ---------------------------------------------------------------------------
// getAllProjects caching
// ---------------------------------------------------------------------------

describe("projectManager getAllProjects caching", () => {
  let apiFetchJson;
  let getAllProjects;
  let invalidateProjectsListCache;

  beforeEach(async () => {
    vi.resetModules();
    ({ apiFetchJson } = await import("../../lib/apiFetch"));
    ({ getAllProjects, invalidateProjectsListCache } = await import("../projectManager"));
    apiFetchJson.mockReset();
  });

  afterEach(() => {
    // Always invalidate so cache doesn't leak between tests
    invalidateProjectsListCache();
  });

  it("returns cached data on a second call within TTL", async () => {
    const projects = [{ id: "p1", name: "One" }];
    apiFetchJson.mockResolvedValue(projects);

    const first = await getAllProjects();
    const second = await getAllProjects();

    expect(first).toEqual(projects);
    expect(second).toEqual(projects);
    expect(apiFetchJson).toHaveBeenCalledTimes(1);
  });

  it("concurrent calls share one in-flight request", async () => {
    const projects = [{ id: "p1", name: "One" }];
    apiFetchJson.mockResolvedValue(projects);

    const [a, b] = await Promise.all([getAllProjects(), getAllProjects()]);

    expect(a).toEqual(projects);
    expect(b).toEqual(projects);
    expect(apiFetchJson).toHaveBeenCalledTimes(1);
  });

  it("failed request does not poison future retries", async () => {
    apiFetchJson.mockRejectedValueOnce(new Error("network"));
    apiFetchJson.mockResolvedValueOnce([{ id: "p1" }]);

    await expect(getAllProjects()).rejects.toThrow();
    const result = await getAllProjects();

    expect(result).toEqual([{ id: "p1" }]);
    expect(apiFetchJson).toHaveBeenCalledTimes(2);
  });

  it("invalidation forces the next call to refetch", async () => {
    apiFetchJson.mockResolvedValue([{ id: "p1" }]);

    await getAllProjects();
    expect(apiFetchJson).toHaveBeenCalledTimes(1);

    invalidateProjectsListCache();
    await getAllProjects();
    expect(apiFetchJson).toHaveBeenCalledTimes(2);
  });

  it("forceRefresh bypasses valid cache", async () => {
    apiFetchJson.mockResolvedValue([{ id: "p1" }]);

    await getAllProjects();
    await getAllProjects({ forceRefresh: true });

    expect(apiFetchJson).toHaveBeenCalledTimes(2);
  });

  it("mid-flight invalidation prevents stale data from repopulating cache", async () => {
    let resolveFirst;
    const staleData = [{ id: "p-stale", name: "Stale" }];
    const freshData = [{ id: "p-fresh", name: "Fresh" }];

    // First call: slow, will resolve with stale data
    apiFetchJson.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFirst = resolve; }),
    );

    const firstPromise = getAllProjects();

    // Invalidate while the first fetch is in-flight (simulates a mutation)
    invalidateProjectsListCache();

    // Second call: fast, returns fresh data
    apiFetchJson.mockResolvedValueOnce(freshData);
    const secondResult = await getAllProjects();
    expect(secondResult).toEqual(freshData);

    // Now the slow first fetch resolves with stale data
    resolveFirst(staleData);
    await firstPromise;

    // The cache should still serve fresh data, not the stale response
    const thirdResult = await getAllProjects();
    expect(thirdResult).toEqual(freshData);
    // Only 2 API calls: the slow one + the fresh one (third hit cache)
    expect(apiFetchJson).toHaveBeenCalledTimes(2);
  });
});
