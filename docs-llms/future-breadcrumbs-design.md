# Future: Breadcrumbs — one trail per page, computed by core, drawn by the theme

> **Status: decided 2026-09-09; menus dropped from v1 on 2026-09-12. Stage 1 of the series in `future-roadmap.md`** (groundwork → **breadcrumbs** → pagination → structured data → multilang → undo fix → rename → upload file names). First consumer: the Widgetizer marketing-site theme (`themes/widgetizer`). Pagination and structured data build on what this stage lands (the widget `collection` declaration, the listing anchor, the trail itself).

---

## Decision

> **Core computes one breadcrumb trail for every rendered page and exposes it to the layout and to every widget. Themes render it — with the core snippet in one line, or with their own markup. Hierarchy is always something the user stated explicitly: a parent page for pages, a listing anchor for collection items. Nothing is inferred from navigation or from the URL. The homepage is found by its slug.**

A page with no parent is `Home → page`. That is the default shape and it is correct, not a degraded state — most pages on a brochure site are top level.

## Rejected

- **Deriving trails from the URL.** Pages are flat (`about.html`), so there is nothing to derive; item URLs (`news/story`) would invent a "News" crumb pointing at a page that may not exist.
- **Themes building trails in Liquid.** Every theme would re-implement the parent walk and home detection, and the visible breadcrumb would drift from the structured-data one.
- **A "listing page" picker in the collection's settings.** Can point at a page that does not list the collection; the anchor flag on the widget cannot be wrong that way, and it lives where the user already is.
- **Menu position as a fallback for pages** (dropped 2026-09-12 — was in the original design; see §Why menus are out).

---

## Why menus are out

The original design fell back to a page's position in a menu when it had no explicit parent, so a site already using menus got trails for free. That is a real pattern — Joomla's breadcrumbs are menu-driven, and Drupal has a widely used contrib module for it — but it was dropped for v1:

- **A menu is a marketing surface, not a hierarchy.** Contact sits under About because it balances the dropdown, and the trail then asserts a parent relationship nobody meant.
- **Stage 3 publishes the trail.** The same array becomes `BreadcrumbList` JSON-LD, so a casual nav reorder would silently rewrite structured data. A nav edit is a frequent, low-ceremony act; changing SEO markup as a side effect is not.
- **"Which menu" has no good answer.** A designated menu in `theme.json` needs every theme to set it; falling back to the first menu by id means a footer menu can win, and renaming a menu changes every trail on the site.
- **Menu ancestors are not always pages.** A mega-menu grouping label or an external link would emit a crumb with no destination — the one thing Google's breadcrumb guidance asks you not to do.

What that costs: a site whose pages are nested in menus now shows `Home → page` until someone sets parents. Acceptable because Widgetizer sites are brochure-shaped, deep nesting is the exception, and the parent picker is a few seconds on the rare page that needs it.

Menus can return in a later version if real sites ask for it. Nothing in the contract below blocks that — `href`/`canonicalPath` are already nullable for an unlinkable crumb, which only a menu source can produce.

---

## Sources of hierarchy

### Pages

1. **Parent page** (explicit, optional) — a `parentPageUuid` field on the page (top level, beside `seo`). Set in Page settings with a page picker that excludes the page itself and its descendants. The chain is followed upward until a page has no parent.
2. **No parent** — `Home → page`.

### Collection items

1. **Listing anchor** (explicit, optional) — a listing widget carries a `listing_anchor` boolean setting; the editor shows it only on widgets whose schema declares `collection.type`, as *"Make this the main Blog page"* (label from the collection's `displayNamePlural`). The anchor's page becomes the item's parent, and that page's own trail continues upward by the page rules above. **One anchor per collection**: switching it on elsewhere moves it (radio behaviour) with a toast naming the page it moved from; the engine tie-breaks deterministically (first page by slug) if data ever holds two.
2. **Single listing page** (fallback) — if exactly one page contains a widget declaring that collection, it is the parent.
3. **Neither** — `Home → item`.

### Home

The page whose slug satisfies `isHomeSlug` (`index` / `home`) — the rule canonicals, the sitemap and the header logo already use. Its href comes from `pageHref("index", …)`, so it is `./`, `../` or `index.html` as depth and Clean URLs dictate. **Label:** the page's name, overridable by the theme through the snippet's `home_label` (multilang later supplies the per-language word there). The homepage itself has an **empty trail** — on its first page; its paginated copies (`page/2.html` on) show `Home → Page 2`.

### Rules that apply everywhere

- **Every crumb in v1 is a real page with a real href.** `href`/`canonicalPath` are nullable in the contract for a future source that can produce an unlinkable ancestor; nothing produces one today.
- Labels are page names (for items, the `usedAsTitle` field).
- Hrefs are built by `pageHref` / `itemHref` (`packages/core/src/utils/internalHref.js`), so Clean URLs, depth and — later — language folders are handled once.
- Cycles cannot be created through the picker; the builder still stops at depth 10 and drops the loop rather than hanging.
- A deleted parent or anchor page degrades to the next rule on the next render; nothing is stored about trails.

---

## The contract — `breadcrumbs`

An array, in order from Home to the current page; empty on the homepage's first page. Available as `page.breadcrumbs` in the layout context and as `globals.breadcrumbs` inside every widget (header and footer included — they already receive the current page path the same way). Frozen once a theme ships against it.

| field | meaning |
|---|---|
| `label` | text to show |
| `href` | internal link, depth- and Clean-URLs-aware; `null` for an unlinkable ancestor (unused in v1) |
| `canonicalPath` | un-prefixed `.html` path of the target (`about.html`, `news/story.html`); `null` when unlinkable |
| `current` | `true` on the last entry |
| `home` | `true` on the first entry |
| `pageNumber` | added by pagination (stage 2): only on the extra last crumb of page 2+ of a paginated page |

On those copies the page's own crumb stops being current and links to page 1; the numbered crumb's `label` is the number, and the core snippet prefixes it with `page_label` (default "Page").

Structured data (stage 3) builds `BreadcrumbList` from this same array — the visible trail and the JSON-LD can never disagree.

---

## Rendering

**Core snippet** — `packages/core/src/snippets/breadcrumbs.liquid`, beside `menu.liquid`:

```liquid
{% render 'breadcrumbs', class_nav: 'site-breadcrumbs', class_link: 'crumb', home_label: 'Home' %}
```

Params: `class_nav`, `class_list`, `class_item`, `class_link`, `class_current`, `separator` (text; default none — themes usually draw it with CSS), `home_label`, `page_label` (default "Page", added by pagination), `aria_label` (default "Breadcrumb"), `show_home` (default true). Output: `<nav aria-label><ol><li><a href aria-current="page">`, and nothing at all when the trail is empty. Themes that want their own markup loop `page.breadcrumbs` / `globals.breadcrumbs` directly.

The snippet reads the trail off the globals bag, so it must tolerate `{% render %}` scope isolation the way `page_url` and `collection` do — read the environment first, fall back to `context.globals`.

**Where a theme puts it** is the theme's call — all three work because the data is a global:

- in `layout.liquid` between header and main content (`themes/widgetizer`: always on; Arch: behind a `layout.show_breadcrumbs` checkbox in `theme.json`, default off);
- inside the header global widget;
- as a page widget users place themselves (not built in this stage; trivial later).

---

## Widget-schema declaration (shared with pagination and structured data)

Listing widgets declare what they list, at the top level of `schema.json`:

```json
"collection": { "type": "news" }
```

Breadcrumbs needs only `type`. Pagination (stage 2) adds `perPageSetting` to the same block. Arch: `news-grid`, `projects-grid`, `services-grid`; Widgetizer theme: `blog-grid`. Today the collection is named only inside the Liquid template (`'news' | collection`), which core cannot see.

---

## Engine and editor work

- **Trail builder** — `packages/core/src/utils/breadcrumbs.js` (new, pure): `buildBreadcrumbs({ currentCanonicalPath, pagesByUuid, collectionSchemas, listingPages, cleanUrls, outputPathPrefix })` → array. Unit-tested in isolation.
- **Engine** — `renderPageLayout` and `renderCollectionItemPage` (`packages/render-engine/src/renderEngine.js`) build the trail once per page **before** rendering header/footer, stamp it on `sharedGlobals.breadcrumbs`, and add `breadcrumbs` to the page object in the layout context. Pages come from `pagesByUuid`. Listing pages (anchor + count per collection) are derived from `pagesByUuid` plus the widget schemas and cached on `sharedGlobals` (**verify `loadPagesByUuid` carries widgets**; if not, a `deps.loadListingPages()` hook supplied by `renderingService.buildRenderDeps`, like the collection loader).
- **Preview** — `previewController.js` already passes `currentCanonicalPath` for page, item and single-widget (morph) renders; the morph path must compute the trail too so a header breadcrumb updates when a page is renamed in the editor.
- **Parent page** — page JSON field; picker in `packages/editor-ui/src/components/pages/PageForm.jsx`; `cleanupDeletedPageReferences` and the duplicate/import uuid remap in `packages/builder-server/src/utils/linkEnrichment.js` treat `parentPageUuid` like every other `pageUuid` reference.
- **Anchor** — setting id `listing_anchor`, surfaced by `SettingsPanel.jsx` for widgets with `collection.type`; the toggle calls the page API to clear the flag on the previous anchor page (radio); server tie-break as above.
- **Themes** — snippet call in `themes/widgetizer/layout.liquid`; Arch setting + layout call; `collection` block in the four widget schemas.
- **Docs** — `theming.md` (snippet, contract), `theming-widgets.md` (`collection` declaration), `core-collections.md` (anchor), `user-test-checklist.md`.

---

## Multilang note (stage 4 reads this)

A `parentPageUuid` that points at a page in another language resolves to that page's translation sibling in the current language when one exists, and is otherwise ignored (the page falls back to `Home → page`). Anchors are widget settings on per-language pages, so they are per language already.

---

## Definition of done

- Widgetizer theme: Home → Blog → post on a blog post; Home → Designs on a top-level page; nothing on the homepage; a page with a parent shows its chain.
- Parent page set on a page produces the chain; clearing it restores `Home → page`; deleting the parent falls back cleanly on the next render.
- Anchor toggle moves between pages with a toast; with no anchor and two listing pages the item trail is Home → item.
- Hrefs correct at depth 0 and 1 under both Clean URLs values (export test), and in the preview canvas after a page rename (morph test).
- Core unit tests cover: a parent chain several levels deep, the cycle guard, the depth cap, homepage detection and label fallback, item with anchor / single listing page / none.
- A project with no parents set renders Home → page everywhere and no errors.
- The snippet renders identically at the top level of a template and inside a `{% render %}`'d snippet.
