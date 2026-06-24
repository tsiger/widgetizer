# TODO — OSS builder (web + Electron desktop)

**Updated:** 2026-06-24

Open work for the OSS builder, migrated 2026-06-24 from the engagement-level
`experiment-docs/TODO.md` (parent repo) so each item lives with the project it
applies to. Hosted-specific items moved to `widgetizer-hosted/docs/TODO.md`.
Original engagement section numbers are kept in parentheses for traceability.

Conventions still in force: commit only on the `experimentation` branch with
explicit permission, never switch branch / never push.

---

## 1. Relative preview asset URLs (robustness) — discuss  *(was experiment-docs §10)*

Surfaced 2026-06-19 while root-causing a parity-audit "masonry-gallery" false positive — a
preview that rendered completely unstyled, which turned out to be a `SERVER_URL`/port test
artifact (not a code bug). The preview render builds **absolute**
theme/widget asset URLs from `apiUrl = process.env.SERVER_URL || http://localhost:${PORT||3001}`
(`packages/builder-server/src/controllers/previewController.js`; emitted in
`packages/core/src/tags/renderFooterAssets.js` + `renderEngine.js`). If `SERVER_URL` (or the
default port) doesn't match the port actually serving the render, **all** preview CSS/JS 404 and
the preview renders unstyled (and JS-visibility-gated widgets like masonry-gallery lose their
content entirely). This bit the audit because exp ran on :4101 while its dev env pinned
`SERVER_URL=http://localhost:3001`.

**Idea:** make preview asset URLs **relative** (no host) so they always resolve to whatever origin
served the `/render/:token` document, immune to a `SERVER_URL`/port mismatch. **Not a regression**
(master uses the same absolute-URL scheme), and not a parity gap — purely hardening. Caveat: the
render iframe is cross-origin (`localhost:4101` vs editor `localhost:4100`), so confirm a relative
base resolves against the render doc's origin (it should, since the `<base href>`/doc origin is the
render server) and doesn't break the editor's same-origin/hosted-nested cases. Low priority.

---

## 2. Bundled theme updates on the OSS desktop app (product/design decision)  *(was experiment-docs §11)*

Surfaced 2026-06-19 during an Electron re-validation: a fresh v0.9.9 build showed
**Arch 0.9.6** when creating a new project. Root cause (not a build/refactor regression):

- The app serves themes from the **user data dir** (`getThemesDir()` →
  `~/Library/Application Support/widgetizer/data/themes`), seeded from the bundled themes
  (`THEMES_SEED_DIR`) on startup by `ensureThemesDirectory()`
  (`packages/builder-server/src/controllers/themeController.js`).
- That seed is **install-if-missing only** — `if (await fs.pathExists(dest)) continue;`
  (themeController.js:186). It never overwrites an installed theme, deliberately, so it
  doesn't clobber user edits.
- So a theme dir persisted by an **older installed app** (here 0.9.6) is never refreshed when
  a newer app bundles a newer theme. New projects scaffold from the stale data-dir copy.

This is the **OSS desktop counterpart of the hosted theme-update gap** (see
`widgetizer-hosted/docs/TODO.md` "theme version / library management"). There *is* an
explicit user-triggered update path (`themeUpdateService` / `/themes` apply-update), but
nothing reconciles the **bundled** seed version against the installed copy on app upgrade.

**To decide:** how should bundled theme version bumps reach existing installs?
- Auto-reconcile on startup when the bundled `theme.json` `version` > installed (with a
  strategy for user-modified themes — skip-if-dirty? prompt? fork-and-keep?).
- Or surface an in-app "theme update available" prompt driven by the bundled-vs-installed
  version compare, reusing `themeUpdateService`.
- Or leave manual and just document it.
Tie the decision to the hosted theme-update gap so OSS + hosted share a coherent
theme-versioning story. Not blocking; needs a product call, not just wiring.

---

## 3. Modernize pre-refactor `src/...` / `server/...` paths in `docs-llms/*` (docs hygiene)  *(was experiment-docs §14)*

Surfaced 2026-06-24, while doing finding **D6** (updated `AGENTS.md` to the package layout)
and the accompanying doc-accuracy sweep.

Several `docs-llms/*` bodies still cite the pre-refactor monolith paths (`src/...`,
`server/...`) instead of the current package paths (`packages/builder-server/src/...`,
`packages/editor-ui/src/...`, `app/...`, etc.). Examples seen: `core-database.md` cites
`server/db/index.js` + `server/db/migrations.js`; `core-media.md` cites
`server/utils/mimeTypes.js` + `server/services/mediaUsageService.js`; `core-page-editor.md`
cites `src/utils/previewRuntime.js`. There are more.

This is **known, tolerated drift** — `CLAUDE.md` carries a blanket "the `docs-llms/*` bodies
sometimes cite pre-refactor `src/...`/`server/...` paths — treat the package paths as current"
note, so nothing is *misleading* to a reader who's read `CLAUDE.md`. We deliberately did **not**
chase it during D6: fixing one path in a doc that uses `server/...` throughout would be
inconsistent, and it's orthogonal to the findings remediation.

**Do it as a dedicated pass** when convenient: grep `docs-llms/` for `\bsrc/` and `\bserver/`,
map each to its package path (see `CLAUDE.md` / `docs-llms/core-architecture.md` for the
mapping), update in bulk, and once the bodies are clean, drop the blanket caveat from
`CLAUDE.md` + `widgetizer/CLAUDE.md` + `AGENTS.md`. Low priority (P3) — cosmetic accuracy, no
behavioural impact.

---

## 4. Deferred — Playwright E2E smoke (OSS) *(was experiment-docs §9, OSS portion)*

No end-to-end browser tests exist yet (only `node:test` server + Vitest client/component
suites). Planned "later" for OSS: a **Web smoke** (create → edit → export). **Electron E2E is
deferred** (playwright-electron setup is its own task). Not blocking; the test-coverage audit
(`audit-prompt-test-coverage.md`) tracks coverage gaps meanwhile. (The hosted smoke is tracked
separately in `widgetizer-hosted/docs/TODO.md`.)

---

## 5. Consolidate preview-dispatch logic (route-mapping half)  *(findings-doc follow-up; session task #16)*

Surfaced during OSS finding **C4 + #17** (unify the standalone site preview). The
`buildPreviewUrl(token)` half of the preview-helper consolidation already landed
(`cd2f5a48` — one shared definition in `editor-ui/src/lib/previewBase.js`, was copy-pasted
4×). **Still open:** the **route-dispatch** half — the target→route mapping currently spread
across `getStandalonePreviewPath` / `openSitePreview` / `previewLinkUtils` in editor-ui. Fold
these into one place so a preview target (page vs collection item) maps to its route/URL
through a single helper rather than three parallel call sites.

editor-ui change (OSS) → inherited by web/Electron/hosted. It's the natural companion to the
**hosted preview full-parity decision** (`widgetizer-hosted/docs/TODO.md` §7): if hosted moves
to the persistent `SitePreviewLayout` pattern, a single dispatch helper is what both repos'
layouts would call. Do this consolidation first regardless — it stands on its own.

---

## 6. Narrow-sidebar icon-grid + color-picker visual review  *(C2 follow-up; session task #18)*

Surfaced post-**C2** (compact settings-sidebar CSS, `c74d714f`): the icon-grid and color
picker in the narrow (~200 px) right page-editor settings sidebar looked slightly off after the
port. CSS-only, no behavioural impact — needs an eyes-on pass in the running app (the CSS has no
unit surface). Check the icon-grid fill/wrap and the color-picker sizing/alignment under
`.page-editor-settings`; adjust `styles/preset.css` / the `icon-grid-button` hook as needed.
Low priority, cosmetic.
