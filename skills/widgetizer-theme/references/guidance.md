# Guidance files (`insights.md`)

A theme can ship Markdown guidance for people and AI assistants. Widgetizer never renders it. The AI assistant that connects to Widgetizer serves it in small pieces when it chooses, places or fills a section, and the theme checker (`npm run validate:theme`) checks its structure and its examples. Every guidance file is optional; a theme without any still works, and an assistant then has only the schemas.

Three places, one file name:

| File | What it covers | Read by the assistant |
| --- | --- | --- |
| `insights.md` (theme root) | How to compose pages with this theme: colour schemes, rhythm, openers, header and footer, collections, dos and don'ts | On request, before building or restructuring pages. Copied into every site made from the theme, so a site keeps the guidance of its own theme version. |
| `widgets/<type>/insights.md` | One section type: what it is for, when to use it, what goes wrong, ready-made recipes | Purpose while choosing a section; the rest with the section's details; one recipe at a time on request. Copied into sites with the widget. |
| `presets/<id>/insights.md` | Who the preset suits, how it looks, how to adapt it to a similar business | While choosing a starting point for a new site. Read from the installed theme, since presets are not copied into sites. |

Guidance is advisory. It never overrides the user's request, the schema, or the app's own rules. Write it for the person composing a page, not for a developer: no CSS class names, no Liquid, no file paths. Keys, options, ranges and defaults come from `schema.json` and must not be repeated; say what a schema cannot say, such as how settings interact, what a setting does visually, and what the section needs from its neighbours.

Refer to section types, block types, settings, option values, pages, menus and collections in single backticks (`banner`, `color_scheme`, `highlight-primary`, `contact`). The checker warns about a backticked name that exists nowhere in the theme, so a renamed setting shows up in the guidance that still mentions it. Prose in backticks (anything with spaces, capitals or punctuation) is not checked.

## Theme guide

Free structure under a `#` title. Cover what an assistant cannot infer from schemas:

- what each colour scheme means on a page and how many highlight sections a page takes
- vertical rhythm: when `auto`, `small` and `none` spacing are right, and how filled sections differ from unfilled ones
- which sections may open a page, and what the header's transparent mode needs from the first section
- header and footer: what each block or setting is for, what belongs in contact lines
- collections: which fields matter for each type, how listing sections relate to items, and what a listing anchor and pagination do
- dos and don'ts that hold across the whole theme

Keep it to what fits in two or three screens. The assistant reads it in parts of about 12,000 characters.

## Widget guide

Fixed second-level headings, in this order:

````markdown
# <type>

## Purpose

One or two paragraphs: what the section is and what it looks like. The first
paragraph is shown while the assistant chooses between section types, so it
must say what this one is for in about 300 characters.

## When to use

Bullets: the role it plays on a page, what it is good and bad for, whether it
can open a page, which sections sit well next to it, how much content it needs.

## Pitfalls

Bullets: what goes wrong. Settings that interact, limits the schema cannot
express, spacing behaviour, contrast traps, text lengths that break the layout.

## Recipes

### <Recipe name>

A line or two on what this arrangement is good for, and which images or texts
the user must supply (images are never part of an example).

```json
{
  "type": "<type>",
  "settings": { "<setting id>": "<value>" },
  "blocks": [{ "type": "<block type>", "settings": { "<setting id>": "<value>" } }]
}
```
````

Rules the checker enforces:

- A file with `## Purpose` and `## When to use` is structured; the other two headings are then expected (a warning when missing). Any other `##` heading is reported, because it will not be served.
- Each `###` under `## Recipes` is one recipe with exactly one fenced `json` example. The example is a section as the editor stores it, without ids: `type` (optional, must match the folder), `settings` keyed by setting id, and `blocks` as an array of `{ "type", "settings" }` in order. Setting ids, option values, ranges, block types and `maxBlocks` are validated against the schema like a starter page. Two recipes cannot share a name.
- Leave image, gallery, file and video settings out of examples and name the images in the recipe's text instead. A link in an example uses `{ "text": "…", "href": "…" }`; the checker does not expect its target page to exist.
- Richtext values are HTML strings; keep them to `<p>`, lists and inline tags.

An older free-form file without these headings is still accepted: the assistant serves its first paragraph as the purpose and the rest as plain text, and the checker warns once that it should be restructured.

Core widgets the app ships (`core-form`) carry the same file in the app's own source; themes do not copy or override it.

## Preset guide

Fixed second-level headings:

```markdown
# <Preset name>

## Suits

The kinds of business it fits (service, shop, appointments, portfolio,
hospitality, …) and why: which pages and sections carry that story, which
collections it seeds. Suitability is not functionality: a preset for an
appointment-based business does not book appointments, and a shop preset does
not sell; say so when it matters.

## Look

Mood, palette, type and the header and opener pattern, in a few lines, so an
assistant can match a described taste without opening the demo.

## Adapting

Similar businesses it converts to with little work, and what to change for each:
pages to rename or drop, sections to swap, collections to repurpose. Also what it
is a poor fit for.
```

Rules the checker enforces: the three headings are required (an error when one is missing); other `##` headings are reported; a `#` title is expected. The file holds judgement only. Pages, sections, menus and seeded items are read from the preset's own files by the assistant, so never list them by hand.

A preset without this file can still be chosen; the assistant then has only its name, description and templates to go on. Bundled Widgetizer themes ship it for every preset.

## Checking

```bash
npm run validate:theme -- themes/<theme>
```

Rules: `guidance-structure` (headings), `guidance-recipe` (examples), `guidance-reference` (backticked names). Recipe validation proves an example fits the schema, not that it looks right; render it once in the editor.
