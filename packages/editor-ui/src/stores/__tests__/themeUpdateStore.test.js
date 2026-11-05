/**
 * The theme-update badge keeps the count it last knew when a check fails, so a
 * broken reply neither crashes nor clears it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/config", () => ({ API_URL: (path) => `http://api.test${path}` }));
vi.mock("../../lib/activeProjectId", () => ({ getActiveProjectId: () => null, registerProjectStore: () => {} }));

const { default: useThemeUpdateStore } = await import("../themeUpdateStore.js");

const reply = (body, ok = true) => ({ ok, status: ok ? 200 : 500, statusText: "", text: async () => body });

beforeEach(() => {
  useThemeUpdateStore.setState({ updateCount: 3, isLoading: false });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("themeUpdateStore.fetchUpdateCount", () => {
  it("takes the server's count", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(reply(JSON.stringify({ count: 1 })));
    await useThemeUpdateStore.getState().fetchUpdateCount();
    expect(useThemeUpdateStore.getState().updateCount).toBe(1);
  });

  for (const [label, response] of [
    ["an empty reply", reply("")],
    ["an HTML page", reply("<html>Sign in</html>")],
    ["a failed request", reply("{}", false)],
  ]) {
    it(`keeps the last count on ${label}`, async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(response);
      await useThemeUpdateStore.getState().fetchUpdateCount();
      expect(useThemeUpdateStore.getState().updateCount).toBe(3);
      expect(useThemeUpdateStore.getState().isLoading).toBe(false);
    });
  }
});
