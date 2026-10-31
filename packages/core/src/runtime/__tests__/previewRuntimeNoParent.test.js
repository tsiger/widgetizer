// @vitest-environment jsdom
/**
 * An editor-mode runtime loaded without ?parentOrigin= does not know which
 * window is its editor, so it obeys no control message; its own reports still go out.
 */
import { beforeAll, describe, expect, it } from "vitest";

const posted = [];

beforeAll(async () => {
  window.parent.postMessage = (data) => posted.push(data.type);
  await import("../previewRuntime.js");
});

describe("preview runtime without a parent origin", () => {
  it("ignores control messages from any origin", () => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "UPDATE_BODY_CLASS", payload: { className: "probe", enabled: true } },
        origin: window.location.origin,
      }),
    );
    expect(document.body.classList.contains("probe")).toBe(false);
  });

  it("still announces itself", () => {
    expect(posted).toContain("PREVIEW_READY");
  });
});
