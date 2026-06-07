import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/apiFetch", () => ({
  apiFetchJson: vi.fn(),
  isApiError: vi.fn((error) => error?.name === "ApiError"),
  rethrowQueryError: vi.fn((error, fallbackMessage) => {
    if (error?.name === "ApiError") {
      throw error;
    }
    throw new Error(fallbackMessage);
  }),
}));

describe("collectionManager", () => {
  let apiFetchJson;
  let manager;

  beforeEach(async () => {
    vi.resetModules();
    ({ apiFetchJson } = await import("../../lib/apiFetch"));
    apiFetchJson.mockReset();
    manager = await import("../collectionManager");
  });

  it("getCollectionSchemas fetches the schemas list", async () => {
    const schemas = [{ type: "portfolio" }];
    apiFetchJson.mockResolvedValue(schemas);

    const result = await manager.getCollectionSchemas();

    expect(apiFetchJson).toHaveBeenCalledWith(
      "/api/collections/schemas",
      {},
      { fallbackMessage: expect.any(String) },
    );
    expect(result).toBe(schemas);
  });

  it("getCollectionSchema fetches a single schema by type", async () => {
    apiFetchJson.mockResolvedValue({ type: "portfolio" });

    await manager.getCollectionSchema("portfolio");

    expect(apiFetchJson).toHaveBeenCalledWith(
      "/api/collections/schema/portfolio",
      {},
      { fallbackMessage: expect.any(String) },
    );
  });

  it("getCollectionItems fetches items for a type", async () => {
    apiFetchJson.mockResolvedValue([]);

    await manager.getCollectionItems("portfolio");

    expect(apiFetchJson).toHaveBeenCalledWith(
      "/api/collections/portfolio",
      {},
      { fallbackMessage: expect.any(String) },
    );
  });

  it("getCollectionItems appends query params when provided", async () => {
    apiFetchJson.mockResolvedValue([]);

    await manager.getCollectionItems("portfolio", { sort: "title_asc", invalid: true });

    const [path] = apiFetchJson.mock.calls[0];
    expect(path).toMatch(/^\/api\/collections\/portfolio\?/);
    expect(path).toContain("sort=title_asc");
    expect(path).toContain("invalid=true");
  });

  it("getCollectionItem fetches a single item", async () => {
    apiFetchJson.mockResolvedValue({ slug: "alpha" });

    await manager.getCollectionItem("portfolio", "alpha");

    expect(apiFetchJson).toHaveBeenCalledWith(
      "/api/collections/portfolio/alpha",
      {},
      { fallbackMessage: expect.any(String) },
    );
  });

  it("createCollectionItem POSTs the item body", async () => {
    apiFetchJson.mockResolvedValue({ slug: "alpha" });

    await manager.createCollectionItem("portfolio", { slug: "alpha", settings: { title: "Alpha" } });

    const [path, options] = apiFetchJson.mock.calls[0];
    expect(path).toBe("/api/collections/portfolio");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ slug: "alpha", settings: { title: "Alpha" } });
  });

  it("updateCollectionItem PUTs to the item path", async () => {
    apiFetchJson.mockResolvedValue({ slug: "alpha" });

    await manager.updateCollectionItem("portfolio", "alpha", { settings: { title: "A" } });

    const [path, options] = apiFetchJson.mock.calls[0];
    expect(path).toBe("/api/collections/portfolio/alpha");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ settings: { title: "A" } });
  });

  it("deleteCollectionItem DELETEs the item path", async () => {
    apiFetchJson.mockResolvedValue({ success: true });

    await manager.deleteCollectionItem("portfolio", "alpha");

    expect(apiFetchJson).toHaveBeenCalledWith(
      "/api/collections/portfolio/alpha",
      { method: "DELETE" },
      { fallbackMessage: expect.any(String) },
    );
  });

  it("bulkDeleteCollectionItems POSTs itemSlugs", async () => {
    apiFetchJson.mockResolvedValue({ deleted: ["a"], notFound: [], errors: [] });

    await manager.bulkDeleteCollectionItems("portfolio", ["a", "b"]);

    const [path, options] = apiFetchJson.mock.calls[0];
    expect(path).toBe("/api/collections/portfolio/bulk-delete");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ itemSlugs: ["a", "b"] });
  });

  it("duplicateCollectionItem POSTs to the duplicate path", async () => {
    apiFetchJson.mockResolvedValue({ slug: "alpha-copy" });

    await manager.duplicateCollectionItem("portfolio", "alpha");

    const [path, options] = apiFetchJson.mock.calls[0];
    expect(path).toBe("/api/collections/portfolio/alpha/duplicate");
    expect(options.method).toBe("POST");
  });

  it("reorderCollectionItems POSTs the order array", async () => {
    apiFetchJson.mockResolvedValue({ success: true });

    await manager.reorderCollectionItems("portfolio", ["b", "a"]);

    const [path, options] = apiFetchJson.mock.calls[0];
    expect(path).toBe("/api/collections/portfolio/reorder");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ order: ["b", "a"] });
  });

  it("rethrows query errors via rethrowQueryError", async () => {
    const apiError = Object.assign(new Error("boom"), { name: "ApiError" });
    apiFetchJson.mockRejectedValue(apiError);

    await expect(manager.getCollectionSchemas()).rejects.toBe(apiError);
  });
});
