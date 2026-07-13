// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the fetch layer so we can inspect the request the morph path sends.
vi.mock("../../lib/apiFetch", () => ({
  editorFetch: vi.fn(),
  editorFetchJson: vi.fn(),
  rethrowQueryError: vi.fn((err) => {
    throw err;
  }),
  throwApiError: vi.fn(),
}));

import { fetchRenderedWidget } from "../previewManager";
import { editorFetch } from "../../lib/apiFetch";

afterEach(() => {
  vi.clearAllMocks();
});

describe("fetchRenderedWidget — currentCanonicalPath forwarding (D3)", () => {
  it("includes currentCanonicalPath in the /preview/widget request body", async () => {
    editorFetch.mockResolvedValue({ ok: true, text: async () => "<div>ok</div>" });

    await fetchRenderedWidget("header", { type: "x" }, { color: "red" }, "portfolio/alpha.html");

    expect(editorFetch).toHaveBeenCalledTimes(1);
    const [path, options] = editorFetch.mock.calls[0];
    expect(path).toBe("/preview/widget");
    const body = JSON.parse(options.body);
    expect(body.currentCanonicalPath).toBe("portfolio/alpha.html");
    expect(body.widgetId).toBe("header");
  });

  it("defaults currentCanonicalPath to an empty string when omitted", async () => {
    editorFetch.mockResolvedValue({ ok: true, text: async () => "<div>ok</div>" });

    await fetchRenderedWidget("footer", { type: "x" }, {});

    const body = JSON.parse(editorFetch.mock.calls[0][1].body);
    expect(body.currentCanonicalPath).toBe("");
  });
});
