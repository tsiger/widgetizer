# Multilang — the decisions that still bind

> **Status: built.** Steps 0–24 shipped 2026-09-16 … 2026-09-19 (`d0442659`). Only step 25 (docs) is open, and it is deliberately held until the domain review questions are settled so it records decisions rather than guesses: it moves what is here into `core-architecture.md`, `core-packages.md`, `theming.md` and `user-test-checklist.md`, after which this file goes.
>
> This is what a reader still needs: the approaches that were rejected, the rules that are not visible in the code, and the contract that cannot change. The build order and the per-step "as built" notes were deleted once the steps were done — they are readable in full at `30304f3a` (`future-multilang-design.md`, `future-multilang-implementation-plan.md`).

## The model

Per-language pages inside **one** project. A page carries a `translationGroupId` (falling back to its own `uuid`) linking sibling translations; at most one page per language per group. Links between siblings are **loose, not mirrors** — a page may exist in one language only, and translations may use different widgets entirely. Cultural adaptation is a feature, not drift. The group exists for exactly two consumers: hreflang pairs and the language switcher.

A duplicate gets a **fresh** group; "Create `<lang>` version" **joins** the source's group; project duplication **preserves** groups.

**Rejected, do not re-propose:** one project per language (projects drift — separate theme settings, update states, media libraries, and every upload duplicated) and field-level overlays (Webflow-style per-language values on every setting — touches every input and the save flow, and enforces structural parity we explicitly do not want).

## Rules that are not obvious from the code

**Language is derived from the folder, never stored.** Default-language content carries no `language` value; the root folder *is* the default language. Non-default content lives in `pages/<lang>/`, `pages/<lang>/global/`, `menus/<lang>/`, `collections/<type>/<lang>/`. A stored tag can drift out of sync with the folder a file lives in; a derived one cannot. **Persisted is empty; resolved is never empty** — the absence stops at the loader, so no consumer writes its own `language || defaultLanguage` fallback. Every key is built by `packages/core/src/utils/contentAddress.js`, which is the single place the two are compared.

**The default language is locked once a second language exists.** While a project is single-language it is freely editable — someone who builds twenty pages and then realises the site should be Greek must not start over. After that, changing it would move every page between the root and a language folder, change every public URL, and shift which media metadata sits in the default columns. A static export cannot issue redirects, so a flip is an SEO event for the whole site. If it is ever wanted it comes back as an explicit "change site language" migration. *(The form disables that select with nothing explaining why — TODO §76.)*

**Adding a language seeds only the skeleton** — header, footer and menus, never pages. Mass-copying would produce dozens of fake translations full of source-language text exported under `/el/`.

**Seeding never rewrites links, and that is not a bug.** A seeded page or menu keeps the page references it inherited. For menus it is the only coherent option: at the moment a language is added no pages exist in it yet, so there is nothing to remap *to*. The choice is "keep the source-language targets" or "clear them and leave items pointing nowhere", and keeping them preserves the structure that makes the menu a useful starting point. An unfixed Greek menu sending visitors to English pages is the author's to fix as they translate each page — visible, not silent, and not a defect to report.

Distinct from that: adding a language **does** rewrite the header and footer's *menu references*, because menus are copied first with fresh uuids and the scaffolding we generated must point at the copies.

**Removing a language deletes that language's content** — pages, items, header/footer, menus, media metadata rows, and the media-usage records of everything deleted. Shared binaries are never touched. Behind the standard `variant: "danger"` modal, stating the counts. The default language cannot be removed.

**Pickers show every language**, grouped and filterable, defaulting to the current page's language. The model allows a page to exist in one language only, so a picker that hides other languages makes such a page impossible to link to. A cross-language target carries a small language tag on the item — a label, not a warning.

**Enabled language codes are reserved names.** A root page slug or a collection `slugPrefix` may not equal an enabled code, and enabling a code that collides with one is refused, naming the conflict. `pages/el.json` exports to `el.html` while Greek exports under `el/`; with Clean URLs on, `/el` is both. Only *enabled* codes are reserved. `page` is reserved too, in every language folder — it is the pagination segment. Non-root slugs are unaffected: `pages/el/it.json` is the Greek page named "it".

**Slugs are unique per language, not per project** — otherwise `gallery-1` leaks into a public URL forever. Storage and output order differ deliberately: `collections/news/el/story.json` → `el/news/story.html`. Storage nests language under the type so a type's items stay together; output puts language first because the public URL groups the site by language. **`slugPrefix` is not translated** — `/el/news/my-story`, never `/el/nea/my-story`.

**Media is one shared library with per-language metadata** (alt/title/caption), stored in a translations table keyed by `(media_file_id, language)`; the existing columns are the default language. `NULL` means inherit; `""` means intentionally blank — without that a decorative image cannot have deliberately empty alt text in a translated language.

**Media-usage identities are uuid-based** (`page:<uuid>`, `collection:<uuid>`), and globals use `global:root:<type>` for the default language. `root` names the position, which survives a default-language switch; `global:en:header` would strand its rows the moment a single-language project changed its default.

**Translated forms are separate submission streams.** Form keys are language-qualified; unifying them would need an author-set form id, which belongs to the forms work.

**An enabled language with no homepage is skipped from the export** and named in a prominent user-visible warning. A missing *default*-language homepage still fails the whole export — skipping the root language would produce a site with no `/` at all.

## `page.translations` — frozen theme contract

One array, supplied to pages and collection item pages alike. Frozen: Arch ships a switcher against it.

| field | meaning |
|---|---|
| `language` | code as stored, lowercase (`el`) |
| `hreflang` | canonically cased for markup (`el`, `pt-BR`) |
| `label` | the language's **native** name (`Ελληνικά`, not "Greek") — a switcher is read by someone who does not yet read the current language |
| `href` | internal link for the switcher: depth-aware and Clean-URLs-aware (`../el/contact.html`, or `../el/contact`) |
| `seoUrl` | **absolute** and Clean-URL-aware (`https://site.com/el/contact`) |
| `active` | this is the page being rendered |
| `fallback` | `true` when this points at the language's homepage because no sibling exists |
| `dir` | text direction — `ltr` for everything v1 accepts; `rtl` reserved, so RTL support never changes a shipped theme's switcher |

`href` and `seoUrl` cannot be one field: the switcher is a link inside a static page and needs a relative path to a real file; hreflang is crawler metadata and needs an absolute canonical URL.

- **The switcher uses `href` and may use every entry**, fallbacks included — landing a visitor on the homepage beats a dead end.
- **hreflang uses `seoUrl` and only entries where `fallback` is false.** Declaring the homepage as the English version of `/el/contact` is false, and search engines either ignore the whole set or index the wrong page.
- **Every hreflang set includes a self-reference** (a set without one is invalid) **and `x-default`**, pointing at the default-language sibling or, failing that, the default-language homepage. That is the one place a `fallback` entry is legitimate.
- **A single-language project emits no hreflang at all.**
- Both exclude languages omitted from the export — a link to a language that was never written is a 404.

## Not in v1

- **RTL languages.** They need `dir="rtl"` plumbing and theme work; absent from the picker *and* rejected by the service, because hiding an option is not enforcement.
- **A per-language site title**, and a per-language 404 page.
- **Editor-side language indicators** beyond the tabs, chips and page menu that shipped.

## Hosted questions (no OSS impact — the local adapter returns `Infinity`)

- `MAX_PAGES_PER_PROJECT` exists but no controller enforces it; whether translations count toward a ceiling is a pricing question.
- `MAX_COLLECTION_ITEMS` **is** enforced on create. Open: do translated items count physically (one story in three languages = three) or per translation group? Physical is what the code does.
- `MAX_FORMS_PER_SITE` is adapter-backed (hosted default 5), checked at export. Open: group counting is **not** available here — forms deliberately have no cross-language identity, so there is no group to count. Either each language-qualified stream takes a slot (2 forms × 3 languages = 6 keys, so 5 collapses), or the cap rises for multilingual sites, or stable form-group ids get built.
