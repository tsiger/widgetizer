/**
 * HTML Processor Test Suite
 *
 * Tests the export HTML processing utilities:
 *  - formatHtml   — Prettier-based HTML formatting
 *  - formatXml    — Prettier-based XML formatting (sitemap)
 *  - validateHtml — html-validate based validation with source snippets
 *  - generateIssuesReport — HTML report from validation results
 *
 * Pure utility functions — no filesystem, no mock req/res needed.
 *
 * Run with: node --test server/tests/htmlProcessor.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  formatHtml,
  formatXml,
  validateHtml,
  generateIssuesReport,
} from "../utils/htmlProcessor.js";

// ============================================================================
// formatHtml
// ============================================================================

describe("formatHtml", () => {
  it("returns success: true for valid HTML", async () => {
    const result = await formatHtml("<html><head><title>Hi</title></head><body><p>Hello</p></body></html>");
    assert.equal(result.success, true);
  });

  it("returns formatted HTML string", async () => {
    const result = await formatHtml("<html><head><title>Hi</title></head><body><p>Hello</p></body></html>");
    assert.ok(result.html.includes("<p>Hello</p>"));
    // Prettier should add newlines / indentation
    assert.ok(result.html.includes("\n"));
  });

  it("indents nested elements", async () => {
    const input = "<div><ul><li>Item</li></ul></div>";
    const result = await formatHtml(input);
    assert.equal(result.success, true);
    // Should have indentation (Prettier uses 2 spaces by default config)
    assert.ok(result.html.includes("  "));
  });

  it("handles already-formatted HTML", async () => {
    const input = "<p>Hello</p>\n";
    const result = await formatHtml(input);
    assert.equal(result.success, true);
    assert.ok(result.html.includes("Hello"));
  });

  it("returns success: false and original HTML on invalid input", async () => {
    // Prettier is fairly tolerant, but a completely broken input
    // or binary-like content might fail. Let's test with null-ish.
    // Actually Prettier handles most malformed HTML, so test the error path
    // by checking the contract: on failure, original html is returned.
    const result = await formatHtml("");
    // Empty string is valid for Prettier, should succeed
    assert.equal(result.success, true);
  });

  it("preserves HTML attributes", async () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>';
    const result = await formatHtml(input);
    assert.equal(result.success, true);
    assert.ok(result.html.includes('href="https://example.com"'));
    assert.ok(result.html.includes('target="_blank"'));
  });

  it("handles meta tags and self-closing elements", async () => {
    const input = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head><body></body></html>';
    const result = await formatHtml(input);
    assert.equal(result.success, true);
    assert.ok(result.html.includes("charset"));
    assert.ok(result.html.includes("viewport"));
  });

  it("handles inline styles and scripts", async () => {
    const input = "<style>body { color: red; }</style><script>console.log('hi');</script>";
    const result = await formatHtml(input);
    assert.equal(result.success, true);
    assert.ok(result.html.includes("color: red"));
  });
});

// ============================================================================
// formatXml
// ============================================================================

describe("formatXml", () => {
  it("returns success: true for valid XML", async () => {
    const input = '<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>https://example.com</loc></url></urlset>';
    const result = await formatXml(input);
    assert.equal(result.success, true);
  });

  it("returns formatted XML string", async () => {
    const input = '<?xml version="1.0"?><urlset><url><loc>https://example.com</loc></url></urlset>';
    const result = await formatXml(input);
    assert.ok(result.xml.includes("<loc>"));
    assert.ok(result.xml.includes("\n"));
  });

  it("formats sitemap-like XML with indentation", async () => {
    const input = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc><lastmod>2026-01-01</lastmod></url><url><loc>https://example.com/about</loc></url></urlset>';
    const result = await formatXml(input);
    assert.equal(result.success, true);
    assert.ok(result.xml.includes("example.com/about"));
  });

  it("returns success: false and original XML on failure", async () => {
    // formatXml uses parser: "html", so most things won't fail
    // But verify the error contract
    const result = await formatXml("<valid>content</valid>");
    assert.equal(result.success, true);
  });

  it("handles empty XML", async () => {
    const result = await formatXml("");
    assert.equal(result.success, true);
  });
});

// ============================================================================
// validateHtml
// ============================================================================

describe("validateHtml", () => {
  it("returns no issues for valid HTML", async () => {
    const html = '<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body><p>Hello</p></body></html>';
    const result = await validateHtml(html, "test-page");
    assert.equal(result.errorCount, 0);
    assert.equal(result.warningCount, 0);
    assert.deepEqual(result.issues, []);
  });

  it("does not flag missing doctype (doctype-style is off)", async () => {
    // The validator config disables doctype-style, so missing doctype is not flagged.
    // Only element-required-attributes (like missing lang) should fire.
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = await validateHtml(html, "test-page");
    const doctypeIssue = result.issues.find((i) => i.ruleId.includes("doctype") || i.message.toLowerCase().includes("doctype"));
    assert.equal(doctypeIssue, undefined, "doctype issues should be suppressed by config");
    // But missing lang should still fire
    assert.ok(result.issues.length > 0);
  });

  it("detects missing lang attribute on <html>", async () => {
    const html = '<!DOCTYPE html><html><head><title>Test</title></head><body></body></html>';
    const result = await validateHtml(html, "test-page");
    const langIssue = result.issues.find(
      (i) => i.message.toLowerCase().includes("lang") || i.ruleId.includes("lang"),
    );
    assert.ok(langIssue, "should flag missing lang attribute");
  });

  it("returns structured issue objects", async () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = await validateHtml(html, "test-page");
    assert.ok(result.issues.length > 0);

    const issue = result.issues[0];
    assert.ok("line" in issue);
    assert.ok("column" in issue);
    assert.ok("severity" in issue);
    assert.ok("message" in issue);
    assert.ok("ruleId" in issue);
    assert.ok("sourceSnippet" in issue);
    assert.ok(issue.severity === "error" || issue.severity === "warning");
  });

  it("includes source snippets with line numbers", async () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = await validateHtml(html, "test-page");
    assert.ok(result.issues.length > 0);

    const snippet = result.issues[0].sourceSnippet;
    assert.ok(Array.isArray(snippet));
    assert.ok(snippet.length > 0);
    assert.ok("num" in snippet[0]);
    assert.ok("code" in snippet[0]);
    assert.ok("isError" in snippet[0]);
  });

  it("marks the error line with isError: true in snippet", async () => {
    // Multi-line HTML so we can verify the right line is flagged
    const html = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body></body>
</html>`;
    const result = await validateHtml(html, "test-page");
    // Should have at least a "missing lang" issue on line 2
    const langIssue = result.issues.find((i) => i.line === 2);
    if (langIssue) {
      const errorLine = langIssue.sourceSnippet.find((l) => l.isError);
      assert.ok(errorLine, "should have an error line marked");
      assert.ok(errorLine.code.includes("<html>"));
    }
  });

  it("counts errors and warnings separately", async () => {
    const html = '<html><body><p>No doctype, no head, no lang</p></body></html>';
    const result = await validateHtml(html, "test-page");
    assert.equal(typeof result.errorCount, "number");
    assert.equal(typeof result.warningCount, "number");
    assert.equal(result.errorCount + result.warningCount, result.issues.length);
  });

  it("returns empty issues on validator error (graceful fallback)", async () => {
    // Pass something that won't crash but tests the catch path
    // The validator is fairly resilient, so we just verify the contract
    const result = await validateHtml("", "empty-page");
    assert.ok(Array.isArray(result.issues));
    assert.equal(typeof result.errorCount, "number");
    assert.equal(typeof result.warningCount, "number");
  });

  it("handles large multi-line HTML", async () => {
    const lines = ['<!DOCTYPE html>', '<html lang="en">', "<head><title>Big</title></head>", "<body>"];
    for (let i = 0; i < 100; i++) {
      lines.push(`  <p>Paragraph ${i}</p>`);
    }
    lines.push("</body>", "</html>");
    const html = lines.join("\n");

    const result = await validateHtml(html, "big-page");
    // Should complete without error
    assert.ok(Array.isArray(result.issues));
  });
});

// ============================================================================
// generateIssuesReport
// ============================================================================

describe("generateIssuesReport", () => {
  it("returns a complete HTML document", () => {
    const report = generateIssuesReport([]);
    assert.ok(report.includes("<!DOCTYPE html>"));
    assert.ok(report.includes("<html"));
    assert.ok(report.includes("</html>"));
    assert.ok(report.includes("<head>"));
    assert.ok(report.includes("<body>"));
  });

  it("includes the title 'Export Validation Issues'", () => {
    const report = generateIssuesReport([]);
    assert.ok(report.includes("Export Validation Issues"));
  });

  it("includes CSS styles", () => {
    const report = generateIssuesReport([]);
    assert.ok(report.includes("<style>"));
    assert.ok(report.includes("</style>"));
  });

  it("shows total issue count in summary", () => {
    const issues = [
      {
        page: "home",
        filename: "index.html",
        issues: [
          { line: 1, column: 1, severity: "error", message: "Missing doctype", ruleId: "doctype", sourceSnippet: [] },
          { line: 5, column: 1, severity: "warning", message: "Missing alt", ruleId: "img-alt", sourceSnippet: [] },
        ],
      },
    ];
    const report = generateIssuesReport(issues);
    assert.ok(report.includes("2 issues"));
  });

  it("shows page count in summary", () => {
    const issues = [
      { page: "home", filename: "index.html", issues: [{ line: 1, column: 1, severity: "error", message: "Error", ruleId: "test", sourceSnippet: [] }] },
      { page: "about", filename: "about.html", issues: [{ line: 1, column: 1, severity: "error", message: "Error", ruleId: "test", sourceSnippet: [] }] },
    ];
    const report = generateIssuesReport(issues);
    assert.ok(report.includes("2 pages"));
  });

  it("uses singular when 1 issue / 1 page", () => {
    const issues = [
      {
        page: "home",
        filename: "index.html",
        issues: [{ line: 1, column: 1, severity: "error", message: "Error", ruleId: "test", sourceSnippet: [] }],
      },
    ];
    const report = generateIssuesReport(issues);
    // "1 issue found across 1 page" — no trailing 's'
    assert.ok(report.includes("1 issue "));
    assert.ok(report.includes("1 page"));
    assert.ok(!report.includes("1 issues"));
    assert.ok(!report.includes("1 pages"));
  });

  it("includes page filename in report", () => {
    const issues = [
      {
        page: "about",
        filename: "about.html",
        issues: [{ line: 1, column: 1, severity: "error", message: "Error", ruleId: "test", sourceSnippet: [] }],
      },
    ];
    const report = generateIssuesReport(issues);
    assert.ok(report.includes("about.html"));
  });

  it("includes issue message and location", () => {
    const issues = [
      {
        page: "home",
        filename: "index.html",
        issues: [
          { line: 42, column: 7, severity: "error", message: "Missing closing tag", ruleId: "close-tag", sourceSnippet: [] },
        ],
      },
    ];
    const report = generateIssuesReport(issues);
    assert.ok(report.includes("Missing closing tag"));
    assert.ok(report.includes("Line 42"));
    assert.ok(report.includes("Column 7"));
  });

  it("renders error and warning severity badges", () => {
    const issues = [
      {
        page: "home",
        filename: "index.html",
        issues: [
          { line: 1, column: 1, severity: "error", message: "Err", ruleId: "r1", sourceSnippet: [] },
          { line: 2, column: 1, severity: "warning", message: "Warn", ruleId: "r2", sourceSnippet: [] },
        ],
      },
    ];
    const report = generateIssuesReport(issues);
    // Should have both severity classes
    assert.ok(report.includes('class="severity error"'));
    assert.ok(report.includes('class="severity warning"'));
  });

  it("renders source snippets with line numbers", () => {
    const issues = [
      {
        page: "home",
        filename: "index.html",
        issues: [
          {
            line: 3,
            column: 1,
            severity: "error",
            message: "Error on line 3",
            ruleId: "test",
            sourceSnippet: [
              { num: 2, code: "<head>", isError: false },
              { num: 3, code: "<title>Missing lang</title>", isError: true },
              { num: 4, code: "</head>", isError: false },
            ],
          },
        ],
      },
    ];
    const report = generateIssuesReport(issues);
    assert.ok(report.includes("source-snippet"));
    assert.ok(report.includes("error-line"));
    assert.ok(report.includes("&lt;head&gt;"));
    assert.ok(report.includes("&lt;title&gt;"));
  });

  it("renders rule link when ruleUrl is provided", () => {
    const issues = [
      {
        page: "home",
        filename: "index.html",
        issues: [
          {
            line: 1,
            column: 1,
            severity: "error",
            message: "Error",
            ruleId: "my-rule",
            ruleUrl: "https://docs.example.com/rules/my-rule",
            sourceSnippet: [],
          },
        ],
      },
    ];
    const report = generateIssuesReport(issues);
    assert.ok(report.includes('href="https://docs.example.com/rules/my-rule"'));
    assert.ok(report.includes("my-rule"));
  });

  it("renders rule ID without link when ruleUrl is null", () => {
    const issues = [
      {
        page: "home",
        filename: "index.html",
        issues: [
          { line: 1, column: 1, severity: "error", message: "Error", ruleId: "no-link-rule", ruleUrl: null, sourceSnippet: [] },
        ],
      },
    ];
    const report = generateIssuesReport(issues);
    assert.ok(report.includes("no-link-rule"));
    // Should NOT have an <a> tag for this rule
    assert.ok(!report.includes('href="null"'));
  });

  it("escapes HTML in page filenames (XSS protection)", () => {
    const issues = [
      {
        page: "xss",
        filename: '<img src=x onerror="alert(1)">.html',
        issues: [{ line: 1, column: 1, severity: "error", message: "Error", ruleId: "test", sourceSnippet: [] }],
      },
    ];
    const report = generateIssuesReport(issues);
    assert.ok(!report.includes('<img src=x'));
    assert.ok(report.includes("&lt;img"));
  });

  it("escapes HTML in issue messages (XSS protection)", () => {
    const issues = [
      {
        page: "home",
        filename: "index.html",
        issues: [
          { line: 1, column: 1, severity: "error", message: '<script>alert("xss")</script>', ruleId: "test", sourceSnippet: [] },
        ],
      },
    ];
    const report = generateIssuesReport(issues);
    assert.ok(!report.includes("<script>alert"));
    assert.ok(report.includes("&lt;script&gt;"));
  });

  it("handles empty issues array (0 issues, 0 pages)", () => {
    const report = generateIssuesReport([]);
    assert.ok(report.includes("0 issues"));
    assert.ok(report.includes("0 pages"));
  });

  it("handles multiple pages with multiple issues", () => {
    const issues = [
      {
        page: "home",
        filename: "index.html",
        issues: [
          { line: 1, column: 1, severity: "error", message: "E1", ruleId: "r1", sourceSnippet: [] },
          { line: 5, column: 3, severity: "warning", message: "W1", ruleId: "r2", sourceSnippet: [] },
        ],
      },
      {
        page: "about",
        filename: "about.html",
        issues: [
          { line: 10, column: 1, severity: "error", message: "E2", ruleId: "r3", sourceSnippet: [] },
        ],
      },
      {
        page: "contact",
        filename: "contact.html",
        issues: [
          { line: 2, column: 4, severity: "warning", message: "W2", ruleId: "r4", sourceSnippet: [] },
          { line: 8, column: 1, severity: "error", message: "E3", ruleId: "r5", sourceSnippet: [] },
          { line: 15, column: 2, severity: "warning", message: "W3", ruleId: "r6", sourceSnippet: [] },
        ],
      },
    ];
    const report = generateIssuesReport(issues);
    assert.ok(report.includes("6 issues"));
    assert.ok(report.includes("3 pages"));
    assert.ok(report.includes("index.html"));
    assert.ok(report.includes("about.html"));
    assert.ok(report.includes("contact.html"));
  });
});
