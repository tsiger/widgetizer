# Masonry Gallery Widget — Insights

Pinterest-style staggered image grid with optional titles, categories, and a built-in lightbox for showcasing visual work.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (optional) | Small label above the headline — useful for section context like "Portfolio" or "Latest Projects" |
| `title` | Any text (default "Our Work") | Main headline; renders as `<h1>` when the widget is first on the page, `<h2>` otherwise |
| `description` | Any text | Supporting paragraph beneath the headline |
| `heading_alignment` | `left`, `center` (default) | Left-aligns the header block for an editorial feel, or centers it for a classic portfolio look |
| `columns_desktop` | 2 -- 5 (default 3) | Number of masonry columns on desktop; fewer columns = larger images, more columns = denser grid |
| `gap` | `small`, `medium` (default), `large` | Spacing between cards; small produces a tight mosaic, large gives each image breathing room |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Controls background and card styling; accent variants add a secondary background and border to each card |
| `top_spacing` | `auto` (default), `none` | Removes top padding so the widget can sit flush against the section above |
| `bottom_spacing` | `auto` (default), `none` | Removes bottom padding for seamless stacking with the next section |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `item` | `image` (image picker), `title` (text), `category` (text) | Each item is one masonry card. Images render at their natural aspect ratio, which is what creates the staggered layout. When no image is uploaded, a placeholder cycles through portrait, landscape, and square aspects. Title and category are both optional -- omitting them produces an image-only card. |

---

## Layout Recipes

### 1. Tight Portfolio Wall
- **Settings**: 4 columns, gap small, heading_alignment left, color_scheme standard
- **Blocks**: 8--12 items, image-only (no titles or categories)
- **Good for**: Photographers, illustrators, tattoo artists who want maximum visual density
- **Industries**: Photography studios, creative agencies, tattoo parlors

### 2. Project Showcase with Labels
- **Settings**: 3 columns, gap medium, heading_alignment center, color_scheme standard-accent
- **Blocks**: 6--9 items, each with image + title + category
- **Good for**: Presenting completed projects with context, making work browsable by type
- **Industries**: Architecture firms, interior designers, landscape contractors, renovation companies

### 3. Two-Column Editorial
- **Settings**: 2 columns, gap large, heading_alignment left, eyebrow set (e.g., "Selected Work")
- **Blocks**: 4--6 items with title only (no category)
- **Good for**: Premium or minimal brands that want each piece to feel significant
- **Industries**: Boutique design studios, luxury home builders, fine art galleries

### 4. Dense Inspiration Board
- **Settings**: 5 columns, gap small, heading_alignment center, color_scheme highlight
- **Blocks**: 10--15 items, image-only
- **Good for**: Mood boards, material libraries, or visual reference collections
- **Industries**: Event planners, florists, fashion boutiques, wedding venues

### 5. Before-and-After Gallery
- **Settings**: 2 columns, gap medium, heading_alignment left, color_scheme standard-accent
- **Blocks**: 6--8 items alternating before/after shots, title describing the project, category as "Before" or "After"
- **Good for**: Demonstrating transformations where side-by-side comparison drives conversions
- **Industries**: Home remodelers, auto detailers, landscapers, dental cosmetics

### 6. Menu or Product Visual Grid
- **Settings**: 3 columns, gap medium, heading_alignment center, color_scheme highlight-accent
- **Blocks**: 6--12 items with image + title (dish or product name) + category (price or product line)
- **Good for**: Restaurants showcasing dishes, bakeries showing their range, retailers highlighting featured products
- **Industries**: Restaurants, bakeries, specialty retail, craft breweries

### 7. Team or Culture Wall
- **Settings**: 4 columns, gap large, heading_alignment center, title "Our Team" or "Life at [Company]"
- **Blocks**: 8--12 items, image + title (person name or moment), category (role or event)
- **Good for**: Humanizing a brand by showing real people and behind-the-scenes moments
- **Industries**: Any small business wanting to build trust -- salons, gyms, veterinary clinics, coworking spaces

---

## Differentiation Tips

- **Mix aspect ratios deliberately.** The stagger effect only works when images have varied heights. A grid of identically cropped photos will look like a regular grid, not a masonry layout. Alternate portrait, landscape, and square images for visual rhythm.
- **Image-only vs. captioned cards change the feel completely.** Dropping titles and categories turns the widget into an immersive visual wall; adding them turns it into a browsable portfolio. Decide based on whether the audience needs context or just wants to look.
- **Accent color schemes add card boundaries.** Use `standard-accent` or `highlight-accent` when cards have text beneath images -- the background and border help separate content. Use plain `standard` or `highlight` for image-only grids where you want seamless flow.
- **Pair column count with item count thoughtfully.** Five columns with only four items looks sparse. Aim for at least 2x the column count in total items so every column has real content and the stagger pattern reads correctly.
- **Use the eyebrow to add hierarchy without weight.** Instead of a long title, keep the headline short and use the eyebrow for section context ("Our Work" as headline, "Portfolio" as eyebrow). This gives the header area visual layers without competing with the images.
- **Leverage the lightbox.** The widget loads `lightbox.js` automatically, so every image can be viewed full-size on click. This means you can use a higher column count (smaller thumbnails) without sacrificing detail -- visitors will click through to see the full image.
- **Remove spacing to build section sequences.** Set `top_spacing: none` or `bottom_spacing: none` when stacking the masonry gallery directly against a full-width hero or a color-matched section for a seamless page flow.
