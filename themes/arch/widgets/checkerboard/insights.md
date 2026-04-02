# Checkerboard Widget — Insights

## Description

An alternating grid of image tiles and text/CTA cards that creates a visually dynamic, magazine-style layout for showcasing services, features, or portfolio work.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text | Small label above the headline — adds context or category framing |
| `title` | Any text (default: "What We Do") | Main section headline; renders as `<h1>` when the widget is first on the page, `<h2>` otherwise |
| `description` | Any text | Subheading paragraph below the title — sets expectations for the grid below |
| `heading_alignment` | `left`, `center` (default) | Controls whether the header block is centered or left-aligned; left works better when the grid itself is asymmetric |
| `columns_desktop` | 2 -- 4 (default: 4) | Number of grid columns on desktop; fewer columns = larger tiles, more visual weight per card |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | `standard`: no extra background or border. `standard-accent`: secondary background on content tiles. `highlight` and `highlight-accent`: add a border to tiles plus padded container; accent variants swap content tile background to secondary color |
| `top_spacing` | `auto`, `none` | Remove top padding to butt this section against the one above it |
| `bottom_spacing` | `auto`, `none` | Remove bottom padding to butt this section against the one below it |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `card` | `image`, `title`, `description` (richtext), `button_link` (text + href + target) | Each card renders as either an image tile or a text content tile. If an image is set, only the image shows (full-bleed, cover-fit, 1:1 aspect). If no image is set, the card renders title + description + optional button on a solid background. Mix both types to get the signature checkerboard look. Max 12 blocks. |

---

## Layout Recipes

### 1. Classic Services Grid (4 columns, 8 cards)

Alternate text cards and image cards in a 4-column layout so the pattern forms a true checkerboard: text, image, text, image on the first row, then image, text, image, text on the second.

- **Settings**: `columns_desktop: 4`, `color_scheme: standard-accent`, `heading_alignment: center`
- **Blocks**: 8 cards — odd positions get title + description + "Learn More" button; even positions get a photo
- **Good for**: Service overview pages where each service needs a brief explanation and a supporting photo
- **Industries**: Landscaping, cleaning companies, home renovation, dental practices

### 2. Two-Column Feature Spotlight (2 columns, 4 cards)

Large tiles that give each service or product substantial real estate. Two rows of two, alternating image and content.

- **Settings**: `columns_desktop: 2`, `color_scheme: highlight`, `heading_alignment: left`, `eyebrow: "Our Specialties"`
- **Blocks**: 4 cards — card 1: content with title + rich description; card 2: image; card 3: image; card 4: content
- **Good for**: Landing pages or about pages where you want fewer, more impactful items
- **Industries**: Architecture firms, interior designers, boutique hotels, law firms

### 3. Portfolio Mosaic (3 columns, 6 cards)

Heavy on images with only a couple of text cards sprinkled in. Feels like a curated gallery with just enough context.

- **Settings**: `columns_desktop: 3`, `color_scheme: standard`, `heading_alignment: center`, `title: "Recent Work"`
- **Blocks**: 6 cards — 4 image-only cards and 2 text cards (positions 3 and 6) with project category + short blurb
- **Good for**: Portfolio or gallery sections where the work itself should dominate
- **Industries**: Photography studios, tattoo shops, florists, bakeries, wedding planners

### 4. Stacked Info Strip (2 columns, 6 cards)

Three rows of alternating content, creating a long-scroll storytelling section. Each row pairs a photo with a narrative block.

- **Settings**: `columns_desktop: 2`, `color_scheme: highlight-accent`, `top_spacing: none`, `bottom_spacing: none`
- **Blocks**: 6 cards — rows alternate image-left/text-right and text-left/image-right
- **Good for**: "How it works" or process explanation sections, step-by-step guides
- **Industries**: SaaS onboarding pages, fitness studios, meal-prep services, consulting firms

### 5. Quick Feature Cards (4 columns, 4 cards, no images)

All text, no images. Four content tiles in a single row, each with a title, a one-liner description, and a CTA button. Clean and scannable.

- **Settings**: `columns_desktop: 4`, `color_scheme: standard-accent`, `heading_alignment: center`, `title: "Why Choose Us"`
- **Blocks**: 4 cards, all without images — each gets a punchy title (e.g., "Fast Turnaround"), 1-sentence description, and button
- **Good for**: Value propositions, competitive differentiators, pricing tier previews
- **Industries**: Agencies, IT support, accountants, real estate agents

### 6. Image Wall With Single CTA (4 columns, 8 cards)

Seven image tiles and one text card placed strategically (e.g., position 4 or 5) to break the pattern with a call to action.

- **Settings**: `columns_desktop: 4`, `color_scheme: standard`, `heading_alignment: center`, `title: "Our Space"`
- **Blocks**: 8 cards — 7 photos of a venue/space/product, 1 text card with "Book a Tour" CTA
- **Good for**: Showcasing a physical space or product line while funneling visitors toward one action
- **Industries**: Event venues, coworking spaces, restaurants, retail stores, gyms

### 7. Compact Duo (2 columns, 2 cards)

The smallest useful configuration: one image and one content block side by side. Functions almost like a split hero.

- **Settings**: `columns_desktop: 2`, `color_scheme: highlight`, `heading_alignment: left`, `eyebrow: "Featured"`, `title: ""`
- **Blocks**: 2 cards — one image, one content card with title + description + button
- **Good for**: Highlighting a single service, announcement, or seasonal promotion
- **Industries**: Any small business running a seasonal special or featuring a flagship service

---

## Differentiation Tips

- **Checkerboard vs. a plain card grid**: The checkerboard's power comes from mixing image-only tiles with text tiles in the same grid. If every card has both an image and text, use a standard card grid widget instead. The checkerboard shines when some cells are purely visual and others are purely informational.

- **Use empty-content cards intentionally**: Cards with only an image and no text become visual breathing room. Place them between heavy content cards to keep the section from feeling like a wall of text.

- **Column count changes the personality**: 2 columns reads editorial and premium. 3 columns is balanced and versatile. 4 columns feels energetic and information-dense. Match the column count to the brand tone.

- **Accent color schemes on content tiles**: The `standard-accent` and `highlight-accent` schemes give content tiles a distinct background color, which strengthens the visual contrast between image and text tiles. Use these when images have varied brightness levels and you need the text tiles to hold their own.

- **Spacing collapse for full-bleed sections**: Set `top_spacing: none` and `bottom_spacing: none` when stacking the checkerboard directly against a hero or another full-width section. This eliminates gaps and creates a seamless visual flow.

- **The 12-block max is generous**: Most effective layouts use 4-8 blocks. Going beyond 8 risks overwhelming the visitor. If you have 12 items, consider whether some should be grouped differently or split across two widget instances.

- **Button placement matters**: Only text cards can have buttons. Place your highest-priority CTA on a card that sits in the first or second row where it is visible without scrolling, especially on 2-column layouts.
