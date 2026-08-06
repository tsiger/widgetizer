# Future: Schema.org / JSON-LD

> **Status: Recommended direction, nothing built.** This document replaces the earlier two-pass discussion with one consolidated product and architecture direction. The scope is intended to ship as one release, although the build order still matters.

---

## Decision

Widgetizer should offer structured data as an automatic core SEO feature:

> **Core produces one safe JSON-LD graph through the existing SEO output; Project details owns site and business identity; Arch collection schemas declare how theme-owned content maps to the small set of semantic types core supports.**

Structured data is therefore **not a theme setting**, but it is not entirely ignorant of the theme either. Core owns correctness and output. Arch supplies semantic field mappings for content types it defines, such as News.

## Product constraints

This direction assumes the current Widgetizer product:

1. Arch is the only theme. There is no third-party theme ecosystem today.
2. A project's theme is selected at creation and cannot currently be switched.
3. Every project holds its own copy of its theme files, and theme updates are optional.
4. The complete feature is planned as one release, including LocalBusiness details and opening hours.

The third constraint is why structured data must use the existing `{% seo %}` hook. Requiring a new tag in `layout.liquid` would leave existing projects without structured data until their owners applied a theme update.

---

## Ownership

| Concern | Owner | Meaning |
|---|---|---|
| JSON-LD graph generation and safe serialization | Widgetizer core | Every site receives valid, consistently generated output. |
| Canonical URLs, absolute media URLs, IDs, and page relationships | Widgetizer core | URL behavior stays aligned with existing SEO and export behavior. |
| Site, organization, person, and business facts | Project details | These are facts about the site, not visual design choices. |
| Meaning of collection fields | Arch collection schemas | Arch knows that a News title is an article headline and its featured image is the article image. |
| Visual use of identity and business data | Arch templates and widgets | The theme may display the project-owned logo, address, telephone, profiles, and hours wherever appropriate. |
| Colors, typography, spacing, animation, and presentation | Arch Site settings | These remain theme-defined settings. |

Themes must never hand-build JSON inside Liquid templates. They declare supported semantics; core turns the resolved data into JSON-LD.

---

## Output model

### Existing SEO hook

The existing core `SeoTag` should append the JSON-LD script to its current title, canonical, Open Graph, and social-card output. Internally, graph construction and serialization should remain separate responsibilities, but `{% seo %}` remains the only required Liquid hook.

This gives existing projects the feature without requiring a new `layout.liquid` tag.

### One graph per page

Widgetizer should emit one JSON-LD graph for each rendered page. Nodes use stable absolute IDs based on the configured Site URL, for example the site, identity, page, and article identities.

Full site and identity definitions belong on the homepage. Other pages can refer to those stable identities. When a supported content type needs publisher details on its own page, core supplies the minimum applicable identity information there.

### Site URL requirement

Published structured data depends on a valid Site URL for canonical IDs, page URLs, and media URLs. When it is missing:

- Widgetizer omits URL-dependent structured data rather than emitting preview or relative URLs.
- Project details clearly warns that automatic structured data is incomplete or disabled.
- Export reports the same warning.

This must be visible to the user and must not fail silently.

### Safe output

Core builds data objects and serializes them safely. It removes empty properties, prevents user content from closing the script element, validates custom data, and never creates JSON through Liquid string interpolation.

JSON-LD is inline page metadata. It does not change or extend `site.webmanifest`.

---

## Project-owned identity and business data

The durable project concept should be called **Site identity**, rather than only Business, because Widgetizer may represent an organization, a person, a nonprofit, a portfolio, or a local business.

### Site identity

The first release includes:

- Identity kind: organization, person, or local business.
- Most specific supported organization or business category.
- Public name.
- Dedicated identity logo.
- Email address.
- Canonical social and profile URLs.

The identity logo is separate from the Site Icon. A favicon may be visually unsuitable as the organization's representative logo even when its dimensions are large enough. Widgetizer may offer the Site Icon as a user-confirmed starting value, but it should not silently reuse it.

### Local business details

When the identity is a local business, the first release also includes:

- Primary telephone number.
- Price range.
- Street address.
- City/locality.
- Region.
- Postcode.
- Country.
- Opening hours.
- Closed days.
- Multiple opening ranges per day, allowing split shifts.

Persist locations as a list even though the first UI edits only one **Primary location**. This avoids committing the data model to one address while keeping multi-location management out of the first release.

Presets may suggest a suitable business category, but the user makes the final choice. A preset must not permanently determine the site's identity.

The same project-owned data should be available to Liquid so Arch can display it in footers, contact widgets, click-to-call actions, or other theme components without asking the user to enter it again.

---

## Automatic graph by page type

| Page | Automatic structured data |
|---|---|
| Homepage | `WebSite`, the primary `Organization`, `Person`, or `LocalBusiness`, and `WebPage`. |
| Ordinary page | `WebPage`. |
| About page | `AboutPage` when the user explicitly selects that page purpose. |
| Contact page | `ContactPage` when the user explicitly selects that page purpose. |
| Arch News item | `WebPage`, `BlogPosting`, and a valid `BreadcrumbList`. |
| Arch Project item | `WebPage` only for now. |
| Arch Service item | `WebPage` only for now. |

Widgetizer must not expose the full Schema.org vocabulary in a page-type dropdown. Ordinary pages need only **Automatic**, **Standard page**, **About page**, and **Contact page**. Specialized types should come from structured content models that can supply the appropriate visible information.

### News articles

Arch's News collection should opt into the core `BlogPosting` builder and map its visible content fields:

| Article meaning | Arch News field |
|---|---|
| Headline | Title |
| Publication date | Date |
| Description | Excerpt |
| Image | Featured image |
| Article content | Body |

Core adds system-owned values such as the canonical URL, modified date, page relationship, publisher when available, and absolute image URL.

The existing SEO description and social image should not automatically replace the visible excerpt and featured image. Structured data should describe the content users can see on the page. SEO values may be used only when an explicit supported mapping calls for them.

A generic `usedAsImage` marker is unnecessary. A collection can have several images with different purposes, so its semantic mapping should identify the exact image field.

### Breadcrumbs

Breadcrumbs may contain only real, canonical destinations:

- Use **Home → item** when only the item page is known.
- Use **Home → listing page → item** only when Widgetizer can resolve a real listing page.

Never invent a listing URL from a collection's `slugPrefix`. Exporting items under `news/` does not prove that a navigable News landing page exists.

---

## Supported semantic builders

Core should provide a small, closed set of structured-data builders. A collection schema selects a supported builder and maps its own fields to the semantic roles that builder understands.

For the first release, the only collection-specific builder is `BlogPosting` for Arch News. Core validates that every declared source field exists and understands how to convert its setting type.

Do not create a universal JSON-to-Liquid mapping language. Add future builders only alongside content models that can supply appropriate structured data. Product, Event, Recipe, and similar types remain out of scope until Widgetizer has matching structured collection types.

---

## Screen plan

### Project details

Project details is the home for all core-owned site identity, business, and site-wide structured-data controls. It already owns Site Title, Website Address, and Clean URLs, so these settings belong beside the other project-level facts.

The screen should be divided into clear collapsible sections or internal tabs rather than becoming one uninterrupted form.

#### Project

- Internal project title.
- Folder name.
- Notes.
- Theme and theme-update preference.

#### Website

- Site title.
- Website address / Site URL.
- Clean URLs.
- Structured-data readiness warning when Site URL is missing.

#### Site identity

- Organization, person, or local business.
- Public name.
- Dedicated identity logo.
- Email.
- Social and profile URLs.

#### Business details

Displayed only for a local business:

- Business category.
- Primary phone.
- Price range.
- Primary location and postal address.
- Opening-hours editor with closed days and split shifts.

#### Advanced SEO

- Automatic structured-data status.
- Validation summary.
- Homepage/site-identity custom JSON-LD nodes.
- A deliberate control to disable automatic structured data, with a strong warning.

### Site settings

The existing Site settings screen remains owned by Arch and focused on theme presentation:

- General theme behavior.
- Site icon and visual branding options.
- Colors.
- Typography.
- Style.
- Animations.
- Date presentation.
- Theme-specific advanced presentation or script controls.

Core identity and business forms should not be injected into this theme-generated settings form. Arch may consume project-owned identity data, but it does not define or store it.

### Page create/edit → SEO

Page-specific controls live with the existing page SEO fields:

- Page purpose: Automatic, Standard, About, or Contact.
- Readable summary of the automatic structured data for that page.
- Additional custom JSON-LD nodes scoped to that page.
- Optional page-level disable control for experts, with a warning.

### Collection item editor

News items show that Article structured data is generated automatically from their visible fields. The user does not enter article information twice.

The SEO area may contain additional custom JSON-LD nodes scoped to that item. Projects and Services show only general page structured data until a specialized builder exists.

### Preview and Export

Preview and Export report problems but do not own the data. Useful issues include:

- Missing or invalid Site URL.
- Missing identity name or logo.
- Invalid custom JSON-LD.
- Missing mapped article fields.
- Unresolvable breadcrumb destinations.
- Opening-hours or address validation problems.

Export should include structured-data issues in the existing developer-mode validation report.

---

## Advanced custom JSON-LD

Automatic generation is the primary product. Custom JSON-LD is an expert escape hatch.

The first contract should accept additional graph nodes rather than trying to merge arbitrary values deeply into generated nodes:

- Site-level custom nodes in Project details apply to the homepage/site identity graph.
- Page-level custom nodes apply only to that page.
- Collection-item custom nodes apply only to that item page.
- Duplicate generated identities produce a warning or validation error.
- Custom data is validated when saved and again during preview/export.
- Custom-only output requires deliberately disabling automatic structured data.

The existing Custom Head Scripts setting remains available, but it is not the structured-data product: it is raw, unvalidated, and not naturally scoped to individual pages or items.

---

## Single-release scope and build order

Everything below belongs to the same planned release. The grouping is implementation order, not a staged product rollout.

### Foundation

1. Core graph builder and safe serializer behind the existing `{% seo %}` output.
2. Project-owned Site identity and stable graph identities.
3. Homepage site/identity graph and ordinary `WebPage` output.

### Content semantics

4. Supported-builder declaration in collection schemas.
5. Arch News `BlogPosting` mapping from visible fields.
6. Breadcrumbs built only from verified destinations.

### Project-details experience

7. Site identity section.
8. LocalBusiness category, primary location, address, telephone, and price range.
9. Opening-hours editor with closed days and split shifts.
10. Identity/business data exposed to Liquid for theme use.

### Expert controls and quality

11. Site-, page-, and collection-item-scoped custom JSON-LD.
12. Preview/export warnings, developer-mode validation, and automated tests.

Opening hours are the largest individual UI component and should be budgeted explicitly. If the release must shrink, advanced custom JSON-LD should be reconsidered first because the existing Custom Head Scripts field provides experts with an imperfect fallback. Opening hours are more directly valuable to Widgetizer's small-business audience.

---

## Out of scope

- A universal Schema.org type selector.
- A universal theme mapping language.
- Additional core builders such as Product, Event, and Recipe without matching structured content types.
- Multi-location management UI, although the persisted location model allows it later.
- Automatic geocoding or latitude/longitude lookup.
- Any promise that valid structured data guarantees a Google rich result.

Multilingual identity and business fields need to align with the eventual multilingual design. Addresses and identifiers are mostly stable, while public descriptions and some location names may need translation. This should not invent a competing translation model.

---

## Validation and definition of done

At minimum:

- Preview and published output produce the same semantic graph.
- Clean URLs and nested collection paths produce correct absolute IDs and URLs.
- Media URLs follow the same publish rules as existing SEO images.
- Missing Site URL or identity data produces actionable warnings rather than broken properties.
- User content cannot break out of the JSON-LD script element.
- Existing projects containing `{% seo %}` gain automatic structured data without a layout update.
- Arch mappings cannot reference missing collection fields.
- Structured data uses visible content values where Google requires page-content parity.
- Breadcrumbs never link to destinations Widgetizer did not verify.
- Opening hours support closed days and more than one time range per day.
- Custom data is validated at save and again at preview/export.
- Google-supported output is checked with the Rich Results Test, while general Schema.org validity is checked separately.

Primary implementation references:

- [Google: Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Google: General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google: Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Google: Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google: Breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
- [Google Rich Results Test and Schema Markup Validator](https://developers.google.com/search/docs/appearance/structured-data)

---

## Follow-up exploration: project-owned social networks

Before implementation, explore moving social-network/profile values out of [`themes/arch/`](../themes/arch/) and into project-owned Site identity data.

The desired direction is:

- The project defines its social profiles once.
- Core can reliably use those canonical profile URLs for identity `sameAs` data.
- Arch and future themes can pull the project-owned profiles and display them wherever they choose: footer, header, contact blocks, social-link widgets, or other templates.
- The theme remains responsible for presentation, ordering, icons, visibility, and layout—not for owning the URLs themselves.

The exploration should audit the current Arch social settings, presets, global widgets, locales, theme updates, and existing project data. It should propose a compatibility and migration path so existing social links are preserved, and determine whether themes need a normalized iterable profile collection, named profile fields, or both.

---

## Open questions before implementation

Raised against the consolidated direction above. Each blocks or reshapes a specific item in the build order; none challenge the decision itself.

### 1. How does Widgetizer verify a breadcrumb listing page? (blocks build item 6)

The rule — never invent a listing URL from `slugPrefix` — is right, but the document does not say how a real listing page is *resolved*. Whoever implements breadcrumbs hits this on the first day and will invent a mechanism if the document does not supply one.

Candidate answers, none yet chosen:

- The collection schema declares a listing page UUID or canonical path.
- The user selects the listing page in Project details or the collection's settings.
- Core searches pages for one that renders the collection, and falls back to `Home → item` when it finds none or more than one.

Also undecided: what happens when the declared listing page is later deleted, unpublished, or has its slug changed. Silent fallback to `Home → item` is probably correct, but it should be a stated behaviour rather than an accident.

### 2. Social profile URLs are simultaneously in scope and deferred

**Site identity** lists "canonical social and profile URLs" as part of the first release, and the ownership table makes core responsible for `sameAs`. The follow-up section then parks the source of that data as pre-implementation *exploration*.

Both cannot hold. Those URLs live in Arch's theme settings today, so migrating them is inside this release regardless of whether the exploration runs first. The open question is only whether the migration is:

- a one-time move of existing values into project identity, with Arch reading them back; or
- a dual-read period where Arch keeps its own fields and core prefers project values when present.

The second is more forgiving for existing projects — worth deciding explicitly, since existing sites already have populated social settings that must not silently disappear from their footers.

### 3. "Page purpose" is an uncosted data-model change

The Screen plan introduces a page-level purpose selector (Automatic / Standard / About / Contact), but it appears in no other section: not in Ownership, not in the build order, not in the validation list. It implies a new persisted field on every page, its own editor control, and a default for existing pages.

Where does it live — inside the existing page `seo` object, or as a sibling field? That choice affects the page schema, the save path, and the collection-item equivalent.

### 4. Do `AboutPage` and `ContactPage` earn their cost?

Google produces no distinct rich result for either. As specified they require a persisted page field, a UI control, and a default for every existing page — in exchange for output no user will observably benefit from.

Every other item in this document has a visible payoff: breadcrumbs appear in results, articles get dates and images, identity feeds brand matching, business details drive local results. This one does not. Recommend dropping it and letting ordinary pages emit `WebPage`, which also removes question 3 entirely.

### 5. Identity kind and business category can contradict each other

Site identity stores both an identity kind (organization / person / local business) and a "most specific supported category". In Schema.org a `LocalBusiness` *is* an `Organization` subtype, so the two fields overlap and can be set to impossible combinations — `kind: person` with `category: Bakery`.

Decide whether category is constrained by kind (and disabled for a person), or whether kind is derived from the chosen category and not stored separately.

### 6. Release size — an observation, not an objection

The single-release decision is taken. For planning only, the distinct surfaces are: graph builder, safe serializer, identity data model, identity UI, business details UI, opening-hours editor, collection-schema mapping contract, breadcrumb resolution, three separately scoped custom-JSON-LD editors, preview warnings, and export/developer-mode validation.

That is comparable in size to multilang phase one. The stated cut order — advanced custom JSON-LD before opening hours — is the right one, and it is worth noting that the three custom-JSON-LD scopes (site, page, item) are three surfaces rather than one, so cutting them recovers more than the list suggests.
