# Future: Roadmap — eight items, built in series

> **Status: order decided 2026-09-09, revised 2026-09-15. Stages 0–3 and 5–7 shipped on branch `0.9.10` (groundwork and breadcrumbs 2026-09-12, pagination 2026-09-14, structured data, undo history `e4379a50` and the "Widgetizer Desktop" rename `8fae65c5` 2026-09-15).** Revised order: stages 5 → 6 → 7 first, then the open minor fixes and hands-on testing, then multilang (stage 4) from a clean slate. Stage 7 (upload file names) was built 2026-09-16. **Multilang started 2026-09-16; steps 0–24 are in as of 2026-09-19 (`d0442659`), leaving only step 25 (docs).** Stage 8 came out of step 22 and shipped the same day. Hands-on testing began 2026-09-18 on a two-language test project. Nothing is urgent; each stage is finished and shipped before the next starts, and each lands groundwork the later ones use instead of rewriting. This page is the entry point — start here, then open the stage's own doc.

| stage | what ships | design doc | what it lands for later stages |
|---|---|---|---|
| **0. Groundwork** | **(a)** A `page_url` filter (`'index' | page_url`) exposing the existing link helpers and replacing the Arch header logo's inline Clean-URLs `if`. Preset CTA links already gain page references during setup; change defaults only if a failing case is demonstrated. **(b)** One Site URL base helper so every generated absolute URL — canonical, og:image, sitemap, robots, later JSON-LD ids and hreflang — is joined the same way. | `future-multilang-implementation-plan.md`, steps 0 and 1 | One way for a theme to link to a page; one way to build an absolute URL. |
| **1. Breadcrumbs** | Core computes one trail per page from explicit associations only — a parent page for pages, a listing anchor (else the single listing page) for items, homepage by slug, `Home → page` when nothing is set — and themes draw it with a core snippet or their own markup. Needed by the Widgetizer marketing-site theme. | `future-breadcrumbs-design.md` | The widget-schema `collection` declaration and the listing **anchor** flag (pagination and structured data both consume them); the `breadcrumbs` trail that structured data's `BreadcrumbList` reuses; the optional parent-page field. |
| **2. Collection pagination** | Paginated copies of the page hosting a listing widget (`blog.html`, `blog/page/2.html`), switched on per widget. | `future-pagination-design.md` | Derived output depth, the addressing module (output / public / preview paths), the `page` reserved page and item slug, one collection snapshot per export; extends the `collection` declaration with the per-page setting. |
| **3. Structured data** | Automatic JSON-LD through the existing SEO tag; project-owned site identity and business details that Arch shows in the footer. | `future-structured-data-design.md` | Every widget (header and footer included) rendering with `page` and `project` in context; the split between stable facts and translatable text (`text` keys in `site_identity`); the `project.identity` theme contract. |
| **4. Multilang** | Per-language pages in one project, language folders, translation groups, hreflang, switcher. | `future-multilang-design.md` (decisions) + `future-multilang-implementation-plan.md` (steps) | — |
| **5. Undo history** | Undo survives saves (manual and autosave); rapid edits to one setting coalesce into one step; the step limit goes up. Bug-fix sized, editor stores only. | §Stage 5 on this page | — (independent of the other stages; last only because nothing waits on it) |
| **6. Rename to "Widgetizer Desktop"** | The names people read in the OSS app become "Widgetizer Desktop" — window and dialog titles, loading and error screens, About box, sidebar footer, README, store listing. Anything that affects how the app works (`productName`, installer file name, `appId`, data and install folders) stays `Widgetizer`. | §Stage 6 on this page | — (independent; can be done at any point, ideally with a release) |
| **7. Upload file names** | Uploaded media keep their words: one hyphen between them, lower case, transliterated, cut at 60 characters. | §Stage 7 on this page | — (independent; overlaps with image optimization, which changes extensions) |
| **8. Theme strings a visitor reads** *(shipped 2026-09-19)* | The words a theme puts on the published page — `Next`, `Pause`, `Closed`, every screen-reader label — stopped being typed into the theme. A `site` root in the theme's locales, a `t` filter, and settings whose default comes from it. Arch swept, Greek shipped. A theme may ignore all of it. | `future-theme-strings-plan.md` | The rule that a theme never hardcodes what a visitor reads, and the per-language locale file a second theme would use. |

## Reading order when picking this up

1. This page.
2. `future-multilang-implementation-plan.md` — its Phase 0 lists the shared groundwork with file names and done-when criteria, and marks which stage each piece ships in.
3. The design doc of the stage you are on. Each one states where it sits in the series and what it inherits.

## Stage 5 — Undo history (independent)

Decided 2026-09-09. Built 2026-09-15, ahead of multilang: stages 5–7 and the open minor fixes go first so multilang starts from a clean slate. As built, the history limit is 150 and the grouping window 500 ms; the page-editor doc (`core-page-editor.md`, Undo/Redo System) describes the result. Small enough to live here instead of its own doc; touches only `packages/editor-ui/src/stores/pageStore.js`, `saveStore.js` and their tests.

- **Undo survives saves.** Today every successful save — manual or the 60-second autosave — wipes the 50-step history. The wipe was added 2026-06-27 (user-test item EDIT-045) because Undo after a save "re-dirtied" the page. That is undo working, not a bug: undoing past a save makes the page dirty and autosave re-saves it, which is what every editor does. Remove the `temporal.clear()` call at the end of `saveStore.save()`; keep the one in `pageStore.loadPage`. Nothing else changes — dirtiness is value-based against the last-saved copy, and undo/redo already reconciles the dirty ledger and re-arms autosave. Flip the `saveStore.test.js` case that asserts the wipe.
- **Coalesce keystrokes.** There is no grouping: each character typed into a setting is one history entry (`SettingsPanel.handleSettingChange` → `updateWidgetSettings` → zundo `handleSet`). Group consecutive edits to the same widget + setting within a short idle window (~500 ms) into one entry — replace the last entry instead of pushing — in the `handleSet` wrapper in `pageStore.js`. A step then means an action, not a keystroke.
- **Raise the limit** from 50 to 100–200 once grouping is in. Entries share structure with their neighbours, so memory is not a concern; the whole-snapshot comparison `handleSet` already does per edit does not grow with the limit.

Done when: undo after an autosave still works and marks the page dirty; typing a sentence is one undo step; three cases verified by hand — undo while a save is in flight, theme-settings undo across a save, undo after the server corrected a value on save.

## Stage 6 — Rename the app to "Widgetizer Desktop" (independent)

Decided 2026-09-09. The hosted SaaS product is called **Widgetizer**; the OSS/Electron app becomes **Widgetizer Desktop** so users and support can tell them apart. This is a *display-name* change only: `widgetizer` stays as the package name, `appId` (`com.widgetizer.app`), data folder, repo, theme names and every code identifier. Changing those would break existing installs and auto-update.

**As built (2026-09-15):** narrowed to visible text. `productName` stays `Widgetizer` — Electron derives the data folder (`app.getPath("userData")`), the macOS bundle and the Windows install folder from it, so renaming it would hide existing projects and risk a second app after an update. The installer `artifactName` and the Mac app-menu name (`app.name`) stay too. Changed: the unresponsive, loading, startup-error and crash dialogs plus the Help › About item and About box in `electron/main.js`; the `index.html` title; the sidebar footer and logo alt text, which read `APP_NAME` from `packages/editor-ui/src/lib/appName.js` (the OSS Vite build defines `__APP_NAME__` as "Widgetizer Desktop"; any shell that doesn't define it gets "Widgetizer"); the import dialog text no longer names the product; the README Desktop App line; the Store listing name and copy in `release-microsoft-store.md`. The logo artwork is the owner's to replace. The survey below is the original plan.

Where the name is visible today (surveyed 2026-09-09):

- **Installer and OS surfaces** — `productName` and `artifactName` in `electron/builder.config.mjs` (installer file name, Start-menu / Applications entry, window title, macOS bundle name). Keep `appId` unchanged.
- **Electron process strings** — `electron/main.js`: the not-responding dialog title, the startup/loading screen `<title>` and "Starting Widgetizer…", the server-failed error page and dialog, the About box (title, message, menu label), the fatal-start error box.
- **Web page title** — `index.html` `<title>`.
- **Editor UI** — `appTitle` in `packages/core/src/locales/en.json`; the import-backup description string in the same file ("…previously downloaded from Widgetizer"); the sidebar brand in `packages/editor-ui/src/components/layout/SidebarMeta.jsx`. The editor-ui package is also mounted by the hosted product, so these must come from a shell-supplied name (the OSS shell passes "Widgetizer Desktop", hosted passes "Widgetizer") rather than a hardcoded string.
- **Public docs** — `README.md` ("Desktop App" section and title), the Microsoft Store listing in `docs-llms/release-microsoft-store.md`, GitHub release titles going forward.

Done when: a fresh install shows "Widgetizer Desktop" everywhere a user can see a name; **an existing 0.9.x install auto-updates into the renamed build without leaving a second app behind** (the macOS bundle name and the Windows install folder change with `productName` — test the update path on both before shipping); the hosted product still shows "Widgetizer" in the shared editor UI; `grep -rn "Widgetizer Desktop"` hits no code identifier.

## Stage 7 — Upload file names (independent)

Added 2026-09-15, built 2026-09-16. Uploaded media used to lose the words in their names: the old step slugified with `strict`, which DELETES anything that is not a letter or digit rather than separating on it, so `filename_like_that.jpg` became `filenamelikethat.jpg` and `IMG_4032.jpg` became `img4032.jpg`.

**As built** — `normalizeUploadName` (`packages/builder-server/src/utils/uploadFileName.js`), used by the upload pre-pass in `mediaController`:

- Every non-letter, non-digit becomes one hyphen, collapsed, with no hyphen left at either end: `logo (final)_v2.svg` → `logo-final-v2.svg`, `hero.v2.png` → `hero-v2.png`, `invoice_2026_09_15_client#4412.pdf` → `invoice-2026-09-15-client-4412.pdf`.
- Name and extension are lower-cased; accents and other scripts are transliterated by `slugify`: `Café déjà vu.png` → `cafe-deja-vu.png`, `Привет мир.png` → `privet-mir.png`.
- A name left empty (a script `slugify` cannot transliterate, e.g. CJK, or emoji only) falls back to `image` in `images/` and `file` in `files/`, then the existing `-1`, `-2` dedupe applies.
- Cut at 60 characters on a hyphen boundary (mid-word only when there is no boundary past 60%). Windows' 260-character path limit leaves room for ~155, so 60 is a readability choice, not a technical one.
- Input is normalized to NFC first, so a decomposed accent (macOS filenames) is part of its letter rather than a separator: both forms of `Müller.png` give `muller.png`.
- Resized copies are unchanged (`hero-thumb.jpg`) and existing uploads are never renamed; the `-1`, `-2` dedupe now compares case-insensitively, so a legacy `photo.JPG` makes the next upload `photo-1.jpg` instead of a `photo.jpg` that would overwrite it on Windows and macOS.
- Separately fixed: the uploaded name is now decoded from multer's latin1 bytes before being stored as `originalName`, which used to save mojibake (`東京.png` → `æ±äº¬.png`).

**Why the stored name stays ASCII.** Tested 2026-09-16 by bypassing the normalizer and uploading `東京.png` and a Greek-named file: upload, thumbnails, the media route (percent-encoded) and the site-identity logo all worked, and the JSON-LD URL was correctly encoded. But a widget image with such a name renders the placeholder and never reaches the export — `sanitizationService`'s `SAFE_IMAGE_PATH_RE` allows `[A-Za-z0-9._/-]` only, because `{% image %}` writes `src` unescaped and an unfiltered name is an XSS sink. Allowing non-ASCII stored names therefore means moving that boundary from an allowlist to escaping at every output — a security change, not a naming one. Not done.

**Open, if it ever comes up:** renaming a file after upload (every reference — pages, collection items, the identity logo, theme settings — would have to move with it; media usage tracking already knows where each file is used), and whether tool/camera prefixes (`ChatGPT Image …`, `Screenshot … at …`) should be stripped rather than kept verbatim.

## Rules that hold across all stages

- Preserve correct single-language, non-paginated exports byte-for-byte, allowing explicitly tested URL corrections in groundwork, the pagination-stage sort tie-break (exact ties on a sort key now order by newest `created`, then `uuid`), and the deliberate `<html lang>` change in multilang.
- Path and URL logic lives in `@widgetizer/core` helpers (`internalHref.js`, the addressing module), never in a theme template or a controller.
- Theme-facing contracts — the `pagination` object, `page.translations`, `project.identity` — are frozen once Arch ships against them. Get the fields right before that.
- The task tracker is never cited from these docs; reasons go inline.
