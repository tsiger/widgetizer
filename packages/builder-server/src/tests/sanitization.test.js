/**
 * Sanitization Service Test Suite
 *
 * Tests the three-layer sanitization defence:
 *  1. sanitizeRichText  — DOMPurify for richtext fields (output via | raw)
 *  2. sanitizeLink (via sanitizeWidgetData) — blocks dangerous protocols
 *  3. sanitizeWidgetData — walks widget + block settings using schema types
 *
 * Pure-logic service — no filesystem, no mock req/res needed.
 *
 * Run with: node --test server/tests/sanitization.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeRichText,
  sanitizeWidgetData,
  sanitizeCollectionItemData,
  stripHtmlTags,
  sanitizeCssValue,
  sanitizeThemeSettings,
  sanitizeImagePath,
  sanitizeImageSettingValue,
} from "../services/sanitizationService.js";

// ============================================================================
// sanitizeRichText
// ============================================================================

describe("sanitizeRichText", () => {
  // --- Allowed tags pass through ---

  it("allows <p> tags", () => {
    assert.equal(sanitizeRichText("<p>Hello world</p>"), "<p>Hello world</p>");
  });

  it("allows <strong> and <em> for bold/italic", () => {
    const input = "<p><strong>Bold</strong> and <em>italic</em></p>";
    assert.equal(sanitizeRichText(input), input);
  });

  it("allows <a> with href, target, and rel", () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>';
    assert.equal(sanitizeRichText(input), input);
  });

  it("allows <br> tags", () => {
    const input = "Line one<br>Line two";
    const result = sanitizeRichText(input);
    assert.ok(result.includes("<br>") || result.includes("<br />"));
  });

  it("allows <span> with class attribute", () => {
    const input = '<span class="highlight">Text</span>';
    assert.equal(sanitizeRichText(input), input);
  });

  it("allows <ul>, <ol>, <li> for lists", () => {
    const input = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    assert.equal(sanitizeRichText(input), input);
  });

  it("allows ordered lists", () => {
    const input = "<ol><li>First</li><li>Second</li></ol>";
    assert.equal(sanitizeRichText(input), input);
  });

  // --- Dangerous tags are stripped ---

  it("strips <script> tags", () => {
    const result = sanitizeRichText('<p>Hello</p><script>alert("xss")</script>');
    assert.doesNotMatch(result, /<script/i);
    assert.match(result, /<p>Hello<\/p>/);
  });

  it("strips <iframe> tags", () => {
    const result = sanitizeRichText('<iframe src="https://evil.com"></iframe>');
    assert.doesNotMatch(result, /<iframe/i);
  });

  it("keeps <img> only when the field opts in (allow_images), with alt and stripped handlers", () => {
    const html = '<img src="/uploads/images/photo-large.jpg" alt="A cat" onerror="alert(1)">';
    const result = sanitizeRichText(html, { allowImages: true });
    assert.match(result, /<img/i);
    assert.match(result, /src="\/uploads\/images\/photo-large\.jpg"/);
    assert.match(result, /alt="A cat"/);
    assert.doesNotMatch(result, /onerror/i);
  });

  it("strips ALL <img> when the field does not allow images (default — the opt-in contract)", () => {
    // Same markup, no allow_images: <img> is not in the allowlist and is removed
    // regardless of src — so source-mode / imported / API content can't sneak images
    // into a field the theme author never opted into.
    const html = '<p>x</p><img src="/uploads/images/photo-large.jpg" alt="A cat"><p>y</p>';
    assert.doesNotMatch(sanitizeRichText(html), /<img/i);
    assert.doesNotMatch(sanitizeRichText(html, { allowImages: false }), /<img/i);
    assert.match(sanitizeRichText(html), /<p>x<\/p>/, "surrounding content is preserved");
  });

  it("with allow_images, drops <img> whose src is not a valid in-project upload path", () => {
    for (const src of [
      "https://evil.com/pixel.gif", // external
      "data:image/png;base64,AAAA", // data URI
      "javascript:alert(1)", // dangerous scheme
      "/etc/passwd", // non-upload absolute
      "/uploads/images/../secret.png", // directory traversal
      "/uploads/images/a b.png", // space
      "/uploads/images/a.png?x=1", // query string
    ]) {
      const result = sanitizeRichText(`<p>x</p><img src="${src}" alt="y">`, { allowImages: true });
      assert.doesNotMatch(result, /<img/i, `expected <img src="${src}"> to be dropped`);
      assert.match(result, /<p>x<\/p>/, "surrounding content is preserved");
    }
  });

  it("strips <style> tags", () => {
    const result = sanitizeRichText("<style>body { display:none }</style><p>Content</p>");
    assert.doesNotMatch(result, /<style/i);
    assert.match(result, /<p>Content<\/p>/);
  });

  it("strips <form> tags", () => {
    const result = sanitizeRichText('<form action="/steal"><input type="text"></form>');
    assert.doesNotMatch(result, /<form/i);
    assert.doesNotMatch(result, /<input/i);
  });

  it("strips <div> tags (not in allowed list)", () => {
    const result = sanitizeRichText("<div>Content inside div</div>");
    assert.doesNotMatch(result, /<div/i);
    assert.ok(result.includes("Content inside div"));
  });

  it("with allow_headings, keeps <h2>-<h4> and strips <h1>/<h5>/<h6>", () => {
    const result = sanitizeRichText(
      "<h1>One</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4><h5>Five</h5><h6>Six</h6>",
      { allowHeadings: true },
    );
    // h2-h4 are allowed (emitted by the allow_headings editor option).
    assert.match(result, /<h2>Two<\/h2>/);
    assert.match(result, /<h3>Three<\/h3>/);
    assert.match(result, /<h4>Four<\/h4>/);
    // h1 / h5 / h6 are never in the allowlist — tags stripped, text preserved.
    assert.doesNotMatch(result, /<h1|<h5|<h6/i);
    assert.ok(result.includes("One"));
    assert.ok(result.includes("Five"));
  });

  it("strips ALL headings when the field does not allow them (default — opt-in contract)", () => {
    // Same as images: allow_headings is enforced at the sanitizer, not just the UI.
    const html = "<h2>Two</h2><p>Body</p><h3>Three</h3>";
    const result = sanitizeRichText(html);
    assert.doesNotMatch(result, /<h2|<h3|<h4/i);
    assert.match(result, /<p>Body<\/p>/);
    assert.ok(result.includes("Two") && result.includes("Three"), "heading text is preserved");
  });

  // --- Dangerous attributes are stripped ---

  it("strips onerror attribute", () => {
    const result = sanitizeRichText('<p onerror="alert(1)">Text</p>');
    assert.doesNotMatch(result, /onerror/i);
    assert.match(result, /<p>Text<\/p>/);
  });

  it("strips onclick attribute", () => {
    const result = sanitizeRichText('<p onclick="alert(1)">Click me</p>');
    assert.doesNotMatch(result, /onclick/i);
  });

  it("strips style attribute", () => {
    const result = sanitizeRichText('<p style="background:url(evil)">Styled</p>');
    assert.doesNotMatch(result, /style=/i);
  });

  it("strips data-* attributes", () => {
    const result = sanitizeRichText('<p data-payload="malicious">Text</p>');
    assert.doesNotMatch(result, /data-/i);
  });

  it("strips id attribute", () => {
    const result = sanitizeRichText('<p id="injected">Text</p>');
    assert.doesNotMatch(result, /id=/i);
  });

  // --- XSS attack vectors ---

  it("blocks javascript: in href", () => {
    const result = sanitizeRichText('<a href="javascript:alert(1)">Click</a>');
    assert.doesNotMatch(result, /javascript:/i);
  });

  it("blocks data: protocol in href", () => {
    const result = sanitizeRichText('<a href="data:text/html,<script>alert(1)</script>">Click</a>');
    assert.doesNotMatch(result, /data:text/i);
  });

  it("blocks nested/encoded XSS in tags", () => {
    const result = sanitizeRichText('<p><<script>alert("xss")</script>>');
    assert.doesNotMatch(result, /<script/i);
  });

  it("blocks SVG-based XSS", () => {
    const result = sanitizeRichText('<svg onload="alert(1)"><circle r="50"/></svg>');
    assert.doesNotMatch(result, /<svg/i);
    assert.doesNotMatch(result, /onload/i);
  });

  it("blocks object/embed tags", () => {
    const result = sanitizeRichText('<object data="evil.swf"></object><embed src="evil.swf">');
    assert.doesNotMatch(result, /<object/i);
    assert.doesNotMatch(result, /<embed/i);
  });

  // --- Edge cases ---

  it("returns non-string values unchanged", () => {
    assert.equal(sanitizeRichText(null), null);
    assert.equal(sanitizeRichText(undefined), undefined);
    assert.equal(sanitizeRichText(42), 42);
    assert.equal(sanitizeRichText(true), true);
  });

  it("handles empty string", () => {
    assert.equal(sanitizeRichText(""), "");
  });

  it("handles plain text (no HTML)", () => {
    assert.equal(sanitizeRichText("Just plain text"), "Just plain text");
  });

  it("preserves nested allowed tags", () => {
    const input = '<ul><li><strong>Bold item</strong> with <a href="/about">link</a></li></ul>';
    assert.equal(sanitizeRichText(input), input);
  });
});

// ============================================================================
// sanitizeWidgetData — link sanitization (via sanitizeSettingValue)
// ============================================================================

describe("sanitizeWidgetData — link fields", () => {
  const schema = {
    settings: [
      { id: "cta_link", type: "link" },
      { id: "title", type: "text" },
    ],
    blocks: [],
  };

  it("passes through safe http links", () => {
    const data = {
      settings: {
        cta_link: { text: "Click", href: "https://example.com", target: "_blank" },
        title: "Hello",
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.cta_link.href, "https://example.com");
  });

  it("passes through relative links", () => {
    const data = {
      settings: {
        cta_link: { text: "About", href: "/about", target: "_self" },
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.cta_link.href, "/about");
  });

  it("passes through mailto links", () => {
    const data = {
      settings: {
        cta_link: { text: "Email", href: "mailto:user@example.com" },
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.cta_link.href, "mailto:user@example.com");
  });

  it("passes through tel links", () => {
    const data = {
      settings: {
        cta_link: { text: "Call", href: "tel:+1234567890" },
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.cta_link.href, "tel:+1234567890");
  });

  it("blocks javascript: protocol in link href", () => {
    const data = {
      settings: {
        cta_link: { text: "Evil", href: "javascript:alert(1)" },
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.cta_link.href, "");
  });

  it("blocks JavaScript: with mixed case", () => {
    const data = {
      settings: {
        cta_link: { text: "Evil", href: "JavaScript:alert(1)" },
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.cta_link.href, "");
  });

  it("blocks javascript: with leading whitespace", () => {
    const data = {
      settings: {
        cta_link: { text: "Evil", href: "  javascript:void(0)" },
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.cta_link.href, "");
  });

  it("blocks data: protocol", () => {
    const data = {
      settings: {
        cta_link: { text: "Evil", href: "data:text/html,<script>alert(1)</script>" },
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.cta_link.href, "");
  });

  it("blocks vbscript: protocol", () => {
    const data = {
      settings: {
        cta_link: { text: "Evil", href: "vbscript:MsgBox('xss')" },
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.cta_link.href, "");
  });

  it("blocks tab/newline/CR-obfuscated dangerous protocols", () => {
    // Browsers strip these control chars while resolving the scheme, so each of
    // these executes as javascript:/vbscript: despite the interleaved char.
    const hrefs = [
      "java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "java\rscript:alert(1)",
      "\tjavascript:alert(1)",
      "vb\rscript:MsgBox(1)",
    ];
    for (const href of hrefs) {
      const data = { settings: { cta_link: { text: "Evil", href } } };
      sanitizeWidgetData(data, schema);
      assert.equal(data.settings.cta_link.href, "", `expected blocked for ${JSON.stringify(href)}`);
    }
  });

  it("blocks leading C0-control / null obfuscated protocols", () => {
    // WHATWG URL preprocessing strips leading C0-or-space, so these resolve to
    // javascript: in a browser even though they are not contiguous schemes.
    const hrefs = ["\x01javascript:alert(1)", "\x00javascript:alert(1)", "\x1Fjavascript:alert(1)"];
    for (const href of hrefs) {
      const data = { settings: { cta_link: { text: "Evil", href } } };
      sanitizeWidgetData(data, schema);
      assert.equal(data.settings.cta_link.href, "", `expected blocked for ${JSON.stringify(href)}`);
    }
  });

  it("preserves text field — does not sanitize (left for autoescape)", () => {
    const data = {
      settings: {
        cta_link: { text: '<script>alert("xss")</script>', href: "https://safe.com" },
      },
    };
    sanitizeWidgetData(data, schema);
    // text is left as-is — LiquidJS autoescape handles it at render time
    assert.equal(data.settings.cta_link.text, '<script>alert("xss")</script>');
    assert.equal(data.settings.cta_link.href, "https://safe.com");
  });

  it("handles null/undefined link values gracefully", () => {
    const data = {
      settings: {
        cta_link: null,
        title: "Hello",
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.cta_link, null);
  });

  it("handles non-object link values gracefully", () => {
    const data = {
      settings: {
        cta_link: "not-an-object",
        title: "Hello",
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.cta_link, "not-an-object");
  });
});

// ============================================================================
// sanitizeWidgetData — richtext fields in widget settings
// ============================================================================

describe("sanitizeWidgetData — richtext in settings", () => {
  const schema = {
    settings: [
      { id: "body", type: "richtext" },
      { id: "heading", type: "text" },
      { id: "embed_code", type: "code" },
    ],
    blocks: [],
  };

  it("sanitizes richtext setting values", () => {
    const data = {
      settings: {
        body: '<p>Hello</p><script>alert("xss")</script>',
        heading: "Safe Title",
      },
    };
    sanitizeWidgetData(data, schema);
    assert.doesNotMatch(data.settings.body, /<script/i);
    assert.match(data.settings.body, /<p>Hello<\/p>/);
  });

  it("leaves text type settings untouched", () => {
    const data = {
      settings: {
        body: "<p>Content</p>",
        heading: "<img src=x onerror=alert(1)>",
      },
    };
    sanitizeWidgetData(data, schema);
    // text fields are NOT sanitized here — LiquidJS autoescape handles them
    assert.equal(data.settings.heading, "<img src=x onerror=alert(1)>");
  });

  it("leaves code type settings untouched (intentionally raw)", () => {
    const data = {
      settings: {
        body: "<p>Content</p>",
        embed_code: '<iframe src="https://youtube.com/embed/123"></iframe>',
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.embed_code, '<iframe src="https://youtube.com/embed/123"></iframe>');
  });

  it("handles null settings value", () => {
    const data = {
      settings: {
        body: null,
        heading: "Title",
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.body, null);
  });

  it("handles missing settings object", () => {
    const data = {};
    // Should not throw
    sanitizeWidgetData(data, schema);
    assert.ok(true);
  });
});

// ============================================================================
// sanitizeWidgetData — block settings
// ============================================================================

describe("sanitizeWidgetData — block settings", () => {
  const schema = {
    settings: [{ id: "heading", type: "text" }],
    blocks: [
      {
        type: "text_block",
        settings: [
          { id: "content", type: "richtext" },
          { id: "link", type: "link" },
          { id: "label", type: "text" },
        ],
      },
      {
        type: "image_block",
        settings: [
          { id: "caption", type: "richtext" },
          { id: "alt", type: "text" },
        ],
      },
    ],
  };

  it("sanitizes richtext in block settings", () => {
    const data = {
      settings: { heading: "Title" },
      blocks: {
        block_1: {
          type: "text_block",
          settings: {
            content: "<p>Safe</p><script>evil()</script>",
            label: "My Label",
          },
        },
      },
    };
    sanitizeWidgetData(data, schema);
    assert.doesNotMatch(data.blocks.block_1.settings.content, /<script/i);
    assert.match(data.blocks.block_1.settings.content, /<p>Safe<\/p>/);
  });

  it("sanitizes link fields in block settings", () => {
    const data = {
      settings: { heading: "Title" },
      blocks: {
        block_1: {
          type: "text_block",
          settings: {
            content: "<p>Text</p>",
            link: { text: "Click", href: "javascript:alert(1)" },
            label: "Label",
          },
        },
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.blocks.block_1.settings.link.href, "");
  });

  it("sanitizes different block types independently", () => {
    const data = {
      settings: { heading: "Title" },
      blocks: {
        block_1: {
          type: "text_block",
          settings: {
            content: "<p>Safe</p><div>Removed</div>",
            label: "Label",
          },
        },
        block_2: {
          type: "image_block",
          settings: {
            caption: '<em>Nice</em><img src=x onerror="alert(1)">',
            alt: "Photo alt",
          },
        },
      },
    };
    sanitizeWidgetData(data, schema);
    // text_block: div stripped
    assert.doesNotMatch(data.blocks.block_1.settings.content, /<div/i);
    assert.match(data.blocks.block_1.settings.content, /<p>Safe<\/p>/);
    // image_block: img stripped from caption
    assert.doesNotMatch(data.blocks.block_2.settings.caption, /<img/i);
    assert.match(data.blocks.block_2.settings.caption, /<em>Nice<\/em>/);
    // text field left untouched
    assert.equal(data.blocks.block_2.settings.alt, "Photo alt");
  });

  it("handles blocks with unknown type (not in schema)", () => {
    const data = {
      settings: { heading: "Title" },
      blocks: {
        block_1: {
          type: "mystery_block",
          settings: {
            dangerous: '<script>alert("xss")</script>',
          },
        },
      },
    };
    sanitizeWidgetData(data, schema);
    // Unknown block type — settings are left untouched (no schema match)
    assert.equal(data.blocks.block_1.settings.dangerous, '<script>alert("xss")</script>');
  });

  it("skips blocks with missing settings", () => {
    const data = {
      settings: { heading: "Title" },
      blocks: {
        block_1: {
          type: "text_block",
          // no settings property
        },
      },
    };
    // Should not throw
    sanitizeWidgetData(data, schema);
    assert.ok(true);
  });

  it("skips blocks with missing type", () => {
    const data = {
      settings: { heading: "Title" },
      blocks: {
        block_1: {
          settings: { content: "<p>Content</p>" },
        },
      },
    };
    // Should not throw
    sanitizeWidgetData(data, schema);
    assert.ok(true);
  });

  it("handles null blocks gracefully", () => {
    const data = {
      settings: { heading: "Title" },
      blocks: {
        block_1: null,
      },
    };
    sanitizeWidgetData(data, schema);
    assert.equal(data.blocks.block_1, null);
  });

  it("handles empty blocks object", () => {
    const data = {
      settings: { heading: "Title" },
      blocks: {},
    };
    sanitizeWidgetData(data, schema);
    assert.ok(true);
  });
});

// ============================================================================
// sanitizeWidgetData — schema edge cases
// ============================================================================

describe("sanitizeWidgetData — schema edge cases", () => {
  it("handles empty schema settings array", () => {
    const schema = { settings: [], blocks: [] };
    const data = {
      settings: { anything: '<script>alert("xss")</script>' },
    };
    sanitizeWidgetData(data, schema);
    // No type map entries — value passes through untouched
    assert.equal(data.settings.anything, '<script>alert("xss")</script>');
  });

  it("handles missing schema settings", () => {
    const schema = { blocks: [] };
    const data = {
      settings: { body: "<p>Content</p>" },
    };
    // Should not throw
    sanitizeWidgetData(data, schema);
    assert.ok(true);
  });

  it("handles schema settings without id or type", () => {
    const schema = {
      settings: [
        { id: "body", type: "richtext" },
        { id: "noType" }, // missing type
        { type: "text" }, // missing id
        {}, // both missing
      ],
      blocks: [],
    };
    const data = {
      settings: {
        body: "<p>Hello</p><script>bad()</script>",
        noType: "some value",
      },
    };
    sanitizeWidgetData(data, schema);
    // Only body (which has id + type) gets sanitized
    assert.doesNotMatch(data.settings.body, /<script/i);
    assert.equal(data.settings.noType, "some value");
  });

  it("settings not in schema are left untouched", () => {
    const schema = {
      settings: [{ id: "body", type: "richtext" }],
      blocks: [],
    };
    const data = {
      settings: {
        body: "<p>Clean</p>",
        extra_field: '<script>alert("xss")</script>',
      },
    };
    sanitizeWidgetData(data, schema);
    // extra_field has no schema entry, so no sanitization
    assert.equal(data.settings.extra_field, '<script>alert("xss")</script>');
  });

  it("handles multiple blocks of the same type", () => {
    const schema = {
      settings: [],
      blocks: [
        {
          type: "card",
          settings: [{ id: "description", type: "richtext" }],
        },
      ],
    };
    const data = {
      settings: {},
      blocks: {
        card_1: {
          type: "card",
          settings: { description: "<p>One</p><script>bad1()</script>" },
        },
        card_2: {
          type: "card",
          settings: { description: "<p>Two</p><script>bad2()</script>" },
        },
        card_3: {
          type: "card",
          settings: { description: "<p>Three</p>" },
        },
      },
    };
    sanitizeWidgetData(data, schema);
    assert.doesNotMatch(data.blocks.card_1.settings.description, /<script/i);
    assert.doesNotMatch(data.blocks.card_2.settings.description, /<script/i);
    assert.match(data.blocks.card_3.settings.description, /<p>Three<\/p>/);
  });
});

// ============================================================================
// sanitizeCollectionItemData — collection item settings (mirrors widget rules)
// ============================================================================

describe("sanitizeCollectionItemData", () => {
  const schema = {
    settings: [
      { id: "title", type: "text" },
      { id: "description", type: "richtext" },
      { id: "summary", type: "textarea" },
      { id: "book_link", type: "link" },
      { id: "embed", type: "code" },
    ],
  };

  it("sanitizes richtext fields (strips <script>, keeps safe tags)", () => {
    const item = {
      settings: { description: '<p>Stay with us</p><script>steal()</script>' },
    };
    sanitizeCollectionItemData(item, schema);
    assert.doesNotMatch(item.settings.description, /<script/i);
    assert.match(item.settings.description, /<p>Stay with us<\/p>/);
  });

  it("strips event-handler attributes from richtext", () => {
    const item = {
      settings: { description: '<p>Hi</p><img src=x onerror="alert(1)">' },
    };
    sanitizeCollectionItemData(item, schema);
    assert.doesNotMatch(item.settings.description, /<img/i);
    assert.doesNotMatch(item.settings.description, /onerror/i);
  });

  it("blocks javascript: protocol in link hrefs", () => {
    const item = {
      settings: { book_link: { text: "Book", href: "javascript:alert(1)" } },
    };
    sanitizeCollectionItemData(item, schema);
    assert.equal(item.settings.book_link.href, "");
  });

  it("blocks data: and vbscript: protocols in link hrefs", () => {
    const item1 = { settings: { book_link: { href: "data:text/html,<script>x</script>" } } };
    const item2 = { settings: { book_link: { href: "vbscript:msgbox(1)" } } };
    sanitizeCollectionItemData(item1, schema);
    sanitizeCollectionItemData(item2, schema);
    assert.equal(item1.settings.book_link.href, "");
    assert.equal(item2.settings.book_link.href, "");
  });

  it("blocks tab/newline/CR-obfuscated protocols in link hrefs", () => {
    const hrefs = ["java\tscript:alert(1)", "java\nscript:alert(1)", "vb\rscript:msgbox(1)"];
    for (const href of hrefs) {
      const item = { settings: { book_link: { href } } };
      sanitizeCollectionItemData(item, schema);
      assert.equal(item.settings.book_link.href, "", `expected blocked for ${JSON.stringify(href)}`);
    }
  });

  it("blocks leading C0-control / null obfuscated protocols in link hrefs", () => {
    const hrefs = ["\x01javascript:alert(1)", "\x00javascript:alert(1)"];
    for (const href of hrefs) {
      const item = { settings: { book_link: { href } } };
      sanitizeCollectionItemData(item, schema);
      assert.equal(item.settings.book_link.href, "", `expected blocked for ${JSON.stringify(href)}`);
    }
  });

  it("passes through safe http/mailto/tel link hrefs", () => {
    const item = { settings: { book_link: { href: "https://example.com/book" } } };
    sanitizeCollectionItemData(item, schema);
    assert.equal(item.settings.book_link.href, "https://example.com/book");
  });

  it("leaves text and textarea fields untouched (LiquidJS autoescape handles them)", () => {
    const item = {
      settings: {
        title: "<img src=x onerror=alert(1)>",
        summary: '<script>alert("xss")</script>',
      },
    };
    sanitizeCollectionItemData(item, schema);
    assert.equal(item.settings.title, "<img src=x onerror=alert(1)>");
    assert.equal(item.settings.summary, '<script>alert("xss")</script>');
  });

  it("leaves code fields untouched (intentionally raw)", () => {
    const item = {
      settings: { embed: '<iframe src="https://maps.example/embed"></iframe>' },
    };
    sanitizeCollectionItemData(item, schema);
    assert.equal(item.settings.embed, '<iframe src="https://maps.example/embed"></iframe>');
  });

  it("leaves settings not declared in the schema untouched", () => {
    const item = { settings: { stray: '<script>alert(1)</script>' } };
    sanitizeCollectionItemData(item, schema);
    assert.equal(item.settings.stray, '<script>alert(1)</script>');
  });

  it("handles null/missing item, settings, schema, and values gracefully", () => {
    // none of these should throw
    sanitizeCollectionItemData(null, schema);
    sanitizeCollectionItemData({}, schema);
    sanitizeCollectionItemData({ settings: { description: null } }, schema);
    sanitizeCollectionItemData({ settings: { description: "<p>x</p>" } }, null);
    assert.ok(true);
  });
});

// ============================================================================
// sanitizeImagePath — reusable upload-image-path guard (shared by gallery)
// ============================================================================

describe("sanitizeImagePath", () => {
  it("keeps a valid /uploads/images/ path", () => {
    assert.equal(sanitizeImagePath("/uploads/images/photo.jpg"), "/uploads/images/photo.jpg");
  });

  it("trims surrounding whitespace", () => {
    assert.equal(sanitizeImagePath("  /uploads/images/photo.jpg  "), "/uploads/images/photo.jpg");
  });

  it("blanks dangerous, external, or non-upload strings", () => {
    assert.equal(sanitizeImagePath("javascript:alert(1)"), "");
    assert.equal(sanitizeImagePath("https://evil.example/x.jpg"), "");
    assert.equal(sanitizeImagePath("/uploads/images/../../etc/passwd"), "");
    assert.equal(sanitizeImagePath("/uploads/files/doc.pdf"), ""); // files aren't images
    assert.equal(sanitizeImagePath("/default-logo.png"), ""); // theme asset, not an upload
  });

  it("blanks non-string input", () => {
    assert.equal(sanitizeImagePath(null), "");
    assert.equal(sanitizeImagePath(undefined), "");
    assert.equal(sanitizeImagePath(42), "");
    assert.equal(sanitizeImagePath({ src: "x" }), "");
  });
});

// ============================================================================
// sanitizeImageSettingValue — plain `image` setting guard (broader than gallery's)
// ============================================================================

describe("sanitizeImageSettingValue", () => {
  it("keeps a library upload path", () => {
    assert.equal(sanitizeImageSettingValue("/uploads/images/photo.jpg"), "/uploads/images/photo.jpg");
  });

  it("keeps a non-upload in-project theme asset path (unlike the strict gallery guard)", () => {
    assert.equal(sanitizeImageSettingValue("/default-logo.png"), "/default-logo.png");
    assert.equal(sanitizeImageSettingValue("/assets/logo.svg"), "/assets/logo.svg");
    assert.equal(sanitizeImagePath("/default-logo.png"), ""); // contrast: strict guard blanks it
  });

  it("trims surrounding whitespace", () => {
    assert.equal(sanitizeImageSettingValue("  /uploads/images/photo.jpg  "), "/uploads/images/photo.jpg");
  });

  it("blanks schemes, external / protocol-relative URLs, traversal, and relative paths", () => {
    assert.equal(sanitizeImageSettingValue("javascript:alert(1)"), "");
    assert.equal(sanitizeImageSettingValue("data:text/html,<script>x</script>"), "");
    assert.equal(sanitizeImageSettingValue("https://evil.example/x.jpg"), "");
    assert.equal(sanitizeImageSettingValue("//evil.example/x.jpg"), "");
    assert.equal(sanitizeImageSettingValue("/uploads/images/../../etc/passwd"), "");
    assert.equal(sanitizeImageSettingValue("uploads/images/x.jpg"), ""); // relative, no leading slash
  });

  it("blanks HTML attribute-breakout payloads — the {% image %} fallback src is unescaped", () => {
    // basename of these reaches a raw <img src="..."> (imageTag.js); a surviving quote/space/<>
    // would break out of the attribute → XSS. The allowlist rejects them.
    assert.equal(sanitizeImageSettingValue('/uploads/images/x" onerror="alert(1).jpg'), "");
    assert.equal(sanitizeImageSettingValue("/uploads/images/x<svg onload=alert(1)>.jpg"), "");
    assert.equal(sanitizeImageSettingValue("/uploads/images/a b.jpg"), ""); // whitespace
    assert.equal(sanitizeImageSettingValue("/uploads/images/back\\slash.jpg"), "");
    assert.equal(sanitizeImageSettingValue("/uploads/images/x'.jpg"), ""); // single quote
  });

  it("blanks non-strings and keeps an empty value as \"\"", () => {
    assert.equal(sanitizeImageSettingValue(""), "");
    assert.equal(sanitizeImageSettingValue(null), "");
    assert.equal(sanitizeImageSettingValue(42), "");
    assert.equal(sanitizeImageSettingValue({ src: "x" }), "");
  });
});

// ============================================================================
// image setting sanitization via the exported entry points (widget + theme)
// ============================================================================

describe("image setting sanitization (entry points)", () => {
  it("blanks a dangerous image value in a widget setting, keeps a valid upload", () => {
    const schema = { settings: [{ id: "img", type: "image" }, { id: "bg", type: "image" }], blocks: [] };
    const data = { settings: { img: "javascript:alert(1)", bg: "/uploads/images/ok.jpg" } };
    sanitizeWidgetData(data, schema);
    assert.equal(data.settings.img, "");
    assert.equal(data.settings.bg, "/uploads/images/ok.jpg");
  });

  it("normalizes a widget/collection image null to \"\" (uniform invariant, handled before the null guard)", () => {
    const wData = { settings: { img: null } };
    sanitizeWidgetData(wData, { settings: [{ id: "img", type: "image" }], blocks: [] });
    assert.equal(wData.settings.img, "");

    const item = { settings: { featured: null } };
    sanitizeCollectionItemData(item, { settings: [{ id: "featured", type: "image" }] });
    assert.equal(item.settings.featured, "");
  });

  it("blanks a dangerous theme image value, keeps uploads and theme-asset paths", () => {
    const themeData = {
      settings: {
        global: {
          branding: [
            { type: "image", id: "evil", value: "https://evil.example/x.jpg", default: "" },
            { type: "image", id: "logo", value: "/uploads/images/logo.png", default: "" },
            { type: "image", id: "fallback", value: "/default-logo.png", default: "" },
          ],
        },
      },
    };
    const { data } = sanitizeThemeSettings(themeData);
    const byId = Object.fromEntries(data.settings.global.branding.map((s) => [s.id, s.value]));
    assert.equal(byId.evil, "");
    assert.equal(byId.logo, "/uploads/images/logo.png");
    assert.equal(byId.fallback, "/default-logo.png");
  });

  it("blanks a dangerous image value in a collection-item setting (third entry point)", () => {
    const item = {
      settings: { featured: '/uploads/images/x" onerror="alert(1).jpg', ok: "/uploads/images/ok.jpg" },
    };
    sanitizeCollectionItemData(item, {
      settings: [{ id: "featured", type: "image" }, { id: "ok", type: "image" }],
    });
    assert.equal(item.settings.featured, "");
    assert.equal(item.settings.ok, "/uploads/images/ok.jpg");
  });

  it("reverts an invalid or null theme image to the default, but preserves an explicit clear", () => {
    const themeData = {
      settings: {
        global: {
          branding: [
            { type: "image", id: "bad", value: "javascript:alert(1)", default: "/default-logo.png" },
            { type: "image", id: "cleared", value: "", default: "/default-logo.png" },
            // null must NOT win over the default (it bypasses the switch via the null guard);
            // handled before the guard so it reverts like any other invalid value.
            { type: "image", id: "nulled", value: null, default: "/default-logo.png" },
          ],
        },
      },
    };
    const { data } = sanitizeThemeSettings(themeData);
    const byId = Object.fromEntries(data.settings.global.branding.map((s) => [s.id, s.value]));
    assert.equal(byId.bad, "/default-logo.png"); // reverted to default, not erased
    assert.equal(byId.cleared, ""); // explicit clear preserved
    assert.equal(byId.nulled, "/default-logo.png"); // null reverts, doesn't wipe the default
  });
});

// ============================================================================
// gallery sanitization — via the exported entry points (the switch helpers are
// private). The value is a string[] of upload paths. Same rule everywhere: drop
// blank/invalid (or non-string) entries; normalize non-array (incl. null/undefined) to [].
// ============================================================================

describe("gallery sanitization", () => {
  const widgetSchema = { settings: [{ id: "gallery", type: "gallery" }], blocks: [] };

  it("keeps valid upload paths, drops blank/invalid entries (widget)", () => {
    const data = {
      settings: {
        gallery: [
          "/uploads/images/a.jpg",
          "javascript:alert(1)",
          "../../etc/passwd",
          "https://evil.example/x.jpg",
          "",
        ],
      },
    };
    sanitizeWidgetData(data, widgetSchema);
    assert.deepEqual(data.settings.gallery, ["/uploads/images/a.jpg"]);
  });

  it("drops a legacy { src, caption } object entry — NOT coerced to its src", () => {
    // Locks the "no legacy handling / no coercion" decision: an old object-shaped entry
    // is removed, never converted to a string.
    const data = {
      settings: {
        gallery: [{ src: "/uploads/images/legacy.jpg", caption: "old" }, "/uploads/images/new.jpg"],
      },
    };
    sanitizeWidgetData(data, widgetSchema);
    assert.deepEqual(data.settings.gallery, ["/uploads/images/new.jpg"]);
  });

  it("normalizes a non-array gallery to [] (widget)", () => {
    const data = { settings: { gallery: "not-an-array" } };
    sanitizeWidgetData(data, widgetSchema);
    assert.deepEqual(data.settings.gallery, []);
  });

  it("normalizes a null/undefined gallery to [] — handled before the null guard (widget)", () => {
    const d1 = { settings: { gallery: null } };
    const d2 = { settings: { gallery: undefined } };
    sanitizeWidgetData(d1, widgetSchema);
    sanitizeWidgetData(d2, widgetSchema);
    assert.deepEqual(d1.settings.gallery, []);
    assert.deepEqual(d2.settings.gallery, []);
  });

  it("sanitizes a gallery in a collection item", () => {
    const item = {
      settings: {
        gallery: ["/uploads/images/room.jpg", "data:text/html,<script>x</script>"],
      },
    };
    sanitizeCollectionItemData(item, { settings: [{ id: "gallery", type: "gallery" }] });
    assert.deepEqual(item.settings.gallery, ["/uploads/images/room.jpg"]);
  });

  it("sanitizes a gallery value in theme settings (and does not mutate the input)", () => {
    const themeData = {
      settings: {
        global: {
          media: [
            {
              type: "gallery",
              id: "showcase",
              value: ["/uploads/images/t.jpg", "javascript:alert(1)"],
            },
          ],
        },
      },
    };
    const { data } = sanitizeThemeSettings(themeData);
    assert.deepEqual(data.settings.global.media[0].value, ["/uploads/images/t.jpg"]);
    // input untouched (sanitizeThemeSettings clones)
    assert.equal(themeData.settings.global.media[0].value.length, 2);
  });
});

// ============================================================================
// table sanitization (collection items) — via sanitizeCollectionItemData
// ============================================================================

describe("table sanitization", () => {
  const schema = {
    settings: [
      {
        id: "rates",
        type: "table",
        columns: [
          { id: "label", type: "text" },
          { id: "price", type: "text" },
        ],
      },
    ],
  };

  it("keeps declared cells, drops unknown keys, blanks non-strings, drops empty/whitespace rows", () => {
    const item = {
      settings: {
        rates: [
          { label: "Low", price: "€10", bogus: "x" }, // unknown key dropped
          { label: "  ", price: "  " }, // whitespace-only → dropped
          { label: "", price: "" }, // empty → dropped
          { label: "High", price: 99 }, // non-string cell → ""
        ],
      },
    };
    sanitizeCollectionItemData(item, schema);
    assert.deepEqual(item.settings.rates, [
      { label: "Low", price: "€10" },
      { label: "High", price: "" },
    ]);
  });

  it("normalizes a non-array table to []", () => {
    const item = { settings: { rates: "not-an-array" } };
    sanitizeCollectionItemData(item, schema);
    assert.deepEqual(item.settings.rates, []);
  });

  it("drops a number-only row — non-string cells sanitize to '' → all-blank → dropped", () => {
    const item = { settings: { rates: [{ price: 99 }] } };
    sanitizeCollectionItemData(item, schema);
    assert.deepEqual(item.settings.rates, []);
  });

  it("ignores a __proto__ key smuggled into a row (no prototype pollution)", () => {
    const row = JSON.parse('{ "label": "L", "price": "P", "__proto__": { "polluted": true } }');
    const item = { settings: { rates: [row] } };
    sanitizeCollectionItemData(item, schema);
    assert.deepEqual(item.settings.rates, [{ label: "L", price: "P" }]);
    assert.equal({}.polluted, undefined, "Object.prototype must not be polluted");
  });
});

// ============================================================================
// stripHtmlTags
// ============================================================================

describe("stripHtmlTags", () => {
  it("strips <script> tags completely", () => {
    assert.equal(stripHtmlTags('<script>alert("xss")</script>'), "");
  });

  it("strips <script> tags but keeps surrounding text", () => {
    assert.equal(stripHtmlTags('Hello <script>alert("xss")</script> World'), "Hello  World");
  });

  it("preserves ampersands without encoding", () => {
    assert.equal(stripHtmlTags("Tom & Jerry"), "Tom & Jerry");
  });

  it("preserves double quotes without encoding", () => {
    assert.equal(stripHtmlTags('Say "Hello"'), 'Say "Hello"');
  });

  it("preserves single quotes without encoding", () => {
    assert.equal(stripHtmlTags("O'Brien"), "O'Brien");
  });

  it("preserves special unicode characters", () => {
    const input = "Test & Site #1 — \"Quotes\"";
    assert.equal(stripHtmlTags(input), input);
  });

  it("strips all HTML tags but keeps text content", () => {
    assert.equal(stripHtmlTags("Tom <b>Bold</b> Name"), "Tom Bold Name");
  });

  it("strips <img> tags including event handlers", () => {
    assert.equal(stripHtmlTags('<img src=x onerror=alert("xss")>'), "");
  });

  it("strips nested HTML", () => {
    assert.equal(stripHtmlTags("<div><p>Hello</p></div>"), "Hello");
  });

  it("returns non-string values as-is", () => {
    assert.equal(stripHtmlTags(42), 42);
    assert.equal(stripHtmlTags(null), null);
    assert.equal(stripHtmlTags(undefined), undefined);
  });

  it("handles empty string", () => {
    assert.equal(stripHtmlTags(""), "");
  });

  it("handles plain text without HTML", () => {
    assert.equal(stripHtmlTags("Just plain text"), "Just plain text");
  });
});

// ============================================================================
// sanitizeCssValue
// ============================================================================

describe("sanitizeCssValue", () => {
  it("strips < from string", () => {
    assert.equal(sanitizeCssValue("</style>"), "/style");
  });

  it("strips > from string", () => {
    assert.equal(sanitizeCssValue("<script>"), "script");
  });

  it("strips { from string", () => {
    assert.equal(sanitizeCssValue("red; } body {"), "red;  body ");
  });

  it("strips } from string", () => {
    assert.equal(sanitizeCssValue("} .evil { display: none"), " .evil  display: none");
  });

  it("strips all dangerous chars from style tag breakout", () => {
    assert.equal(sanitizeCssValue('</style><script>alert(1)</script>'), "/stylescriptalert(1)/script");
  });

  it("leaves hex colors intact", () => {
    assert.equal(sanitizeCssValue("#DE1877"), "#DE1877");
  });

  it("leaves font stacks intact", () => {
    assert.equal(sanitizeCssValue('"Inter", sans-serif'), '"Inter", sans-serif');
  });

  it("leaves pixel values intact", () => {
    assert.equal(sanitizeCssValue("16px"), "16px");
  });

  it("returns non-strings unchanged", () => {
    assert.equal(sanitizeCssValue(42), 42);
    assert.equal(sanitizeCssValue(null), null);
    assert.equal(sanitizeCssValue(true), true);
  });
});

// ============================================================================
// sanitizeThemeSettings
// ============================================================================

describe("sanitizeThemeSettings", () => {
  // Helper to build a minimal theme data structure
  function makeTheme(category, items) {
    return { settings: { global: { [category]: items } } };
  }

  // --- Color validation ---

  describe("color validation", () => {
    it("passes valid 6-digit hex color", () => {
      const theme = makeTheme("colors", [
        { type: "color", id: "bg", default: "#ffffff", value: "#DE1877" },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.colors[0].value, "#DE1877");
    });

    it("passes valid 8-digit hex color (with alpha)", () => {
      const theme = makeTheme("colors", [
        { type: "color", id: "bg", default: "#ffffff", value: "#DE1877FF" },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.colors[0].value, "#DE1877FF");
    });

    it("rejects non-hex string — falls back to default", () => {
      const theme = makeTheme("colors", [
        { type: "color", id: "bg", default: "#ffffff", value: "red" },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.colors[0].value, "#ffffff");
    });

    it("rejects HTML injection — falls back to default", () => {
      const theme = makeTheme("colors", [
        { type: "color", id: "bg", default: "#ffffff", value: '#<script>alert(1)</script>' },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.colors[0].value, "#ffffff");
    });

    it("rejects non-string value — falls back to default", () => {
      const theme = makeTheme("colors", [
        { type: "color", id: "bg", default: "#ffffff", value: 12345 },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.colors[0].value, "#ffffff");
    });
  });

  // --- Number / Range validation ---

  describe("number and range validation", () => {
    it("passes valid number", () => {
      const theme = makeTheme("layout", [
        { type: "range", id: "spacing", min: 0, max: 100, default: 16, value: 24 },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.layout[0].value, 24);
    });

    it("clamps to min", () => {
      const theme = makeTheme("layout", [
        { type: "range", id: "spacing", min: 0, max: 100, default: 16, value: -5 },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.layout[0].value, 0);
    });

    it("clamps to max", () => {
      const theme = makeTheme("layout", [
        { type: "range", id: "spacing", min: 0, max: 100, default: 16, value: 999 },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.layout[0].value, 100);
    });

    it("rejects non-numeric string — falls back to default", () => {
      const theme = makeTheme("layout", [
        { type: "number", id: "cols", min: 1, max: 12, default: 3, value: "abc" },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.layout[0].value, 3);
    });

    it("coerces numeric string to number", () => {
      const theme = makeTheme("layout", [
        { type: "range", id: "spacing", min: 0, max: 100, default: 16, value: "50" },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.layout[0].value, 50);
    });
  });

  // --- Checkbox validation ---

  describe("checkbox validation", () => {
    it("passes true", () => {
      const theme = makeTheme("privacy", [
        { type: "checkbox", id: "bunny", default: false, value: true },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.privacy[0].value, true);
    });

    it("passes false", () => {
      const theme = makeTheme("privacy", [
        { type: "checkbox", id: "bunny", default: true, value: false },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.privacy[0].value, false);
    });

    it("rejects non-boolean — falls back to default", () => {
      const theme = makeTheme("privacy", [
        { type: "checkbox", id: "bunny", default: false, value: "yes" },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.privacy[0].value, false);
    });
  });

  // --- Select / Radio validation ---

  describe("select and radio validation", () => {
    it("passes valid option", () => {
      const theme = makeTheme("layout", [
        {
          type: "select",
          id: "style",
          default: "rounded",
          options: [{ label: "Rounded", value: "rounded" }, { label: "Sharp", value: "sharp" }],
          value: "sharp",
        },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.layout[0].value, "sharp");
    });

    it("rejects value not in options — falls back to default", () => {
      const theme = makeTheme("layout", [
        {
          type: "select",
          id: "style",
          default: "rounded",
          options: [{ label: "Rounded", value: "rounded" }, { label: "Sharp", value: "sharp" }],
          value: '<script>alert(1)</script>',
        },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.layout[0].value, "rounded");
    });

    it("radio: rejects invalid value — falls back to default", () => {
      const theme = makeTheme("layout", [
        {
          type: "radio",
          id: "alignment",
          default: "left",
          options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }],
          value: "hacked",
        },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.layout[0].value, "left");
    });
  });

  // --- Font picker validation ---

  describe("font_picker validation", () => {
    it("passes valid font picker value", () => {
      const theme = makeTheme("typography", [
        {
          type: "font_picker",
          id: "heading_font",
          default: { stack: '"Inter", sans-serif', weight: 400 },
          value: { stack: '"Fraunces", serif', weight: 600 },
        },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.deepEqual(result.data.settings.global.typography[0].value, {
        stack: '"Fraunces", serif',
        weight: 600,
      });
    });

    it("strips <> from font stack", () => {
      const theme = makeTheme("typography", [
        {
          type: "font_picker",
          id: "heading_font",
          default: { stack: '"Inter", sans-serif', weight: 400 },
          value: { stack: '</style><script>alert(1)</script>', weight: 400 },
        },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.doesNotMatch(result.data.settings.global.typography[0].value.stack, /[<>]/);
    });

    it("rejects missing stack — falls back to default", () => {
      const theme = makeTheme("typography", [
        {
          type: "font_picker",
          id: "heading_font",
          default: { stack: '"Inter", sans-serif', weight: 400 },
          value: { weight: 600 },
        },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.deepEqual(result.data.settings.global.typography[0].value, {
        stack: '"Inter", sans-serif',
        weight: 400,
      });
    });

    it("rejects non-numeric weight — falls back to default", () => {
      const theme = makeTheme("typography", [
        {
          type: "font_picker",
          id: "heading_font",
          default: { stack: '"Inter", sans-serif', weight: 400 },
          value: { stack: '"Fraunces", serif', weight: "bold" },
        },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.deepEqual(result.data.settings.global.typography[0].value, {
        stack: '"Inter", sans-serif',
        weight: 400,
      });
    });
  });

  // --- Text/textarea with outputAsCssVar ---

  describe("text with outputAsCssVar", () => {
    it("passes plain text through", () => {
      const theme = makeTheme("custom", [
        { type: "text", id: "val", default: "", outputAsCssVar: true, value: "16px" },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.data.settings.global.custom[0].value, "16px");
    });

    it("strips style tag breakout from CSS var text", () => {
      const theme = makeTheme("custom", [
        {
          type: "text",
          id: "val",
          default: "",
          outputAsCssVar: true,
          value: '</style><script>alert(1)</script>',
        },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.doesNotMatch(result.data.settings.global.custom[0].value, /[<>]/);
    });

    it("strips CSS injection braces from CSS var text", () => {
      const theme = makeTheme("custom", [
        {
          type: "text",
          id: "val",
          default: "",
          outputAsCssVar: true,
          value: "red; } body { display: none; } :root {",
        },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.doesNotMatch(result.data.settings.global.custom[0].value, /[{}]/);
    });

    it("text without outputAsCssVar is left as-is", () => {
      const theme = makeTheme("custom", [
        { type: "text", id: "val", default: "", value: '<script>alert(1)</script>' },
      ]);
      const result = sanitizeThemeSettings(theme);
      // Left for LiquidJS autoescape to handle at render time
      assert.equal(result.data.settings.global.custom[0].value, '<script>alert(1)</script>');
    });
  });

  // --- Full theme data walkthrough ---

  describe("full theme data", () => {
    it("sanitizes a realistic theme structure without mutating input", () => {
      const original = {
        name: "Test Theme",
        version: "1.0.0",
        settings: {
          global: {
            colors: [
              { type: "header", id: "h1", label: "Colors" },
              { type: "color", id: "bg", default: "#ffffff", outputAsCssVar: true, value: "#DE1877" },
              { type: "color", id: "bad", default: "#000000", outputAsCssVar: true, value: "not-a-color" },
            ],
            typography: [
              {
                type: "font_picker",
                id: "body_font",
                default: { stack: '"Inter", sans-serif', weight: 400 },
                value: { stack: '"Fraunces", serif', weight: 600 },
              },
            ],
            advanced: [
              { type: "code", id: "custom_css", default: "", value: "body { color: red; }" },
            ],
          },
        },
      };

      const result = sanitizeThemeSettings(original);

      // Does not mutate original
      assert.equal(original.settings.global.colors[2].value, "not-a-color");

      // Preserves valid color
      assert.equal(result.data.settings.global.colors[1].value, "#DE1877");
      // Invalid color falls back to default
      assert.equal(result.data.settings.global.colors[2].value, "#000000");
      // Font picker preserved
      assert.deepEqual(result.data.settings.global.typography[0].value, {
        stack: '"Fraunces", serif',
        weight: 600,
      });
      // Code left raw
      assert.equal(result.data.settings.global.advanced[0].value, "body { color: red; }");
      // Non-settings fields preserved
      assert.equal(result.data.name, "Test Theme");
      assert.equal(result.data.version, "1.0.0");
      // Warnings reported for invalid color
      assert.ok(result.warnings.length > 0);
    });

    it("handles missing settings.global gracefully", () => {
      const theme = { name: "Empty" };
      const result = sanitizeThemeSettings(theme);
      assert.deepEqual(result.data, { name: "Empty" });
      assert.deepEqual(result.warnings, []);
    });

    it("handles null input", () => {
      const result = sanitizeThemeSettings(null);
      assert.equal(result.data, null);
      assert.deepEqual(result.warnings, []);
    });

    it("skips header type items", () => {
      const theme = makeTheme("colors", [
        { type: "header", id: "h1", label: "Colors" },
      ]);
      const result = sanitizeThemeSettings(theme);
      // Header items don't have value, should not throw
      assert.equal(result.data.settings.global.colors[0].type, "header");
    });

    it("skips items without value", () => {
      const theme = makeTheme("colors", [
        { type: "color", id: "bg", default: "#ffffff" },
      ]);
      const result = sanitizeThemeSettings(theme);
      // No value set — should remain undefined
      assert.equal(result.data.settings.global.colors[0].value, undefined);
    });

    it("returns warnings for corrected values", () => {
      const theme = makeTheme("colors", [
        { type: "color", id: "bg", label: "Background", default: "#ffffff", value: "<script>alert(1)</script>" },
        { type: "color", id: "fg", label: "Text", default: "#000000", value: "#DE1877" },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.equal(result.warnings.length, 1);
      assert.match(result.warnings[0], /Background/);
    });

    it("returns empty warnings when all values are valid", () => {
      const theme = makeTheme("colors", [
        { type: "color", id: "bg", default: "#ffffff", value: "#DE1877" },
      ]);
      const result = sanitizeThemeSettings(theme);
      assert.deepEqual(result.warnings, []);
    });
  });
});
