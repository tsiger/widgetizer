# Theme Packaging Script (`theme-package`) — Spec

> **Status: PLANNED — not yet implemented.**
> This document is a design spec. It records the agreed model, the CLI, the
> algorithm, and — importantly — the *decisions and the reasoning behind them*
> so the design does not get re-litigated when we build it. No code exists yet.

## Purpose

`theme-package` generates a **distributable theme bundle** (frozen base version +
per-release delta folders) from a theme's normal git history. It is the authoring
counterpart to the runtime [theme update system](theme-updates.md): the update
system *consumes* the base+deltas layout; this script *produces* it.

It must work in two settings:

1. **Bundled themes** developed inside the widgetizer monorepo (`themes/<id>/`).
2. **Standalone themes** developed in their own separate git repos.

## The load-bearing model

The design rests on one principle: **git tags are the source of release truth, and
the distributable bundle is a pure function of those tags.**

- During development, `themes/<id>/` is a **normal evolving theme**: `root = HEAD = latest`. The author edits in place, live-previews via `theme-sync`, and commits freely. There are **no `updates/` folders in the source tree.**
- Each release is a git tag.
- The bundle is **derived** at package time:
  - **base** (bundle root) = the tree at the **first** release tag.
  - **`updates/<v>/`** = `git diff <prevTag> <thisTag>` for each subsequent release.

This is the standard "source vs. build artifact" split. The deltas are a packaging
concern computed from history; they are never hand-authored or stored in the source
tree.

### Why this model (and not hand-authored deltas)

An earlier mental model had the author hand-maintain `themes/<id>/` *as* the
base+delta bundle (root frozen at v1.0, `updates/1.1.0/` etc. added by hand). That
breaks down past the first release:

- To develop **v1.2** you need a working tree that *starts* from the v1.1 composed
  state (so you can edit and live-preview the real current theme). But a
  frozen-at-base root is permanently v1.0 — so you'd have to re-compose the previous
  release back into root every time, which is just "develop in `latest/`" relocated.
- A diff against the original base would produce a bloated delta (v1.1+v1.2
  combined) instead of just v1.2.
- You couldn't commit work-in-progress normally — only the moment a delta was
  carved — so your real development history would live on a fork that never merges.

Deriving deltas from consecutive tags removes all of this: you always develop
against `root = latest`, commit normally, and the script reconstructs the minimal
per-release deltas from history.

### Why consecutive-tag diffs are correct

The runtime always rebuilds `latest/` as `base + all deltas in semver order, later
wins` (see `buildLatestSnapshot` in `server/controllers/themeController.js`). A file
last changed in version *k* ends up in `updates/<k>/` with version *k*'s content; no
later delta touches it, so `latest` keeps that content. Therefore
`updates/<k>/ = diff(tag[k-1], tag[k])` composes back to the newest full theme
exactly. (Diffing against the original base would also compose correctly but
produces redundant, bloated deltas — consecutive-tag diffs are the minimal form.)

## Decisions (with rationale)

These were settled deliberately. Do not reverse without revisiting the reasoning.

### D1 — One standalone, zero-dependency script

The script uses **only Node builtins (`node:fs`, `node:path`, `node:child_process`)
plus the `git` CLI**. No `fs-extra`, no `semver`, no widgetizer imports.

**Why:** it must run in *both* the monorepo and external theme repos. An external
theme repo has none of widgetizer's dependencies or `server/` utils, so the script
has to copy-paste cleanly and run anywhere git + Node exist. One code path, no
divergence between the two cases. (Semver comparison is a ~15-line inline
comparator; binary-safe file extraction uses `git show` captured as a Buffer;
argument parsing uses `node:util`'s `parseArgs`, the optional confirm prompt uses
`node:readline`, and config is parsed with the built-in `JSON.parse`.)

### D2 — Tag convention: prefix only in the monorepo

| Setting | Release tag | Tag glob |
| --- | --- | --- |
| Monorepo (`themes/<id>/`) | `<id>-v1.2.0` (e.g. `arch-v1.2.0`) | `<id>-v*` |
| Standalone (repo root) | `v1.2.0` | `v*` |

**Why:** in the monorepo a single tag points at a whole-repo commit shared by every
theme *and* the app itself, so tags **must** be namespaced per theme to identify one
theme's release history unambiguously. In a one-theme standalone repo there's no
ambiguity, so the plain `v*` convention authors already use is fine. Mode is detected
by comparing the resolved theme path to the git repo root (`git rev-parse
--show-toplevel`): equal → standalone (`v`), nested → monorepo (`<id>-v`). The prefix
is overridable via `--tag-prefix`.

### D3 — Read-only, plus `--dry-run`

The script **never creates tags or commits.** It only reads existing tags to build
the bundle. `--dry-run` diffs the last tag against `HEAD`/working tree and prints
what the *next* delta would contain, writing nothing.

**Why:** tagging a release is a deliberate human act; a packaging tool mutating git
history is surprising and risky. `--dry-run` lets the author preview and sanity-check
the next delta *before* committing to a tag.

### D4 — Output lives beside `themes/`, never inside it

Default output: **`dist-themes/<id>/`** at the repo root — a **sibling of `themes/`**,
not inside `themes/<id>/` alongside `assets`/`locales`.

**Why:** `themes/<id>/` is exactly what three systems treat as "the theme":

- `theme-sync.js` watches it as `srcDir` and copies it into `data/`
  (`scripts/theme-sync.js`),
- `buildLatestSnapshot` copies the theme root as the base,
- the upload/zip flow bundles the whole theme folder.

A frozen self-copy + deltas placed *inside* that dir would be swept up by all three —
a base containing a copy of itself, recursive garbage in `data/`, bloated zips.
Keeping `dist-themes/` as a sibling means **zero changes** to the sync/compose/upload
code, because none of them look outside `themes/<id>/`. (`dist/` itself is taken by
the Vite frontend build, and `dist-electron/` by Electron builds — hence the distinct
`dist-themes/` name.)

### D5 — Do not commit the output; gitignore it

`dist-themes/` is gitignored. Durable, versioned bundles are published by attaching
the **zip to a GitHub release** (the same pattern the app already uses for Electron
installers, `build.publish` → github).

**Why:** the bundle is a build artifact and a pure function of the tags. Committing it
causes:

- **Two sources of truth that drift** — a committed bundle can disagree with the tags
  via a hand-edit, a script bug, or a bad merge, defeating the whole derived model.
- **Lost reproducibility** — especially if the script ever trusted committed deltas
  and only appended, an old delta's bug would be frozen in git forever.
  Regen-from-tags is self-healing.
- **Repo bloat** — the base duplicates v1.0 source already in history, and every
  asset/screenshot change re-commits binary blobs into deltas; git can't GC it.
- **Merge conflicts + noisy diffs** — generated files conflict badly and drown the
  real source change in every release PR.

The shallow-clone and "don't regenerate everything each time" upsides of committing
are marginal: releases are infrequent (a full clone / `git fetch --tags` at package
time is fine), and regenerating all deltas from tags is cheap (a handful of
`git show` calls over small files). If build speed ever matters, the `--incremental`
flag reuses the existing *local, gitignored* output directory as a cache (see
**Incremental builds** below) — without committing artifacts.

### D6 — Do **not** invert to `themes-src/` + generated `themes/`

We considered making `themes/<id>/` the generated bundle (what the app reads) and
moving development to a separate `themes-src/<id>/`. Rejected.

**Why:** the premise — "the update system needs the base+delta layout, so `themes/`
should be the bundle" — does not hold. The update system reads a plain
`root = latest` theme perfectly well:

- `buildLatestSnapshot` bails when there are ≤1 versions (no `updates/` folders) — no
  `latest/` is built;
- `getThemeSourceDir` then returns root;
- `checkForUpdates` reads the source version from root `theme.json`; an older project
  still sees an update;
- `applyThemeUpdate` copies wholesale from root.

The base+delta layout is only *required* at one moment: a user uploading a theme
**zip over an existing install**, where `uploadTheme` enforces matching base versions.
That is a distribution-time event, not a repo-state requirement. So:

- Bundled themes don't need deltas at all — on app upgrade the new `themes/<id>/`
  (root = latest) re-seeds and a wholesale apply produces the same result a composed
  `latest/` would.
- Inverting would re-commit the build artifact (reintroducing every D5 downside,
  permanently baked into the repo layout), split the dev loop from what ships
  (`themes/` goes stale and drifts), create a "don't edit the obvious folder"
  footgun, and re-diverge the bundled vs. standalone layouts we unified.

So `themes/<id>/` stays the **source = `root = latest` = what ships**, and
`dist-themes/<id>/` is the throwaway thing you hand out.

### D7 — Theme path is positional; `--theme` is optional

The theme directory is a **positional argument** (default: cwd), not a `--source`
flag. The script resolves it to an absolute path and aborts if it contains no
`theme.json`. `--theme` (the bundle id) defaults to the **basename of that resolved
path** and is only needed to override.

**Why:** you run the tool *against a theme*, so the theme location is the natural
positional input, and its directory name is a sensible default id. Dropping `--source`
and the required `--theme` removes two flags from the common case — point at a folder,
or just run inside it.

### D8 — Config file is JSON (the only zero-dep data format)

Options may be set in an optional **`.theme-package.json`** (a dotfile) in the theme
folder; CLI flags override it; `--dry-run` is never read from it. The config is
**excluded from the bundle output**.

**Why:** D1 forbids dependencies, and **JSON is the only data format Node parses
natively** — there is no built-in YAML or TOML parser. (A `theme-package.config.js`
module is the only zero-dep alternative, but it is executable code, not data, so it is
deferred rather than the default.)

### D9 — A missing `--out` directory is created only after a prompt

If the resolved output directory doesn't exist, the script prints its **full resolved
path** and asks before creating it (`node:readline`); `-y/--yes` skips the prompt and a
non-TTY stdin (CI) errors instead of hanging.

**Why:** output should never be silently scattered to an unexpected place. Showing the
absolute path first lets the author confirm *where* the bundle lands before anything is
written.

## CLI

```
node scripts/theme-package.js [path] [options]

  [path]             Path to the theme directory (positional, default: cwd).
                     Resolved to an absolute path; must contain theme.json or
                     the script aborts.
  --theme <id>       Bundle folder name (default: basename of the resolved path)
  --tag-prefix <p>   Release tag glob prefix
                     (auto: "<id>-v" in monorepo, "v" standalone)
  --out <dir>        Output directory (default: <repoRoot>/dist-themes). If it
                     does not exist, the script prints the full resolved path and
                     prompts before creating it.
  --incremental      Reuse an existing local <out>/<id>/ and append only deltas
                     for tags newer than the highest already present.
  --zip              Also emit <out>/<id>.zip (the folder is always written)
  --dry-run          Diff lastTag..HEAD, print the next delta, write nothing.
                     CLI-only — never read from the config file.
  -y, --yes          Skip the out-dir creation prompt (non-interactive / CI)
```

**Theme path & id:** the theme directory is the positional `[path]` (default cwd),
resolved to an absolute path; the script aborts if it has no `theme.json`. `--theme`
defaults to the basename of that resolved path. There is no `--source` flag — the
positional path replaces it.

**Mode auto-detection (tag prefix):** compare the resolved theme path to the git repo
root (`git rev-parse --show-toplevel`). Equal → the theme *is* the repo →
**standalone**, prefix `v`. Nested below the root → **monorepo**, prefix `<id>-v`
(tags are shared across themes and the app, so they must be namespaced). Overridable
with `--tag-prefix`.

**npm wiring (monorepo):** add `"theme:package": "node scripts/theme-package.js"`,
invoked as `npm run theme:package -- themes/arch`.

## Configuration file

The zero-dependency rule (D1) constrains the format. Node parses **JSON** natively
(`JSON.parse`) but has **no built-in YAML or TOML parser**, so those would require a
dependency and are therefore **out**. (A `theme-package.config.js` ESM module that
`export default`s an object is also zero-dep and more flexible, but it is executable
*code* rather than data — noted as a possible later addition, not the default.)

**Decision:** an optional **`.theme-package.json`** (a dotfile) in the theme directory
(the resolved `[path]`). It may set any option **except `--dry-run`**:

```json
{
  "theme": "arch",
  "tagPrefix": "arch-v",
  "out": "../dist-themes",
  "incremental": true,
  "zip": true
}
```

**Precedence:** CLI flag > config file > auto-detected default. The config lives
inside the theme folder, so it never specifies the theme path. **Path resolution:** the
default `out` is `<repoRoot>/dist-themes`; an `out` from the **CLI** is resolved
against the cwd, while an `out` from the **config file** is resolved against the theme
directory (stable regardless of where the command runs).

**Bundle exclusion:** because `.theme-package.json` lives inside the theme folder, it
is **never copied into the bundle** — neither the base nor any delta — exactly like
`updates/` and `latest/`.

## Algorithm

1. **Discover tags** — `git tag --list "<prefix>*"`, strip the prefix, parse and
   semver-sort with an inline comparator.
2. **Base** — extract the tree at the first tag via `git ls-tree -r --name-only
   <firstTag> -- <themePath>` + per-file `git show <firstTag>:<path>` (captured as a
   Buffer so binary assets survive). Write to `<out>/<id>/`, stripping the
   `<themePath>/` prefix so files land at the bundle root. Apply the **bundle
   exclusions** — `updates/`, `latest/`, and `.theme-package.json` — which never belong
   in the output.
3. **Per release tag `T`** — `git diff --no-renames --name-status <prev> <T> --
   <themePath>`:
   - `A` / `M` → copy the file from `T`'s tree into `updates/<v>/<relpath>`.
   - `D` → write a placeholder into `updates/<v>/deleted/<relpath>` **only** for
     deletion-eligible paths (`assets/`, `widgets/`, `snippets/`, `locales/`,
     `layout.liquid`). A `D` under `templates/` or `menus/` prints a warning and is
     **skipped** (those are add-only — see the [eligibility table](theme-updates.md#file-deletions)).
   - `--no-renames` makes renames surface as delete + add, which is what we want.
   - The **bundle exclusions** (`updates/`, `latest/`, `.theme-package.json`) are
     filtered out, so a config edit never lands in a delta.
4. **`theme.json` per delta** — it changes between tags (version bump + settings) so
   it lands in `updates/<v>/theme.json` naturally, already carrying version `<v>`.
5. **Validation** — for each tag, assert the `theme.json` version equals the version
   parsed from the tag, mirroring `buildLatestSnapshot`'s guard. Abort on mismatch.
6. **`--dry-run`** — diff the last tag against `HEAD`/working tree, print what
   `updates/<currentVersion>/` would hold, and verify current `theme.json` version >
   last tag's version. Write nothing.
7. **Output** — resolve the output dir (default `<repoRoot>/dist-themes`, where
   `<repoRoot>` is `git rev-parse --show-toplevel`; an explicit `--out`/config value
   is used instead — see [Configuration file](#configuration-file) for resolution).
   If it does not exist, print the **full resolved path** and prompt (via
   `node:readline`) before creating it — `-y/--yes` skips the prompt, and a non-TTY
   stdin (CI) errors with the path rather than hanging. Then write `<out>/<id>/`;
   with `--zip`, also emit `<out>/<id>.zip` (top-level folder `<id>/`). `latest/` is
   never produced — it is rebuilt on the consuming side and `uploadTheme` ignores it.

### Incremental builds (`--incremental`)

`--incremental` reuses an existing local `<out>/<id>/` (gitignored) instead of
rebuilding from scratch. `<out>` is the **fully resolved output directory** — the same
value a normal build writes to (default `<repoRoot>/dist-themes`, or `--out`, or the
config `out`, resolved per the [Configuration file](#configuration-file) rules) — so
`--incremental` always reads from wherever output currently goes:

1. Read the existing bundle's base `theme.json` and the version folders under
   `updates/`.
2. Verify the existing base version equals the current first release tag. If it
   differs — or no bundle exists — **fall back to a full rebuild** and print a notice;
   incremental on a mismatched base is unsafe.
3. Generate deltas only for release tags **newer** than the highest version already
   present, appending them; the base and existing deltas are left untouched.

A clean full rebuild from tags is always available and remains authoritative;
`--incremental` is purely a speed optimization, and it does not weaken reproducibility
because the cache is local and never committed (D5).

## Constraints honored (from the runtime update system)

These come from existing code and the bundle must respect them — see
[theme-updates.md](theme-updates.md):

- **Base immutability** — the bundle root must always be the *first* release's tree.
  `uploadTheme` rejects an upload over an existing install whose base version differs
  ("Base versions must match"). The script must never let the base drift as long as
  any install might still be on an old version.
- **Delta version == folder name** — `buildLatestSnapshot` aborts if a version
  folder's `theme.json` version doesn't match the folder name. The validation step
  enforces this at package time.
- **Deletion eligibility** — only `assets`/`widgets`/`snippets`/`locales`/
  `layout.liquid` may be deleted via a `deleted/` placeholder; `templates`/`menus`
  are add-only; `pages`/`uploads` are protected and never appear in a theme source.
- **Updatable vs add-only vs protected paths** — defined by `UPDATABLE_PATHS` in
  `server/services/themeUpdateService.js`. The bundle only needs to carry the theme's
  own files; the project-side apply decides what is replaced, added, or protected.

## Open questions (deferred until implementation)

- **Standalone script distribution** — how external authors obtain the script: a
  documented copy-paste file vs. a tiny published CLI. Deferred; D1 keeps it
  dependency-free so either works later.
- **Zip internals** — whether to shell out to `zip`/use a tiny zip lib while keeping
  the zero-dep promise, or leave zipping to the author. To decide at build time.

## Related docs

- [theme-updates.md](theme-updates.md) — the runtime system that consumes this bundle
  (base, deltas, `latest/`, settings merge, base-match upload rule).
- [core-themes.md](core-themes.md) — the upload UI/flow that ingests the zip.
- [theming.md](theming.md) — theme structure and development.
