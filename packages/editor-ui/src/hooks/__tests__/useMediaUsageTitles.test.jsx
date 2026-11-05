// @vitest-environment jsdom
/**
 * The "Used in" labels name pages and collection items. When the page list
 * can't be loaded, the labels fall back to the bare sources and the screen
 * says so, instead of quietly showing `page:<uuid>`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const getAllPages = vi.fn();
const getCollectionSchemas = vi.fn();
const getCollectionItems = vi.fn();
vi.mock("../../queries/pageManager", () => ({ getAllPages: (...a) => getAllPages(...a) }));
vi.mock("../../queries/collectionManager", () => ({
  getCollectionSchemas: (...a) => getCollectionSchemas(...a),
  getCollectionItems: (...a) => getCollectionItems(...a),
}));

const { default: useMediaUsageTitles } = await import("../useMediaUsageTitles.js");

beforeEach(() => {
  getAllPages.mockReset();
  getCollectionSchemas.mockReset().mockResolvedValue([]);
  getCollectionItems.mockReset().mockResolvedValue([]);
});

const args = { project: { id: "p1" }, defaultLanguage: "en", languages: [] };

describe("useMediaUsageTitles", () => {
  it("names a page by its title", async () => {
    getAllPages.mockResolvedValue([{ id: "about", uuid: "u-1", name: "About", language: "en" }]);
    const onError = vi.fn();
    const { result } = renderHook(() => useMediaUsageTitles({ ...args, onError }));
    await waitFor(() => expect(result.current["page:u-1"]).toBe("About"));
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports a page list that can't be loaded, and keeps the global labels", async () => {
    getAllPages.mockRejectedValue(Object.assign(new Error("Failed to get pages"), { code: "UNEXPECTED_REPLY" }));
    const onError = vi.fn();
    const { result } = renderHook(() => useMediaUsageTitles({ ...args, onError }));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(result.current["global:root:header"]).toBeDefined();
    expect(result.current["page:u-1"]).toBeUndefined();
  });

  it("asks for nothing without a project", async () => {
    const { result } = renderHook(() => useMediaUsageTitles({ ...args, project: null, onError: vi.fn() }));
    expect(result.current).toEqual({});
    expect(getAllPages).not.toHaveBeenCalled();
  });
});
