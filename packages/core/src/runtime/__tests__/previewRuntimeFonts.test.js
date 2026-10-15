// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";

const fontLinks = () => [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.href);

function post(payload) {
  window.dispatchEvent(new MessageEvent("message", { data: { type: "LOAD_FONTS", payload } }));
}

beforeAll(async () => {
  document.head.innerHTML =
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap" rel="stylesheet">';
  await import("../previewRuntime.js");
});

describe("preview runtime font loading", () => {
  it("swaps the stylesheet between Google and Bunny without adding a second one", () => {
    post({ url: "https://fonts.bunny.net/css?family=Inter:wght@400&display=swap" });
    expect(fontLinks()).toEqual(["https://fonts.bunny.net/css?family=Inter:wght@400&display=swap"]);

    post({ url: "https://fonts.googleapis.com/css2?family=Lora:wght@400&display=swap" });
    expect(fontLinks()).toEqual(["https://fonts.googleapis.com/css2?family=Lora:wght@400&display=swap"]);
  });

  it("ignores a stylesheet from any other host", () => {
    post({ url: "https://fonts.googleapis.com.evil.example/css2?family=X" });
    post({ url: "https://evil.example/?https://fonts.bunny.net/" });
    expect(fontLinks()).toEqual(["https://fonts.googleapis.com/css2?family=Lora:wght@400&display=swap"]);
  });
});
