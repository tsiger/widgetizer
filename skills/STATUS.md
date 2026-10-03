# Theme skills: working status

Updated 2026-10-04 after the Panna refinement review. This is a maintainer handoff, outside the portable skill folders.

## Resume here

The author said the refined Panna preview looks good and has more notes to discuss next session. Start with those notes. Do not choose another niche, expand Panna into a full theme, or revise the other previews before that discussion.

The current exercise is to explore different niches up to a working homepage/styleguide preview, learn the author's preferences, and carry confirmed preferences into the collection rules. Full theme development comes later. A liked preview is not a completed reusable theme.

## Decisions already made

- Keep both skills in this repository and make them useful to other theme authors. The technical and design skills have separate responsibilities and work together.
- Technical correctness belongs to the app-owned validator plus explicit import, editor, export and update checks. A skill cannot guarantee validity through instructions alone.
- The design skill develops the brief, uses selective questions and references (including screenshots), proposes a direction, and builds a responsive preview with a styleguide and representative layouts.
- Keep editing simple for owners who find other systems too complex. Content and branding should be easy to change; responsive layout and detailed spacing should mostly be handled by the theme.
- The author intends a collection of roughly 30–40 premium themes, with 2–3 presets per theme, generally within the same industry/niche. Each theme should have its own identity rather than resemble Arch.
- Keep the explored themes in `themes/` for now. The author will move them out when appropriate; do not relocate or publish them on their behalf.
- Add no new Core widgets for this collection. A shared pool of reusable theme widgets can grow from actual theme work; its packaging is not decided or implemented yet.
- Generate only the key images needed for an initial preview. The author will choose whether to supply or request the full image set when a theme develops further.

## What exists

| Component | Current state |
| --- | --- |
| `skills/widgetizer-theme/` | Technical workflow, focused references, a minimal working starter theme and generated `references/contract.json` |
| `scripts/build-theme-skill-contract.js` | Generates the app capability catalog; `--check` detects drift |
| `scripts/validate-theme.js` | App-owned static validation using the configured LiquidJS engine and Widgetizer rules |
| `packages/builder-server/src/tests/themeSkill.test.js` | Catalog freshness, starter import/project/export, Arch/preset validation and invalid-theme regression coverage |
| `skills/widgetizer-theme-design/` | Brief, reference handling, direction selection, responsive preview, imagery and simple editing guidance |
| `skills/theme-collections/widgetizer-premium.json` | Author-confirmed collection preferences, separate from portable guidance and platform validation |

The catalog lists supported names and selected metadata, including the app's available font stacks and weights; it is not the complete Liquid or runtime behavior specification. The validator uses current app source. No desktop validation UI or skill distribution package has been built.

## Explored directions

All six directions have been received positively. They remain local, uncommitted visual previews, deliberately excluded from the skill commit.

| Theme | Niche | Existing local preview |
| --- | --- | --- |
| Common | Coworking and shared spaces | `http://127.0.0.1:4178/` |
| Kiln | Ceramics studio | `http://127.0.0.1:4179/` |
| Margin | Independent bookshop | `http://127.0.0.1:4180/` |
| Afterhours | Small live music venue | `http://127.0.0.1:4181/` |
| Cove | Sea kayaking | `http://127.0.0.1:4182/` |
| Panna | Artisan gelateria | `http://127.0.0.1:4183/` |

Each has a `styleguide.html` preview. Servers may need restarting after the session; their existing helpers are under `tmp/<theme>-preview/`. These ignored local artifacts are useful evidence, not dependencies of the skills or files supplied by this commit.

## Panna: latest accepted refinement

Panna means cream in Italian. Preserve its warm cream, deep cherry and pistachio palette, Fraunces headings, DM Sans body, calm mood and photography.

- A full-image hero demonstrates both a transparent header and text over photography. The styleguide uses a solid header. The mobile hero has its own portrait image.
- The flavour menu now uses two columns on desktop, useful ingredient icons and fewer separator lines.
- Pricing sits in a quiet pistachio panel within the menu, alongside the seasonal photograph and story.
- The visit section has a more restrained headline and distinct location, opening-hours and contact groups. Day/time pairs stay close together.
- Lucide SVG icons identify location, hours, email, serving sizes and ingredient information. Written labels remain visible.
- The secondary action is an outlined button with a soft hover fill and visible keyboard focus. Text links have one underline; the former doubled underline is fixed.
- Theme validation reported zero errors/warnings. An isolated real theme upload, project creation and export passed. Homepage layouts were checked at 1280, 980, 390 and 320px; styleguide at 1280 and 390px. No horizontal overflow, missing images or browser warnings/errors were observed. Visible text stayed at least 14px.
- Full editor lifecycle, accessibility assessment, pages and presets remain pending. The fictional shop details, prices, hours and ingredient statements are demo content.

Local evidence and helpers: `tmp/panna-preview/brief.json`, `review.json`, `refinement-checks.json`, `image-prompts.json`, `render.mjs`, `serve.mjs`, and desktop/mobile captures. `before-refinement/` preserves the previous theme and screenshots. To rebuild the isolated preview from source, run `node tmp/panna-preview/render.mjs`; restart its server with `node tmp/panna-preview/serve.mjs` only if needed. Never sync over a real customer project.

## Preferences to carry forward

The maintained source is `theme-collections/widgetizer-premium.json`. Key points from the reviews:

- Calm, clear, detailed and visibly premium. A good palette, font pairing and hero are only the start; the whole page needs considered composition and interaction states.
- Natural-case text by default. Uppercase labels only for verified languages; Greek keeps natural casing and accents.
- No decorative subtitle dots, bullets, numbers, dashes or em dashes. No decorative numbering in captions or sections.
- Use actual open-source SVG icons with consistent treatment and retained licensing. Use meaningful icons more often for practical content; avoid automatic repeated button arrows and unrelated decorative symbols.
- Give a heading one consistent typographic/color treatment unless a mixed treatment makes a specific meaningful contribution. Kiln's second line no longer uses decorative italics and a different color.
- Body/navigation/actions/forms at least 16px; short secondary labels/captions at least 14px, including mobile. Larger text when the font needs it. Review Common, Kiln, Margin and Afterhours against these floors during full development; no retroactive cleanup solely for this rule now.
- Use lines intentionally. Avoid redundant stacked borders; grouping, spacing and alignment can establish relationships.
- Give practical information clear hierarchy, and check normal, hover and keyboard-focus states together.
- Explore transparent headers and text-on-image heroes as independent reusable choices. Overlay headers require a compatible first widget; other pages need a readable solid header.

Older proposal notes in `docs-llms/future-skills-theme.md` include historical preferences and unresolved distribution ideas. Do not use those to override the collection's current rules or the author's accepted cream-based directions.

## Skill commit scope and checks

The skill checkpoint includes the two skills, starter/catalog, collection rules, maintainer documentation, validator/generator, and directly supporting app exports and tests. The render-engine change exposes the same configured Liquid dialect to tooling; the collection change exposes existing structured-data rules; the export-test change isolates its temporary Core widget so concurrent catalog checks stay reliable. Theme directories and ignored preview assets are excluded.

Before the checkpoint, 204 targeted tests passed across theme-skill validation, export, rendering, collection rendering and collection services. Catalog freshness and the starter import/project/export flow are covered by those tests. This does not certify the explored themes' full editor lifecycle.

Next session: hear the author's additional Panna notes, refine within the current preview scope, and add only confirmed reusable preferences to the collection rules. Decide together when to expand a selected direction into complete pages, widgets, presets, imagery and lifecycle/accessibility checks.
