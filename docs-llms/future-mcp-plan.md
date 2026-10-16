# Future: Widgetizer MCP — Implementation Plan

> **Status: In progress for 1.0.** Build order for the design in `future-mcp.md`. Work happens on the `mcp` branch. Each milestone ends with passing tests, a review of the diff, and a short note on what to try in the app.

## Progress

- **M0 — done** (`d48762c6`…`ae7598e4`, packaging fix `35691e75`). Tried by the maintainer with Claude Desktop and Codex; the unsigned packaged builds work on macOS and Windows, and the `.mcpb` installs and connects in Claude Desktop. Still open: verifying signed builds before release. Decided: keep the bundled Node runtime for the relay.
- **M1 — done** (`c9d00efc`, `eb373c82`). Fourteen read-only tools, reviewed by Codex until no findings remained. Tried by the maintainer: works.
- **M2a — built, reviewed by Codex (no findings), not yet tried by the maintainer.** Turning access on in the desktop app goes through the app's own prompt (see M2's first bullet). Isolating the preview itself was dropped: embeds, maps and theme scripts must keep working as they do. To try it, use a packaged build (`npm run electron:build:win:unsigned`, then `dist-electron\win-unpacked\Widgetizer.exe`); `electron:dev` runs without the editor credential and behaves like the browser version. Check: Turn On shows the system prompt, Cancel leaves access off, Allow turns it on; the window still takes keyboard input afterwards; Turn Off needs no prompt; exports and media open in a plain app window, outside links in the browser. Afterwards `npm run dev:all` rebuilds `better-sqlite3` for Node.
- **Next: the rest of M2.** Revision and receipts, jobs, the start handshake, the write gate, snapshots, asset retention, validation (including where executable content is output), the live editor, Stop/Undo. Plan it in detail, have Codex review the plan, explain it to the maintainer in plain words, then build.
- Known test baseline on Windows: 11 backend tests (theme update / preset / snapshot atomicity) and 1 adapters-local test (concurrent atomic writes) fail without any of this work too.

---

## Ground rules

- Everything sits behind the one **AI Assistant** setting (off by default). While it's off the assistant can't reach the app, but revision tracking, image retention and editor authentication keep running, so earlier undo points stay valid.
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

- **Revision and receipts:** a per-site revision bumped by every write path (editor, media metadata, uploads, project details, languages, indirect page changes). Every operation records its actual effects and warnings; these become the completion record.
- **Jobs:** start / status / finish / abort, persisted with durable states (capturing, writing, restoring). One per site, pinned to the site and its languages. Startup recovery runs before any conflicting write is admitted. Abandoned jobs time out and are restored, except while an Allow/Cancel prompt is open.
- **Start handshake:** the server enters *preparing*; saves already admitted finish, new editor writes are refused. Open windows turn read-only and report whether they are clean. Unsaved edits are never discarded or counted as clean: any dirty or unreachable window fails the start and the lock lifts. The snapshot is captured only after this settles. Without a reachable editor, writes are refused; reads still work.
- **Write gate:** checked on admission and again inside the write section after any wait. Job ownership is persisted state with short critical sections, never a mutex held across the conversation. No new lock wraps an existing operation (the content-write lock is non-reentrant and innermost); mutation helpers are extracted where needed.
- **Snapshots:** captured through the storage adapters plus scoped repository reads, under exclusion, so files and rows describe one revision. Packed as one archive and manifest in injected snapshot storage. Restore keeps IDs, removes what the job added, and reconciles media usage.
- **Asset retention:** immutable versions, pinning, read/restore and garbage collection in the asset contract and conformance suite. Every delete/replace path goes through it, the editor's included. A retention failure stops the delete (today deletion swallows asset errors and removes metadata anyway). Capped by count and disk, never pruning the latest snapshot or a running job.
- **Executable content is confirm-first** (refused until M3). Classify fields by where their value is output, not by setting type: a `textarea` used as an iframe `src` (Arch's map) can run code through a `javascript:` address. Either restrict such values to safe schemes and targets or treat the field as executable; reject unknown cases. Check effective values, including schema defaults a new section or block brings in.
- **Validation:** a pure validator in core (setting keys and types, options, ranges, block types, `maxBlocks`, link shape, fonts, project-owned media, ID and order consistency). Orchestration lives in the backend package and reuses sanitisation.
- **Live editor:** an event channel; banner with Stop; lock across every window; refetch on reconnect; clean-baseline refresh without autosave; "Undo assistant changes" button.
- Stop and Undo; undo refused after later edits or a theme update.
- Anything that would need Allow/Cancel, including accumulated section edits past the threshold, is refused until M3.

## M3 — Allow/Cancel

- The request carries the exact plan; Widgetizer shows the prompt. **The whole app halts** until the user answers, with no timeout: an app-wide write barrier across every site, window and in-flight write. The prompt, Stop and turning access off stay usable. In Hosted the halt covers the user's account only.
- If the assistant disconnects or Widgetizer restarts while the prompt is open, the prompt becomes a choice to keep or undo the job's changes so far; the job ends either way.
- Approval is single-use and bound to the plan, job, session and revision. Impact counts across the whole job.
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
