# Future: editable / composable collection item templates

> **Status: 🧪 Exploration notes — NOT a committed plan.** Captured from a design
> brainstorm. The goal is to make a collection's **item template** composable in the visual
> editor (theme authors define blocks; end users arrange them) instead of a fixed
> `template.liquid`. Nothing here is decided; the open forks in §7 are the things to sleep on.
> Builds on the existing collections system, the widget **blocks** model, and the page editor.
> For *when* to build this, see the verdict in §8 — short version: when the hosted SaaS needs it.

## 1. The idea in one line

Today a collection has two halves: **`schema.json`** (what data an item holds) and a fixed
**`template.liquid`** (how it's displayed). The user can edit an item's *data* but never its
*layout*. This explores making the **display composable** — the same way pages already let
users add / reorder / remove widgets. It's the "sections / blocks" model (Shopify sections,
WordPress full-site-editing) applied to collection **item pages**.

## 2. The framing we landed on (reuse, don't reinvent)

Map the new idea onto primitives that already exist:

- **page → item template.** Each collection type gets an editable item-page template that
  appears in the page editor's top-bar list (e.g. *Accommodation template*, *Excursion
  template*). Selecting it opens a canvas.
- **widget → the collection's renderer.** The canvas shows the item rendered; its content
  region is composable.
- **blocks → the renderable pieces.** Each slice of the item (gallery, rates, amenities, …) is
  a **block** the user can reorder / show-hide. Plus theme-provided **visual blocks** (static
  text shown on all items, divider, spacer).
- **editor → reuse the page editor.** Add / reorder / remove + per-item-settings already
  exists; point it at an item template rather than build a parallel builder.

Important scope note: composition belongs to the **item page**, because that's where the
current `item` is in scope (blocks need `item.settings.rates`, etc.). The arrangement is stored
**per collection type** (one Accommodation layout, shared by all accommodation items); each item
flows its own data through it. (Dropping these blocks on an arbitrary non-item page is a
*different* feature — a collection list/grid widget, partly covered today by the `| collection`
filter.)

## 3. The key simplification — ONE block model

Adding visual/static blocks (a divider, a "same on every item" text section) does **not** add a
second system — it forces the realization that there's only **one** notion of a block:

> **A block type = a small Liquid template + an optional settings schema.**

The only difference is what the template reads:
- **Rates block** → reads `item.settings.rates` (data-bound).
- **Text block** → reads *its own* setting (`block.settings.body`).
- **Divider block** → reads nothing.

So you don't build a "data-block system" and a "visual-block system." You build one block
system; a "data block" is just a block whose template happens to pull from `item`. The
distinctions we sensed become **flags** the theme author sets per block type:

- **`singleton` vs `repeatable`** — Rates is one-of-each (there's one rates field); a divider or
  text section can appear many times, anywhere.
- **`inDefault`** — whether it's in the starter layout (data blocks usually yes; a divider you
  add on demand).
- **`reads`** — the explicit link from a block back to the schema field/group it renders (so the
  system knows the Rates block renders the Rates field). This is more than bookkeeping — it's
  the hook for editor affordances: click a data block → deep-link to that field in the item
  form; warn when a block is hidden but items carry data for it (or a field has no block
  rendering it).

**Consequence — static blocks carry template-level content.** When a user types into a static
text block on the Accommodation template, that text is shared by **every** accommodation item
(it's part of the type's layout, not any one item's data). So the item template is content-
bearing — layout *plus* each static block's settings — exactly how a page already behaves. That
reinforces "this is the page editor pointed at an item template," not a new builder.

## 4. Concrete folder structure (one explored option)

Theme side — what the theme author ships (proposed; does not exist yet):

```
themes/<theme>/collection-types/accommodation/
├── schema.json          # item DATA — the fields a user fills per item (UNCHANGED)
├── item.liquid          # the item-page SHELL — outer markup + a {% blocks %} slot
├── template.json        # DEFAULT block arrangement (starter layout)
└── blocks/              # the PALETTE — one folder per block type
    ├── heading/
    │   ├── block.json   #   data block → renders the item's title + summary
    │   └── block.liquid
    ├── gallery/
    │   ├── block.json   #   data block → renders item.settings.gallery
    │   └── block.liquid
    ├── rates/
    │   ├── block.json   #   data block → renders item.settings.rates
    │   └── block.liquid
    ├── amenities/
    │   ├── block.json
    │   └── block.liquid
    ├── text/
    │   ├── block.json   #   visual block → repeatable, own richtext setting
    │   └── block.liquid
    └── divider/
        ├── block.json   #   visual block → no settings
        └── block.liquid
```

Three roles kept cleanly separate:
- **`schema.json`** — *what data an item has* (today's item form; unchanged).
- **`blocks/<name>/{block.json, block.liquid}`** — *how each slice renders*. Mirrors
  `widgets/<name>/{schema.json, widget.liquid}`, so the pattern is already familiar.
- **`item.liquid`** — the page *shell* (fixed chrome + a `{% blocks %}` slot). Replaces today's
  monolithic `template.liquid`.

`block.json` examples (the new authoring artifact):

```json
// data block — reads item data, one-of-each, no own settings
{ "label": "Rates", "icon": "Table", "singleton": true, "inDefault": true, "reads": "rates" }
```
```json
// visual block — repeatable, carries its own content
{ "label": "Text", "icon": "Type", "repeatable": true,
  "settings": [ { "id": "body", "type": "richtext", "label": "Text" } ] }
```

Shell is tiny:
```liquid
<article class="room-single">
  {% blocks %}   {# the user's arranged blocks render here, in order #}
</article>
```

Default arrangement the theme ships (so a fresh install isn't blank):
```json
{ "blocks": ["heading", "gallery", "rates", "amenities"] }
```

Project side — what the editor produces. The user's arrangement saves into the **project**, not
the theme (structurally the same as a page's widget JSON — the reuse payoff):

```
data/projects/<folder>/collections/accommodation/_template.json   # ordered block instances + static content
```

Optional DX nicety: theme-wide reusable visual blocks (text, divider, spacer — same everywhere)
could live once at `themes/<theme>/collection-blocks/` instead of being duplicated per type, while
data blocks (gallery, rates) stay per-type because they read that type's fields.

## 5. DX and UX

- **DX (theme author):** `schema.json` as today + a small `block.liquid` per renderable piece +
  one-line `block.json` flags + a default `template.json`. No new templating language, no
  monolithic if/elsif template — each block is a tidy file.
- **UX (user):** *Accommodation template* / *Excursion template* appear in the top-bar list next
  to pages. Open one → the shell with the default blocks. The existing widget/block inspector
  reorders (drag), shows/hides, edits each block's settings, and adds text/divider blocks from
  the palette. Data blocks preview against a **sample item** so the user sees real content.

### The split that stays (decided)

Two surfaces, on purpose, and they don't merge:

- **Collection form** — the user edits *data* (one item). Changes affect that item only.
- **Item template editor** — the user adjusts *layout* (the type). Changes affect every item.

Mixing them blurs "affects this item" vs "affects all items" (Shopify keeps the same
separation). The form's existing **eye-icon item preview stays**: it's the only place to check
*your specific item's* content (real photos, a long title that wraps weirdly) against the
template — the template editor previews a sample item, so it can never answer that question.
Because every preview path already rides the shared item-page renderer, the eye preview
automatically shows the user-arranged layout the day this ships, for free. Navigation-level
stitching is enough: an "Edit layout" link from the item preview, an item picker in the
template editor (fork §7.6).

## 6. Spectrum — there is a much smaller first step

- **Lean MVP:** the canvas only **reorders / toggles** the schema-derived data blocks (plus
  maybe a couple of theme-provided visual blocks). No free-form widget interleaving. Cheap, no
  hard data-scoping problems, delivers ~80% of the value (control over what shows and in what
  order).
- **Full version:** free-form — drop any block *and* any theme widget anywhere on the item page.
  Powerful, but now you must answer "what does a generic widget see when it sits inside an item
  page," handle item-agnostic widgets, etc. The expensive 20%.

### The hidden cost in "reuse the page editor": the live-preview loop

The "~70% already exists" figure is fair for state/storage/sidebar but quietly excludes the
editor's *instant feel*, which is built around per-widget morphing: diff state per widget id
(`previewManager.js`), POST the **whole widget JSON** to `/api/preview/widget`, morph the
returned HTML into the iframe by `data-widget-id`. Three of its assumptions break for item
blocks:

1. **Render unit** — `blocks/<name>/block.liquid` has no loader; the morph endpoint renders
   `widget.liquid` only.
2. **Context** — a widget is self-contained (the client posts everything the template reads);
   an item block reads `item.settings.*`, and a render-safe `item` must be resolved/sanitized
   **server-side** (`prepareCollectionItemForRender`: links, menus, richtext) per request.
3. **Pipeline** — `renderCollectionItemPage` is all-or-nothing; there's no "render one block"
   entry point, and the `{% blocks %}` tag must emit `data-block-id` morph targets.

Two reuse seams make this much cheaper than it sounds:

- `renderCollectionItemPage` **already returns `mainContentHtml` separately** from the full
  page — so "re-render the whole item template, morph only the main region" is nearly free.
- Present the `{% blocks %}` region to the editor as **one pseudo-widget** whose
  `blocks`/`blocksOrder` are the item blocks — exactly how header/footer already piggyback on
  the widget model — and the WidgetList, block selection/overlays, drag-reorder, and the client
  half of the morph path reuse as-is. The genuinely new work concentrates server-side.

Scope ladder for the preview loop:

- **Tier 0 — full iframe reload per change** (debounced). Works today:
  `POST /api/preview/collection` already renders draft items (the eye-icon preview uses it).
  Fine for proving storage/UI; clunky as an editor.
- **Tier 1 — main-region morph.** Re-render the item page server-side, morph just
  `mainContentHtml` into the iframe. One new runtime message, no per-block endpoint, no flash,
  scroll preserved. For a template of ~6 blocks this is cheap and gets ~90% of the page-editor
  feel. **The lean MVP should target this.**
- **Tier 2 — true per-block morph** (new endpoint with server-side item-context loading,
  per-block diffing, `data-block-id` targets, optimistic text updates). Parity with pages; only
  worth it if Tier 1 ever feels slow — for a single-item template it likely won't.

## 7. Open forks — the things to sleep on

1. **Single slot vs named regions** *(the big one).* `item.liquid` with one `{% blocks %}` slot =
   a single composable column → today's rich 2-column "main + aside" accommodation layout
   flattens into one stream. Named regions (`{% blocks 'main' %}` / `{% blocks 'aside' %}`, each
   block assigned a region) preserve complex layouts but add files + a two-drop-zone editor.
   This choice most shapes both the files and the editor. *Middle path to weigh:* keep ONE slot
   but give each block instance a `placement` flag (full / main / aside) that the shell turns
   into the 2-column CSS — one drop zone in the editor, side-by-side blocks on the page. Note
   this fork interacts with §6: if the lean MVP ships single-slot, the first theme with a
   2-column item layout immediately demands more.
2. **Lean (reorder/toggle) vs full (free-form add any block/widget)** — §6.
3. **Palette ownership** — confirm the `block.json`-per-folder declaration is how a theme author
   registers the palette and links a block to its schema field (`reads`).
4. **Migration from today's fixed `template.liquid`** — opt-in alongside fixed templates, or the
   new default? Backward-compat for themes that don't define blocks.
5. **Singleton enforcement** — is "one Rates block" a hard rule or a soft default (could a theme
   legitimately render the same data twice)? *Leaning: soft* — `singleton` just grays the block
   out in the palette once placed. A hard rule means enforcement code, UI states, and
   theme-update edge cases (what if the count changes?), all to prevent something harmless.
6. **Preview item selection** — first item, a flagged sample, or a picker, when editing a
   type-level template.
7. **Per-type vs theme-wide visual blocks** — where `text`/`divider`/`spacer` live (§4 nicety).

## 8. Honest assessment

Coherent, on-trend (FSE / Shopify sections), and it fits the architecture surprisingly well —
the widget/blocks model and the page editor are ~70% of what's needed (state/storage/sidebar;
the preview loop is the honest remainder — see §6), which is the difference between "big
feature" and "two-quarter rewrite." The strategic calls: **reuse the widget-composition
machinery, don't build a second one**, and **start with the lean reorder/toggle MVP** before
free-form interleaving.

### When to build — resolved

The old counter-question ("are fixed item templates actually limiting real themes yet?") has an
answer now:

- **The audience doesn't need it yet.** Widgetizer's users are small businesses — a few posts a
  year, simple services/team/portfolio collections. They want item pages that look great with
  *zero* decisions; a well-designed fixed `template.liquid` isn't the limitation, it's the
  product. The people who rearrange item layouts are power users and theme authors — and today
  the entire set of theme authors is one person.
- **Deferring is cheap.** There's no theme ecosystem yet, so no migration burden accrues:
  converting one fixed template to `item.liquid` + blocks later is an afternoon of the
  maintainer's own time, not a breaking change for anyone.
- **The real trigger is the hosted SaaS.** In the OSS app a determined user can always edit
  `template.liquid` — the escape hatch exists. On the SaaS, users never touch Liquid; the
  editor is the *only* knob, so composable item templates go from nicety to the only way a
  paying customer controls item layout.

**Verdict: later, when the SaaS needs it** (a better trigger than any calendar date). Meanwhile,
the first fixed `template.liquid` written for a real collection type doubles as the design study — where the
template *wants* to be sliced into blocks is the best possible input to fork §7.1.

## See Also
- [Collections](core-collections.md) — current item schema, `template.liquid`, item pages, `| collection`.
- [Widget Authoring](theming-widgets.md) — the blocks model this reuses.
- [Visual Page Editor](core-page-editor.md) — the composition machinery to point at item templates.
