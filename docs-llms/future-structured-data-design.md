# Future: Schema.org / JSON-LD

> **Status: shipped 2026-09-15 on branch `0.9.10` (commits `a303661b`…`3017c436`); direction locked 2026-08-06, sharpened 2026-09-09.** All nine build steps are in: steps 1–8 in those commits, step 9 (export and developer-mode reporting of missing details) in the commit that follows them. Where the build departs from the design below, §What changed wins. The series (groundwork → breadcrumbs → pagination → **structured data** → multilang) and its cross-stage build order live in `future-roadmap.md`.
>
> One answer per question below. The 2026-08 open questions are resolved in §Resolved questions, not re-argued in the body.

---

## What changed during the build and review (2026-09-15)

- **Every widget gets `page` and `project`, not just header and footer.** `renderWidget` reads the page from `sharedGlobals.currentPageData`, which preview, export, item pages and the canvas morph set once per render; `page` is shaped like the layout's (breadcrumbs and pagination included). A morph request without a page gets no `page`, and the morph plans pagination from the whole posted page so a morphed header keeps `page.pagination`.
- **The logo is stored as its `/uploads/images/…` path, not a media id** — duplicate and import give every media file a new id. It is tracked as media usage source `global:site-identity` so exports copy it and the library won't delete it.
- **Categories are declared rows** (`id`, schema.org type, kind) in `SITE_IDENTITY_CATEGORIES`: Arch's preset business types plus Organization, Person and a generic LocalBusiness. **ProfessionalService is not used** (schema.org deprecates it); businesses without an exact type get `LocalBusiness`. **VeterinaryCare is emitted as `["VeterinaryCare", "LocalBusiness"]`**, since schema.org files it outside LocalBusiness. When a new theme or preset brings a business type, add a row.
- **Profiles are one URL per named network** (`PROFILE_NETWORKS`: facebook instagram twitter linkedin youtube tiktok pinterest github mastodon bluesky discord reddit telegram threads whatsapp); an unknown network is refused.
- **Every translatable value sits under a `text` key** — `text.publicName`, `text.description`, `locations[].text.label`.
- **Validation** (`normalizeSiteIdentity`) returns the pruned value plus one `{ field, code }` per rejected field. Opening hours: `HH:MM`, opens ≠ closes, at most 4 ranges a day, `[]` = closed, a missing day = not stated, ranges may cross midnight. Country is two letters, stored upper-case; up to 20 locations. Create and update answer `400 { error, fields }`.
- **Only human-readable text is tag-stripped**, with the new `stripHtmlToText` (plain text, `&` kept as typed). URLs, email, phone and the logo path are validated exactly as sent: `stripHtmlTags` re-serialises through DOMPurify, which would rewrite a query string and store `&amp;`.
- **Project update validates everything before the folder rename.** Before, a request rejected after the rename could strand the project. Import keeps only the valid part of an imported identity.
- **Node ids anchor on the page's own published address** (`pageSelfUrl` in `packages/core/src/utils/publishedUrls.js`, shared with `SeoTag`), never on an explicit canonical override — for pages, numbered copies and items alike. `urlNodeId` refuses addresses the URL parser would silently repair.
- **The serializer escapes `<`, `>`, `&`, U+2028 and U+2029**, not just `</script`. Each builder is isolated (one that throws is skipped), and `{% seo %}` appends the script in its own `try`, so a structured-data failure never costs the page its meta tags.
- **WebSite is always on the homepage; the identity node only when a name resolves** (public name, else Site Title), and `publisher` / `about` references follow it. A person gets `image`, an organization `logo`, a local business both. A closed day is written as opens and closes `00:00`, which Google reads as closed.
- **BreadcrumbList appears on every page whose trail has two or more entries**, so ordinary pages (Home → page), items and numbered copies carry one, not only News items (§Automatic graph table updated).
- **BlogPosting reads richtext through `htmlToText`**: block boundaries become line breaks, inline markup joins its neighbours, quoted attributes are respected, script/style content is dropped. Item page data carries `collectionItem { type, structuredData, settingTypes, settings }` from the prepared (visible) settings.
- **A numbered copy's last crumb is named "Page N"** — the breadcrumbs snippet's default `page_label`. A theme passing its own `page_label` or `home_label` draws different words than the JSON-LD says. Known limitation; multilang will have to revisit it.
- **The readiness line sits at the top of the Identity tab**, not under Site, and only shows while something is missing; it says "Search engines", not "Google". Items: site address, name, logo (not for a person), address (local business: street, city and country).
- **Site identity and Business details appear on both the new-project and edit forms** (same tabs; on create the logo is a local file, uploaded right after the project is created). Business details shows for local-business categories, or whenever one of its fields has an error. Emptying the primary location while other locations exist is refused (`primaryRequired`): pruning would promote the next, uneditable location. The form is `noValidate`, and `MediaDrawer` stops its submit event from reaching an enclosing form.
- **Project details only opens for the active project**, because media and theme requests are scoped to it on the server; the Projects list no longer links to other projects' details, and any other id redirects to the list. The logo picker and "Use the Site Icon" therefore always work when editing.
- **No "Use business details" toggle.** Arch has a `business_details` block in the footer and in Contact Details (title, show address, show phone and email, show hours) rendered by `themes/arch/snippets/business-details.liquid`. It publishes nothing when empty and shows a hint in preview.
- **Project profiles win everywhere Arch draws social icons** — footer, Contact Details, Social Icons, Accordion, Map and Schedule Table pass `identity: project.identity` to `snippets/social-icons.liquid`. The theme's Social Media settings are the fallback when the project has no profiles, and the mail icon uses the project email first. The fallback is Arch's; core never reads theme settings.
- **`project.identity` carries the logo path, not an absolute URL** (so it works with `{% image %}`), plus `telephoneHref`, `hasProfiles`, the primary `address` (or `null`) and `openingHours` grouped into runs of consecutive days.
- **Existing projects get site, page and breadcrumb data with no theme update.** News `BlogPosting` and the Business details block need the Arch 0.9.10 theme update (`themes/arch/updates/0.9.10`).
- **The export result carries `structuredData: { readiness, warnings }`.** `readiness` is `identityReadiness`; `warnings` lists `emptyArticleFields` (an item leaves mapped article fields empty, from core `emptyArticleFields`) `noListingPage` (no page lists the collection) and `ambiguousListingPage` (several do and none is the anchor); in both the item's trail is Home → item. A homepage listing counts as resolved. The export screen shows them in a plain-language note after a successful export, and developer mode adds them to `__export__issues.html`. There is no separate preview report: Project details' readiness line covers the site-wide items.
- **A guard test (`themeUpdateCopies.test.js`) fails when any file in Arch's newest update folder differs from the base theme file**, since forgetting the update copy leaves existing projects on stale files.

---

## Decision

Widgetizer offers structured data as an automatic core SEO feature:

> **Core produces one safe JSON-LD graph through the existing SEO output; Project details owns site and business identity; Arch collection schemas declare how theme-owned content maps to the small set of semantic types core supports.**

Structured data is not a theme setting, but it is not ignorant of the theme either. Core owns correctness and output. Arch supplies semantic field mappings for the content types it defines.

## The three rules for a non-technical audience

These decide most of the design below. When in doubt, apply them in order.

1. **Make identity data visible on the site, not just in the head.** Business details live in Project details and Arch's footer and contact widget can display them with one Business details block. People fill in an address when it appears in their footer; nobody fills in an SEO form. This single decision does more for adoption than anything else here.
2. **Zero new vocabulary in the UI.** "Schema", "JSON-LD" and "structured data" appear only in one status line — *"Google can read your business details: name ✓, address ✓, logo missing"*. A readiness line with plain actions replaces a validator screen.
3. **Derive, don't ask.** Public name defaults from Site Title. The logo is offered from the Site Icon with one confirmation, never silently reused. The identity kind (organization / person / local business) is derived from the chosen category, not stored separately.

## Product constraints

1. Arch is the only theme; there is no third-party theme ecosystem today.
2. A project's theme is selected at creation and cannot be switched.
3. Every project holds its own copy of its theme files, and theme updates are optional — so the feature must ride the existing `{% seo %}` hook. Requiring a new tag in `layout.liquid` would leave existing projects without structured data until they applied a theme update.
4. Multilang follows this stage. Data that will need translation is kept apart from data that will not, from day one (§Data model).

---

## Ownership

| Concern | Owner |
|---|---|
| JSON-LD graph generation and safe serialization | core |
| Canonical URLs, absolute media URLs, stable ids, page relationships | core (through the Site URL base helper landed in stage 0) |
| Site, organization, person and business facts, social profiles | Project details (project-owned data) |
| Meaning of collection fields (which field is the headline, the date, the image) | Arch collection schemas |
| Visual use of identity and business data | Arch templates and widgets |
| Colors, typography, spacing, presentation | Arch Site settings (unchanged) |

Themes never hand-build JSON inside Liquid. They declare meaning; core writes markup.

---

## Output model

- **The existing `SeoTag` appends the JSON-LD script** to its current title / canonical / Open Graph / social-card output. Graph construction and serialization are separate modules; `{% seo %}` stays the only required Liquid hook.
- **One graph per page**, nodes with stable absolute ids built from the Site URL (`<site>/#website`, `<site>/#identity`, `<pageUrl>/#webpage`, `<itemUrl>/#article`). The homepage carries the full site and identity nodes; other pages reference them by id and carry only what they need.
- **Site URL is required for anything URL-dependent.** Without it, URL-dependent nodes are omitted (never relative or preview URLs), and the readiness line in Project details and the export result both say so. Same rule as og:image today — a deliberate, visible omission.
- **Safe output.** Empty properties are pruned, user text cannot close the `<script>` element, nothing is built through Liquid string interpolation. JSON-LD is inline page metadata; `site.webmanifest` is untouched.

---

## Data model

Stored on the project (one JSON column, `site_identity`, validated by a core module shared by the form and the controller the way `isValidSiteUrl` is). Two groups, deliberately separate:

**Stable facts — never translated:**

- `category` — the most specific supported organization / business category. The identity kind is *derived* from it: each category row declares its kind (organization, person, local business) and the schema.org type it emits. The kind is declared rather than read off the schema.org hierarchy because some fitting types sit outside LocalBusiness there (VeterinaryCare). No category means organization.
  - **The list is `SITE_IDENTITY_CATEGORIES` in `packages/core/src/utils/siteIdentity.js`.** The first release covers the business types of Arch's presets plus Organization, Person and a generic local business; a business with no exact schema.org type gets its own row with a broader type (a photographer is a LocalBusiness — not ProfessionalService, which schema.org deprecates). **When a new theme or preset brings a business type the list lacks, add a row.**
- `logo` — a dedicated identity image, separate from the Site Icon, stored as its `/uploads/images/…` path like every image setting. Not a media file id: duplicate and import give every media file a new id, which would silently drop the logo from the copy.
- `email`, `telephone`, `priceRange`.
- `profiles` — one URL per named network (the networks Arch's footer offers: facebook, instagram, twitter, linkedin, youtube, tiktok, pinterest, github, mastodon, bluesky, discord, reddit, telegram, threads, whatsapp), project-owned (§Social profiles).
- `locations[]` — a list from day one, first UI edits only the primary; each with street, locality, region, postcode, country (two-letter code), and `openingHours` (per weekday: an empty list is closed, otherwise one or more `{ opens, closes }` ranges in `HH:MM` — split shifts are a list of ranges, not a special case; a range may run past midnight; a day not listed is simply not stated).

**Translatable text — one value now, per-language later:**

- `text.publicName` — defaults from Site Title; editable.
- `text.description` — short, optional.
- `locations[].text.label` — the display name of a location, when it differs from the public name.

Every translatable value sits under a `text` key. Multilang later makes each `text` per-language. Nothing outside a `text` key ever moves.

### Social profiles — dual read

Arch stores social URLs in its theme settings today and existing footers depend on them. The migration is a **dual-read period**, not a move:

- Project details gains the profile fields (project-owned, canonical).
- Core builds `sameAs` from project profiles when any are set, and never reads theme settings — structured data works the same under a theme with no social settings at all.
- Every Arch social icon set (footer, Contact Details, Social Icons, Accordion, Map, Schedule Table) reads project profiles first and falls back to the theme settings when the project has none. The 0.9.10 theme update ships the change; presets are untouched.
- A later cleanup can retire the theme fields once projects have migrated; not this release.

No existing footer loses a link at any point.

---

## Theme use of identity data

- Project identity is exposed to Liquid as `project.identity` (resolved: derived kind, name falling back to Site Title, the stored logo path, the project's own profiles, primary address, opening hours grouped into runs). The theme applies any social-settings fallback itself; core never reads theme settings.
- As built, Arch's footer and its contact-details widget gain a **Business details block** (title, show address, show phone and email, show hours) instead of a "Use business details" toggle. It renders address, phone, email and hours from the project, and existing blocks behave exactly as before. This is what makes rule 1 real.
- Global widgets (header / footer) need `page` and `project` in their render context. That contract change is multilang plan step 3; it **landed in this stage** for every widget.

---

## Automatic graph by page type

| Page | Structured data |
|---|---|
| Homepage | `WebSite`, the identity node (`Organization` / `Person` / `LocalBusiness` subtype from the category; only when a name resolves), `WebPage` |
| Ordinary page | `WebPage`, `BreadcrumbList` (Home → page) |
| Paginated copy (`blog/page/2`) | `WebPage` on its own address, `BreadcrumbList` ending "Page 2" |
| Arch News item | `WebPage`, `BlogPosting`, `BreadcrumbList` |
| Arch Project / Service item | `WebPage` and `BreadcrumbList`, until a matching builder exists |

There is **no page-purpose selector**. About and Contact page types are dropped: Google produces no rich result for either, and they cost a persisted page field, a control, and a default on every existing page for nothing a user can see.

### News articles — the collection-schema contract

The collection schema declares meaning in a small closed block; core owns the builder:

```json
"structuredData": {
  "type": "BlogPosting",
  "headline": "title",
  "datePublished": "date",
  "description": "excerpt",
  "image": "featured_image",
  "articleBody": "body"
}
```

- `validateCollectionSchema` (`packages/builder-server/src/services/collectionService.js`) rejects a block whose `type` core does not support or whose mapped field does not exist or has the wrong setting type. A mapping can never point at a missing field.
- Core adds the system-owned values: canonical URL, `dateModified` from the item's updated stamp, `isPartOf` the page, publisher (the identity node, when set), absolute image URL through the same rules as og:image.
- Values come from the **visible** fields named in the block, never silently from the SEO description or social image — Google requires page-content parity.
- The only supported `type` in the first release is `BlogPosting`. Adding a type means adding a core builder *and* a content model that can supply its required fields.

### Breadcrumbs — from the stage-1 trail

`BreadcrumbList` is built from the same array the visible breadcrumb renders (`page.breadcrumbs`, `future-breadcrumbs-design.md`): an explicit parent page for pages, the listing anchor or the single listing page for items, Home detected by slug. Nothing is inferred from navigation — deliberately, so a nav reorder cannot silently rewrite published structured data. Only linkable entries are emitted; the node is omitted when the trail has fewer than two entries (the homepage). A deleted parent or anchor degrades on the next render exactly as the visible breadcrumb does. Nothing to configure here, and the visible trail and the JSON-LD can never disagree.

---

## Not in the first release: widget-level structured data

Event list, job listing and FAQ *look* structured, but:

- the event-list widget stores day and month as text with no year — Google requires a full `startDate`;
- the job-listing widget has no description and no posted date — both required for `JobPosting`;
- FAQ rich results were withdrawn for ordinary sites in 2023, so `FAQPage` markup buys nothing.

Doing these properly means first adding the missing fields to those widgets, then reusing the same declaration mechanism (`structuredData` on a widget schema). That is a separate, later piece of work. Leaving widgets out keeps the first release honest.

---

## Screen plan

### Project details

Sections, not one long form:

- **Website** — Site title, Website Address, Clean URLs. As built, the **readiness line** sits at the top of Site identity instead (*"Google can read your business details: name ✓, address ✓, logo missing"* — each missing item is a link to the field). Computed by one core function shared with the export warnings.
- **Site identity** — category (drives the derived kind), public name (pre-filled from Site Title), identity logo (offer the Site Icon with a confirm), email, description, profiles.
- **Business details** — shown when the category derives a local business: phone, price range, primary location and address, opening hours with closed days and split shifts. The hours editor is the single largest UI piece; budget it on its own.

### Site settings

Unchanged, Arch-owned, presentation only. Identity forms are never injected here.

### Page SEO

No new controls. A one-line readable summary of what the page emits (*"Web page"*, *"Article with breadcrumbs"*) is optional polish.

### Collection item editor

News items say, once, that article data is generated from the visible fields. Nothing is entered twice.

### Preview and export

Report, never own: missing Site URL, missing name or logo, a mapped field that is empty on an item, an unresolvable listing page. Export includes these in the existing developer-mode validation report.

---

## Cut first if the release must shrink

In this order:

1. **Custom JSON-LD editors** (site / page / item — three surfaces, not one). Custom Head Scripts already covers experts, imperfectly. If kept later, the contract is *append nodes*, validated on save and at export, with duplicate generated ids refused.
2. **Opening hours editor** — valuable for the small-business audience, so it goes second, not first.

Everything else is the feature.

---

## Build steps (stage 3 of the series)

Steps 1–8 shipped 2026-09-15 (`a303661b`, `95acac2e`, `e3ae2f42`, `e4873122`, `24861cb9`, `013ef1ec`, `538594ec`, `3017c436`); step 9's export and developer-mode reporting landed in the commit after them. The steps below are the plan as written — §What changed records where the build departed (notably step 3's escaping, step 7's readiness placement and step 8's block instead of a toggle).

Prerequisites already landed by earlier stages: the Site URL base helper and `page_url` filter (stage 0); the breadcrumb trail, the widget `collection` declaration and the listing anchor (stage 1); derived output depth and the addressing module (stage 2). Multilang plan step 3 (global widgets get `page` and `project` in context) lands **here**, as step 1.

1. **Global-widget render context** — `renderPageLayout` / `renderCollectionItemPage` in `packages/render-engine/src/renderEngine.js` pass page and project into the header/footer `renderWidget` calls; `renderSingleWidget` in `packages/builder-server/src/controllers/previewController.js` does the same for the canvas. Test: a footer template reads `project.siteUrl`.
2. **Data model + validation** — the next migration version adds `site_identity TEXT` to `projects` (`packages/builder-server/src/db/migrations.js`); `packages/core/src/utils/siteIdentity.js` (new) owns the shape, validation, the derive rules (kind from category, name from Site Title) and the readiness computation; `projectRepository.js` maps it; `projectController.js` validates on create/update and round-trips it through export/import/duplicate.
3. **Graph builder + safe serializer** — `packages/core/src/structuredData/` (new): `buildGraph(context)` returns nodes; `serializeJsonLd(nodes)` prunes empties and escapes `</script`. `SeoTag.js` appends the script. Tests: stable ids, pruning, breakout attempts, no Site URL → URL-dependent nodes absent.
4. **Homepage and ordinary pages** — `WebSite` + identity + `WebPage` on the homepage, `WebPage` elsewhere (paginated copies included); readiness warning surfaced in the export result.
5. **Collection contract + News** — `structuredData` block validation in `collectionService.js`; the `BlogPosting` builder; the block added to `themes/arch/collection-types/news/schema.json`; item pages emit it. Tests: missing field refused, parity with visible values, absolute image URL under both Clean URLs values.
6. **Breadcrumbs** — `BreadcrumbList` from `page.breadcrumbs` on every page whose trail has two or more linkable entries. Tests: page with a parent chain, page with no parent (Home → page — one linkable ancestor plus the page, so a node is emitted), item with an anchor, item without one (Home → item), homepage (no node).
7. **Project details UI** — Website readiness line; Site identity section; Business details section; opening-hours editor (`app/src/components/projects/ProjectForm.jsx`, strings in `packages/core/src/locales/en.json`).
8. **Theme** — `project.identity` in the base render context (`renderingService.js` `buildRenderDeps`); "Use business details" toggle in Arch's footer and contact-details widget; social dual-read in the footer.
9. **Warnings, validation, docs** — preview/export reporting; developer-mode validation entries; `docs-llms/core-collections.md` (the `structuredData` block), theme authoring docs, `docs-llms/user-test-checklist.md`.

---

## Out of scope

- A universal Schema.org type selector or a theme mapping language.
- Builders without a matching structured content model (Product, Event, Recipe, JobPosting, FAQ).
- Multi-location UI (the model allows it).
- Geocoding.
- Any promise that valid markup guarantees a rich result.

---

## Definition of done

- Preview and export emit the same graph.
- Clean URLs and nested paths (items, paginated copies) produce correct absolute ids.
- Media URLs follow the og:image publish rules.
- Missing Site URL or identity data yields the readiness line and export warning, never broken properties.
- User content cannot break out of the script element.
- Existing projects with `{% seo %}` gain structured data without a theme update.
- Arch mappings cannot reference missing fields.
- Breadcrumbs never link to an unverified destination.
- Opening hours support closed days and multiple ranges per day.
- Rich Results Test passes for the homepage and a News item on the fixture project.

---

## Resolved questions (from the 2026-08 draft)

| # | question | resolution |
|---|---|---|
| 1 | How is a breadcrumb listing page verified? | Stage 1 (breadcrumbs): the listing **anchor** flag on a listing widget, falling back to the single page that lists the collection; otherwise Home → item. Visible breadcrumb and JSON-LD share one trail. |
| 2 | Social profiles: in scope or deferred? | In scope, as a dual-read period — project fields added, Arch prefers them, theme fields stay as fallback. |
| 3 | Where does "page purpose" live? | Nowhere — dropped with question 4. |
| 4 | Do About/Contact page types earn their cost? | No. Ordinary pages emit `WebPage`. |
| 5 | Identity kind vs category contradiction? | Kind is derived from the category and not stored. |
| 6 | Release size | Acknowledged; cut order is custom JSON-LD first, opening hours second. Widget-level structured data is out of the first release. |

## References

- [Google: Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Google: General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google: Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Google: Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google: Breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
- [Google Rich Results Test and Schema Markup Validator](https://developers.google.com/search/docs/appearance/structured-data)
