# Tasks — plain English

Two lists: what is in the current GitHub milestone, and what we have found but not yet scheduled. Technical detail for every item is in [the agent version](TODO-agents.md), under the same ID.

- **Milestone** items follow GitHub: their status is the board column, and they leave this list when the issue closes.
- **Findings** are not scheduled. To schedule one, open a GitHub issue in a milestone and move it up.

## OSS 0.9.10 milestone

| Issue | What | GitHub status | Who |
| --- | --- | --- | --- |
| [#115](https://github.com/tsiger/widgetizer/issues/115) | Multilingual sites | To Be Reviewed | anastis, tsiger |
| [#162](https://github.com/tsiger/widgetizer/issues/162) | Desktop app: links that open a new window go to the browser | To Be Reviewed | tsiger |

Closed in this milestone: 26 issues (the milestone's Closed tab).

## Findings, not scheduled

### Bugs

- **UI-LIST-REPLY** — a bad reply from the server crashes the Pages screen or empties editor screens. Show a clear "couldn't load" instead.
- **GH148** — the testimonial carousel shows part of the next card on phones (reported on 0.9.9).
- **GH154** — on the Linux desktop app, "View site" fails.
- **SKIPPED-ITEM-NOTICE** — a collection item with a broken address disappears with nothing on screen to say so.
- **THEME-UPLOAD-CLEANUP** — a theme update upload that fails near the end can leave its new versions installed.
- **THEME-UPDATE-RESUME** — after a crash mid theme update the site looks broken until the update is pressed again.
- **THEME-UPDATE-REMOVED-FOLDER** — when a theme version drops a whole folder (for example all its collection types), sites that update keep the old one.
- **THEME-UPDATE-STAGE-CLEANUP** — if a theme update can't delete its temporary folder, the next update can pick up stale files from it.
- **THEME-UPDATE-PREPARE-DIRS** — getting a theme update ready creates empty page folders in the site, which stay behind if the update then fails.
- **PREVIEW-SCRIPT-URL** — a badly written theme script address stops a widget's live preview.
- **EDITOR-THEME-USAGE-NOTICE** — a site-settings save in the editor says "this page" in its image notice.
- **SETTINGS-LOAD-RETRY** — Site settings doesn't retry after a failed load.
- **MISSING-IMAGE-MESSAGE** — a theme save with a deleted image just says "Please try again".
- **THEME-CHECKER** — the theme checker passes a few things that break on export and crashes on one valid tag.
- **LANG-PREFIX-WARNING** — the theme checker's "this prefix looks like a language code" warning is a best guess: it misses a few codes a site could add and the docs describe it as more exact than it is.
- **GH159** — when a link's target page is deleted or its language removed, the menu item or button keeps its label but publishes as a link to nowhere that just reloads the page. For tsiger: what to publish instead isn't decided. The issue proposes showing the menu item as plain text and leaving the button out, while the editor keeps showing them so they can be re-pointed.
- **PROJECT-DETAILS-STALE** — if you save Project details and switch to another project's details within a second, the old save can make the first project active again (sending you back to the Projects list) or show its messages on the new page.
- **BACKUP-ZIP-NAME** — backups download as `project-export.zip` instead of the project's name (seen in the dev setup; the packaged app may be fine).
- **PREVIEW-FORM-SUBMIT** — submitting a form in the preview shows a raw "Cannot POST" error; say forms work once published instead.

### Improvements

- **LANG-NAME-IN-SENTENCES** — some messages mix languages, like "Ελληνικά added." or "Ελληνικά version created."; inside an English sentence the language should read "Greek". Revisit later.
- **ITEM-COPY-NUMBERING** — duplicating a copied item gives "X (Copy) (Copy)"; number it "X (Copy 2)" like pages and menus.
- **MULTILANG-ONLY-SETTINGS** — the header's language switcher settings show on single-language sites, where they do nothing. Let themes mark settings as "only with several languages" so the editor hides them.
- **T66** — form errors should say which field to fix and how.
- **T53** — make the three-dot menus easier to use with a keyboard.
- **VIDEO-EMBED-FILTER** — read YouTube/Vimeo links properly in one shared filter (Shorts, unlisted links, bad IDs).
- **T73** — let themes choose "|" instead of "-" between page and site titles.
- **SEO-DATA-EXTRAS** — optional extras Google suggests for the search-engine information: an author on news articles, a full time on publication dates, and the page's language.
- **MEDIA-USAGE-TITLES** — the Media screen makes many requests to name where each file is used; on big multilingual sites one request from the server would be better.

### Decisions

- **T76** — can a site's main language change once it has translations?
- **MEDIA-BLANK-ALT** — allow deliberately blank alt text in one language, or drop the idea.
- **MENU-LANG-FALLBACK** — when a language's menu is deleted, that language's pages show the main language's menu, unless the header's menu was picked by hand (then they show none). Decide: never fall back (proposed, plus a warning when deleting a menu a header uses), or keep the fallback and say so.
- **ARCH-DEFAULT-WORDS** — Arch's editable starting texts ("Skip to main content", "Menu", "Read more", "View all", headings like "Latest News") stay English on translated pages until the owner edits them. Decide: translate them per language (proposed first for the header and "Read more"/"View all"), or leave them as the owner's to change.
- **DATE-ORDER-LANG** — dates keep the site's one date order in every language, so Greek shows "Μαρτίου 15, 2026" instead of "15 Μαρτίου 2026". Decide whether each language gets its own order.
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
