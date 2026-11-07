// @vitest-environment jsdom
/**
 * A page reached through a `page.html#section` link: the preview hands the section
 * to the render as the frame's #fragment, and the runtime shows it once loaded.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

const scrolledTo = [];

beforeAll(async () => {
  window.history.replaceState(null, "", "/render/token#our%20team");
  document.body.innerHTML = `
    <section id="our team"><p>Team</p></section>
    <script type="module" data-preview-mode="standalone" data-output-path="about.html"></script>`;
  Element.prototype.scrollIntoView = vi.fn(function scrollIntoView() {
    scrolledTo.push(this.id);
  });
  window.parent.postMessage = () => {};
  await import("../previewRuntime.js");
  if (document.readyState !== "complete") window.dispatchEvent(new Event("load"));
});

describe("standalone preview opened at a section", () => {
  it("scrolls to and focuses the section the frame's #fragment names", () => {
    expect(scrolledTo).toEqual(["our team"]);
    expect(document.activeElement.id).toBe("our team");
  });
});
