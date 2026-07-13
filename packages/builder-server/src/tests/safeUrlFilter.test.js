/**
 * URL safety helper + `safe_url` Liquid filter.
 *
 * Covers the shared href sanitizer (@widgetizer/core/urlSafety) and the filter
 * theme templates use for author-entered URLs emitted into href attributes.
 *
 * Run with: node --test packages/builder-server/src/tests/safeUrlFilter.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Liquid } from "liquidjs";

import { sanitizeHref, normalize, isValidSiteUrl } from "@widgetizer/core/urlSafety";
import { registerSafeUrlFilter } from "@widgetizer/core";

describe("urlSafety.isValidSiteUrl", () => {
  it("treats empty/blank/non-string as valid (optional field)", () => {
    assert.equal(isValidSiteUrl(""), true);
    assert.equal(isValidSiteUrl("   "), true);
    assert.equal(isValidSiteUrl(undefined), true);
    assert.equal(isValidSiteUrl(null), true);
  });

  it("accepts proper http(s) URLs with a dotted host", () => {
    assert.equal(isValidSiteUrl("https://mysite.com"), true);
    assert.equal(isValidSiteUrl("http://cssigniter.com"), true);
    assert.equal(isValidSiteUrl("  https://www.example.co.uk/path?q=1  "), true);
  });

  it("rejects malformed / non-web / authority-less values", () => {
    assert.equal(isValidSiteUrl("not a url"), false);
    assert.equal(isValidSiteUrl("mysite.com"), false);
    // WHATWG `new URL` accepts these, but they are not real site URLs:
    assert.equal(isValidSiteUrl("https:cssigniter.com"), false); // missing //
    assert.equal(isValidSiteUrl("https://localhost"), false); // single-label host
    assert.equal(isValidSiteUrl("https://foo"), false);
    assert.equal(isValidSiteUrl("ftp://example.com"), false); // non-http(s)
  });
});

describe("urlSafety.normalize", () => {
  it("trims leading/trailing C0-control-or-space", () => {
    assert.equal(normalize("  https://x.com  "), "https://x.com");
    assert.equal(normalize("\x01https://x.com"), "https://x.com");
  });

  it("removes embedded tab/LF/CR", () => {
    assert.equal(normalize("ht\ttps://x.com"), "https://x.com");
    assert.equal(normalize("java\nscript:x"), "javascript:x");
  });

  it("returns '' for non-strings", () => {
    assert.equal(normalize(null), "");
    assert.equal(normalize(undefined), "");
  });
});

describe("urlSafety.sanitizeHref", () => {
  it("passes safe URLs through unchanged", () => {
    for (const href of ["https://example.com", "/about", "mailto:a@b.com", "tel:+1", "#frag", "../rooms/x.html"]) {
      assert.equal(sanitizeHref(href), href);
    }
  });

  it("blocks dangerous schemes (plain + spacing/case)", () => {
    for (const href of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:void(0)",
      "data:text/html,<script>x</script>",
      "vbscript:msgbox(1)",
    ]) {
      assert.equal(sanitizeHref(href), "", `expected blocked for ${JSON.stringify(href)}`);
    }
  });

  it("blocks embedded tab/LF/CR-obfuscated schemes", () => {
    for (const href of ["java\tscript:alert(1)", "java\nscript:alert(1)", "java\rscript:alert(1)"]) {
      assert.equal(sanitizeHref(href), "", `expected blocked for ${JSON.stringify(href)}`);
    }
  });

  it("blocks leading C0-control / null obfuscated schemes", () => {
    for (const href of ["\x01javascript:alert(1)", "\x00javascript:alert(1)", "\x1Fjavascript:alert(1)"]) {
      assert.equal(sanitizeHref(href), "", `expected blocked for ${JSON.stringify(href)}`);
    }
  });

  it("returns non-strings unchanged", () => {
    assert.equal(sanitizeHref(null), null);
    assert.equal(sanitizeHref(undefined), undefined);
    assert.equal(sanitizeHref(42), 42);
  });
});

describe("safe_url Liquid filter", () => {
  const engine = new Liquid();
  registerSafeUrlFilter(engine);
  const render = (url) => engine.parseAndRenderSync("{{ url | safe_url }}", { url });

  it("emits safe URLs", () => {
    assert.equal(render("https://example.com"), "https://example.com");
    assert.equal(render("/about"), "/about");
  });

  it("blanks dangerous + obfuscated URLs", () => {
    assert.equal(render("javascript:alert(1)"), "");
    assert.equal(render("java\tscript:alert(1)"), "");
    assert.equal(render("\x01javascript:alert(1)"), "");
  });

  it("blanks missing/non-string values", () => {
    assert.equal(engine.parseAndRenderSync("{{ url | safe_url }}", {}), "");
  });
});
