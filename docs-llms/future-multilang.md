# Future: Multilanguage Support

> **Status: Direction locked, detailed design pending.** This doc records the decisions already made so deeper design work builds on them instead of re-opening settled questions. Target: the simplest workable multilang for small-to-medium sites.
>
> Revised 2026-08-06 after two review passes (Codex, Claude) and a product decision round. Both review passes are folded into the sections below — there is one answer per question here, not a discussion thread.

---

## Rejected Approaches (do not re-propose)

1. **One project per language.** Rejected because projects drift: separate theme settings, separate theme-update states, separate media libraries, and nothing keeping structure or configuration in sync over years of editing. Also duplicates every upload.
2. **Field-level overlays** (Webflow-style: one page structure, per-language values on every text setting). Kills drift by construction, but touches every setting input, richtext, and the save flow — the deepest possible integration. Also enforces structural parity across languages, which we explicitly do **not** want (see below).

## Core Model: Per-Language Pages in One Project

- Pages get a `language` field plus a shared **`translationGroupId`** linking sibling translations. Page uuids stay globally unique; the group id is what makes sibling lookup reliable.
  - *Why a group id rather than a `translationOf` pointer chain:* a pointer chain creates a privileged "root" translation and awkward behaviour when that page is deleted. A group id has no root — deleting any sibling leaves the rest intact.
- Links are **loose, not mirrors**. A page can exist in only one language. Translated versions may use completely different widgets and layouts — cultural adaptation per language is a feature, not drift to be prevented. Nothing enforces parity after creation.
- The translation group exists for exactly two consumers: **hreflang pairs** and the **language switcher**. "Translate page" seeds a copy of the source page as a starting point, then the two are independent.

**Invariant: at most one page per language in a translation group.** Two Greek siblings would make both consumers ambiguous — hreflang would emit conflicting alternates and the switcher would not know which to link. Enforced on create and on "Create <lang> version". The same invariant applies to collection items (§9a).

**Group behaviour on copy:**

| action | group |
|---|---|
| ordinary "Duplicate page/item" | **fresh** group — a duplicate is a new piece of content, not a translation |
| "Create <lang> version" | **joins** the source's group |
| project duplication | groups **preserved** as-is, so translations survive the copy |

## Locked Decisions

### 1. Activation via a project setting

- Every project has a **default language**, even single-language ones (this also replaces the currently hardcoded `lang="en"` in theme layouts).
- Additional languages are added in the project form ("Languages" section). **One language = the entire multilang UI stays invisible everywhere.** Adding a second language is the switch that turns it all on.
- Stored in project metadata (SQLite), exposed app-wide via `projectStore`, and to themes as `project.languages` / `page.language`.

#### 1a. The default language is editable only while the project is single-language

- **One language: freely editable.** Someone who accepts the default without thinking, builds twenty pages, then realises the site should be Greek must not be told to start over.
- **Two or more: locked**, with a clear message. Changing it then moves every page between the root and its language folder, changes every public URL in every language, and shifts which media metadata lives in the default columns versus the translations table. A static export cannot issue its own redirects, so a flip is an SEO event for the whole site.

If it is ever wanted after translations exist, it returns as an explicit "change site language" migration — contained work, provided the addressing layer (§Implementation Contracts) exists. Not v1.

#### 1a-i. Language is empty for default-language content

Default-language content carries **no** `language` value; only non-default content is tagged explicitly. The root folder *is* the default language.

This is what makes the single-language switch above genuinely free — it updates one project setting and nothing else, instead of retagging every page, menu, global, and collection item. It also removes a whole class of bug: a stored tag can drift out of sync with the folder a file lives in, a derived one cannot.

The cost is that "find all English pages" means matching empty-when-English. That lives in the addressing layer, so it is one place, not everywhere.

**Persisted is empty; resolved is never empty.** The absence is a storage detail and must not leak past the loader, or every consumer ends up writing its own `language || defaultLanguage` fallback and one of them gets it wrong.

| layer | value |
|---|---|
| persisted root-language file | `language` absent |
| loaded page / item / menu / global model | `language` = `project.defaultLanguage` |
| `page.language` in Liquid | always a real code, never empty |

#### 1b. Language identifier format

- **Simple ISO 639-1 codes in the UI** (`en`, `el`, `it`) — valid in `<html lang>` and `hreflang`, and right for the target sites.
- **Validation and storage accept a wider BCP 47 subset** (`^[a-z]{2}(-[a-z0-9]{2,8})?$`), so adding `pt-br` later needs no migration. Cheap insurance, no v1 complexity.
- Store and path-build in **lowercase**; emit canonical casing (`pt-BR`) in `lang` / `hreflang` output.
- **RTL languages are not supported in v1** — they need `dir="rtl"` plumbing and theme work. They are absent from the picker *and* **rejected by the service/API**: hiding an option is not enforcement, and the language endpoint would otherwise accept `ar` from any direct call. Revisit as its own piece.
- **Existing projects migrate to `en`**, which is also the default for new projects.

#### 1c. Removing a language is destructive, behind a confirmation modal

Removing a language is supported in v1 and **deletes** that language's content: its pages, its collection items, its header/footer, its menus, and its media metadata rows — and cleans the media-usage records of everything deleted, so no orphaned usage keeps an image marked as in-use. Uploaded binaries are shared and are never touched.

- The confirmation modal states exactly what will be deleted — counts of pages, collection items, and menus — and that it cannot be undone. It uses the standard destructive-action modal (`variant: "danger"`).
- **The default language cannot be removed.** Removing it would be the root-ownership change §1a rules out; the only way to drop it is to remove the other languages first, at which point §1a's single-language rule applies.

#### 1d. Site language is not editor language

The project's language is the *visitor-facing* site language. It has no relationship to the language of the admin interface (which is driven by the editor's own i18n locales, currently `en` only). Setting a site to Greek must never switch the editor UI to Greek.

### 2. Adding a language seeds only the skeleton

Auto-copy just the singletons the new language needs to render at all: **header, footer, and menus** (tagged with the new language). **Never mass-copy pages** — that would produce dozens of fake "translated" pages full of source-language text exported under `/en/`. Pages are translated one by one, deliberately.

#### 2a. Seeding never rewrites links

A seeded page or menu keeps the page references it inherited from the source language. We do not remap, clear, or rewrite them.

- **Page content is the author's.** Links inside widgets and richtext are content; the author owns them.
- **For menus this is also the only coherent option.** At the moment a language is added, no pages exist in it yet (see above) — so there is nothing in the target language to remap *to*. The real choice is "keep the source-language targets" or "clear them and leave items pointing nowhere". Keeping them preserves the menu's structure, which is what makes it a useful starting point: the author re-points each item as they translate that page.
- The failure mode is visible, not silent: an unfixed Greek menu sends visitors to English pages, which anyone opening their own site notices immediately. That is a different class of problem from silent data loss and is acceptable to leave to the author.

### 3. Pages list: language tabs + status chips

- Language tabs above the pages table. The active tab filters the list; new pages inherit the tab's language.
- Each row shows small chips for the other languages: **filled** = translation exists (click to open), **hollow** = missing (click = "Create <lang> version", which seeds from this page and joins them into the same translation group). That one control is the whole translation workflow.

### 4. Page editor: context follows the page, no global mode

- No app-wide "editing language" state to forget about. Opening a Greek page renders the Greek header/footer in the canvas automatically.
- A small language menu on the current page jumps to its siblings or creates a missing one.

#### 4a. Pickers show every language, grouped and filterable

Link pickers and menu pickers list pages from **all** languages, grouped by language, with a language filter. The view defaults to the current page's language so the common case stays one click.

*Why not filter to the page's language:* the Core Model explicitly allows a page to exist in only one language. If a Careers page exists solely in English, a picker that hides other languages makes it impossible to link to — the design permits the situation while the UI forbids the remedy. It also fits the same principle as §2a: authors own their links; hiding options decides for them.

The original intent — don't let authors wire cross-language links *by accident* — is preserved through visibility instead of prohibition: **a link pointing at another language carries a small language tag on the item.** It is a label, not a warning. This also means the cross-language targets inherited by seeded menus (§2a) need no special-case UI; they render as ordinary entries that happen to sit in another language's group.

### 5. Per-language singletons

- **Header/footer**: independent per-language instances (no shared-with-overrides machinery). Default globals stay at `pages/global/`; non-default at `pages/<lang>/global/`.
- **Menus**: multiple menus already exist per project; menus stay in `menus/` and get a `language` tag (empty = default, per §1a-i).

#### 5a. Seeding order: menus first, then remap

Adding a language copies singletons in a fixed order, because the header and footer reference menus *by uuid*:

1. Copy the default language's menus, giving each a **fresh uuid**
2. Keep an old-uuid → new-uuid map
3. Copy header/footer, rewriting their **menu references** through that map

Without step 3 the Greek header still points at the English menus. Note this is a different thing from §2a: rewriting a header's *menu reference* is fixing scaffolding we generated, not touching the *page links* inside menu items, which stay exactly as inherited.

### 6. Media: one shared library, per-language metadata

- The grid, uploads, and binaries stay exactly as today — shared across languages (the whole point of staying in one project).
- Only the metadata drawer changes: language pills above **alt/title/caption**. The default language keeps the existing `media_files` columns; other languages **fall back to the default at render time**, so untranslated metadata never breaks output. The `{% image %}` tag already reads metadata at render time and just picks the current language.
- **Storage: a normalized translations table keyed by `(media_file_id, language)`**, with the existing columns remaining the default language. Chosen over a JSON column because it indexes and batches, avoids rewriting a blob to change one language, and matches the existing `mediaRepository` pattern.
- **`NULL` and `""` mean different things.** `NULL` (or no row) = inherit the default language. `""` = intentionally blank. Without that distinction a decorative image cannot have deliberately empty alt text in a translated language — it would silently inherit the default's description instead, which is worse for accessibility than no alt at all.

### 7. Export: zero configuration

- Default language exports at `/`, others at `/el/`, `/it/`, etc.
- Emits `<html lang>`, hreflang pairs from the translation group, and per-language sitemap entries.
- Rendering non-default languages at `/<lang>/` depth reuses the machinery collection item pages already use (`outputPathPrefix` + `prefixInternalHref`), with the depth **derived** rather than hardcoded (see §Implementation Contracts).
- The language switcher is a **theme concern**: a header setting reading `page.translations`. This depends on the render-context change in §Implementation Contracts.

#### 7a. File shape and Clean URLs

The language is a folder; nothing about the existing file shape changes. Clean URLs keeps doing exactly what it does today — it rewrites **SEO URLs only** (canonical links and the sitemap), never the exported filenames or internal links.

| | file on disk | canonical / sitemap URL |
|---|---|---|
| Clean URLs **off** | `el/contact.html` | `/el/contact.html` |
| Clean URLs **on** | `el/contact.html` | `/el/contact` |

- **hreflang URLs follow Clean URLs**, since they are SEO URLs like the canonical.
- **The language switcher emits ordinary internal links**, so it keeps `.html` like every other link in the output.

#### 7b. An enabled language with no homepage is skipped

Adding a language enables its authoring UI immediately; that does not make it exportable. An enabled **non-default** language with no homepage is **omitted from the export**, and the export result carries a **prominent user-visible warning** naming it. A server-log-only warning would make a partially published site too easy to miss. No readiness state machine — one rule.

**The default language is not subject to this.** A missing default-language homepage still fails the entire export, as it does today (`exportController` throws "Export failed: No homepage found"). Skipping the root language would produce a site with no `/` at all.

#### 7c. `page.translations` — the theme contract

One array, two consumers with different rules, so each entry carries both link forms and says which kind it is:

```liquid
{% for t in page.translations %}
  <a href="{{ t.href }}" {% if t.active %}aria-current="true"{% endif %}>{{ t.label }}</a>
{% endfor %}
```

| field | meaning |
|---|---|
| `language` | code as stored, lowercase (`el`) |
| `hreflang` | canonically cased code for markup (`el`, `pt-BR`) |
| `label` | the language's **native** name (`Ελληνικά`, not "Greek") — a switcher is read by someone who does not yet read the current language |
| `href` | internal link for the switcher: **depth-aware and always file-shaped** (`../el/contact.html`) |
| `seoUrl` | **absolute** and Clean-URL-aware (`https://site.com/el/contact`) |
| `active` | this is the page being rendered |
| `fallback` | `true` when this points at the language's homepage because no sibling exists |

**`href` and `seoUrl` cannot be one field.** The switcher is a link inside a static page, so it needs a relative path to a real file; hreflang is metadata for crawlers, so it needs an absolute canonical URL. One value cannot be both.

- **The switcher uses `href`, and may use every entry**, fallbacks included — landing a visitor on the homepage beats a dead end.
- **hreflang uses `seoUrl`, and only entries where `fallback` is false.** Declaring the homepage as the English version of `/el/contact` is false, and search engines either ignore the whole set or index the wrong page.
- **Both exclude languages omitted from the export** (§7b). A link to a language that was never written is a 404.

Locking this shape early matters because the switcher is a theme feature: once themes ship against it, it cannot be changed retroactively.

The same array is supplied to collection item pages (§9a), so a theme's switcher works identically there.

### 8. Slugs are unique per language, not per project

Both languages naturally want the same slug (e.g. `gallery`). With project-wide uniqueness, `generateUniqueSlug` would mint `gallery-1` and the suffix leaks into the public URL forever (`/el/gallery-1`). Instead:

```
source file              exported file        public URL (Clean URLs on)
pages/gallery.json    →  gallery.html      →  mysite.com/gallery       (default language)
pages/el/gallery.json →  el/gallery.html   →  mysite.com/el/gallery    (Greek)
```

- Non-default languages live in `pages/<lang>/` subfolders, mirroring the export URL structure.
- **Collection items follow the same principle** — they live flat at `collections/<type>/<slug>.json` today and have the identical collision problem — but note the **storage and output orders differ**, deliberately:

```
collections/news/story.json     →  news/story.html      →  mysite.com/news/story
collections/news/el/story.json  →  el/news/story.html   →  mysite.com/el/news/story
```

  Storage nests language *under* the type, so a collection type's items stay together in one folder. Output puts language *first*, because the public URL groups the whole site by language. Both are right for their own purpose; the addressing layer owns the translation between them.
- Uniqueness checks scope to the language folder. Page uuids (and collection item uuids) stay globally unique, so links and menus are unaffected.
- Nothing forces slug parity either: Greek `epikoinonia` pairs with English `contact` through the translation group, not the slug.
- **Why locked early:** everything downstream keys off page identity — `getAllPages` listing, media-usage source strings, link resolution, export paths. Deciding the layout first makes the language folder part of the page's path from day one; retrofitting it later means a migration.

### 9. Collections are in scope for v1

Collections ship with multilang, not after it. Items get a `language` + translation group like pages; collection widgets (the `| collection` filter) filter items by the rendering page's language. Item URLs nest as `/<lang>/<slugPrefix>/<itemSlug>`.

This makes the §8 collection storage layout an implemented contract rather than a reserved one, and makes the derived-output-depth work (§Implementation Contracts) mandatory in v1 — a Greek news item sits two directory levels deep where today the exporter assumes one.

#### 9a. Item authoring mirrors the pages workflow

Collections get the same three controls as pages (§3, §4), for the same reasons — there is no argument for a second, different translation workflow in the same product:

- **Language tabs** above the items table; the active tab filters, new items inherit its language.
- **Translation chips** per row: filled = sibling exists (click to open), hollow = missing (click = "Create <lang> version", seeding from this item and joining the group).
- **A language menu on the item editor** jumping to siblings or creating a missing one.

Items obey the same one-per-language invariant and the same copy rules as pages (§Core Model).

Item pages receive the same `page.translations` contract as pages (§7c) so a theme's switcher works identically on an item page.

**`slugPrefix` is NOT translated** (decided): the prefix from the collection-type definition is identical across languages — `/news/my-story` and `/el/news/my-story`, never `/el/nea/my-story`. Only the `/<lang>/` segment varies. This matches how mainstream CMSs and their multilang plugins handle base slugs by default, and keeps the type definition language-free.

### UI conventions

- Language labels are **codes or names, never flags** (flags are countries, not languages).
- Tabs are the model up to ~4–5 languages, which covers the small/medium target. Don't design for more now.

---

## Implementation Contracts

Derived from tracing the page, link, preview, media, rendering, and export code. The principal engineering risk is not the language UI — it is that page identity and slug-derived paths already participate in many systems. These are the contracts to make explicit before implementation.

### A single language-aware addressing layer (the central seam)

Language awareness belongs in shared helpers, not in scattered `if (language !== defaultLanguage)` branches. One layer should own:

- page storage keys and global-widget keys
- collection-item keys
- public output paths and **derived output depth**
- media-usage source identities
- language-scoped uniqueness checks

Callers pass language plus content identity; they never assemble `pages/<lang>/...` themselves. This mirrors why the backend went scope-first with `Scope` and adapters (see `core-packages.md`) — callers stopped building paths by hand. The pure path/URL helpers belong in `@widgetizer/core` beside `linkPrefixer.js`, so both shells and the render engine can use them.

### Phase-one correctness blockers

1. **Media-usage identity must become collision-proof for every translated content type.** Usage sources are currently human-readable strings that all collide once the same name exists per language:

   | today | collides because | replace with |
   |---|---|---|
   | `<pageSlug>` | §8 allows the same slug per language | `page:<uuid>` |
   | `collection:<type>/<slug>` | same, for items | `collection:<uuid>` |
   | `global:header` | one header per language, same id | `global:root:<type>` (default) / `global:<language>:<type>` (non-default) |

   Uuids are already globally unique, so they sidestep the problem entirely; globals have no uuid, hence the segment. **Default globals use `root`, not the language code** — `global:en:header` would strand its usage rows the moment a single-language project switches its default from `en` to `el`, breaking §1a's one-setting-only guarantee. `root` names the position, which survives the switch. This is **data loss, not an addressing cleanup** — deleting a Greek page can strip media still in use by its English sibling — and must land before same-slug translations can be saved. (`global:theme-settings` is project-wide and unaffected; theme settings stay shared.)

2. **Global-widget render context must carry `page` and `project`.** `renderWidget()` receives no page data — only `renderPageLayout()` does. Header and footer render through `renderWidget()`, so the §7 language switcher (a header setting reading `page.translations`) cannot be built until the context contract is extended. This is a prerequisite of a locked decision, not an optional cleanup.

3. **Output depth must be derived, not hardcoded.** `exportController.js` passes `outputPathPrefix: "../"` as a literal. Replacing it with another literal is insufficient — the correct prefix depends on the final path (`el/news/story.html` is two levels deep, `news/story.html` one). Note `depthRenderSmoke.test.js` only exercises depth-1 today, so nothing currently guards this.

### Assumptions that must change

- Page API/storage readers enumerate only root-level `pages/*.json` (`listPagesFromDir` filters `isFile()`, so subfolders are invisible); global widgets are fixed at `pages/global/{header,footer}.json`.
- Page UUID maps, link-target pickers, menu resolution, richtext resolution, delete cleanup, project duplication, and preset enrichment assume one project-wide page set with no render-language filter.
- Standalone preview routes are slug-only (`/preview/:pageId`), and the in-iframe link mapper understands only root pages and one-level collection item paths. **Preview routes keep an explicit content namespace** — `/preview/page/el/contact`, `/preview/collection/el/news/story` — rather than mirroring the public path literally. `/preview/el/contact` is ambiguous: `el` could be a language or a collection prefix, and nothing in the path resolves it.
- Static export requires one root `index` page, writes flat root `.html` files, generates one canonical per slug, and builds sitemap/robots data without language alternates.
- **Translated forms are separate submission streams in v1 — and that separation must be built, not assumed.** The forms manifest derives form and field identifiers from visitor-facing labels (`handleizeKey(label)`, which transliterates non-Latin scripts), so an English "Contact" and a Greek "Epikoinonia" naturally become two forms. But label-derived keys alone do **not** guarantee separation: a copied not-yet-translated form has identical labels, so the manifest silently merges the two streams into one; a *partially* translated form (same transliterated name, different field labels) collides on the key with different fields, which today **fails the whole export** (`formsManifestService` treats same-key/different-fields as an error). And `page_path` is built flat (`/${outputFilename}`) with no language folder. v1 therefore needs **language-qualified form keys** and **addressing-layer-generated page paths**. Unifying streams instead would need an author-set form id (a seeded copy gets a fresh uuid, so uuid identity cannot work) — product surface belonging to the forms work. Splitting by language is also defensible on its own: knowing which language a visitor wrote in is useful. How per-language streams count against the forms-per-site ceiling is an open hosted decision (see §Hosted product questions); OSS is unbounded.

### Hosted product questions (no OSS impact — the local adapter returns `Infinity`/unbounded for every count limit)

- `LIMIT_KEYS.MAX_PAGES_PER_PROJECT` exists in `@widgetizer/core` and the local adapter answers it, but **no controller enforces it** — whether translations count toward a per-project page ceiling is a hosted pricing question with nothing to change in code today.
- `LIMIT_KEYS.MAX_COLLECTION_ITEMS` **is actively enforced** (`collectionController` checks it on create). **OPEN:** do translated items count physically (one story in three languages = three items against the cap) or per translation group? Until decided, physical counting is what the code does.
- `LIMIT_KEYS.MAX_FORMS_PER_SITE` — was a constant hardcoded in `formsManifestService.js` and thus enforced on OSS exports too; now adapter-backed like every other count limit (OSS `Infinity`, hosted-contract default 5, checked at export). **OPEN:** how the cap works on a multilingual site. Note **group-based counting is not available here**, unlike collection items: forms deliberately have no stable cross-language identity in v1 (that is what makes them separate streams), so there is no group to count. The viable choices are: each language-qualified stream consumes a slot (5 collapses at the 4–5-language target — 2 forms × 3 languages = 6 keys); raise or remove the hosted cap for multilingual sites; or introduce stable form-group ids, which expands v1 scope.

---

## Phase Boundaries

**In v1:** everything in Locked Decisions above, including collections (§9), dynamic `<html lang>`, hreflang generation, and localized month names (scheduled last — see below).

**Deferred to its own project — a site-runtime theme translation API.** Visitor-facing strings baked into layouts, snippets, and collection `template.liquid` (Arch currently hardcodes "Skip to main content") cannot be translated today. The eventual answer is a site-runtime translation namespace usable from layouts, snippets, widgets, and collection templates, kept conceptually separate from the existing editor-facing `tTheme:` schema-label locales. That is a new theme-facing API surface plus a locale-authoring story plus adoption work in every theme — comparable in size to multilang itself, so it does not ride along.

For v1: **move** Arch's hardcoded visitor-facing strings into per-language header content or settings, and document the authoring rule that themes must not hardcode site-facing copy.

**"Move", never "delete".** Arch's `layout.liquid` hardcodes "Skip to main content" — an accessibility feature for keyboard and screen-reader users. Removing the string to satisfy the no-hardcoded-copy rule would remove the feature. The label becomes translatable content; the skip link itself stays.

**Theme settings stay shared** (they're design tokens). Rule of thumb: translatable text belongs in widgets, not theme settings.

---

## Open Questions (for the next design round)

- **SEO details:** self-referential hreflang entries, `x-default`, and whether site-facing `siteTitle` becomes per-language.
- **Per-language 404 page** in exports.
- **Editor-side language indicators** beyond the tabs/chips/menus already specified.

---

## Localized month names — in v1, scheduled last

`packages/core/src/utils/dateFormat.js` holds fixed `MONTHS_SHORT` / `MONTHS_FULL` arrays and nothing is locale-aware, so a Greek site renders "31 December 2026" — an English month on a Greek page, visible on every article.

**In scope for v1 and release-blocking** — a multilingual site emitting English month names is a multilang output defect, not a background gap, so v1 does not ship without it. **Sequenced last** only because it is independent of everything above: no other decision waits on it.

Two constraints for whoever picks it up:

- `Intl.DateTimeFormat` makes this contained, but the file's timezone-safe contract must survive — it deliberately splits the `YYYY-MM-DD` string rather than constructing a local `Date`, so any replacement must format in UTC explicitly.
- The existing format tokens are a fixed, user-chosen list (the app's date-format setting). Localizing must not silently change which format a site already uses — only which language the month is rendered in.

This is not covered by the theme-string work above: these strings live in core, not in a theme.

---

## Note for the next reviewer

Fourth revision. All review passes and product decision rounds are folded into the sections above — one authoritative answer per question, no appended discussion, and no historical change-log here: the sections themselves are the record. (Earlier revisions of this note summarized superseded states of the doc and had drifted out of sync with it — per review, the summaries are gone.)

**This round's corrections, applied:**

| raised | now |
|---|---|
| stale closing note contradicting the sections | this note rewritten; historical tables removed |
| separate form streams not actually guaranteed | §Assumptions — identical labels currently *merge* streams, partial translation *fails export*, `page_path` is flat; v1 needs language-qualified form keys + addressing-layer paths |
| `global:<language>:<type>` breaks the free default switch | §Blocker 1 — default globals use `global:root:<type>`; language codes only on non-default |
| language removal omitted collection items | §1c — items deleted, usage records cleaned, counts shown |
| month names both required and optional | §Localized month names — release-blocking, sequenced last |
| `MAX_COLLECTION_ITEMS` interaction unrecorded | §Hosted product questions — enforced today, so translations consume the item allowance; hosted must lock that or count groups. OSS unaffected (`Infinity`) |
| `MAX_FORMS_PER_SITE` misfiled as hosted-only | **fixed in code, not just the doc** — the hardcoded constant is now adapter-backed (`LIMIT_KEYS.MAX_FORMS_PER_SITE`; OSS `Infinity`, hosted default 5). §Hosted product questions marks the two remaining counting decisions OPEN: items physical-vs-group, and form slots × languages |

**Worth a look:**

1. **§7c is the last thing that should move.** It is a frozen theme contract in both link forms; once a theme ships a switcher against it, it cannot change. If a field is still missing — `dir` for future RTL, a region label — this is the moment.
2. **§9a assumes collections mirror the pages workflow exactly.** Deliberate, but collections carry different volumes: if a hundred news items make tabs-and-chips the wrong shape, say so now.
3. **Separate form streams (v1) is a product call, not a technical limit.** Defensible on its own merits, but if per-language submission splitting is unacceptable to users, stable form ids become a v1 dependency and that changes scope.
