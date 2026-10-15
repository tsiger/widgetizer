# Tasks — plain English

Two lists: what is in the current GitHub milestone, and what we have found but not yet scheduled. Technical detail for every item is in [the agent version](TODO-agents.md), under the same ID.

- **Milestone** items follow GitHub: their status is the board column, and they leave this list when the issue closes.
- **Findings** are not scheduled. To schedule one, open a GitHub issue in a milestone and move it up.

## OSS 0.9.10 milestone

| Issue | What | GitHub status | Who |
| --- | --- | --- | --- |
| [#115](https://github.com/tsiger/widgetizer/issues/115) | Multilingual sites | To Be Reviewed | anastis, tsiger |
| [#122](https://github.com/tsiger/widgetizer/issues/122) | Search-engine information (structured data) | To Be Reviewed | anastis |
| [#126](https://github.com/tsiger/widgetizer/issues/126) | Leave-page prompt froze typing on Windows | To Be Reviewed | anastis |
| [#133](https://github.com/tsiger/widgetizer/issues/133) | Form limits for embedding apps | To Be Reviewed | anastis |
| [#134](https://github.com/tsiger/widgetizer/issues/134) | Undo keeps working after autosave | To Be Reviewed | tsiger |
| [#155](https://github.com/tsiger/widgetizer/issues/155) | Theme labels refresh after a theme update | To Be Reviewed | anastis |
| [#156](https://github.com/tsiger/widgetizer/issues/156) | No English left on translated pages | To Be Reviewed | anastis |
| [#117](https://github.com/tsiger/widgetizer/issues/117) | Featured image as the fallback social image | Todo | tsiger |

Closed in this milestone: 15 issues (the milestone's Closed tab).

## Findings, not scheduled

### Bugs

- **UI-LIST-REPLY** — a bad reply from the server crashes the Pages screen or empties editor screens. Show a clear "couldn't load" instead.
- **EXPORT-CLASH-LANG** — in a translated language, a collection can silently overwrite pages on export. Refuse the export with a clear message.
- **GH148** — the testimonial carousel shows part of the next card on phones (reported on 0.9.9).
- **GH154** — on the Linux desktop app, "View site" fails.
- **GH153** — pages and menus a theme update adds aren't linked like a new project's, so their links don't follow renames.
- **SKIPPED-ITEM-NOTICE** — a collection item with a broken address disappears with nothing on screen to say so.
- **TRANSLATION-CREATE-NAV** — creating a translation and leaving the list before it finishes pulls you into its editor anyway.
- **THEME-UPLOAD-CLEANUP** — a theme update upload that fails near the end can leave its new versions installed.
- **THEME-UPDATE-RESUME** — after a crash mid theme update the site looks broken until the update is pressed again.
- **MEDIA-USAGE-LABELS** — "Used in" shows codes like "El:header (Global)" for translated content.
- **PREVIEW-SCRIPT-URL** — a badly written theme script address stops a widget's live preview.
- **THEME-WARNING-LABEL** — a theme-save warning names the setting by an internal code.
- **UNDO-CLEAN** — undoing back to the saved state leaves Save enabled.
- **PAGINATE-UNDO** — turning on "Split into pages" takes three undos and changes the item count out of view.
- **EDITOR-THEME-USAGE-NOTICE** — a site-settings save in the editor says "this page" in its image notice.
- **SETTINGS-LOAD-RETRY** — Site settings doesn't retry after a failed load.
- **MISSING-IMAGE-MESSAGE** — a theme save with a deleted image just says "Please try again".
- **THEME-CHECKER** — the theme checker passes a few things that break on export and crashes on one valid tag.

### Improvements

- **T66** — form errors should say which field to fix and how.
- **T53** — make the three-dot menus easier to use with a keyboard.
- **VIDEO-EMBED-FILTER** — read YouTube/Vimeo links properly in one shared filter (Shorts, unlisted links, bad IDs).
- **T73** — let themes choose "|" instead of "-" between page and site titles.

### Decisions

- **T76** — can a site's main language change once it has translations?
- **MEDIA-BLANK-ALT** — allow deliberately blank alt text in one language, or drop the idea.
- **GH138** — edit a project's details from the project list?
- **GH128** — which extra image-optimisation tools to add.
- **T54** — which accessibility standard to aim for.
- **T57** — should the editor style guide also cover components?
- **T72** — how theme authors package a new base version.
- **SYMLINK-PATHS** — refuse shortcut folders inside a project, or document that they're not supported.

### Checks (not confirmed bugs)

- **RENDER-LANG** — site-wide links in theme settings may point to the main language on translated pages (not Arch).
- **MENU-MEDIA-USAGE** — a file linked from a menu may not count as "used".
- **T41** — the preview may slow down over long sessions.
- **T44** — published image file names may clash in some preset cases.
- **T64** — some failures may look like an empty list or vanish too fast.
- **T32** — two theme uploads may share a temporary folder.
- **T38** — reading the active project can also pick one automatically.
- **T58** — one backend test once failed only in the full suite.

### Later, only when the need arises

T4 browser smoke test · T17 stricter old tests · T33 repeated editor code · T39 usage labels during a refresh · T43 template trust review · T61 preview startup warnings · T63 unused publishing route · T67 export links through linked folders · T71 real-navigation prompt tests · R1-COORD structural overlap · R1-RESTART edits across a restart · R1-CONTRACT shared save rules · R2-REPAIR repair dead links · R2-MENU menu matching for new setting types · R3-DRAFT recover work after a language is removed · R3-FOLDERS empty language folders · R5-NESTED links inside structured settings · R8-ARCHIVE unusual backup formats · QA-EXTRA extra checks when changing an area

### Embedding apps (not OSS release work)

T74 complete page-render entry point · H-PAGES enforce a page allowance · H-WRITES consistent custom saves · H-ADAPTERS verify adapters · H-RENDER custom publishing · H-BACKUP custom backup and language setup · H-THEMES custom theme updates · T30 project copying · T49 helpers through storage adapters · H-MULTIPROCESS several servers on one project
