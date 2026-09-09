# Future: Schema.org / JSON-LD

> **Status: direction locked 2026-08-06; sharpened 2026-09-09 — open questions resolved, scope trimmed, placed as stage 2 of the series.** The series (groundwork → pagination → **structured data** → multilang) and its cross-stage build order live in `future-multilang-implementation-plan.md` (§Series order). Nothing is built yet.
>
> One answer per question below. The 2026-08 open questions are resolved in §Resolved questions, not re-argued in the body.

---

## Decision

Widgetizer offers structured data as an automatic core SEO feature:

> **Core produces one safe JSON-LD graph through the existing SEO output; Project details owns site and business identity; Arch collection schemas declare how theme-owned content maps to the small set of semantic types core supports.**

Structured data is not a theme setting, but it is not ignorant of the theme either. Core owns correctness and output. Arch supplies semantic field mappings for the content types it defines.

## The three rules for a non-technical audience

These decide most of the design below. When in doubt, apply them in order.

1. **Make identity data visible on the site, not just in the head.** Business details live in Project details and Arch's footer and contact widget can display them with one toggle. People fill in an address when it appears in their footer; nobody fills in an SEO form. This single decision does more for adoption than anything else here.
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

- `category` — the most specific supported organization / business category. The identity kind is *derived* from it: a category under LocalBusiness makes the identity a local business; "Person" is itself a category; everything else is an organization.
- `logo` — a dedicated identity image (media file id), separate from the Site Icon.
- `email`, `telephone`, `priceRange`.
- `profiles` — canonical social / profile URLs, project-owned (§Social profiles).
- `locations[]` — a list from day one, first UI edits only the primary; each with street, locality, region, postcode, country, and `openingHours` (per weekday: closed, or one or more ranges — split shifts are a list of ranges, not a special case).

**Translatable text — one value now, per-language later:**

- `publicName` — defaults from Site Title; editable.
- `description` — short, optional.
- `locations[].label` — the display name of a location, when it differs from the public name.

Multilang later attaches a language to the second group only. Nothing in the first group ever moves.

### Social profiles — dual read

Arch stores social URLs in its theme settings today and existing footers depend on them. The migration is a **dual-read period**, not a move:

- Project details gains the profile fields (project-owned, canonical).
- Core builds `sameAs` from project profiles when any are set.
- Arch's footer and social widgets read project profiles first and fall back to their own theme settings when the project has none. Presets and theme updates are untouched.
- A later cleanup can retire the theme fields once projects have migrated; not this release.

No existing footer loses a link at any point.

---

## Theme use of identity data

- Project identity is exposed to Liquid as `project.identity` (resolved: derived kind, absolute logo URL, profiles with the dual-read fallback applied).
- Arch's footer and its contact-details widget gain a **"Use business details"** toggle: on, they render name, address, phone, email, hours and profiles from the project; off, they behave exactly as today. This is what makes rule 1 real.
- Global widgets (header / footer) need `project` in their render context. Today `renderWidget` does not receive it — that contract change is multilang plan step 3 and **lands in this stage**.

---

## Automatic graph by page type

| Page | Structured data |
|---|---|
| Homepage | `WebSite`, the identity node (`Organization` / `Person` / `LocalBusiness` subtype from the category), `WebPage` |
| Ordinary page | `WebPage` |
| Paginated copy (`blog/page/2`) | `WebPage` — its own canonical id, nothing else |
| Arch News item | `WebPage`, `BlogPosting`, `BreadcrumbList` |
| Arch Project / Service item | `WebPage` only, until a matching builder exists |

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

### Breadcrumbs — auto-detected, no UI

A breadcrumb may only point at a destination that really exists:

- If **exactly one** page contains a listing widget for the item's collection, the trail is *Home → that page → item*.
- Otherwise (none, or more than one) the trail is *Home → item*.

"Contains a listing widget for the collection" is read from the widget schema's `collection` declaration introduced by pagination (`future-pagination-design.md` §1) — the same fact the pager uses. Deterministic, nothing to configure, and a deleted or renamed listing page silently degrades to *Home → item* on the next render.

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

- **Website** — Site title, Website Address, Clean URLs, and the **readiness line** (*"Google can read your business details: name ✓, address ✓, logo missing"* — each missing item is a link to the field). Computed by one core function shared with the export warnings.
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

## Build steps (stage 2 of the series)

Prerequisites already landed by earlier stages: the Site URL base helper and `page_url` filter (stage 0), derived output depth and the addressing module (stage 1). Multilang plan step 3 (global widgets get `page` and `project` in context) lands **here**, as step 1.

1. **Global-widget render context** — `renderPageLayout` / `renderCollectionItemPage` in `packages/render-engine/src/renderEngine.js` pass page and project into the header/footer `renderWidget` calls; `renderSingleWidget` in `packages/builder-server/src/controllers/previewController.js` does the same for the canvas. Test: a footer template reads `project.siteUrl`.
2. **Data model + validation** — the next migration version adds `site_identity TEXT` to `projects` (`packages/builder-server/src/db/migrations.js`); `packages/core/src/utils/siteIdentity.js` (new) owns the shape, validation, the derive rules (kind from category, name from Site Title) and the readiness computation; `projectRepository.js` maps it; `projectController.js` validates on create/update and round-trips it through export/import/duplicate.
3. **Graph builder + safe serializer** — `packages/core/src/structuredData/` (new): `buildGraph(context)` returns nodes; `serializeJsonLd(nodes)` prunes empties and escapes `</script`. `SeoTag.js` appends the script. Tests: stable ids, pruning, breakout attempts, no Site URL → URL-dependent nodes absent.
4. **Homepage and ordinary pages** — `WebSite` + identity + `WebPage` on the homepage, `WebPage` elsewhere (paginated copies included); readiness warning surfaced in the export result.
5. **Collection contract + News** — `structuredData` block validation in `collectionService.js`; the `BlogPosting` builder; the block added to `themes/arch/collection-types/news/schema.json`; item pages emit it. Tests: missing field refused, parity with visible values, absolute image URL under both Clean URLs values.
6. **Breadcrumbs** — listing-page detection from the widget `collection` declaration; `BreadcrumbList` on item pages. Tests: zero / one / two listing pages.
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
| 1 | How is a breadcrumb listing page verified? | Auto-detect: exactly one page with a listing widget for the collection → use it; otherwise Home → item. No UI. |
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
