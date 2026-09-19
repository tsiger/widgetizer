# Future: Roadmap — the eight-stage series

> **Status 2026-09-19: the series is built.** Order decided 2026-09-09, revised 2026-09-15 so stages 5–7 went before multilang and multilang started from a clean slate. Each stage was finished before the next began, and each landed groundwork the later ones used. All of it is on branch `0.9.10`.
>
> **What comes next is not a stage.** The domain review (`domain/review-questions.md`) raised eight questions about rules that may be incomplete or inconsistent between two paths that ought to agree — stale media usage after a half-failed save, a language removed while another window writes to it, a backup that has to come back whole, an operation reporting success it did not have. Two independent reviews concluded the architecture is sound and needs no multilang refactor, so these are contracts and tests on top of it, worked one at a time. **Multilang's last step, the docs, deliberately comes after them**, so it writes down decisions rather than guesses.

| # | stage | shipped | design doc |
|---|---|---|---|
| 0 | **Groundwork** — a `page_url` / `item_url` filter so a theme has one way to link to a page, and one Site URL base helper so every generated absolute URL (canonical, og:image, sitemap, robots, JSON-LD ids, hreflang) is joined the same way | 2026-09-12 | — |
| 1 | **Breadcrumbs** — one trail per page from explicit associations only; themes draw it with a core snippet or their own markup | 2026-09-12 | `future-breadcrumbs-design.md` |
| 2 | **Collection pagination** — paginated copies of the page hosting a listing widget (`blog.html`, `blog/page/2.html`), switched on per widget | 2026-09-14 | `future-pagination-design.md` |
| 3 | **Structured data** — automatic JSON-LD through the existing SEO tag; project-owned site identity and business details | 2026-09-15 | `future-structured-data-design.md` |
| 4 | **Multilang** — per-language pages in one project, language folders, translation groups, hreflang, switcher | steps 0–24 by 2026-09-19 (`d0442659`); step 25 (docs) held until the review questions are settled | `future-multilang-design.md` |
| 5 | **Undo history** — undo survives saves, rapid edits coalesce, limit 150 / 500 ms window | 2026-09-15 (`e4379a50`) | `core-page-editor.md`, Undo/Redo System |
| 6 | **Rename to "Widgetizer Desktop"** — visible text only | 2026-09-15 (`8fae65c5`) | §Stage 6 below |
| 7 | **Upload file names** — uploaded media keep their words | 2026-09-16 | §Stage 7 below |
| 8 | **Theme strings a visitor reads** — a `site` root in the theme's locales, a `t` filter, and settings whose default comes from it. Arch swept, Greek shipped, and a theme may ignore all of it | 2026-09-19 | `theming.md` §Site strings |

The built-in widgets got the same treatment on 2026-09-19 (`22a93fa5`): `core-form` reads in the page's language from a `site` dictionary that ships with the app and that a theme may override key by key. Not a stage of the series — it came out of reviewing what stage 8 had left behind.

## Two things that must not be undone

**Stage 6 — `productName` stays `Widgetizer`.** Electron derives the data folder (`app.getPath("userData")`), the macOS bundle and the Windows install folder from it, so renaming it would hide existing projects and risk a second app after an update. The installer `artifactName`, `appId` and the Mac app-menu name stay too. Only visible text changed; the editor reads its name from `packages/editor-ui/src/lib/appName.js`, because the hosted product mounts the same UI and must still say "Widgetizer".

**Stage 7 — stored upload names stay ASCII.** Tested 2026-09-16 by bypassing the normalizer: uploads, thumbnails, the media route and the identity logo all handle `東京.png` fine, but a widget image with such a name renders the placeholder and never reaches the export. `sanitizationService`'s `SAFE_IMAGE_PATH_RE` allows `[A-Za-z0-9._/-]` only, because `{% image %}` writes `src` unescaped and an unfiltered name is an XSS sink. Allowing non-ASCII means moving that boundary from an allowlist to escaping at every output — a security change, not a naming one.

Still open from stage 7, if it ever comes up: renaming a file after upload (every reference would have to move with it), and whether tool/camera prefixes (`ChatGPT Image …`, `Screenshot … at …`) should be stripped rather than kept.

## Rules that held across all stages

- Preserve correct single-language, non-paginated exports byte-for-byte. The only sanctioned departures were tested URL corrections in groundwork, the pagination sort tie-break (exact ties order by newest `created`, then `uuid`), and the deliberate `<html lang>` change in multilang.
- Path and URL logic lives in `@widgetizer/core` helpers (`internalHref.js`, `contentAddress.js`), never in a theme template or a controller.
- Theme-facing contracts — the `pagination` object, `page.translations`, `project.identity` — are frozen once Arch ships against them.
- The task tracker is never cited from these docs; reasons go inline.
