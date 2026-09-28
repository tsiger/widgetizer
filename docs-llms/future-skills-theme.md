# Future: Widgetizer Theme Skill

> **Status: Proposal.** Recorded on 2026-09-27. Nothing is built yet. This file collects what an agent needs to build a distributable "create / update a Widgetizer theme" Agent Skill: what a skill is, where it lives, how it ships, and the Widgetizer facts it must encode. Facts about third-party platforms (Claude, OpenAI) were checked on 2026-09-27 and change quickly — re-verify them before building.

---

## 1. Goal

Give end users of the **desktop app** a skill that lets their AI agent (Claude Code, Claude Cowork, OpenAI Codex, ChatGPT) create a new Widgetizer theme, or update one they already have, without having to learn the theming docs first.

It fits the LLM-first positioning: `docs-llms/` already works as the API for AI themers, and the skill packages that knowledge for people who don't have this repo.

Scope within "theme work" is still open (see §9). Candidate jobs:

- New theme from scratch
- New widget inside an existing theme
- Update an existing theme (edit in place / fork a bundled theme)
- Ship an update to projects that already use the theme (`updates/<version>/`)
- New Arch preset (already documented in `theme-preset-generator.md`; possibly a separate skill)

---

## 2. What a skill is

A skill is a folder with a `SKILL.md` file, plus optional supporting files.

```
widgetizer-theme/
  SKILL.md          # YAML frontmatter (name, description) + the workflow body
  references/       # detailed docs, read only at the step that needs them
  scripts/          # helpers the agent runs rather than reads
  templates/        # starter files to copy (theme skeleton, widget skeleton)
```

- **Progressive disclosure.** Only `name` + `description` sit in the agent's context permanently. The body loads when a task matches the description (or the user invokes it by name). Reference files load only when the body tells the agent to read them. Scripts are executed, costing almost no context.
- **The description decides triggering.** It must say both what the skill does and when to use it ("create a Widgetizer theme", "add a widget to my theme", "update my theme"…).
- **Frontmatter** (Agent Skills spec): `name` is required, 1–64 chars, lowercase letters/digits/hyphens, and must match the folder name. `description` is required, 1–1024 chars. `license`, `compatibility`, `metadata` and `allowed-tools` are optional.
- **Size guidance:** keep `SKILL.md` under ~500 lines and push detail into `references/`.
- **Versus other mechanisms:** `CLAUDE.md` is always loaded (wrong place for thousands of lines of theming rules). `docs-llms/` is only read when something points at it. A skill is the thing that does the pointing, in the right order, with the checks built in.

---

## 3. Where it lives

**Master copy in this repo; published copy in a separate small public repo.**

- Master: a top-level folder such as `skills/widgetizer-theme/`. Deliberately **not** `.claude/skills/` — this is a shipped product, not the maintainer's local dev tooling, and it must stay tool-neutral. It sits beside the code and docs it describes, so a theme-format change and the skill update can land in the same commit.
- Public: a separate repo (e.g. `widgetizer-skills`) holding only the skill plus the per-ecosystem wrappers. This repo is far too heavy to install from (~355 MB of pack files, ~185 MB of `themes/` with preset media), and Anthropic's directory caps a submitted repo at ~50 MiB archived.
- A small publish script copies `skills/widgetizer-theme/` into the public repo, adds the wrappers and pushes. Run it at release time so the skill version tracks the app version.
- Once built, add a line to `CLAUDE.md`: when the theme format, widget/setting rules or theming docs change, check whether `skills/widgetizer-theme/` needs the same change.

**Open decision — the single source of truth for the reference content.** The skill must be self-contained (end users don't have `docs-llms/`), so its `references/` will contain theming knowledge. Two options, and one must be chosen so nothing is maintained twice by hand:

1. Generate `references/` from `docs-llms/theming*.md` etc. in the publish script.
2. Make the skill's `references/` canonical and trim the `docs-llms/` files to point at them.

---

## 4. Distribution

The `SKILL.md` format is an open standard ([agentskills.io](https://agentskills.io/specification)), so one skill folder works across ecosystems. Discovery and installation differ per platform. Nothing finds the skill automatically across ecosystems: users get it from the public repo/website, or from a directory it has been submitted to.

### Claude

- **Claude Code — plugin marketplace (main route).** Wrap the skill as a plugin: `.claude-plugin/plugin.json` manifest, skill at `skills/<name>/SKILL.md`, and a `marketplace.json` listing the plugin. Users add the GitHub repo as a marketplace, then install the plugin; pushes reach them as updates. Verify the exact commands when building.
- **Claude app (chat, desktop, Cowork).** Pro/Max users upload the packaged plugin (zip) under Customize → Plugins. Team/Enterprise admins can provision it org-wide (Organization settings → Plugins & skills). Free accounts cannot install custom skills.
- **Anthropic directory (optional).** Submit at `claude.ai/directory/manage` (paid plan). Automated validation and security scan, then human review. Requires `README.md` (≥40 words) and `LICENSE`. Limits: files <256 KiB each (images/fonts exempt), ≤512 files, repo <50 MiB archived.
- **Claude API.** A Skills API (`/v1/skills`) exists for developers; probably irrelevant to this audience.

Docs: [Create custom skills](https://claude.com/docs/skills/how-to.md) · [Submit your plugin](https://claude.com/docs/plugins/submit.md) · [Pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist.md) · [Share a plugin](https://claude.com/docs/plugins/share.md)

### OpenAI

- **ChatGPT (web, desktop, mobile)** supports skills; users upload a zipped skill folder in the Skills section. Plan requirements unconfirmed (the help article blocked automated fetching).
- **Codex (CLI, desktop app, IDE extension)** reads skills from `.agents/skills/` (repo) and `~/.agents/skills/` (user), and has a built-in installer that pulls skills from GitHub.
- Optional `agents/openai.yaml` inside the skill folder configures OpenAI's UI display, invocation policy and tool dependencies. OpenAI packages plugins its own way; the `.claude-plugin/` wrapper means nothing there.

Docs: [Build skills – ChatGPT Learn](https://learn.chatgpt.com/docs/build-skills) · [Skills in ChatGPT](https://help.openai.com/en/articles/20001066-skills-in-chatgpt) · [openai/codex skills docs](https://github.com/openai/codex/blob/main/docs/skills.md) · [openai/skills catalog](https://github.com/openai/skills)

### Consequences for the public repo

```
widgetizer-skills/
  .claude-plugin/marketplace.json
  plugins/widgetizer/…               # Claude plugin wrapper (plugin.json)
    skills/widgetizer-theme/
      SKILL.md                       # the one shared, tool-neutral skill
      agents/openai.yaml             # optional OpenAI metadata
      references/ scripts/ templates/
  README.md  LICENSE
```

The exact wrapper layout must be checked against both platforms' current docs when building.

---

## 5. Which agents can do what

| Agent | Local files? | How it works with Widgetizer |
|---|---|---|
| Claude Code, Claude Cowork | Yes | Works directly in the desktop app's data folder (§6) |
| OpenAI Codex | Yes | Same as Claude Code |
| ChatGPT desktop / "Work" | Unconfirmed | Verify before promising |
| Claude chat / ChatGPT in a browser | No (sandbox, no network, no package installs) | Produces a theme ZIP the user uploads on the Themes page (§7) |

**Writing rules that follow from this:**

- **Tool-neutral wording.** No Claude-specific tool names ("use the Read tool"), no Claude Code slash commands, nothing assuming one vendor. Plain steps and file paths.
- **Script runtime is not guaranteed.** Desktop users won't necessarily have Node or Python. Every bundled script needs a fallback: the body says what the script does, so the agent can do the same steps by hand.
- **Folder access.** The data folder lives outside anything the user normally opens in their agent. The skill's setup step must tell them to point the agent at it (or open the agent there).

---

## 6. Widgetizer facts the skill must encode

### Desktop data folder

The running app uses `<userData>/data/themes/` (themes) and `<userData>/data/projects/` (projects) — `getThemesDir()` in `packages/builder-server/src/config.js`, `userDataPath` in `electron/main.js`.

- **Windows (observed on an installed copy):** `%APPDATA%\com.widgetizer.app\data\`
- **macOS (assumed, unverified):** `~/Library/Application Support/com.widgetizer.app/data/`

The folder is named after the appId (`com.widgetizer.app` in `electron/builder.config.mjs`), not the productName "Widgetizer". What makes Electron choose that name is unresolved — **confirm on a Mac before building**. The paths aren't user-configurable today; if that changes, the skill falls back to asking the user.

`data/themes/` only appears after first launch (themes are seeded on first access). If it's missing, the skill says "open Widgetizer once" rather than failing.

### Three copies of a theme

1. **Seed** — `themes/<id>/`, repo only. Desktop users don't have it; bundled themes are provisioned from `app.asar.unpacked/themes/`.
2. **Runtime** — `data/themes/<id>/`. Provisioned **once** and never refreshed by app upgrades.
3. **Project copy** — `data/projects/<folder>/`. `copyThemeToProject` (in `themeController.js`) copies the theme at project creation, excluding `updates/`, `latest/`, `presets/`, `preset-media/`.

Editing the theme folder does **not** change existing projects. That is the central dev-loop problem.

### Gotchas

- **`latest/` wins.** If `data/themes/<id>/latest/theme.json` exists (the theme has updates), the app reads from `latest/`, not the root. Editing root files of such a theme has no visible effect.
- **Project `theme.json` holds the user's setting values.** Blindly copying the theme's `theme.json` over a project's resets that project's theme settings. Use a settings merge (see `mergeThemeSettings` in `themeUpdateService.js`: add new settings, keep existing values, drop removed ones) or skip it.
- **Project-owned folders.** `templates/` (applied at creation) and `menus/` (stamped with uuids that widgets reference) must not be mirrored into a project. `scripts/theme-sync.js` excludes `templates`, `presets`, `updates`, `latest`, `preset-media`, `menus` for exactly this reason.
- **Bundled themes (Arch etc.)** are provisioned by the app and receive updates. The skill should suggest copying one to a new theme id before customizing it.
- **No build tooling in the theme root.** Everything at the root (except the excluded folders) is copied into every project, so `package.json`/`node_modules` there would ship into every project (see `themes/widgetizer-saas-theme/BUILD.md`).
- **Theme listing cache.** Theme source metadata is cached for ~5 s (`THEME_SOURCE_CACHE_TTL_MS`), so a refresh immediately after an edit can briefly show stale data.

### Dev loop the skill should run

1. Create or edit the theme in `data/themes/<id>/`.
2. Have the user create one test project from it in the app.
3. After each change, mirror the theme into that project (respecting the exclusions and the `theme.json` rule above) and have the user refresh the editor.

Step 3 is the prime candidate for a bundled script: a user-facing version of `scripts/theme-sync.js` that takes the desktop data folder instead of repo paths. It needs a manual fallback (§5).

### Theme ZIP upload (sandboxed agents, and distribution)

`uploadTheme` in `packages/builder-server/src/controllers/themeController.js` requires:

- A single root folder in the ZIP (the theme id)
- `theme.json`, `screenshot.png` and `layout.liquid` in that folder
- `theme.json` with `name`, `version` (valid semver) and `author`
- Every `updates/<version>/` folder name must be semver and contain its own `theme.json` whose version matches
- Size cap: `export.maxImportSizeMB` app setting, default 500 MB

Re-uploading an existing theme only imports new `updates/` versions. The ZIP's base version must equal the installed base (HTTP 409 otherwise). Full detail: `core-themes.md`, `theme-updates.md`.

### Shipping an update to existing projects

Projects only pick up theme changes through the update mechanism (`theme-updates.md`):

- Add `updates/<new-version>/` with a matching `theme.json` and **only the changed files**. Removals go under `deleted/`.
- **Never bump the base version in a distributed ZIP.** The base is the floor; bumping it breaks every existing install.
- On update: `layout.liquid`, `assets/`, `widgets/`, `snippets/`, `locales/`, `collection-types/` and `screenshot.png` are replaced. `theme.json` is merged. `menus/` and `templates/` are add-only. `pages/`, `uploads/` and `collections/` are never touched.
- The user then applies the update per project from the Projects page.

---

## 7. Knowledge sources to distill into `references/`

| Topic | Source |
|---|---|
| Theme structure, `theme.json`, layout, Liquid tags/filters, blocks, templates, menus, assets, locales, lifecycle | `theming.md` |
| Widget authoring (structure, layout, typography, color, JS, editor events, schema conventions, standardized blocks, accessibility, checklist) | `theming-widgets.md` |
| Setting types | `theming-setting-types.md` |
| Reference design system (tokens, grid, CSS variable pipeline, widget conventions) | `arch-design-system.md` |
| Theme management, upload, updates | `core-themes.md`, `theme-updates.md` |
| Collections / collection types | `core-collections.md` |
| Security constraints themes must respect (autoescape, `\| raw`, `safe_url`, image-path allowlist) | `core-security.md`, CLAUDE.md "Sanitization & Safety" |
| Presets (if in scope) | `theme-presets.md`, `theme-preset-file-format.md`, `theme-preset-generator.md`, `theme-preset-process.md` |
| A real from-scratch theme build (phases, Tailwind build rules, conversion workflow) | `themes/widgetizer-saas-theme/PLAN.md`, `BUILD.md`, `STATUS.md`, `WIDGETS.md`, `tools/apply_page.py` |
| Existing validation | `scripts/validate-theme-locales.js` |
| Working examples | `themes/arch/` (reference theme), `themes/widgetizer/`, `themes/widgetizer-saas-theme/` |

The saas-theme process docs are effectively a hand-built skill for one theme. They are the best starting point for the workflow section.

**Maintainer rules worth baking in** (currently spread across memory/feedback):

- Shared block types (heading, text, button) use identical settings across all widgets.
- Header `contactDetailsLine1/Line2` are phone/email/address only.
- Placeholder contacts are clearly fake: `hello@example.com`, `(555) xxx-xxxx`, `example.com`.
- Avoid beige/cream/ivory "safe" palettes.
- Image prompts must feel bright, alive, modern-brand.
- Preset templates use `widgets`/`widgetsOrder`/`name`/`slug`.
- Preset `{preset-id}-images.json` is a flat array with `file`/`width`/`height`/`prompt` keys.

---

## 8. Build process (when the time comes)

1. Settle the open questions in §9.
2. Use the `skill-creator` skill (Anthropic) to draft the skill, run it against sample tasks, and tune the description so it triggers reliably.
3. Test on real tasks in a real desktop install, Windows and Mac:
   - "Create a theme for a bakery"
   - "Add a testimonials widget to my theme"
   - "Change my theme's fonts and ship it as an update"
4. Test in at least one non-Claude agent (Codex) to prove tool neutrality.
5. Write the publish script and public repo wrappers. Verify install commands and upload paths against current docs.
6. Add the `CLAUDE.md` "keep the skill in sync" line.
7. Optionally submit to the Anthropic directory.

---

## 9. Open questions

1. **Scope.** Which jobs from §1? One skill, or several (e.g. theme / widget / preset)?
2. **CSS approach for new themes.** Tailwind (as in the saas theme) or plain CSS tokens (as in Arch)? The Tailwind path needs a CLI the user may not have.
3. **Definition of done.** Candidates: locales validate; every widget has `schema.json` + `widget.liquid`; shared blocks match; the theme ZIP passes upload validation; the test project renders.
4. **Single source for reference content** (§3).
5. **macOS data-folder name** (§6).
6. **ChatGPT desktop local-file access**, and ChatGPT plan requirements for skills (§4–5).
7. **Theme screenshot.** `screenshot.png` (1280×720) is required for upload. How does an agent produce one without a browser?
