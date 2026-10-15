import { describe, it, expect } from "vitest";
import { escapeHtml } from "./escapeHtml.js";

describe("escapeHtml", () => {
  it("escapes the five characters that matter in text and attributes", () => {
    expect(escapeHtml(`<script>alert(1)</script>`)).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(escapeHtml(`" onerror="x`)).toBe("&quot; onerror=&quot;x");
    expect(escapeHtml(`' onload='x`)).toBe("&#039; onload=&#039;x");
  });

  it("escapes & first so entities are not double-escaped", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("closes an attribute break-out", () => {
    const attr = `x" onerror="alert(1)`;
    expect(`<div data-t="${escapeHtml(attr)}">`).toBe(
      `<div data-t="x&quot; onerror=&quot;alert(1)">`,
    );
  });

  it("returns '' for non-strings rather than stringifying them", () => {
    for (const v of [undefined, null, 0, {}, []]) expect(escapeHtml(v)).toBe("");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("hero-banner")).toBe("hero-banner");
  });
});
