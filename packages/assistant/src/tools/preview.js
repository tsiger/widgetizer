import TurndownService from "turndown";
import { toolError } from "../errors.js";
import { languageArg, listAvailable, nameArg, partArg, textPart } from "./shared.js";

const MAX_LINKS = 200;
const COVERAGE =
  "Text only: layout, colours, images and the mobile view were not checked, and forms were not tested.";

// Absolute file paths in error text: drive paths either way round, UNC shares,
// and POSIX paths of two segments or more.
const LOCAL_PATH = /(?:[A-Za-z]:[\\/]|\\\\|\/(?=[^\s"'<>/]+\/))[^\s"'<>]+/g;

function decode(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

const safeMessage = (text) => decode(text).replace(LOCAL_PATH, "[path]").trim().slice(0, 300);

/** Pull the render engine's in-page error boxes out, as short, path-free diagnostics. */
export function extractProblems(html) {
  const problems = [];
  const cleaned = html.replace(/<div class="widget-error"([^>]*)>([\s\S]*?)<\/div>/g, (_match, attrs, body) => {
    const section = /data-widget-id="([^"]*)"/.exec(attrs)?.[1] ?? null;
    const type = /data-widget-type="([^"]*)"/.exec(attrs)?.[1] ?? null;
    const pre = /<pre[^>]*>([\s\S]*?)<\/pre>/.exec(body)?.[1];
    const message = pre ? pre.split("\n")[0] : body.replace(/<[^>]+>/g, " ");
    problems.push({ section: section && decode(section), type: type && decode(type), message: safeMessage(message) });
    return "";
  });
  const withoutPageError = cleaned.replace(/<h1>Error rendering page<\/h1>\s*<pre>([\s\S]*?)<\/pre>/, (_match, text) => {
    problems.push({ section: null, type: "page", message: safeMessage(text) });
    return "";
  });
  return { cleaned: withoutPageError, problems };
}

function createConverter() {
  const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
  turndown.remove(["style", "script", "noscript", "template", "svg", "iframe"]);
  // Keep what a visitor would read on a form: its fields and buttons.
  turndown.addRule("formFields", {
    filter: ["input", "textarea", "select"],
    replacement: (_content, node) => {
      const type = node.getAttribute("type");
      if (type === "hidden" || type === "submit") return "";
      const name = node.getAttribute("placeholder") || node.getAttribute("aria-label") || node.getAttribute("name") || "";
      return ` [${node.nodeName.toLowerCase()} field${name ? `: ${name}` : ""}] `;
    },
  });
  // Images by what a visitor reads about them; their addresses are internal.
  turndown.addRule("images", {
    filter: "img",
    replacement: (_content, node) => {
      if (!node.hasAttribute("alt")) return "[image without alt text]";
      const alt = node.getAttribute("alt").trim();
      return alt ? `[image: ${alt}]` : "[decorative image]";
    },
  });
  // Icon-only links (social icons) are named by their accessible label.
  turndown.addRule("labelledLinks", {
    filter: (node) => node.nodeName === "A" && !node.textContent.trim() && !node.querySelector("img"),
    replacement: (_content, node) => {
      const name = node.getAttribute("aria-label") || node.getAttribute("title") || "unnamed link";
      return `[${name}](${node.getAttribute("href") || ""})`;
    },
  });
  turndown.addRule("buttons", {
    filter: "button",
    replacement: (content) => (content.trim() ? ` [button: ${content.trim()}] ` : ""),
  });
  return turndown;
}

function linksIn(html) {
  const links = new Map();
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const href = decode(match[1]);
    const text = decode(match[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const key = `${href}|${text}`;
    if (!links.has(key)) links.set(key, { text, href });
    if (links.size >= MAX_LINKS) break;
  }
  return [...links.values()];
}

const ALT_ATTRIBUTE = /\salt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/** Images by their alt text: described, deliberately blank (decorative), or missing. */
export function imagesIn(html) {
  const counts = { total: 0, described: 0, decorative: 0, missingAlt: 0 };
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    counts.total += 1;
    const match = ALT_ATTRIBUTE.exec(tag);
    if (!match) counts.missingAlt += 1;
    else if ((match[1] ?? match[2] ?? match[3] ?? "").trim()) counts.described += 1;
    else counts.decorative += 1;
  }
  return counts;
}

export const previewPageTool = {
  name: "preview_page",
  title: "Preview a page",
  description:
    "Renders a saved page (or a collection item's page) the way visitors get it and returns it as readable text: headings, text, links, form fields and buttons, plus any sections that failed to render. It can't show how the page looks. Long pages come in parts.",
  inputSchema: {
    type: "object",
    properties: {
      page: nameArg("A page slug. Use this, or collection + item."),
      collection: { type: "string", pattern: "^[a-z0-9-]+$", maxLength: 200, description: "A collection type." },
      item: { type: "string", pattern: "^[a-z0-9-]+$", maxLength: 200, description: "An item slug in that collection." },
      language: languageArg,
      part: partArg,
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx) {
    const { page: slug, collection, item, language, part = 1 } = ctx.args;
    if (Boolean(slug) === Boolean(collection && item) || (collection && !item) || (item && !collection)) {
      throw toolError("ASSISTANT_INVALID_ARGUMENTS", "Give either page, or both collection and item.");
    }
    const { scope, project } = await ctx.openSite();
    const lang = ctx.language(language);

    let html;
    if (slug) {
      html = await ctx.reader.renderPage(scope, project, slug, lang);
      if (html == null) {
        const available = await ctx.reader.listPageSlugs(scope, lang);
        throw toolError("PAGE_NOT_FOUND", `There's no page "${slug}" in ${lang.language}. Pages: ${listAvailable(available)}.`);
      }
    } else {
      html = await ctx.reader.renderItem(scope, project, collection, item, lang);
    }

    const { cleaned, problems } = extractProblems(html);
    const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(cleaned)?.[1] ?? cleaned;
    const text = createConverter().turndown(body).replace(/\n{3,}/g, "\n\n").trim();
    const title = /<title>([\s\S]*?)<\/title>/i.exec(cleaned)?.[1];
    const description = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(cleaned)?.[1];

    return {
      data: {
        ...ctx.about(lang),
        ...(slug ? { page: slug } : { collection, item }),
        title: title ? decode(title).trim() : null,
        metaDescription: description ? decode(description) : null,
        problems,
        images: imagesIn(body),
        links: part === 1 ? linksIn(body) : undefined,
        content: textPart(text, part),
        coverage: COVERAGE,
      },
    };
  },
};
