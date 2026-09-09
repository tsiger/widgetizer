# Future: Roadmap — seven items, built in series

> **Status: order decided 2026-09-09.** Nothing is urgent; each stage is finished and shipped before the next starts, and each lands groundwork the later ones use instead of rewriting. This page is the entry point — start here, then open the stage's own doc.

| stage | what ships | design doc | what it lands for later stages |
|---|---|---|---|
| **0. Groundwork** | **(a)** A `page_url` filter (`'index' | page_url`) replacing the Arch header logo's inline Clean-URLs `if`; also fixes the header CTA default that ships as a raw `contact.html`. **(b)** One Site URL base helper so every absolute URL — canonical, og:image, sitemap, robots, later JSON-LD ids and hreflang — is joined the same way. | `future-multilang-implementation-plan.md`, steps 0 and 1 | One way for a theme to link to a page; one way to build an absolute URL. |
| **1. Breadcrumbs** | Core computes one trail per page — parent page, else menu position, for pages; listing anchor, else the single listing page, for items; homepage by slug — and themes draw it with a core snippet or their own markup. Needed by the Widgetizer marketing-site theme. | `future-breadcrumbs-design.md` | The widget-schema `collection` declaration and the listing **anchor** flag (pagination and structured data both consume them); the `breadcrumbs` trail that structured data's `BreadcrumbList` reuses; the optional parent-page field. |
| **2. Collection pagination** | Paginated copies of the page hosting a listing widget (`blog.html`, `blog/page/2.html`), switched on per widget. | `future-pagination-design.md` | Derived output depth, the addressing module (output / public / preview paths), the `page` reserved name; extends the `collection` declaration with the per-page setting. |
| **3. Structured data** | Automatic JSON-LD through the existing SEO tag; project-owned site identity and business details that Arch shows in the footer. | `future-structured-data-design.md` | Global widgets rendering with `page` and `project` in context; the split between stable facts and translatable text. |
| **4. Multilang** | Per-language pages in one project, language folders, translation groups, hreflang, switcher. | `future-multilang-design.md` (decisions) + `future-multilang-implementation-plan.md` (steps) | — |
| **5. Undo history** | Undo survives saves (manual and autosave); rapid edits to one setting coalesce into one step; the step limit goes up. Bug-fix sized, editor stores only. | §Stage 5 on this page | — (independent of the other stages; last only because nothing waits on it) |
| **6. Rename to "Widgetizer Desktop"** | Every user-visible name of the OSS app becomes "Widgetizer Desktop" — installer, window and dialog titles, sidebar brand, About box, README, store listing. Code identifiers, package names, ids and folder names stay `widgetizer`. | §Stage 6 on this page | — (independent; can be done at any point, ideally with a release) |

## Reading order when picking this up

1. This page.
2. `future-multilang-implementation-plan.md` — its Phase 0 lists the shared groundwork with file names and done-when criteria, and marks which stage each piece ships in.
3. The design doc of the stage you are on. Each one states where it sits in the series and what it inherits.

## Stage 5 — Undo history (independent)

Decided 2026-09-09. Small enough to live here instead of its own doc; touches only `packages/editor-ui/src/stores/pageStore.js`, `saveStore.js` and their tests.

- **Undo survives saves.** Today every successful save — manual or the 60-second autosave — wipes the 50-step history. The wipe was added 2026-06-27 (user-test item EDIT-045) because Undo after a save "re-dirtied" the page. That is undo working, not a bug: undoing past a save makes the page dirty and autosave re-saves it, which is what every editor does. Remove the `temporal.clear()` call at the end of `saveStore.save()`; keep the one in `pageStore.loadPage`. Nothing else changes — dirtiness is value-based against the last-saved copy, and undo/redo already reconciles the dirty ledger and re-arms autosave. Flip the `saveStore.test.js` case that asserts the wipe.
- **Coalesce keystrokes.** There is no grouping: each character typed into a setting is one history entry (`SettingsPanel.handleSettingChange` → `updateWidgetSettings` → zundo `handleSet`). Group consecutive edits to the same widget + setting within a short idle window (~500 ms) into one entry — replace the last entry instead of pushing — in the `handleSet` wrapper in `pageStore.js`. A step then means an action, not a keystroke.
- **Raise the limit** from 50 to 100–200 once grouping is in. Entries share structure with their neighbours, so memory is not a concern; the whole-snapshot comparison `handleSet` already does per edit does not grow with the limit.

Done when: undo after an autosave still works and marks the page dirty; typing a sentence is one undo step; three cases verified by hand — undo while a save is in flight, theme-settings undo across a save, undo after the server corrected a value on save.

## Stage 6 — Rename the app to "Widgetizer Desktop" (independent)

Decided 2026-09-09. The hosted SaaS product is called **Widgetizer**; the OSS/Electron app becomes **Widgetizer Desktop** so users and support can tell them apart. This is a *display-name* change only: `widgetizer` stays as the package name, `appId` (`com.widgetizer.app`), data folder, repo, theme names and every code identifier. Changing those would break existing installs and auto-update.

Where the name is visible today (surveyed 2026-09-09):

- **Installer and OS surfaces** — `productName` and `artifactName` in `electron/builder.config.mjs` (installer file name, Start-menu / Applications entry, window title, macOS bundle name). Keep `appId` unchanged.
- **Electron process strings** — `electron/main.js`: the not-responding dialog title, the startup/loading screen `<title>` and "Starting Widgetizer…", the server-failed error page and dialog, the About box (title, message, menu label), the fatal-start error box.
- **Web page title** — `index.html` `<title>`.
- **Editor UI** — `appTitle` in `packages/core/src/locales/en.json`; the import-backup description string in the same file ("…previously downloaded from Widgetizer"); the sidebar brand in `packages/editor-ui/src/components/layout/SidebarMeta.jsx`. The editor-ui package is also mounted by the hosted product, so these must come from a shell-supplied name (the OSS shell passes "Widgetizer Desktop", hosted passes "Widgetizer") rather than a hardcoded string.
- **Public docs** — `README.md` ("Desktop App" section and title), the Microsoft Store listing in `docs-llms/release-microsoft-store.md`, GitHub release titles going forward.

Done when: a fresh install shows "Widgetizer Desktop" everywhere a user can see a name; **an existing 0.9.x install auto-updates into the renamed build without leaving a second app behind** (the macOS bundle name and the Windows install folder change with `productName` — test the update path on both before shipping); the hosted product still shows "Widgetizer" in the shared editor UI; `grep -rn "Widgetizer Desktop"` hits no code identifier.

## Rules that hold across all stages

- A single-language, non-paginated project must export byte-for-byte what it exports today after every stage (allowing for the deliberate `<html lang>` change in multilang).
- Path and URL logic lives in `@widgetizer/core` helpers (`internalHref.js`, the addressing module), never in a theme template or a controller.
- Theme-facing contracts — the `pagination` object, `page.translations`, `project.identity` — are frozen once Arch ships against them. Get the fields right before that.
- The task tracker is never cited from these docs; reasons go inline.
