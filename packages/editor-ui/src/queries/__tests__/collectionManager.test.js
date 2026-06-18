import { beforeEach, describe, expect, it, vi } from "vitest";

// The new-arch query layer goes through editorFetchJson (apiBase-relative paths,
// X-Project-Id injected), mirroring pageManager — so paths carry NO "/api" prefix.
vi.mock("../../lib/apiFetch", () => ({
  editorFetchJson: vi.fn(),
  isApiError: vi.fn((error) => error?.name === "ApiError"),
  rethrowQueryError: vi.fn((error, fallbackMessage) => {
    if (error?.name === "ApiError") {
      throw error;
    }
    throw new Error(fallbackMessage);
  }),
}));

describe("collectionManager", () => {
  let editorFetchJson;
  let manager;

  beforeEach(async () => {
    vi.resetModules();
    ({ editorFetchJson } = await import("../../lib/apiFetch"));
    editorFetchJson.mockReset();
    manager = await import("../collectionManager");
  });

  it("getCollectionSchemas fetches the schemas list", async () => {
    const schemas = [{ type: "portfolio" }];
    editorFetchJson.mockResolvedValue(schemas);

    const result = await manager.getCollectionSchemas();

    expect(editorFetchJson).toHaveBeenCalledWith(
      "/collections/schemas",
      {},
      { fallbackMessage: expect.any(String) },
    );
    expect(result).toBe(schemas);
  });

  it("getCollectionSchema fetches a single schema by type", async () => {
    editorFetchJson.mockResolvedValue({ type: "portfolio" });

    await manager.getCollectionSchema("portfolio");

    expect(editorFetchJson).toHaveBeenCalledWith(
      "/collections/schema/portfolio",
      {},
      { fallbackMessage: expect.any(String) },
    );
  });

  it("getCollectionItems fetches items for a type", async () => {
    editorFetchJson.mockResolvedValue([]);

    await manager.getCollectionItems("portfolio");

    expect(editorFetchJson).toHaveBeenCalledWith(
      "/collections/portfolio",
      {},
      { fallbackMessage: expect.any(String) },
    );
  });

  it("getCollectionItems appends query params when provided", async () => {
    editorFetchJson.mockResolvedValue([]);

    await manager.getCollectionItems("portfolio", { sort: "title_asc", invalid: true });

    const [path] = editorFetchJson.mock.calls[0];
    expect(path).toMatch(/^\/collections\/portfolio\?/);
    expect(path).toContain("sort=title_asc");
    expect(path).toContain("invalid=true");
  });

  it("getCollectionItem fetches a single item", async () => {
    editorFetchJson.mockResolvedValue({ slug: "alpha" });

    await manager.getCollectionItem("portfolio", "alpha");

    expect(editorFetchJson).toHaveBeenCalledWith(
      "/collections/portfolio/alpha",
      {},
      { fallbackMessage: expect.any(String) },
    );
  });

  it("createCollectionItem POSTs the item body", async () => {
    editorFetchJson.mockResolvedValue({ slug: "alpha" });

    await manager.createCollectionItem("portfolio", { slug: "alpha", settings: { title: "Alpha" } });

    const [path, options] = editorFetchJson.mock.calls[0];
    expect(path).toBe("/collections/portfolio");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ slug: "alpha", settings: { title: "Alpha" } });
  });

  it("updateCollectionItem PUTs to the item path", async () => {
    editorFetchJson.mockResolvedValue({ slug: "alpha" });

    await manager.updateCollectionItem("portfolio", "alpha", { settings: { title: "A" } });

    const [path, options] = editorFetchJson.mock.calls[0];
    expect(path).toBe("/collections/portfolio/alpha");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ settings: { title: "A" } });
  });

  it("deleteCollectionItem DELETEs the item path", async () => {
    editorFetchJson.mockResolvedValue({ success: true });

    await manager.deleteCollectionItem("portfolio", "alpha");

    expect(editorFetchJson).toHaveBeenCalledWith(
      "/collections/portfolio/alpha",
      { method: "DELETE" },
      { fallbackMessage: expect.any(String) },
    );
  });

  it("bulkDeleteCollectionItems POSTs itemSlugs", async () => {
    editorFetchJson.mockResolvedValue({ deleted: ["a"], notFound: [], errors: [] });

    await manager.bulkDeleteCollectionItems("portfolio", ["a", "b"]);

    const [path, options] = editorFetchJson.mock.calls[0];
    expect(path).toBe("/collections/portfolio/bulk-delete");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ itemSlugs: ["a", "b"] });
  });

  it("duplicateCollectionItem POSTs to the duplicate path", async () => {
    editorFetchJson.mockResolvedValue({ slug: "alpha-copy" });

    await manager.duplicateCollectionItem("portfolio", "alpha");

    const [path, options] = editorFetchJson.mock.calls[0];
    expect(path).toBe("/collections/portfolio/alpha/duplicate");
    expect(options.method).toBe("POST");
  });

  it("reorderCollectionItems POSTs the order array", async () => {
    editorFetchJson.mockResolvedValue({ success: true });

    await manager.reorderCollectionItems("portfolio", ["b", "a"]);

    const [path, options] = editorFetchJson.mock.calls[0];
    expect(path).toBe("/collections/portfolio/reorder");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ order: ["b", "a"] });
  });

  it("rethrows query errors via rethrowQueryError", async () => {
    const apiError = Object.assign(new Error("boom"), { name: "ApiError" });
    editorFetchJson.mockRejectedValue(apiError);

    await expect(manager.getCollectionSchemas()).rejects.toBe(apiError);
  });
});
