import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config", () => ({
  API_URL: vi.fn((path) => `http://api.test${path}`),
}));

vi.mock("../activeProjectId", () => ({
  getActiveProjectId: vi.fn(),
}));

// Editor project-scoped calls go through editorFetch, which prepends the
// configurable apiBase: OSS "/api", hosted "/api/projects/:id".
describe("editorFetch / apiBase", () => {
  let fetchMock;
  let getActiveProjectId;
  let editorFetch;
  let editorFetchJson;
  let setApiBase;

  beforeEach(async () => {
    vi.resetModules();
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock;

    ({ getActiveProjectId } = await import("../activeProjectId"));
    ({ editorFetch, editorFetchJson } = await import("../apiFetch"));
    ({ setApiBase } = await import("../apiBase"));
    getActiveProjectId.mockReset();
    getActiveProjectId.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete globalThis.fetch;
  });

  it("prepends the default OSS apiBase (/api) to editor paths", async () => {
    await editorFetch("/pages");
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/pages", { headers: {} });
  });

  it("honors a hosted-style apiBase set via setApiBase", async () => {
    setApiBase("/api/projects/proj-1");
    await editorFetch("/pages");
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/projects/proj-1/pages", { headers: {} });
  });

  it("editorFetchJson parses JSON from the configured base", async () => {
    fetchMock.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue(JSON.stringify({ ok: 1 })) });
    const data = await editorFetchJson("/menus");
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/menus", { headers: {} });
    expect(data).toEqual({ ok: 1 });
  });
});
