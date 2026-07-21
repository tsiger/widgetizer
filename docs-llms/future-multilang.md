# Future: Multilanguage Support

> **Status: Direction locked, detailed design pending.** This doc records the decisions already made so deeper design work builds on them instead of re-opening settled questions. Target: the simplest workable multilang for small-to-medium sites.

---

## Rejected Approaches (do not re-propose)

1. **One project per language.** Rejected because projects drift: separate theme settings, separate theme-update states, separate media libraries, and nothing keeping structure or configuration in sync over years of editing. Also duplicates every upload.
2. **Field-level overlays** (Webflow-style: one page structure, per-language values on every text setting). Kills drift by construction, but touches every setting input, richtext, and the save flow — the deepest possible integration. Also enforces structural parity across languages, which we explicitly do **not** want (see below).

## Core Model: Per-Language Pages in One Project

- Pages get a `language` field plus a loose **"translation of"** link between pages (via the existing stable page uuids).
- Links are **loose, not mirrors**. A page can exist in only one language. Translated versions may use completely different widgets and layouts — cultural adaptation per language is a feature, not drift to be prevented. Nothing enforces parity after creation.
- The translation link exists for exactly two consumers: **hreflang pairs** and the **language switcher**. "Translate page" seeds a copy of the source page as a starting point, then the two are independent.

## Locked Decisions

### 1. Activation via a project setting

- Every project has a **default language**, even single-language ones (this also replaces the currently hardcoded `lang="en"` in theme layouts).
- Additional languages are added in the project form ("Languages" section). **One language = the entire multilang UI stays invisible everywhere.** Adding a second language is the switch that turns it all on.
- Stored in project metadata (SQLite), exposed app-wide via `projectStore`, and to themes as `project.languages` / `page.language`.

### 2. Adding a language seeds only the skeleton

Auto-copy just the singletons the new language needs to render at all: **header, footer, and menus** (tagged with the new language). **Never mass-copy pages** — that would produce dozens of fake "translated" pages full of source-language text exported under `/en/`. Pages are translated one by one, deliberately.

### 3. Pages list: language tabs + status chips

- Language tabs above the pages table. The active tab filters the list; new pages inherit the tab's language.
- Each row shows small chips for the other languages: **filled** = translation exists (click to open), **hollow** = missing (click = "Create <lang> version", which seeds from this page and links them). That one control is the whole translation workflow.

### 4. Page editor: context follows the page, no global mode

- No app-wide "editing language" state to forget about. Opening a Greek page renders the Greek header/footer in the canvas automatically.
- A small language menu on the current page jumps to its siblings or creates a missing one.
- Link pickers and menu pickers filter to the page's language, so a Greek page can't accidentally be wired into the English menu.

### 5. Per-language singletons

- **Header/footer**: independent per-language instances (no shared-with-overrides machinery).
- **Menus**: multiple menus already exist per project; menus get a `language` tag for filtering and for the seeding step above.

### 6. Media: one shared library, per-language metadata

- The grid, uploads, and binaries stay exactly as today — shared across languages (the whole point of staying in one project).
- Only the metadata drawer changes: language pills above **alt/title/caption**. The default language keeps the existing columns; other languages **fall back to the default at render time**, so untranslated metadata never breaks output. The `{% image %}` tag already reads metadata at render time and just picks the current language.

### 7. Export: zero configuration

- Default language exports at `/`, others at `/el/`, `/it/`, etc.
- Emits `<html lang>`, hreflang pairs from the translation links, and per-language sitemap entries.
- Rendering non-default languages at `/<lang>/` depth reuses the machinery collection item pages already use (`outputPathPrefix` + `prefixInternalHref`).
- The language switcher is a **theme concern**: a header setting reading `page.translations`, falling back to the other language's homepage when the current page has no sibling.

### 8. Slugs are unique per language, not per project

Both languages naturally want the same slug (e.g. `gallery`). With project-wide uniqueness, `generateUniqueSlug` would mint `gallery-1` and the suffix leaks into the public URL forever (`/en/gallery-1/`). Instead:

```
pages/gallery.json      → mysite.com/gallery/        (default language)
pages/en/gallery.json   → mysite.com/en/gallery/     (English)
```

- Non-default languages live in `pages/<lang>/` subfolders, mirroring the export URL structure.
- **Collection items follow the same layout**: they live flat at `collections/<type>/<slug>.json` today and have the identical collision problem, so non-default-language items move to `collections/<type>/<lang>/<slug>.json`.
- Uniqueness checks scope to the language folder. Page uuids (and collection item uuids) stay globally unique, so links and menus are unaffected.
- Nothing forces slug parity either: Greek `epikoinonia` pairs with English `contact` through the translation link, not the slug.
- **Why locked early:** everything downstream keys off page identity — `getAllPages` listing, media-usage source strings (page slugs), link resolution, export paths. Deciding the layout first makes the language folder part of the page's path from day one; retrofitting it later means a migration.

### UI conventions

- Language labels are **codes or names, never flags** (flags are countries, not languages).
- Tabs are the model up to ~4–5 languages, which covers the small/medium target. Don't design for more now.

## Deferred (same patterns, later phases)

- **Collections**: items get a `language` + translation link like pages; collection widgets (the `| collection` filter) filter items by the rendering page's language. Item URLs nest as `/<lang>/<slugPrefix>/<itemSlug>/`.
- **`slugPrefix` is NOT translated** (decided): the prefix from the collection-type definition is identical across languages — `/news/my-story/` and `/en/news/my-story/`, never `/en/nea/`. Only the `/<lang>/` segment varies. This matches how mainstream CMSs and their multilang plugins handle base slugs by default, and keeps the type definition language-free.
- **Theme settings** stay shared (they're design tokens). Rule of thumb: translatable text belongs in widgets, not theme settings.

## Open Questions (for the next design round)

- Storage shape for per-language media metadata (translations table vs JSON column; existing columns stay the default language either way).
- **Hardcoded site-facing strings in collection `template.liquid`.** Widget text is translatable for free (per-page settings), but item-page templates have no per-page settings — a "Read more" / "Back to news" baked into the template renders in one language everywhere. Options: per-language theme strings (Shopify-style `| t` locales for site-facing text) vs. an authoring rule that collection templates must not hardcode visitor-facing text. Not decided.
- Exact mechanics of per-language header/footer files and how the render pipeline selects them.
- Per-language 404 page in exports.
- Preview flow and any editor-side language indicators beyond the tabs/chips above.
