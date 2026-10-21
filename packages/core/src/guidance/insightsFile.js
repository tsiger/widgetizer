// Guidance files are Markdown a theme ships for people and AI assistants:
// `insights.md` at the theme root (how to compose pages), in every widget folder
// (one section type) and in every preset folder (who the preset suits). The app
// never renders them; the assistant serves them in pieces and the theme checker
// validates their structure, so both read them through this one parser.

export const GUIDANCE_FILE = "insights.md";

/** Second-level headings of a widget's guidance, in the order they are served. */
export const WIDGET_GUIDE_HEADINGS = ["Purpose", "When to use", "Pitfalls", "Recipes"];

/** Second-level headings of a preset's guidance. */
export const PRESET_GUIDE_HEADINGS = ["Suits", "Look", "Adapting"];

/** Info string of the fenced block that holds a recipe's example. */
export const RECIPE_FENCE = "json";

const FENCE_RE = /^(`{3,}|~{3,})(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

const normalizeHeading = (heading) => heading.trim().toLowerCase().replace(/\s+/g, " ");
const toLines = (markdown) => String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");

/** A fence line closes the open fence when it uses the same character, is at least as long, and has nothing after it. */
const closesFence = (match, open) => match[1][0] === open[0] && match[1].length >= open.length && match[2].trim() === "";

/**
 * Split Markdown into its title (the first `#`), the text before the first `##`,
 * and the `##` sections. Fenced code is never read as headings.
 * @param {string} markdown
 * @returns {{ title: string|null, intro: string, sections: Array<{ heading: string, body: string, line: number }> }}
 */
export function parseMarkdownSections(markdown) {
  let title = null;
  const introLines = [];
  const sections = [];
  let current = null;
  let fence = null;

  toLines(markdown).forEach((line, index) => {
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch && (fence ? closesFence(fenceMatch, fence) : true)) {
      fence = fence ? null : fenceMatch[1];
      (current ? current.lines : introLines).push(line);
      return;
    }
    if (!fence) {
      const heading = line.match(HEADING_RE);
      if (heading) {
        const level = heading[1].length;
        if (level === 1 && title === null) {
          title = heading[2];
          return;
        }
        if (level === 2) {
          current = { heading: heading[2], lines: [], line: index + 1 };
          sections.push(current);
          return;
        }
      }
    }
    (current ? current.lines : introLines).push(line);
  });

  return {
    title,
    intro: introLines.join("\n").trim(),
    sections: sections.map(({ heading, lines: body, line }) => ({ heading, body: body.join("\n").trim(), line })),
  };
}

function sectionNamed(sections, heading) {
  const wanted = normalizeHeading(heading);
  return sections.find((section) => normalizeHeading(section.heading) === wanted) ?? null;
}

/** Fenced code blocks of a Markdown text: their info string, content and line. */
export function fencedBlocks(markdown) {
  const blocks = [];
  let open = null;
  toLines(markdown).forEach((line, index) => {
    const match = line.match(FENCE_RE);
    if (open) {
      if (match && closesFence(match, open.marker)) {
        blocks.push({ info: open.info, content: open.lines.join("\n"), line: open.line });
        open = null;
      } else open.lines.push(line);
      return;
    }
    if (match) open = { marker: match[1], info: match[2].trim(), lines: [], line: index + 1 };
  });
  return blocks;
}

/** The text with fenced code blocks removed. */
function withoutFences(markdown) {
  const kept = [];
  let open = null;
  for (const line of toLines(markdown)) {
    const match = line.match(FENCE_RE);
    if (open) {
      if (match && closesFence(match, open)) open = null;
      continue;
    }
    if (match) {
      open = match[1];
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

/**
 * The first paragraph of plain prose: not a heading, table, rule, list or quote.
 * Older guidance files open with such a paragraph saying what the widget is for.
 */
export function firstParagraph(markdown) {
  const paragraph = withoutFences(markdown)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block && !/^(#|---|\||[-*] |\d+\. |>)/.test(block));
  return paragraph ? paragraph.replace(/\s+/g, " ") : null;
}

/** Cut prose at a word boundary near `max` characters. */
export function clip(text, max) {
  if (typeof text !== "string") return null;
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.lastIndexOf(" ", max - 1);
  return `${flat.slice(0, cut > max / 2 ? cut : max - 1)}…`;
}

/**
 * Recipes are `###` entries under `## Recipes`: a name, a few lines on when to use
 * it, and one fenced `json` example shaped like a section (`type`, `settings`,
 * `blocks: [{ type, settings }]`), so the checker can validate it and an assistant
 * can apply it as it is.
 */
function parseRecipes(body) {
  if (!body) return [];
  const recipes = [];
  let current = null;
  let fence = null;
  toLines(body).forEach((line, index) => {
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch && (fence ? closesFence(fenceMatch, fence) : true)) {
      fence = fence ? null : fenceMatch[1];
      current?.lines.push(line);
      return;
    }
    const heading = !fence && line.match(HEADING_RE);
    if (heading && heading[1].length === 3) {
      current = { name: heading[2].replace(/^\d+[.)]\s*/, ""), lines: [], line: index + 1 };
      recipes.push(current);
      return;
    }
    current?.lines.push(line);
  });
  return recipes.map(({ name, lines: own, line }) => {
    const text = own.join("\n");
    const examples = fencedBlocks(text).filter((block) => block.info.split(/\s+/)[0] === RECIPE_FENCE);
    const fenceBlock = examples[0] ?? null;
    let example = null;
    let error = null;
    if (!fenceBlock) error = `no \`\`\`${RECIPE_FENCE} example`;
    // Only one example is read and served, so a second would go unchecked and unseen.
    else if (examples.length > 1) error = `${examples.length} \`\`\`${RECIPE_FENCE} examples; a recipe holds one, so give each alternative its own ### recipe`;
    else {
      try {
        example = JSON.parse(fenceBlock.content);
        if (example === null || typeof example !== "object" || Array.isArray(example)) {
          example = null;
          error = "the example must be a JSON object";
        }
      } catch (cause) {
        error = `the example is not valid JSON (${cause.message})`;
      }
    }
    return { name, intro: withoutFences(text).trim(), example, error, line, exampleLine: fenceBlock ? line + fenceBlock.line : null };
  });
}

/**
 * A widget's guidance. `structured` when it has the fixed headings; an older,
 * free-form file still yields `purpose` (its first paragraph) and `text`.
 */
export function parseWidgetGuide(markdown) {
  const text = String(markdown ?? "");
  const { title, sections } = parseMarkdownSections(text);
  const [purposeHeading, whenHeading, pitfallsHeading, recipesHeading] = WIDGET_GUIDE_HEADINGS;
  const purpose = sectionNamed(sections, purposeHeading);
  const whenToUse = sectionNamed(sections, whenHeading);
  const pitfalls = sectionNamed(sections, pitfallsHeading);
  const recipes = sectionNamed(sections, recipesHeading);
  const present = [purpose, whenToUse, pitfalls, recipes];
  return {
    structured: Boolean(purpose) && Boolean(whenToUse),
    title,
    purpose: purpose ? purpose.body : firstParagraph(text),
    whenToUse: whenToUse?.body ?? null,
    pitfalls: pitfalls?.body ?? null,
    recipes: recipes ? parseRecipes(recipes.body) : [],
    missing: WIDGET_GUIDE_HEADINGS.filter((_, index) => !present[index]),
    extraHeadings: sections.filter((section) => !present.includes(section)).map((section) => section.heading),
    text,
  };
}

/** A preset's guidance: who it suits, how it looks and how to adapt it. */
export function parsePresetGuide(markdown) {
  const text = String(markdown ?? "");
  const { title, sections } = parseMarkdownSections(text);
  const [suitsHeading, lookHeading, adaptingHeading] = PRESET_GUIDE_HEADINGS;
  const suits = sectionNamed(sections, suitsHeading);
  const look = sectionNamed(sections, lookHeading);
  const adapting = sectionNamed(sections, adaptingHeading);
  const present = [suits, look, adapting];
  return {
    title,
    suits: suits?.body ?? null,
    look: look?.body ?? null,
    adapting: adapting?.body ?? null,
    missing: PRESET_GUIDE_HEADINGS.filter((_, index) => !present[index]),
    extraHeadings: sections.filter((section) => !present.includes(section)).map((section) => section.heading),
    text,
  };
}

/**
 * Names written in single backticks outside fenced code: how guidance refers to
 * section types, settings, pages and the like. The checker warns about ones that
 * exist nowhere in the theme.
 */
export function backtickedNames(markdown) {
  const names = new Set();
  for (const match of withoutFences(markdown).matchAll(/(?<!`)`([^`\n]+)`(?!`)/g)) names.add(match[1].trim());
  return [...names];
}
