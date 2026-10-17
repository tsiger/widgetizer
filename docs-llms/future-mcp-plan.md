# Future: Widgetizer MCP — Implementation Plan

> **Status: In progress for 1.0.** Build order for the design in `future-mcp.md`. Work happens on the `mcp` branch. Each milestone ends with passing tests, a review of the diff, and a short note on what to try in the app.

## Progress

- **M0 — done** (`d48762c6`…`ae7598e4`, packaging fix `35691e75`). Tried by the maintainer with Claude Desktop and Codex; the unsigned packaged builds work on macOS and Windows, and the `.mcpb` installs and connects in Claude Desktop. Still open: verifying signed builds before release. Decided: keep the bundled Node runtime for the relay.
- **M1 — done** (`c9d00efc`, `eb373c82`). Fourteen read-only tools, reviewed by Codex until no findings remained. Tried by the maintainer: works.
- **M2a — built, reviewed by Codex (no findings), not yet tried by the maintainer.** Turning access on in the desktop app goes through the app's own prompt (see M2's first bullet). Isolating the preview itself was dropped: embeds, maps and theme scripts must keep working as they do. To try it, use a packaged build (`npm run electron:build:win:unsigned`, then `dist-electron\win-unpacked\Widgetizer.exe`); `electron:dev` runs without the editor credential and behaves like the browser version. Check: Turn On shows the system prompt, Cancel leaves access off, Allow turns it on; the window still takes keyboard input afterwards; Turn Off needs no prompt; exports and media open in a plain app window, outside links in the browser. Afterwards `npm run dev:all` rebuilds `better-sqlite3` for Node.
- **M2b–M2e — built and committed 2026-10-17, each reviewed by Codex until no findings; waiting for the maintainer's test.** M2b: every site write passes a gate inside the content-write section (refusals answer 423); snapshots capture and restore a site's content files and rows; one Widgetizer per data folder (OS lock on `owner.lock`, held until the process exits). M2c: jobs with start handshake, Stop, Undo, site switch, recovery after a crash (Try again / Keep), the editor lock and event stream, stale-save refusal. M2d: Undo banner, shortcuts and saves stand still while locked, media drawer counts as unsaved. M2e: `edit_sections` (sections and blocks of a page, header or footer; library media by id, page and item links by name; limits: 3 targets, no removing more than half).
- **M3–M5 — built and committed 2026-10-17, reviewed by Codex until no findings; waiting for the maintainer's test.** M3: Allow/Cancel (the job waits; desktop asks in a window of its own, the browser version in the lock screen; disconnect or restart while asking turns into Keep/Undo), limits counted across the job, image bytes held for undo only when a kept copy needs them. M4: tools for pages, menus, look, site details, collection items, image descriptions, languages and translations, calling the editor's own routes as the job; open_site and create_site after every window confirms it has nothing unsaved; listing and pagination settings editable; preset images marked. M5: Widgetizer's own completion record (what changed, next steps such as replacing demo photos), and the editor goes once to the changed page. Deviation: export is not offered to the assistant yet.
- **Next: the maintainer tries M2–M5 in a packaged build** (`npm run electron:build:win:unsigned`, then `dist-electron\win-unpacked\Widgetizer.exe`; afterwards `npm rebuild better-sqlite3`). Check: turn access on, ask Claude Desktop for a change — the editor locks, then a note lists what changed with Undo and the editor opens the changed page; Undo puts everything back; a large change (several pages) asks Allow/Cancel; Stop halfway puts the site back; new page, menu, language, collection item, open another site, create a site.
- Known test baseline on Windows: 11 backend tests (theme update / preset / snapshot atomicity) and 1 adapters-local test (concurrent atomic writes) fail without any of this work too.

---

## Ground rules

- Everything sits behind the one **AI Assistant** setting (off by default). While it's off the assistant can't reach the app, but change tracking, image retention and editor authentication keep running, so earlier undo points stay valid.
- New code goes in new packages (`packages/mcp`, the assistant backend package, editor extensions). Existing code only gains the generic hooks listed under **Code layout** in `future-mcp.md`.
- The relay never touches storage. Every action runs in the app, through the same services and validation the editor uses.
- Nothing assumes local files or a single user, so Hosted can mount the same backend package later.
- Failure cases are part of each milestone's tests, not a later hardening pass: dirty or disconnected windows, queued autosaves, switching sites mid-job, crashes during write or restore, a full disk, turning access off mid-job.

---

## M0 — Switch, connection and packaging spike

- The `assistant.enabled` setting: backend default and validation, plus the **AI Assistant** tab. Settings saves send only changed fields, so a stale form can't revert the switch.
- Editor request authentication and real Host/Origin checks, so the token can't be bypassed through existing routes. Only the editor can change the setting or answer approvals; the relay never can.
  - Desktop: the main process adds an editor credential to API requests from the top frame of its own windows; page scripts never see it, and the packaged server refuses to start without it.
  - Self-run web: Host/Origin checks only. That protects against other websites, not against programs on the same computer, and the AI Assistant tab says so.
- Connection file: published by the shared OSS server start-up (desktop and self-run web) in the data folder, written atomically after bind, holding the real bound address, a fresh token and an instance ID. Owner-only permissions (including on Windows). Removed on shutdown and when access is turned off; a leftover file from a crash reads as "not running". The relay accepts a data-folder override for custom web installs.
- Client sessions: the relay exchanges the installation token for a session identity. Jobs and approvals are bound to the session. Health comes from heartbeat/disconnect, not from the last handshake.
- Handshake: bridge protocol version, MCP version, capabilities, action catalogue. Plain messages on a mismatch, naming which side to update.
- `packages/mcp`: STDIO relay on the official MCP SDK. It rediscovers the app on connect and reconnect, takes its tool list from the app, and never replays an interrupted write.
- Graceful server shutdown in Electron (today it's killed directly).
- **Packaging spike:** a bundled Node runtime with the relay outside ASAR, plus a minimal signed `.mcpb`, installed and connecting on macOS arm64/x64 and Windows x64. This confirms the runtime choice before anything is built on it.

## M1 — Read-only ("review my site")

- List sites, site overview (including unsaved state), read page / header / footer / menus / look, theme catalogue (compact list, then detail on request), media browse (paginated, with small thumbnails and a larger view on request, so the assistant can pick suitable images and describe them), collections.
- Preview as rendered text.
- Layer 1 platform guidance; bounded fallback for existing `insights.md`. An existing site gets guidance from its copied theme version; choosing a preset for a new site reads the installed theme source.
- Works on the site open in Widgetizer; listing all sites is allowed.

## M2 — One complete edit, with recovery

- **First, decisions the page can't make (M2a).** Code in the preview can act as the editor, so in the desktop app turning access on happens in a prompt the main process draws and reaches the server over the utility-process channel; the settings route refuses it whenever the editor credential is configured. Windows opened by pages follow one rule: the app server's own pages open in a window with no preload, other web addresses in the browser, anything else is refused.

The hard milestone. A single edit family (**edit sections** on a page, header or footer) with everything around it:

- **Fingerprint and receipts:** Undo is allowed only while the site is exactly as the job left it: a hash of the site's content files, site fields and media rows, plus generations bumped before any asset write and any theme update. This replaces a revision counter bumped by every write path, which a missed path would silently break. Every operation records its actual effects and warnings; these become the completion record.
- **One owner per data folder:** the server holds an OS-level exclusive lock on a file in the data folder for its lifetime (taken before recovery and listening, retried briefly at start-up); a second Widgetizer on the same folder refuses to start.
- **Jobs:** start / status / finish / stop, persisted with compare-and-set states and a recovery rule for every state. One job or operation at a time per app (per account in Hosted). Startup recovery runs before any conflicting write is admitted; an unresolved restore stays closed for writes and offers Try again / Keep. Jobs are restored automatically on Stop, turning access off, switching site, the assistant disconnecting, or 10 minutes without activity.
- **Start handshake:** the server enters *preparing*; saves already admitted finish, new editor writes are refused. Open windows turn read-only and report whether they are clean (an unsaved-changes registry covers every screen, input buffers and pending saves). Unsaved edits are never discarded or counted as clean: any dirty or unreachable window fails the start and the lock lifts. The snapshot is captured only after this settles. Without a reachable editor, writes are refused; reads still work.
- **Write gate:** every site writer runs under the content-write lock (upload, media metadata and usage refresh join it); the gate is checked inside it, with the writer's identity carried by AsyncLocalStorage. In the desktop/self-run app every editor write is refused while a job runs, except an exact allowlist (preview, backup, controls, turning access off, switching site). Editor writes carry the change generation of the content they were based on; a write based on content the assistant has since changed is refused.
- **Snapshots:** captured through the storage adapters plus scoped repository reads, under exclusion. Packed as one verified archive in injected snapshot storage. Restore checks everything first, keeps IDs, removes what the job added, and rebuilds media usage without writing content.
- **Asset retention moves to M3:** M2 jobs never touch media, and any media change after a job makes Undo unavailable. Retention is required before the first assistant operation that adds, replaces or deletes media.
- **Validation:** a pure validator in core, shared with `scripts/validate-theme.js` (setting keys and types, options, ranges, block types, `maxBlocks`, link shape, project-owned media, ID and order consistency). Only changed values are checked; untouched values are kept byte for byte. Rich text is sanitised on write as at render. Every theme, widget, block and setting type is editable.
- **Live editor:** an event stream; banner with Stop; lock across every window, including the preview; windows lock again when the stream drops and reconcile on reconnect; clean-baseline refresh without autosave; "Undo assistant changes" button.
- Stop and Undo; undo refused after later edits or a theme update.
- Thresholds, refused until M3: more than 3 pages (or header/footer) in one job, or removing more than half of a page's sections. Listing-anchor and pagination settings, whose save changes other pages, are not editable yet.

## M3 — Allow/Cancel

- The request carries the exact plan; Widgetizer shows the prompt. **The whole app halts** until the user answers, with no timeout: an app-wide write barrier across every site, window and in-flight write. The prompt, Stop and turning access off stay usable. In Hosted the halt covers the user's account only.
- If the assistant disconnects or Widgetizer restarts while the prompt is open, the prompt becomes a choice to keep or undo the job's changes so far; the job ends either way.
- Approval is single-use and bound to the plan, job, session and site fingerprint. Impact counts across the whole job.
- Desktop prompt: a small window main creates (no site content), holding Allow, Cancel and Stop. A parent-modal system box would block Stop. Main keeps the approval ID it showed and sends the answer over the utility-process channel; the server consumes it atomically and refuses it once Stop, turning access off, a disconnect or a restart has invalidated it. Requests for a different approval while one is open are refused, not merged.
- Covers deleting pages, collection items and media; removing a language; replacing a whole menu or header/footer; multi-page rewrites; export (including which older export it prunes).

## M4 — Remaining edit families

- Create a site from theme and preset (special start path; undo returns it to its completed preset state; preset media provenance recorded).
- Pages (create, rename, SEO, duplicate), menus, look (the conflict-aware theme settings PATCH), business and site details, collection items, media descriptions, add language, translations through ordinary edits, open site (only when asked).

## M5 — Completion and navigation

- Completion message built from the receipts: what changed, warnings, next steps (including replacing demo photos), with Undo.
- Navigation once at the end; changed sections briefly highlighted.

## M6 — Guidance

- Arch composition guide; `insights.md` restructured (Purpose / When to use / Pitfalls / Recipes) with recipe checks in `scripts/validate-theme.js`; core widget insights included.
- Preset guidance file: settle the format, add validation, update the theme skill reference and regenerate its catalog. It is read from the installed theme source, since presets aren't copied into projects.
- `theme-preset-generator.md` updated alongside.

## M7 — Connect screen and release

- AI Assistant tab: Connect Claude (opens the `.mcpb`, with fallbacks), Codex values and `codex mcp add` with escaped absolute paths, generic details, real Connected status, "Update connection" when the relay is too old.
- Release: build, sign and verify the relay, runtime and `.mcpb` before app signing; add the steps to the release checklist in `CLAUDE.md`; test installed builds on all three platforms, including updating Widgetizer while an assistant is connected.

## Later

- Choose-files upload prompt (should-have).
- Claude and Codex plugins; Hosted's remote endpoint with OAuth.
