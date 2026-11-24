/**
 * isThemeInstalled answers from the presets route's status: only its 404 means
 * the theme's folder is missing, and any other failure leaves it undecided.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchJson = vi.fn();
vi.mock("../../lib/apiFetch", () => ({
  apiFetchJson: (...args) => apiFetchJson(...args),
  rethrowQueryError: vi.fn(),
}));

const { isThemeInstalled } = await import("../themeManager");

beforeEach(() => {
  apiFetchJson.mockReset();
});

describe("isThemeInstalled", () => {
  it("is true when the server finds the theme's folder", async () => {
    apiFetchJson.mockResolvedValue({ default: null, presets: [] });
    expect(await isThemeInstalled("my theme")).toBe(true);
    expect(apiFetchJson.mock.calls[0][0]).toBe("/api/themes/my%20theme/presets");
  });

  it("is false when the server answers 404", async () => {
    apiFetchJson.mockRejectedValue(Object.assign(new Error("Theme 'meridian' not found"), { status: 404 }));
    expect(await isThemeInstalled("meridian")).toBe(false);
  });

  it("is null for any other failure", async () => {
    apiFetchJson.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));
    expect(await isThemeInstalled("arch")).toBeNull();
    apiFetchJson.mockRejectedValue(new Error("offline"));
    expect(await isThemeInstalled("arch")).toBeNull();
  });
});
