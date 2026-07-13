# Plan: Theme-Root `preset-media/` (Arch delta/disk slimming)

Move Arch's preset starter images out of `presets/<id>/media/` into a theme-root
`preset-media/<id>/` folder that is **excluded from theme update deltas and all
runtime copies**, and resolved from the theme's distribution copy (the app seed)
at project-creation time. Delete this file when shipped.

## Why

The 0.9.8→0.9.9 Arch delta is 197 MB; 180 MB of that is preset starter media
duplicated from the theme root. The update system layers root + delta into
`latest/` and reads presets from there, so today media *must* ride deltas.
Since Arch's presets are final and the images are static, the images can
instead live once, outside the update system's reach.

## Design

New optional theme folder, sibling to `presets/`:

```
themes/arch/preset-media/<presetId>/images/*      (binaries, incl. size variants)
themes/arch/preset-media/<presetId>/manifest.json (same format as today)
```

Inner layout is identical to today's `presets/<id>/media/`, so `seedPresetMedia`
is untouched — only *where the folder is found* changes.

**Media resolution at project creation** (`resolvePresetPaths`), in order:

1. `<sourceDir>/presets/<id>/media` — today's concept, unchanged. Normal
   ZIP-theme authors (typically one preset) keep working exactly as now.
2. `THEMES_SEED_DIR/<theme>/preset-media/<id>` — the app's own copy; always
   current for bundled themes (Arch). This is what makes updated 0.9.8
   installs get current images without the delta carrying them.
3. `<sourceDir>/preset-media/<id>` — covers a ZIP theme that adopts the new
   layout (its installed copy IS its distribution copy; seed doesn't exist).
4. None found → no media seeding. Valid state, not an error (the default
   `arch` preset already works this way: no media folder, no image refs).

**Rules**

- `preset-media/` never enters: update deltas, `latest/`, per-project theme
  copies, or the seed→data-dir theme copy.
- Preset-media filenames are append-only across theme versions: add files
  freely, never rename/delete (older preset templates reference them by name).
  Moot for Arch (presets frozen) but goes in the theme-author docs.

## Touchpoints

### Code (small, verified in source)

- [ ] `scripts/theme-update-delta.js:15` — add `"preset-media"` to
      `EXCLUDED_TOP_LEVEL` (currently `["updates", "latest"]`). This is the
      180 MB saving.
- [ ] `packages/builder-server/src/controllers/themeController.js:1024`
      (`copyThemeToProject`) — add `"preset-media"` to `allExcludes`
      (currently `updates`, `latest`, `presets`) so projects never copy it.
- [ ] `themeController.js:614-618` (`resolvePresetPaths`) — implement the
      4-step media resolution above. Only `mediaDir` changes; templates/menus/
      collections resolution stays exactly as-is (update system untouched).
- [ ] `themeController.js:175-186` (seed→data-dir theme copy) — filter out
      `preset-media/` in the `fs.copy` (saves ~180 MB per install's data dir;
      resolution step 2 reads the seed directly instead).
- [ ] `scripts/pack-preset-media.js:61-64` — pack target changes from
      `presets/<id>/media` to `preset-media/<id>` (same inner layout).

### File move (one-time, Arch)

- [ ] `git mv themes/arch/presets/<id>/media/* → themes/arch/preset-media/<id>/`
      for the 31 presets that have media (the default `arch` preset has none).
      Byte-identical moves — git stores renames cheaply.
- [ ] Delete the untracked `themes/arch/updates/0.9.9/` and regenerate after
      the move + script change. Expect ~18 MB. Sanity: no `presets/**/media`
      or `preset-media` entries in the plan output, and no deletion markers
      for preset media (0.9.8 never shipped any).

### Verify (expect no change needed, confirm while implementing)

- [ ] `layerThemeSnapshot` copies base minus `updates`/`latest` — for Arch the
      data-dir base won't contain `preset-media/` at all (excluded from seed
      copy), so `latest/` stays clean automatically. For a ZIP theme using the
      new layout, `preset-media/` in `latest/` is fine (it's their
      distribution copy; step 3 reads sourceDir).
- [ ] Theme upload / update-import validation: an uploaded ZIP with a
      top-level `preset-media/` must be accepted (or explicitly ignored), not
      rejected.
- [ ] Electron build: `preset-media/` lives inside `themes/`, which already
      ships as the seed — confirm no builder-config change is needed, and that
      `seedPresetMedia`'s `fs.copy` from the packaged seed path works in the
      installed app (asar/resources).
- [ ] Dev `theme:sync` script: decide whether it mirrors `preset-media/` into
      the runtime copy (harmless either way — resolution hits the seed first;
      skipping keeps dev data dirs small).

### Tests

- [ ] `presetMediaSeeding.test.js`: new cases — (a) bundled theme resolves
      media from seed `preset-media/<id>`; (b) no-seed theme falls back to
      `<sourceDir>/preset-media/<id>`; (c) `presets/<id>/media` still wins
      when present; (d) nothing anywhere → seeding skipped cleanly.
- [ ] `themes.test.js` (`resolvePresetPaths` block): cover the new `mediaDir`
      resolution order.
- [ ] Delta script: if it has a test suite, cover the `preset-media` exclusion;
      otherwise verify via the regen output in the file-move step.

### Docs

- [ ] `docs-llms/theme-preset-file-format.md` — document `preset-media/` as the
      optional theme-root alternative; per-preset `media/` stays the default.
- [ ] `docs-llms/theme-preset-process.md` — pack step now targets
      `preset-media/<id>`.
- [ ] `docs-llms/core-media.md` — preset seeding resolution order.
- [ ] `CLAUDE.md` directory-layout line for `themes/` (mentions preset media).
- [ ] Public theme-dev docs (whichever page covers preset structure/media):
      add `preset-media/` + the append-only filename rule.

## Effects

- Installer / packaged app: **−~180 MB** (media shipped once, not twice).
- Per-user data dir: **−~180 MB** (no longer copied out of the seed).
- Update deltas: 0.9.9 drops from 197 MB → ~18 MB; future deltas never carry
  preset media.
- Repo size: unchanged (files move, bytes identical).
- Normal theme authors: zero behavior change.

## Sequencing with the 0.9.9 release

Implement → move files → regenerate delta → update
`plan-release-0.9.9.md` (delta item) → proceed with builds. The Windows
update-playbook rehearsal then also exercises the new resolution path
end-to-end (0.9.8 install → 0.9.9 app → theme update → create project from a
preset → images must appear).
