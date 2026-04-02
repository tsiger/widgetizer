# Bento Grid Widget

A flexible tiled grid for showcasing features, services, or highlights in an asymmetric, visually weighted layout.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text | Small label above the headline; adds context or category framing |
| `title` | Any text (default: "Feature Spotlight") | Section headline; renders as `h1` when the widget is first on the page, `h2` otherwise |
| `description` | Any text | Supporting paragraph below the headline |
| `heading_alignment` | `left`, `center` (default) | Controls whether the section header block sits left-aligned or centered above the grid |
| `gap` | `0`, `--space-sm`, `--space-md` (default), `--space-lg`, `--space-xl` | Gutter size between tiles; `0` gives a seamless mosaic, larger values add breathing room |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Section-level palette; highlight schemes swap background/foreground for contrast sections |
| `top_spacing` | `auto` (default), `none` | Removes the default top margin so sections can sit flush against the previous widget |
| `bottom_spacing` | `auto` (default), `none` | Removes the default bottom margin for flush stacking with the next widget |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| **item** | `title`, `text`, `image`, `link` (content); `col_span` 1-4, `row_span` 1-2 (layout); `background_color`, `overlay_color`, `text_color`, `alignment` (display) | The only block type. Each tile is one item. An image turns the tile into a background-image card with a customizable overlay. A background color without an image creates a flat colored tile. If neither is set, the tile gets a subtle border instead. Tiles with a `link` render as `<a>` elements. |

---

## Layout Recipes

The grid is 4 columns on desktop and collapses to a single column on mobile. Every recipe below assumes desktop and totals to row-complete arrangements (columns add up to 4 per row).

### 1. Hero Spotlight + Supporting Details

| Tile | col_span | row_span | Purpose |
|------|----------|----------|---------|
| Main feature | 2 | 2 | Large image tile, light text, overlay |
| Detail A | 2 | 1 | Flat color tile, dark text |
| Detail B | 2 | 1 | Flat color tile, dark text |

**Good for:** Announcing a flagship product, seasonal promotion, or new location opening.
**Industries:** Retail, restaurants, real estate agencies.

### 2. Equal Quarters

| Tile | col_span | row_span | Purpose |
|------|----------|----------|---------|
| Service A | 2 | 1 | Each tile highlights one offering |
| Service B | 2 | 1 | |
| Service C | 2 | 1 | |
| Service D | 2 | 1 | |

**Good for:** Presenting core service categories at a glance with no single item dominating.
**Industries:** Consulting firms, dental practices, cleaning companies.

### 3. Wide Banner + Three Cards

| Tile | col_span | row_span | Purpose |
|------|----------|----------|---------|
| Banner | 4 | 1 | Full-width image tile with headline and CTA link |
| Card A | 1 | 1 | Supporting detail |
| Card B | 1 | 1 | Supporting detail |
| Card C | 2 | 1 | Slightly wider card for longer copy |

**Good for:** A portfolio intro or event announcement followed by quick-hit details.
**Industries:** Photography studios, event planners, coworking spaces.

### 4. Feature Matrix (6 tiles)

| Tile | col_span | row_span | Purpose |
|------|----------|----------|---------|
| Tile 1 | 1 | 1 | Compact feature |
| Tile 2 | 1 | 1 | Compact feature |
| Tile 3 | 2 | 1 | Wider feature with image |
| Tile 4 | 2 | 1 | Wider feature with image |
| Tile 5 | 1 | 1 | Compact feature |
| Tile 6 | 1 | 1 | Compact feature |

**Good for:** SaaS-style feature breakdowns or a "Why choose us" section.
**Industries:** Software companies, digital agencies, fitness studios listing class types.

### 5. Asymmetric Storytelling

| Tile | col_span | row_span | Purpose |
|------|----------|----------|---------|
| Hero image | 3 | 2 | Dominant photo tile, light text, overlay |
| Stat A | 1 | 1 | Key number or award |
| Stat B | 1 | 1 | Key number or award |

**Good for:** "About us" sections that lead with a strong visual and pair it with proof points.
**Industries:** Architecture firms, contractors, nonprofits.

### 6. Content Dashboard

| Tile | col_span | row_span | Purpose |
|------|----------|----------|---------|
| Primary | 2 | 2 | Image tile linking to latest blog post or case study |
| Secondary A | 1 | 1 | Colored tile linking to second article |
| Secondary B | 1 | 1 | Colored tile linking to third article |
| Secondary C | 1 | 1 | Colored tile linking to fourth article |
| Secondary D | 1 | 1 | Colored tile linking to fifth article |

**Good for:** A curated content hub on a homepage, replacing a traditional blog roll.
**Industries:** Marketing agencies, law firms, health clinics with resource libraries.

### 7. Minimal Duo

| Tile | col_span | row_span | Purpose |
|------|----------|----------|---------|
| Left | 2 | 1 | Image-backed tile |
| Right | 2 | 1 | Flat colored tile with copy |

**Good for:** A simple before/after, problem/solution, or two-service split.
**Industries:** Interior designers, personal trainers, tutoring services.

---

## Differentiation Tips

- **Mix image tiles with flat-color tiles.** A grid where every tile has a background image becomes noisy. Alternate between photo tiles (with overlay + light text) and solid-color tiles (dark text) to create visual rhythm.
- **Use col_span 3 + 1 sparingly.** A 3:1 ratio draws the eye hard to the left; reserve it for a single hero moment per page, not repeated in every section.
- **Let gap do the work.** Setting gap to `0` with border-free image tiles produces a magazine-style mosaic that feels premium. Setting it to `--space-lg` or `--space-xl` feels open and editorial.
- **Pair with heading_alignment left** when the grid follows a narrative flow (top-to-bottom reading). Use center alignment when tiles are more of an unordered showcase.
- **Keep overlay colors intentional.** The default overlay `#0a1e38bf` is a deep navy at 75% opacity. Swap it for a brand color at 60-70% opacity to tint photos toward your palette without losing legibility.
- **Link every tile or none.** Mixing linked and non-linked tiles confuses visitors about what is clickable. If only some tiles need links, give all tiles a consistent hover state by using background colors or images on every tile.
- **Use row_span 2 to anchor the grid.** A single tall tile (col_span 2, row_span 2) surrounded by smaller tiles creates a natural focal point. Without it, the grid can feel like a flat, undifferentiated checkerboard.
