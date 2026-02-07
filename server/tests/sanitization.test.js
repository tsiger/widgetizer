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

import { sanitizeRichText, sanitizeWidgetData } from "../services/sanitizationService.js";

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

  it("strips <img> tags (not in allowed list)", () => {
    const result = sanitizeRichText('<img src="x" onerror="alert(1)">');
    assert.doesNotMatch(result, /<img/i);
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

  it("strips <h1>-<h6> tags (not in allowed list)", () => {
    const result = sanitizeRichText("<h1>Title</h1><h3>Subtitle</h3>");
    assert.doesNotMatch(result, /<h[1-6]/i);
    assert.ok(result.includes("Title"));
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
    const input = "<ul><li><strong>Bold item</strong> with <a href=\"/about\">link</a></li></ul>";
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
        heading: '<img src=x onerror=alert(1)>',
      },
    };
    sanitizeWidgetData(data, schema);
    // text fields are NOT sanitized here — LiquidJS autoescape handles them
    assert.equal(data.settings.heading, '<img src=x onerror=alert(1)>');
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
            content: '<p>Safe</p><script>evil()</script>',
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
        { id: "noType" },               // missing type
        { type: "text" },               // missing id
        {},                             // both missing
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
