# Future: Collection Pagination

> **Status: direction locked 2026-09-09, detailed design in this doc.** Pagination is stage 2 of the series in `future-roadmap.md` — groundwork (page-link filter, Site URL helper) → breadcrumbs → pagination → structured data → multilang → undo-history fix → rename — and deliberately lands groundwork the later stages need. The shared groundwork steps, with files and done-when criteria, are Phase 0 of `future-multilang-implementation-plan.md`. Design vocabulary follows `future-multilang-design.md`.

---

## Rejected approaches (do not re-propose)

1. **A theme-defined listing page per collection type** (WordPress-style archive). Rejected: it is a page the user cannot build or touch, and this is a visual builder — the user designs every page. It would also introduce a second kind of generated page next to item pages, with its own template, its own URL and its own editor gap.
2. **Client-side "load more" / JavaScript pagination.** Rejected: search engines only see what is rendered, it does not scale past a few dozen items, and it needs JavaScript on for a static site.

## Core model: paginated copies of the hosting page

A collection listing stays what it is today — a widget the user drops on any page. Pagination is a switch on that widget. When it is on, the exporter renders **the whole hosting page once per slice** of the collection, so page 2, 3, … are real HTML files that look exactly like the page the user built, with the listing showing the next slice and the pager pointing at a different number.

- **Page 1 is the hosting page itself** — `blog.html` (`/blog` with Clean URLs). There is never a `page/1`; every link to the first page points at the base page, so the first page has one URL.
- **Pages 2+ nest under the hosting page:** `blog/page/2.html`, `blog/page/3.html` (`/blog/page/2` with Clean URLs). A paginated listing on the homepage puts them at the root: `page/2.html`.
- **Everything else on the page repeats** — header, intro, other widgets, footer. That is how every archive page on the web behaves and is not a defect.
- **A short collection is a no-op.** If the collection has no more items than one slice, no pager renders and no extra files are written; output is byte-identical to today. This is what makes the switch safe to leave on.
- **Nothing is stored.** Total pages are computed at render time from the item count; each export is a fresh directory, so an old `page/7` never lingers.

## Locked decisions

### 1. Authoring: one switch, one number

- Listing widgets gain a **Paginate** switch. When it is on, the widget's existing `limit` setting is the **items per page** and must be at least 1 (the editor forces a sensible default, e.g. 12, and refuses 0 — "show all" and "paginate" cannot both be true). `sort` is unchanged and defines the order across pages.
- Sort must be **total**: the loader breaks ties (by created date, then uuid) so an item can never appear on two pages or on none.
- **One paginating widget per page.** A page can only be split one way. The editor refuses to flip a second switch and names the widget that already paginates; the server enforces the same rule on page save (a hidden option is not enforcement).
- Other listing widgets on the same page keep working as teasers — `limit` N, no pager — and the existing "view all" link setting keeps pointing wherever the author sent it. A teaser on Home linking to Blog is the expected pattern.
- Which widgets can paginate is declared by the **widget schema**'s top-level `collection` block, introduced by breadcrumbs (stage 1) with `type`; pagination adds `perPageSetting` — `"collection": { "type": "news", "perPageSetting": "limit" }`. The editor shows the switch only on widgets with the block and the engine knows which setting is the slice size.
- **Paginate implies anchor.** Turning Paginate on makes the widget the collection's listing anchor (stage 1) when none is set; when another page already holds the anchor, the editor says so and offers to move it. A teaser never paginates, and the paginated page is by definition the collection's main page — one flag, one meaning.

### 2. URL shape

- The segment is the literal word **`page`**: `blog/page/2`. `blog/2` would collide with item slugs when a collection shares the prefix, and `page` is the convention visitors and crawlers already know.
- **Clean URLs applies as everywhere else:** `blog/page/2.html` on disk in both modes; links and SEO URLs emit `/blog/page/2` when the setting is on. Pager links go through the same helper as every other internal link (`pageHref` in `packages/core/src/utils/internalHref.js`, extended with a page number), never hand-built by a theme.
- **`page` becomes a reserved name:** no page may be slugged `page` (in any folder — a language folder's homepage will use `<lang>/page/2` later), and no collection item may be slugged `page` (it would sit at `<prefix>/page` next to `<prefix>/page/2`). Same mechanism as the existing `index` reservation for items; pages get the equivalent check.
- Later, multilang puts the language folder in front and nothing else changes: `el/blog/page/2`.

### 3. SEO

- Every copy has its **own self-referencing canonical**. Pages 2+ are distinct pages, not duplicates of page 1.
- `<title>` gets a **number-only suffix** on pages 2+ (`Blog – 2 – Site`), deliberately language-free so it needs no translation later. Visible pager copy ("Next", "Previous") is the theme's, rendered from the pager data.
- `rel="prev"` / `rel="next"` are emitted. Search engines mostly ignore them now; they are harmless and cheap.
- **Pages 2+ go in the sitemap.** They are real, indexable pages.
- **`noindex` is inherited** from the hosting page's SEO settings; the copies never get their own SEO panel.

### 4. Theme contract — the `pagination` object

When a widget is the page's paginating widget, its render context carries `pagination`; otherwise the value is absent (a teaser never sees it). Frozen once Arch ships a pager against it.

| field | meaning |
|---|---|
| `current` | 1-based page number being rendered |
| `total` | total pages (≥ 2 whenever the object is present) |
| `perPage` | slice size |
| `totalItems` | item count after sort, before slicing |
| `prevHref` / `nextHref` | internal links, `null` at the edges — depth- and Clean-URLs-aware |
| `pages` | array of `{ number, href, current }` for a numbered pager, same link rules |

The theme renders the pager from this (an Arch snippet shared by every listing widget). The `| collection` filter call in the widget does not change — the engine injects the slice `offset` for the paginating widget, so a theme never computes offsets.

### 5. Preview and editor

- The editor canvas always edits page 1; the pager is visible and selectable there like any element. The preview panel is **navigable**: clicking a pager number renders that slice of the same page.
- The preview request carries the page number; the in-iframe link mapper recognises the `/page/<n>` suffix on an internal link and maps it back to "this page, slice n". Preview routes keep their shape — no new namespace.

### 6. Forms and media on a paginated page

- A form on the hosting page appears on every copy but is **one form with one submission stream**. The forms manifest is built from the base page only; copies are never scanned.
- Media usage is unchanged — the copies are the same content.

---

## Implementation contracts

Pagination lands the pieces multilang needs regardless. Do them here, in this shape, and multilang extends rather than rewrites them.

1. **Derived output depth.** `blog/page/2.html` is two levels deep; the exporter's literal `outputPathPrefix: "../"` cannot express it. Derive the prefix from the final output path (multilang plan, step 4).
2. **The addressing layer starts here.** A `contentAddress` module in `@widgetizer/core` owns output paths (`pageOutputPath`, `pagedOutputPath`), public paths under both Clean URLs shapes, the preview mapping for a paged link, and the reserved-name checks. Multilang later adds the language dimension to the same functions (multilang plan, step 6) — nothing here should assume a root folder.
3. **Links never hand-built.** Pager hrefs come from the same helper as menu and richtext links. This is also why the page-link filter (stage 0 of the series) lands first: the theme has one way to link to a page, and the pager uses it.
4. **Counting without loading twice.** The exporter asks the collection loader for the sorted item count once per paginating widget (sort applied, no limit), computes `total`, then renders copies with `offset`. The loader's sort tie-break is part of the contract.

---

## Build steps (stage 2 of the series)

Each step ships green (`npm test`, `npm run test:frontend`, `npm run lint:all`) and leaves a project without paginating widgets byte-identical on export.

1. **Reserved name `page`** — `packages/builder-server/src/services/collectionService.js` (`RESERVED_ITEM_SLUGS`), a matching page-slug check in `packages/builder-server/src/controllers/pageController.js` / `packages/builder-server/src/utils/slugHelpers.js`; localized messages in `packages/core/src/locales/en.json`. Tests: create/rename refusal for pages and items.
2. **Derived output depth** — `outputPathPrefixFor(outputPath)` in `packages/core/src/utils/linkPrefixer.js`; `exportProjectToDir` in `packages/builder-server/src/controllers/exportController.js` drops the literal; `depthRenderSmoke.test.js` gains a depth-2 case.
3. **Addressing module** — `packages/core/src/utils/contentAddress.js` with output/public/preview path builders for pages, items and paged copies, and their inverses. Vitest suite pins both Clean URLs shapes at depths 0–2.
4. **Schema + settings** — `perPageSetting` added to the `collection` block breadcrumbs introduced in the Arch listing widget schemas (`themes/arch/widgets/news-grid`, `projects-grid`, `services-grid`); Paginate-implies-anchor wiring; a `paginate` boolean setting the editor surfaces only for widgets with the block; per-page ≥ 1 validation; the one-per-page rule in the page save path (server) and in the settings panel (`packages/editor-ui/src/components/pageEditor/SettingsPanel.jsx`).
5. **Engine** — `pageHref` gains a page number; the render context builds `pagination` for the paginating widget and injects `offset` into its `| collection` call (`packages/render-engine/src/renderEngine.js`, `packages/core/src/filters/collectionFilter.js`); the collection loader in `packages/builder-server/src/services/renderingService.js` exposes a sorted count and a total sort tie-break. `packages/core/src/tags/SeoTag.js` emits the title suffix, self-canonical, prev/next, inherited robots.
6. **Arch pager** — a shared pager snippet under `themes/arch`, used by the three listing widgets; theme docs record the `pagination` contract.
7. **Exporter** — one render per slice; extra sitemap entries through `buildSitemap` in `packages/builder-server/src/services/seoArtifacts.js`; forms manifest scans the base page only (`packages/builder-server/src/services/formsManifestService.js`). Tests: layout under both shapes, homepage pagination at the root, short-collection no-op, sitemap entries, single form stream.
8. **Preview** — page number in the preview request (`packages/builder-server/src/controllers/previewController.js`); `/page/<n>` recognised by `packages/editor-ui/src/utils/previewLinkUtils.js` and `packages/core/src/runtime/previewRuntime.js`.
9. **Docs** — `docs-llms/core-collections.md` (filter behaviour and the pagination object), theme authoring docs, `docs-llms/user-test-checklist.md`.

---

## Open questions

- Whether a pager needs first/last shortcuts or a windowed page list for very large collections (theme concern; the object already carries every page).
- Whether the homepage should be allowed to paginate at all, or whether `page/2` at the site root reads wrongly. Allowed for now; revisit if it confuses users.
