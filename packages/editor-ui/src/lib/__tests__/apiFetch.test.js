import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config", () => ({
  API_URL: vi.fn((path) => `http://api.test${path}`),
}));

vi.mock("../activeProjectId", () => ({
  getActiveProjectId: vi.fn(),
}));

describe("apiFetch", () => {
  let fetchMock;
  let getActiveProjectId;
  let apiFetch;
  let apiFetchJson;
  let subscribeMutationSuccess;

  beforeEach(async () => {
    vi.resetModules();
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock;

    ({ getActiveProjectId } = await import("../activeProjectId"));
    ({ apiFetch, apiFetchJson } = await import("../apiFetch"));
    ({ subscribeMutationSuccess } = await import("../mutationEvents"));
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

  it("apiFetchJson joins validation messages into one ApiError", async () => {
    getActiveProjectId.mockReturnValue("project-123");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          errors: [{ msg: "Name is required" }, { msg: "Theme is required" }],
        }),
      ),
    });

    await expect(apiFetchJson("/api/projects", {}, { fallbackMessage: "Failed to create project" })).rejects.toMatchObject(
      {
        name: "ApiError",
        message: "Name is required; Theme is required",
        status: 400,
        response: {
          status: 400,
          data: {
            errors: [{ msg: "Name is required" }, { msg: "Theme is required" }],
          },
        },
      },
    );
  });

  it("apiFetchJson preserves PROJECT_MISMATCH error metadata", async () => {
    getActiveProjectId.mockReturnValue("project-123");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      statusText: "Conflict",
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          code: "PROJECT_MISMATCH",
          message: "The active project has changed.",
        }),
      ),
    });

    await expect(
      apiFetchJson("/api/pages/home/content", {}, { fallbackMessage: "Failed to save page content" }),
    ).rejects.toMatchObject({
      name: "ApiError",
      code: "PROJECT_MISMATCH",
      status: 409,
      message: "The active project has changed.",
      data: {
        code: "PROJECT_MISMATCH",
        message: "The active project has changed.",
      },
    });
  });

  it("notifies a mutation-success subscriber for a successful POST", async () => {
    getActiveProjectId.mockReturnValue(null);
    fetchMock.mockResolvedValue({ ok: true });
    const handler = vi.fn();
    subscribeMutationSuccess(handler);

    await apiFetch("/api/pages", { method: "POST" });

    expect(handler).toHaveBeenCalledWith({ method: "POST", path: "/api/pages" });
  });

  it("does not notify for GET requests, including calls with no method at all", async () => {
    getActiveProjectId.mockReturnValue(null);
    fetchMock.mockResolvedValue({ ok: true });
    const handler = vi.fn();
    subscribeMutationSuccess(handler);

    await apiFetch("/api/pages", { method: "GET" });
    await apiFetch("/api/pages");

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not notify for a followed redirect, even when the final response is ok", async () => {
    getActiveProjectId.mockReturnValue(null);
    fetchMock.mockResolvedValue({ ok: true, redirected: true });
    const handler = vi.fn();
    subscribeMutationSuccess(handler);

    await apiFetch("/api/pages", { method: "POST" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not notify when the response is not ok", async () => {
    getActiveProjectId.mockReturnValue(null);
    fetchMock.mockResolvedValue({ ok: false });
    const handler = vi.fn();
    subscribeMutationSuccess(handler);

    await apiFetch("/api/pages", { method: "POST" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("still resolves with the response when a mutation-success handler throws", async () => {
    getActiveProjectId.mockReturnValue(null);
    fetchMock.mockResolvedValue({ ok: true });
    const handler = vi.fn(() => {
      throw new Error("boom");
    });
    subscribeMutationSuccess(handler);

    const response = await apiFetch("/api/pages", { method: "POST" });

    expect(response.ok).toBe(true);
  });
});
