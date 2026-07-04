# TEMP — Bedrock preset: remaining work (handoff notes)

> Temporary session notes for finishing the **bedrock** preset (general contractor).
> Delete this file once the preset ships. Authoritative docs: the plan in
> [preset-plans/bedrock.md](preset-plans/bedrock.md), the process in
> [theme-preset-process.md](theme-preset-process.md), status row #31 in
> [archive/theme-presets-tracker.md](archive/theme-presets-tracker.md).

## Where things stand (2026-07-04)

Done: preset fully built + schema-validated (`themes/arch/presets/bedrock/` — templates, menus,
6 seeded `projects` collection items, registry entry); 34 images generated (FLUX) → webp →
uploaded to the local `bedrock` project; **alt text set on all 34** via the media API;
header-contrast fix (inner openers are `rich-text`, not `banner`) and trust-bar spacing fix
applied to preset source + live project; spacing/transparent-header doc corrections shipped
(generator doc §2.4/§10.3–10.4 + 11 widget insights files); `theme:sync` now works bare as a
one-shot runtime mirror. **All of it is uncommitted in the working tree.**

## ⚠ Machine-bound state — read before switching computers

`data/` is gitignored. The Bedrock **project** (pages), its **uploaded images**, and the
**alt-text records (SQLite)** exist only on the original machine. The generated raw/webp images
also live in the untracked `scratch/` folder there.

**Strongly preferred: finish steps 1–2 below on the original machine, then commit + push.**
Once `preset:media` has packed the media into `themes/arch/presets/bedrock/media/` (git-tracked),
every other machine gets everything — a project created from the preset there is born fully
imaged with alt text.

If that's not possible: commit + push the source as-is; on the new machine you'd have to
re-transfer the webp files (copy `scratch/bedrock-webp/`), create a project from the preset,
re-upload, and redo alt text (the intended strings are recorded in this session's media DB and
can be re-derived from [preset-plans/bedrock-images-usage.md](preset-plans/bedrock-images-usage.md) descriptions).

## Remaining checklist (in order)

1. **Replace `bedrock-after-kitchen.webp`** — the FLUX output is a broken side-by-side diptych.
   User is making one manually (finished white shaker kitchen, shot from the doorway, window
   over sink centered on the back wall — must match the framing of `bedrock-before-kitchen.webp`
   for the comparison slider). Delete old file in the media manager, upload new one with the
   **same filename**, then re-set its alt text:
   > Remodeled white kitchen with shaker cabinets and a wide-plank oak floor after renovation
2. **Pack media**: `npm run preset:media -- --project bedrock`
   → writes `themes/arch/presets/bedrock/media/images/` + `manifest.json`. Verify by creating a
   throwaway project from the preset — it should open fully imaged.
3. **Logos** (optional but planned; outside the FLUX pipeline — user generates with another service):
   - Horizontal lockup, symbol left + wordmark right. Prompt (default variant):
     flat vector logo, "Bedrock", square badge of three stacked rock strata with a peaked
     roofline in the top layer, sharp corners; symbol deep umber #292219 with middle stratum
     rust #b35c1e; wordmark in bold slab serif (Arvo-like) #292219; flat colors, no gradients,
     wide format. Light variant for the transparent header: off-white #f7f3ec + light rust
     #e0813c on umber background. Cut both to transparent PNG.
   - Upload both → assign in header settings (`logoImage` = default, `transparent_logo` = light)
   - **Mirror the two paths into `themes/arch/presets/bedrock/templates/global/header.json`**
     (editor changes don't flow back to the preset — see how everafter/inkwell header.json do it)
   - Re-run the pack (step 2) so the logo binaries ship with the preset
4. **Screenshot**: 1024×1024 of the homepage → `themes/arch/presets/bedrock/screenshot.png`
   (currently the blank placeholder)
5. **Export + deploy**: Export Site in the UI → upload to `https://demos.widgetizer.org/bedrock/`
6. **Close out**:
   - Add `"liveDemo": "https://demos.widgetizer.org/bedrock/"` to the bedrock entry in
     `themes/arch/presets/presets.json`
   - Flip tracker row #31 to DONE in [archive/theme-presets-tracker.md](archive/theme-presets-tracker.md)
   - `npm run theme:sync` (bare = one-shot runtime mirror)
   - Commit everything — **exclude `scratch/`** (raw image staging; consider gitignoring it)
   - Delete this file

## Useful bits

- Bedrock project id (original machine): `3d3b07e8-f9fb-4987-82b7-e1615017987b`
- Alt-text update endpoint: `PUT /api/media/projects/:projectId/media/:fileId/metadata`
  with `{ "alt": "..." }` (list files via `GET /api/media` + `X-Project-Id` header)
- Image ↔ widget mapping: [preset-plans/bedrock-images-usage.md](preset-plans/bedrock-images-usage.md)
- Working-tree changes at time of writing: 17 modified files + `themes/arch/presets/bedrock/`,
  `docs-llms/preset-plans/`, `scratch/` untracked (`git status` for the live list)
