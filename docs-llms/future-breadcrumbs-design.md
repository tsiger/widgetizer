# Future: Breadcrumbs — one trail per page, computed by core, drawn by the theme

> **Status: decided 2026-09-09; stage 1 of the series in `future-roadmap.md`** (groundwork → **breadcrumbs** → pagination → structured data → multilang → undo fix → rename). First consumer: the Widgetizer marketing-site theme (`themes/widgetizer`). Pagination and structured data build on what this stage lands (the widget `collection` declaration, the listing anchor, the trail itself).

---

## Decision

> **Core computes one breadcrumb trail for every rendered page and exposes it to the layout and to every widget. Themes render it — with the core snippet in one line, or with their own markup. For pages the trail comes from an explicit parent page, falling back to the page's position in a menu; for collection items from an explicit listing anchor, falling back to the single page that lists the collection. The homepage is found by its slug.**

Nothing here asks a user to think about breadcrumbs. A site whose pages are in a menu gets correct trails without touching anything; the two explicit fields exist for the cases menus cannot express.

## Rejected

- **Deriving trails from the URL.** Pages are flat (`about.html`), so there is nothing to derive; item URLs (`news/story`) would invent a "News" crumb pointing at a page that may not exist.
- **Themes building trails in Liquid.** Every theme would re-implement menu walking and home detection, and the visible breadcrumb would drift from the structured-data one.
- **A "listing page" picker in the collection's settings.** Can point at a page that does not list the collection; the anchor flag on the widget cannot be wrong that way, and it lives where the user already is.

---

## Sources of hierarchy

### Pages

1. **Parent page** (explicit, optional) — a `parentPageUuid` field on the page (top level, beside `seo`). Set in Page settings with a page picker that excludes the page itself and its descendants. The chain is followed upward until a page has no parent.
2. **Menu position** (fallback) — the item in the designated menu that points at the page (matched by `canonicalPath`, exactly as menu active-state matching works today, `packages/core/src/snippets/menu.liquid`); its ancestors, in order, are the crumbs. A page that appears more than once uses the first occurrence in depth-first order. Menus nest up to four levels, so a trail is at most Home + 4 + the page.
3. **Neither** — Home → page.

When both exist, the parent chain wins for the page itself; each ancestor is then resolved with the same rule (its own parent, else its menu position), so a chain can hand over to the menu part-way up.

### Collection items

1. **Listing anchor** (explicit, optional) — a listing widget carries a `listing_anchor` boolean setting; the editor shows it only on widgets whose schema declares `collection.type`, as *"Make this the main Blog page"* (label from the collection's `displayNamePlural`). The anchor's page becomes the item's parent, and that page's own trail continues upward by the page rules above. **One anchor per collection**: switching it on elsewhere moves it (radio behaviour) with a toast naming the page it moved from; the engine tie-breaks deterministically (first page by slug) if data ever holds two.
2. **Single listing page** (fallback) — if exactly one page contains a widget declaring that collection, it is the parent.
3. **Neither** — Home → item.

### Home

The page whose slug satisfies `isHomeSlug` (`index` / `home`) — the rule canonicals, the sitemap and the header logo already use. Its href comes from `pageHref("index", …)`, so it is `./`, `../` or `index.html` as depth and Clean URLs dictate. **Label:** the menu item pointing at the homepage if there is one (almost always "Home"); else the page's name; a theme can override it through the snippet's `home_label` (multilang later supplies the per-language word there). The homepage itself has an **empty trail**.

### Rules that apply everywhere

- A crumb links only to a real internal destination. A menu ancestor that is a custom URL (an external "Documentation" link with children under it) is emitted as **plain text, no href**.
- Labels: menu labels when the ancestor came from the menu (that is what the author named it in navigation); page names when it came from the parent chain; the current page uses its own name (`page.name` — for items, the `usedAsTitle` field).
- Hrefs are built by `pageHref` / `itemHref` (`packages/core/src/utils/internalHref.js`), so Clean URLs, depth and — later — language folders are handled once.
- Cycles cannot be created through the picker; the builder still stops at depth 10 and drops the loop rather than hanging.
- A deleted parent or anchor page degrades to the next rule on the next render; nothing is stored about trails.

---

## The contract — `breadcrumbs`

An array, in order from Home to the current page; empty on the homepage. Available as `page.breadcrumbs` in the layout context and as `globals.breadcrumbs` inside every widget (header and footer included — they already receive the current page path the same way). Frozen once a theme ships against it.

| field | meaning |
|---|---|
| `label` | text to show |
| `href` | internal link, depth- and Clean-URLs-aware; `null` for an unlinkable ancestor |
| `canonicalPath` | un-prefixed `.html` path of the target (`about.html`, `news/story.html`); `null` when unlinkable |
| `current` | `true` on the last entry |
| `home` | `true` on the first entry |

Structured data (stage 3) builds `BreadcrumbList` from this same array — the visible trail and the JSON-LD can never disagree.

---

## Rendering

**Core snippet** — `packages/core/src/snippets/breadcrumbs.liquid`, beside `menu.liquid`:

```liquid
{% render 'breadcrumbs', class_nav: 'site-breadcrumbs', class_link: 'crumb', home_label: 'Home' %}
```

Params: `class_nav`, `class_list`, `class_item`, `class_link`, `class_current`, `separator` (text; default none — themes usually draw it with CSS), `home_label`, `aria_label` (default "Breadcrumb"), `show_home` (default true). Output: `<nav aria-label><ol><li><a href aria-current="page">`, and nothing at all when the trail is empty. Themes that want their own markup loop `page.breadcrumbs` / `globals.breadcrumbs` directly.

**Where a theme puts it** is the theme's call — all three work because the data is a global:

- in `layout.liquid` between header and main content (`themes/widgetizer`: always on; Arch: behind a `layout.show_breadcrumbs` checkbox in `theme.json`, default off);
- inside the header global widget;
- as a page widget users place themselves (not built in this stage; trivial later).

**Which menu** — `theme.json` `settings.breadcrumbs.menu` names the menu id (manifest-level, like `settings.imageSizes`; no user setting). Absent: the first menu, by id, that contains the page.

---

## Widget-schema declaration (shared with pagination and structured data)

Listing widgets declare what they list, at the top level of `schema.json`:

```json
"collection": { "type": "news" }
```

Breadcrumbs needs only `type`. Pagination (stage 2) adds `perPageSetting` to the same block. Arch: `news-grid`, `projects-grid`, `services-grid`; Widgetizer theme: `blog-grid`. Today the collection is named only inside the Liquid template (`'news' | collection`), which core cannot see.

---

## Engine and editor work

- **Trail builder** — `packages/core/src/utils/breadcrumbs.js` (new, pure): `buildBreadcrumbs({ currentCanonicalPath, pagesByUuid, menus, menuId, collectionSchemas, listingPages, cleanUrls, outputPathPrefix })` → array. Unit-tested in isolation.
- **Engine** — `renderPageLayout` and `renderCollectionItemPage` (`packages/render-engine/src/renderEngine.js`) build the trail once per page **before** rendering header/footer, stamp it on `sharedGlobals.breadcrumbs`, and add `breadcrumbs` to the page object in the layout context. Menus come from the existing `menuMaps`; pages from `pagesByUuid`. Listing pages (anchor + count per collection) are derived from `pagesByUuid` plus the widget schemas and cached on `sharedGlobals` (verify `loadPagesByUuid` carries widgets; if not, a `deps.loadListingPages()` hook supplied by `renderingService.buildRenderDeps`, like the collection loader).
- **Preview** — `previewController.js` already passes `currentCanonicalPath` for page, item and single-widget (morph) renders; the morph path must compute the trail too so a header breadcrumb updates when a page is renamed in the editor.
- **Parent page** — page JSON field; picker in `packages/editor-ui/src/components/pages/PageForm.jsx`; `cleanupDeletedPageReferences` and the duplicate/import uuid remap in `packages/builder-server/src/utils/linkEnrichment.js` treat `parentPageUuid` like every other `pageUuid` reference.
- **Anchor** — setting id `listing_anchor`, surfaced by `SettingsPanel.jsx` for widgets with `collection.type`; the toggle calls the page API to clear the flag on the previous anchor page (radio); server tie-break as above.
- **Themes** — snippet call in `themes/widgetizer/layout.liquid`; Arch setting + layout call; `collection` block in the four widget schemas; `theme.json` `settings.breadcrumbs.menu` where the header menu is not `main-menu`.
- **Docs** — `theming.md` (snippet, contract, manifest key), `theming-widgets.md` (`collection` declaration), `core-collections.md` (anchor), `user-test-checklist.md`.

---

## Multilang note (stage 4 reads this)

Menus are per language, so trails are per language for free. A `parentPageUuid` that points at a page in another language resolves to that page's translation sibling in the current language when one exists, and is otherwise ignored (falls back to the menu). Anchors are widget settings on per-language pages, so they are per language already.

---

## Definition of done

- Widgetizer theme: Home → Blog → post on a blog post; Home → Designs on a top-level page; nothing on the homepage; a page nested under a menu item shows its path; a page under an external menu link shows the link's label unlinked.
- Parent page set on a page overrides its menu position; clearing it restores the menu trail; deleting the parent falls back cleanly.
- Anchor toggle moves between pages with a toast; with no anchor and two listing pages the item trail is Home → item.
- Hrefs correct at depth 0 and 1 under both Clean URLs values (export test), and in the preview canvas after a page rename (morph test).
- Core unit tests cover: menu nesting to four levels, first-occurrence rule, parent chain handing over to the menu, cycle guard, homepage detection and label fallback, item with anchor / single listing page / none.
- A project with no menus and no parents renders Home → page everywhere and no errors.
