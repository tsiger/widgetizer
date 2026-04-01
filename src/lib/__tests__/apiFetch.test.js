import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config", () => ({
  API_URL: vi.fn((path) => `http://api.test${path}`),
}));

vi.mock("../activeProjectId", () => ({
  getActiveProjectId: vi.fn(),
}));

describe("apiFetch", () => {
  let fetchMock;
  let getActiveProjectId;
  let apiFetch;

  beforeEach(async () => {
    vi.resetModules();
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock;

    ({ getActiveProjectId } = await import("../activeProjectId"));
    ({ apiFetch } = await import("../apiFetch"));
    getActiveProjectId.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete globalThis.fetch;
  });

  it("adds the active project header when a project is selected", async () => {
    getActiveProjectId.mockReturnValue("project-123");

    await apiFetch("/api/media/projects/project-123/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/media/projects/project-123/media", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Project-Id": "project-123",
      },
      body: "{}",
    });
  });

  it("omits the project header when there is no active project", async () => {
    getActiveProjectId.mockReturnValue(null);

    await apiFetch("/api/themes");

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/themes", {
      headers: {},
    });
  });
});
