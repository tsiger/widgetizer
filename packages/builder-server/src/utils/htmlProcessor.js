/**
 * HTML Processing Utilities for Export
 *
 * Handles HTML formatting (Prettier), validation (html-validate),
 * and issues report generation for the export process.
 */

import prettier from "prettier";
import { HtmlValidate } from "html-validate";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Prettier options for HTML formatting
 */
const PRETTIER_OPTIONS = {
  parser: "html",
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  htmlWhitespaceSensitivity: "css",
  singleAttributePerLine: false,
  bracketSameLine: false,
};

/**
 * HTML Validator instance with relaxed rules suitable for widget-based exports
 */
const htmlValidator = new HtmlValidate({
  extends: ["html-validate:recommended"],
  rules: {
    // Relaxed rules that conflict with Prettier's output or widget patterns
    "no-inline-style": "off",
    "no-trailing-whitespace": "off",
    "attribute-boolean-style": "off",
    "doctype-style": "off", // Prettier outputs lowercase <!doctype html>
    "void-style": "off", // Prettier outputs self-closing <meta />
    "element-permitted-content": "off", // Widgets use <style> inside header/sections
  },
});

// ============================================================================
// HTML Formatting
// ============================================================================

/**
 * Formats HTML using Prettier
 * @param {string} html - Raw HTML string
 * @returns {Promise<{html: string, success: boolean, error?: string}>}
 */
export async function formatHtml(html) {
  try {
    const formattedHtml = await prettier.format(html, PRETTIER_OPTIONS);
    return { html: formattedHtml, success: true };
  } catch (error) {
    return { html, success: false, error: error.message };
  }
}

/**
 * Formats XML using Prettier (for sitemap.xml, etc.)
 * @param {string} xml - Raw XML string
 * @returns {Promise<{xml: string, success: boolean, error?: string}>}
 */
export async function formatXml(xml) {
  try {
    const formattedXml = await prettier.format(xml, { parser: "html" });
    return { xml: formattedXml, success: true };
  } catch (error) {
    return { xml, success: false, error: error.message };
  }
}

// ============================================================================
// HTML Validation
// ============================================================================

/**
 * Validates HTML and returns structured issues with source snippets
 * @param {string} html - HTML string to validate
 * @param {string} pageId - Page identifier for the report
 * @returns {Promise<{issues: Array, errorCount: number, warningCount: number}>}
 */
export async function validateHtml(html, pageId) {
  try {
    const report = await htmlValidator.validateString(html);

    if (!report || !Array.isArray(report.results) || report.results.length === 0) {
      return { issues: [], errorCount: 0, warningCount: 0 };
    }

    const messages = report.results[0].messages || [];
    if (messages.length === 0) {
      return { issues: [], errorCount: 0, warningCount: 0 };
    }

    // Split HTML into lines for source snippets
    const htmlLines = html.split("\n");

    const issues = messages.map((msg) => {
      const lineNum = msg.line || 0;
      // Get surrounding lines for context (2 before, 2 after)
      const startLine = Math.max(0, lineNum - 3);
      const endLine = Math.min(htmlLines.length - 1, lineNum + 1);
      const sourceSnippet = [];

      for (let i = startLine; i <= endLine; i++) {
        sourceSnippet.push({
          num: i + 1,
          code: htmlLines[i] || "",
          isError: i === lineNum - 1,
        });
      }

      return {
        line: lineNum,
        column: msg.column || 0,
        severity: msg.severity === 2 ? "error" : "warning",
        message: msg.message || "Unknown issue",
        ruleId: msg.ruleId || "unknown",
        ruleUrl: msg.ruleUrl || null,
        sourceSnippet,
      };
    });

    return {
      issues,
      errorCount: issues.filter((i) => i.severity === "error").length,
      warningCount: issues.filter((i) => i.severity === "warning").length,
    };
  } catch (error) {
    console.warn(`Could not validate HTML for ${pageId}: ${error.message}`);
    return { issues: [], errorCount: 0, warningCount: 0 };
  }
}

// ============================================================================
// Issues Report Generation
// ============================================================================

/**
 * Escapes HTML special characters to prevent XSS in the report
 * @param {string} str - String to escape
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Generates an HTML issues report from validation results
 * @param {Array<{page: string, filename: string, issues: Array}>} validationIssues
 * @returns {string} Complete HTML document for the issues report
 */
export function generateIssuesReport(validationIssues) {
  const totalIssues = validationIssues.reduce((sum, page) => sum + page.issues.length, 0);
  const pageCount = validationIssues.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Export Validation Issues</title>
  ${generateReportStyles()}
</head>
<body>
  <h1>⚠️ Export Validation Issues</h1>
  <p class="summary">${totalIssues} issue${totalIssues !== 1 ? "s" : ""} found across ${pageCount} page${pageCount !== 1 ? "s" : ""}</p>
  ${validationIssues.map((page) => generatePageSection(page)).join("")}
</body>
</html>`;
}

/**
 * Generates CSS styles for the issues report
 * @returns {string}
 */
function generateReportStyles() {
  return `<style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
      background: #1a1a2e;
      color: #eee;
    }
    h1 { color: #ff6b6b; margin-bottom: 0.5rem; }
    .summary { color: #aaa; margin-bottom: 2rem; }
    .page {
      background: #16213e;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .page-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #4ecdc4;
      margin-bottom: 1rem;
    }
    .issue {
      padding: 0.75rem;
      border-left: 3px solid #ff6b6b;
      background: #0f0f23;
      margin-bottom: 1rem;
      border-radius: 0 4px 4px 0;
    }
    .issue.warning { border-left-color: #feca57; }
    .issue-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .issue-location {
      font-family: monospace;
      font-size: 0.85rem;
      color: #888;
    }
    .issue-message { margin-top: 0.5rem; font-weight: 500; }
    .issue-rule {
      font-size: 0.8rem;
      color: #888;
      font-family: monospace;
      margin-top: 0.25rem;
    }
    .issue-rule a { color: #4ecdc4; text-decoration: none; }
    .issue-rule a:hover { text-decoration: underline; }
    .severity {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 600;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
    }
    .severity.error { background: #ff6b6b33; color: #ff6b6b; }
    .severity.warning { background: #feca5733; color: #feca57; }
    .source-snippet {
      margin-top: 0.75rem;
      background: #0a0a1a;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'SF Mono', Monaco, 'Consolas', monospace;
      font-size: 0.8rem;
    }
    .source-line { display: flex; line-height: 1.6; }
    .source-line.error-line { background: #ff6b6b22; }
    .line-num {
      padding: 0 0.75rem;
      color: #555;
      min-width: 3.5rem;
      text-align: right;
      user-select: none;
      border-right: 1px solid #333;
    }
    .line-code {
      padding: 0 0.75rem;
      white-space: pre;
      color: #ccc;
      overflow-x: auto;
    }
    .error-line .line-num {
      color: #ff6b6b;
      background: #ff6b6b11;
    }
  </style>`;
}

/**
 * Generates HTML for a single page's issues
 * @param {{page: string, filename: string, issues: Array}} pageData
 * @returns {string}
 */
function generatePageSection(pageData) {
  return `
  <div class="page">
    <div class="page-title">📄 ${escapeHtml(pageData.filename)}</div>
    ${pageData.issues.map((issue) => generateIssueBlock(issue)).join("")}
  </div>`;
}

/**
 * Generates HTML for a single issue
 * @param {Object} issue
 * @returns {string}
 */
function generateIssueBlock(issue) {
  const ruleLink = issue.ruleUrl
    ? `<a href="${escapeHtml(issue.ruleUrl)}" target="_blank">${escapeHtml(issue.ruleId)}</a>`
    : escapeHtml(issue.ruleId);

  const sourceSnippetHtml =
    issue.sourceSnippet && issue.sourceSnippet.length > 0
      ? `<div class="source-snippet">${issue.sourceSnippet.map((line) => generateSourceLine(line)).join("")}</div>`
      : "";

  return `
    <div class="issue ${issue.severity}">
      <div class="issue-header">
        <span class="severity ${issue.severity}">${issue.severity}</span>
        <span class="issue-location">Line ${issue.line}, Column ${issue.column}</span>
      </div>
      <div class="issue-message">${escapeHtml(issue.message)}</div>
      <div class="issue-rule">${ruleLink}</div>
      ${sourceSnippetHtml}
    </div>`;
}

/**
 * Generates HTML for a single source code line
 * @param {{num: number, code: string, isError: boolean}} line
 * @returns {string}
 */
function generateSourceLine(line) {
  const lineClass = line.isError ? "source-line error-line" : "source-line";
  return `<div class="${lineClass}"><span class="line-num">${line.num}</span><code class="line-code">${escapeHtml(line.code)}</code></div>`;
}
