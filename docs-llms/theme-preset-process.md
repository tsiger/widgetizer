# Theme Preset Production Process

Step-by-step process for producing a complete, polished Arch theme preset — from
project creation to live demo deployment.

This document covers the **manual production workflow** (human + Claude) and how a
finished project is packed back into a shippable preset. For preset file shapes
(`preset.json`, templates, menus, link objects, the media manifest), see
[theme-preset-file-format.md](theme-preset-file-format.md). For design strategy,
see [theme-preset-generator.md](theme-preset-generator.md). For preset
mechanics (registry, fallback, media seeding) see [theme-presets.md](theme-presets.md).

---

## How preset media works

**Preset media is packed once into the
seed theme, not uploaded per project.** A preset ships its images and their
metadata under `themes/arch/presets/<id>/media/`, and the backend seeds them
automatically into every project created from that preset.

```
themes/arch/presets/<id>/media/
  images/          # image binaries (originals + pre-generated variants)
  manifest.json    # { files: [...] } — alt/title/caption/sizes per image
```

- At project creation, `projectController.seedPresetMedia`
  (`packages/builder-server/src/controllers/projectController.js`) copies
  `media/images/` into the project's `uploads/images/` verbatim and registers
  each `manifest.json` entry in the media DB with a fresh, project-scoped UUID
  (via `mediaRepository.addMediaFile`). The media dir is discovered by
  `themeController.resolvePresetPaths`, which returns `{ ..., collectionsDir, mediaDir }`.
- Because the binaries keep their `/uploads/images/<filename>` paths across
  projects, image-field values shipped in the preset's templates and collection
  items resolve as-is — no re-assignment needed.
- `scripts/pack-preset-media.js` does the reverse: it reads a finished project's
  media records from SQLite (`mediaRepository.getMediaFiles`), copies the image
  binaries from disk, and writes them plus a regenerated `manifest.json` back
  into `themes/arch/presets/<id>/media/`. Run it via `npm run preset:media`.

The practical consequence: you only touch image metadata (alt/title/caption)
**once**, in the source project, then pack it. Every future project from the
preset inherits it.

---

## Prerequisites

- Widgetizer running locally (`npm run dev:all`)
- The preset's `preset.json`, `templates/`, `menus/`, and (if it has collection
  content) `collections/` already exist in `themes/arch/presets/<preset-id>/`
- Image generation prompts ready (or stock images sourced)

---

## Step 1: Create the Project

1. In the Widgetizer UI, create a new project using the **Arch** theme.
2. Select the target preset from the preset list.
3. The project is created with the preset's templates, menus, settings overrides,
   collection items, **and any already-packed starter media** applied.

The project now lives at `data/projects/<folder>/` and is independent from the
preset source files. If the preset already has packed media (a `media/` dir), the
project opens with real photography instead of placeholders; if not, you'll
generate and pack it in Steps 2–3 below.

---

## Step 2: Generate Images and Set Metadata in the Source Project

This is the one-time authoring pass that produces the images a preset will ship.

1. Generate images using the preset's image prompts (or source stock images).
2. Upload them to **this source project** through the Widgetizer media manager.
   Upload also produces the responsive variants (`medium`/`small`/`thumb`) and
   records width/height/sizes in SQLite (`media_files` table, via
   `mediaRepository`).
3. Set `alt` (and `title`/`caption` where useful) for every image. Alt text
   matters for accessibility and SEO and is carried into the preset manifest, so
   set it here rather than per future project.

**Claude-assisted metadata pass:** Claude reads each image visually from
`data/projects/<folder>/uploads/images/`, proposes `alt`/`title` based on image
content and filename hints (`hero-`, `team-`, `gallery-`, etc.), and on approval
sets them through the media manager / media API. The values land in the media DB
and will be packed verbatim into `manifest.json`.

---

## Step 3: Pack Media into the Preset

Once the source project's images and metadata are finished, pack them back into
the git-tracked seed theme so all future projects inherit them:

```bash
npm run preset:media -- --project <folder> [--theme arch] [--preset <id>]
```

`--preset` defaults to the project folder name; `--theme` defaults to `arch`.
The script (`scripts/pack-preset-media.js`):

- copies every image binary (originals + variants) from
  `data/projects/<folder>/uploads/images/` into
  `themes/arch/presets/<id>/media/images/` (clean slate each run, so removed
  images don't linger),
- regenerates `themes/arch/presets/<id>/media/manifest.json` from the project's
  DB records, dropping project-specific fields (`id`/`uploaded`/`usedIn`) so
  `seedPresetMedia` can assign fresh project-scoped values.

After this, creating a new project from the preset auto-seeds these images with
their alt/title/caption and responsive sizes — no manual upload, no SQLite edits.

> Manifest shape is documented in
> [theme-preset-file-format.md](theme-preset-file-format.md). Media internals
> (variants, sizes, the `/uploads/images/…` allowlist) are in
> [core-media.md](core-media.md).

---

## Step 4: Adjust Widget Settings

Manual work in the Widgetizer editor on the source project:

- Confirm images are assigned to the correct widgets (preset templates that ship
  image-field values resolve automatically against the seeded paths; fix any
  gaps).
- Tweak spacing, layout, and color scheme choices.
- Verify the site looks correct across pages.
- Check mobile responsiveness.

Any content changes you make here that should ship with the preset go back into
`themes/arch/presets/<id>/templates/` (see Step 6). Image-binary/metadata changes
are re-captured by re-running the pack step (Step 3).

---

## Step 5: Add Custom Logo

Upload logo variants for the preset:

- **Default logo** — used on standard backgrounds (assigned to header `logoImage`).
- **Transparent logo** — used when the transparent header is active over hero
  images (assigned to header `transparent_logo`).
- **Footer logo** — if the footer uses a different color scheme, a light/inverted
  variant may be needed (assigned to the footer `logo_text` block `logo`).

Logos go through the same media upload flow as other images, so they are packed
into the preset by the same `npm run preset:media` step. Assign them in the
header/footer widget settings, then re-pack so the seeded manifest includes them.

---

## Step 6: Sync Source-Theme Changes

Any CSS, widget-template, JS, or preset-content fixes made during production must
go back to the canonical source theme (`themes/arch/`, committed to git). Use the
sync scripts instead of copying files by hand — they mirror the source into the
runtime copy (`data/themes/arch/`) and rebuild the active project.

```bash
npm run theme:sync                                                       # one-shot: themes/<theme> → data/themes/<theme> (runtime copy only)
npm run theme:sync  -- --project <folder> [--theme arch]                 # theme assets/widgets → runtime + project, then watches
npm run preset:sync -- --project <folder> --preset <preset-id> [--theme arch]  # preset templates/menus/settings rebuild
```

- **`theme:sync`** (`scripts/theme-sync.js`) mirrors the theme source into the
  runtime copy (`data/themes/<theme>/`). Without `--project` it is a one-shot
  mirror and exits — use this to publish a new preset/registry change to the
  project-creation picker. With `--project` it also mirrors shared theme files
  (CSS, JS, widgets, fonts) into the project and keeps watching `themes/<theme>/`.
  The project folder must already exist.
- **`preset:sync`** (`scripts/preset-sync.js`) additionally rebuilds the project's
  pages/menus from `themes/arch/presets/<id>/` when preset content
  (`preset.json`, `templates/`, `menus/`) changes — so settings overrides and
  template edits flow into the active project.

> Preset **content** edits (templates JSON, menus JSON, `preset.json` settings)
> only affect projects created/synced *after* the edit, not unrelated existing
> projects.

---

## Step 7: Create Screenshot

Preset screenshots are **1024x1024** (square) and stored at:

```
themes/arch/presets/<preset-id>/screenshot.png
```

1. Capture or create the screenshot at 1024x1024.
2. Place it in the preset folder.
3. It is served via static file serving at
   `/themes/arch/presets/<preset-id>/screenshot.png`.

The UI displays these with `aspect-square object-cover` in both the Themes page
and the project creation form. Until a real preview exists, the blank theme-root
screenshot (`themes/arch/screenshot.png`) may be used as a placeholder — see
the screenshot exception in [theme-preset-file-format.md](theme-preset-file-format.md).

---

## Step 8: Update presets.json

Add or update the preset entry in `themes/arch/presets/presets.json`. The file is
an object with a `default` key and a `presets` array:

```json
{
  "default": "blank",
  "presets": [
    {
      "id": "blank",
      "name": "Blank",
      "description": "Empty slate"
    },
    {
      "id": "<preset-id>",
      "name": "Display Name",
      "description": "Industry label",
      "liveDemo": "https://demos.widgetizer.org/<preset-id>/"
    }
  ]
}
```

- `default` names the preset selected by default in the creation form (currently
  `blank`).
- The `blank` preset is registered here but ships **no** `templates/`, `menus/`,
  or `media/` — it falls back to the theme root and produces an empty starter
  site. It is the default and must stay in the registry.
- `liveDemo` is optional — add it after the demo is deployed (Step 9). The URL
  convention is `https://demos.widgetizer.org/<preset-id>/` (note the trailing
  slash).

Sync the registry to the runtime location with `npm run theme:sync` (it mirrors
`presets/presets.json` into `data/themes/arch/presets/`); do not hand-copy it.

---

## Step 9: Export and Deploy Live Demo

1. In the Widgetizer UI, go to **Export Site** for the project.
2. Export generates a complete static HTML site (see [core-export.md](core-export.md)).
3. Upload the exported files to `demos.widgetizer.org/<preset-id>/`.
4. Verify the live demo is accessible.
5. If not already set, add the `liveDemo` URL to `presets.json` (Step 8).

---

## Checklist & Tracker

There is no separate per-preset checklist in this doc — the authoritative
per-preset status (which presets exist, their industries, and live-demo URLs)
lives in `themes/arch/presets/presets.json`, and progress is tracked in the
preset tracker (kept in `docs-llms/archive/`). Keep that tracker and
`presets.json` as the single sources of truth to avoid divergence; the file-shape
contract lives in [theme-preset-file-format.md](theme-preset-file-format.md).

When finishing a preset, the load-bearing steps are: pack media (`npm run
preset:media`), set the `screenshot.png`, register/update the `presets.json`
entry (with `liveDemo`), sync to runtime (`npm run theme:sync` / `preset:sync`),
and deploy the demo to `demos.widgetizer.org/<preset-id>/`.
