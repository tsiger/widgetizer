# Theme Preset Production Process

Step-by-step process for producing a complete, polished Arch theme preset — from project creation to live demo deployment.

This document covers the **manual production workflow** (human + Claude). For file format details see [theme-preset-file-format.md](theme-preset-file-format.md). For the preset tracker see [theme-presets-tracker.md](theme-presets-tracker.md).

---

## Prerequisites

- Widgetizer running locally (`npm run dev:all`)
- Access to `data/widgetizer.db` (SQLite)
- Image generation prompts ready (or stock images sourced)
- The preset's `preset.json`, `templates/`, and `menus/` already exist in `themes/arch/presets/{preset-id}/`

---

## Step 1: Create the Project

1. In the Widgetizer UI, create a new project using the **Arch** theme
2. Select the target preset from the preset list
3. The project is created with the preset's templates, menus, and settings overrides applied

The project now lives at `data/projects/{folder}/` and is independent from the preset source files.

---

## Step 2: Generate and Upload Images

1. Generate images using the preset's image prompts (or source stock images)
2. Run the optimization script if needed (`scripts/` tooling)
3. Upload images to the project through the Widgetizer media manager

---

## Step 3: Update Image Metadata (Alt & Title)

Images need `alt` text and `title` for accessibility and SEO. These are stored in SQLite (`data/widgetizer.db`, table `media_files`).

**Claude-assisted workflow:**

1. Claude reads each image visually from `data/projects/{folder}/uploads/images/`
2. Generates alt text and title based on the image content and its context (filename hints like `hero-`, `team-`, `gallery-` etc.)
3. Presents the full list for review
4. On approval, writes all metadata to SQLite in a single transaction via `better-sqlite3`:

```js
const stmt = db.prepare('UPDATE media_files SET alt = ?, title = ? WHERE id = ?');
```

**Finding images for a specific project:**

```js
db.prepare('SELECT id, filename, alt, title FROM media_files WHERE project_id = ?').all(projectId);
```

The `project_id` foreign key links each image to its project.

---

## Step 4: Adjust Widget Settings

This is manual work in the Widgetizer editor:

- Assign uploaded images to the correct widgets
- Tweak spacing, layout, and color scheme choices
- Verify the site looks correct across pages
- Check mobile responsiveness

---

## Step 5: Add Custom Logo

Upload logo variants for the preset:

- **Default logo** — used on standard backgrounds (assigned to header `logoImage`)
- **Transparent logo** — used when transparent header is active over hero images (assigned to header `transparent_logo`)
- **Footer logo** — if the footer uses a different color scheme, a light/inverted variant may be needed (assigned to footer `logo_text` block `logo`)

Logo images go through the same media upload flow as other images. Assign them in the header and footer widget settings.

---

## Step 6: Sync Changes Back to Source Theme

Any fixes or improvements made during the manual adjustment phase need to go back to the source theme. There are **three locations** to keep in sync:

| Location | Role |
|----------|------|
| `themes/arch/` | Canonical source (committed to git) |
| `data/themes/arch/` | Runtime copy (what the app reads) |
| `data/projects/{folder}/` | Active project copy |

**Workflow:**

1. Make changes in the source: `themes/arch/`
2. Copy changed files to both runtime and project locations:

```bash
cp themes/arch/assets/base.css data/themes/arch/assets/base.css
cp themes/arch/assets/base.css data/projects/{folder}/assets/base.css
```

Changes to widget templates (`.liquid`), CSS, or JS all follow this pattern.

**If changes are to preset content** (templates JSON, menus JSON, preset.json settings):
- Edit the files in `themes/arch/presets/{preset-id}/` directly
- These only affect new projects created from the preset, not existing ones

---

## Step 7: Create Screenshot

Preset screenshots are **1024x1024** (square) and stored at:

```
themes/arch/presets/{preset-id}/screenshot.png
```

1. Capture or create the screenshot at 1024x1024
2. Place it in the preset folder
3. The screenshot is served automatically via static file serving at `/themes/arch/presets/{preset-id}/screenshot.png`

**Note:** The UI displays these with `aspect-square object-cover` in both the Themes page and the project creation form.

---

## Step 8: Update presets.json

Add or update the preset entry in `themes/arch/presets/presets.json`:

```json
{
  "id": "{preset-id}",
  "name": "Display Name",
  "description": "Industry label",
  "liveDemo": "https://widgetizer.org/demos/{preset-id}"
}
```

The `liveDemo` field is optional — add it after the demo is deployed (Step 8).

Remember to copy `presets.json` to the runtime location too:

```bash
cp themes/arch/presets/presets.json data/themes/arch/presets/presets.json
```

---

## Step 9: Export and Deploy Live Demo

1. In the Widgetizer UI, go to **Export Site** for the project
2. Export generates a complete static HTML site
3. Upload the exported files to `widgetizer.org/demos/{preset-id}/`
4. Verify the live demo is accessible
5. If not already set, add the `liveDemo` URL to `presets.json` (see Step 7)

---

## Quick Checklist

For each preset, confirm:

- [ ] Project created from preset
- [ ] Images generated/sourced and uploaded
- [ ] Image alt & title metadata populated in SQLite
- [ ] Widget settings adjusted (images assigned, spacing tweaked)
- [ ] Custom logo variants uploaded and assigned (default, transparent, footer)
- [ ] Theme source files updated if any CSS/template fixes were made
- [ ] Screenshot captured at 1024x1024 and placed in preset folder
- [ ] `presets.json` entry added/updated (including `liveDemo` if ready)
- [ ] Site exported and uploaded to widgetizer.org/demos/
- [ ] Live demo verified working
- [ ] Tracker updated in [theme-presets-tracker.md](theme-presets-tracker.md)
