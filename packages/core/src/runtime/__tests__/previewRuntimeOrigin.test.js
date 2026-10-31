// @vitest-environment jsdom
/**
 * The editor-mode runtime obeys only the editor that framed it: the origin it
 * was given on the URL (?parentOrigin=…). Anything else posting to the frame,
 * or a message with no data, is ignored without an error.
 */
import { beforeAll, describe, expect, it } from "vitest";

const EDITOR = "https://editor.example";

beforeAll(async () => {
  window.history.replaceState(null, "", `?parentOrigin=${encodeURIComponent(EDITOR)}`);
  document.body.innerHTML = `<section data-widget-id="w1"></section>`;
  window.parent.postMessage = () => {};
  await import("../previewRuntime.js");
});

const post = (data, origin) => window.dispatchEvent(new MessageEvent("message", { data, origin }));
const toggle = (enabled) => ({ type: "UPDATE_BODY_CLASS", payload: { className: "probe", enabled } });

describe("preview runtime inbound origin check", () => {
  it("obeys the editor's origin", () => {
    post(toggle(true), EDITOR);
    expect(document.body.classList.contains("probe")).toBe(true);
    post(toggle(false), EDITOR);
    expect(document.body.classList.contains("probe")).toBe(false);
  });

  it("ignores a control message from another origin", () => {
    post(toggle(true), window.location.origin);
    post(toggle(true), "https://evil.example");
    expect(document.body.classList.contains("probe")).toBe(false);
  });

  it("ignores a message with no data", () => {
    expect(() => post(null, EDITOR)).not.toThrow();
    expect(() => post("UPDATE_BODY_CLASS", EDITOR)).not.toThrow();
  });
});
