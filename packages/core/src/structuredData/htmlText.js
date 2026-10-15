// Elements that break the flow of text: their boundaries become line breaks,
// while inline elements (strong, a, span…) join their text to the neighbours.
const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "br", "dd", "div", "dl", "dt", "figcaption", "figure",
  "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre",
  "section", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
]);

const SKIPPED_CONTENT_TAGS = new Set(["script", "style", "template", "textarea", "title"]);

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

// A run of source text as it renders: entities decoded, and any whitespace —
// newlines included — a single space. Only block boundaries break lines.
function textRun(source) {
  return source
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
      if (entity[0] === "#") {
        const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, " ");
}

// Index just past the `>` that closes the tag starting at `start`, skipping any
// `>` inside a quoted attribute value.
function tagEnd(html, start) {
  let quote = null;
  for (let index = start; index < html.length; index++) {
    const char = html[index];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      return index + 1;
    }
  }
  return html.length;
}

/**
 * The visible text of an HTML fragment: tags removed (quoted attribute values
 * included), comments and script/style content dropped, entities decoded,
 * block boundaries and `<br>` as line breaks, inline markup joining its text to
 * its neighbours. Each line has its whitespace collapsed; empty lines are dropped.
 * @param {string} html
 * @returns {string}
 */
export function htmlToText(html) {
  if (typeof html !== "string") return "";
  let text = "";
  let index = 0;

  while (index < html.length) {
    const open = html.indexOf("<", index);
    if (open === -1) {
      text += textRun(html.slice(index));
      break;
    }
    text += textRun(html.slice(index, open));

    if (html.startsWith("<!--", open)) {
      const close = html.indexOf("-->", open + 4);
      index = close === -1 ? html.length : close + 3;
      continue;
    }

    const closing = html[open + 1] === "/";
    const nameStart = open + (closing ? 2 : 1);
    const name = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(html.slice(nameStart, nameStart + 32))?.[0].toLowerCase();
    if (!name && html[nameStart] !== "!" && html[nameStart] !== "?") {
      text += "<";
      index = open + 1;
      continue;
    }

    index = tagEnd(html, nameStart);
    if (!name) continue;

    if (!closing && SKIPPED_CONTENT_TAGS.has(name)) {
      const closeTag = html.toLowerCase().indexOf(`</${name}`, index);
      index = closeTag === -1 ? html.length : tagEnd(html, closeTag + 2);
      continue;
    }

    if (BLOCK_TAGS.has(name)) text += "\n";
  }

  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}
