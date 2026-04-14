# Card Grid Widget Insights

A responsive grid of image-plus-text cards with optional carousel mode, suited for showcasing services, team members, products, or any repeating content block.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text | Small label above the headline (e.g. "Our Services"). Leave blank to hide. |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | Any text | Main section headline. Renders as `<h1>` when the widget is first on the page, `<h2>` otherwise. |
| `description` | Any text | Supporting paragraph below the headline. Leave blank to hide. |
| `heading_alignment` | `start`, `center` (default) | Centers or left-aligns the eyebrow/title/description header block. |
| `layout` | `grid` (default), `carousel` | Grid shows all cards at once; carousel adds prev/next navigation and horizontal scrolling. |
| `columns_desktop` | 2 -- 5 (default 4) | Number of columns on desktop. Cards stack to fewer columns on smaller breakpoints automatically. |
| `card_layout` | `box` (default), `flat` | Box gives cards a contained look with background/border treatment. Flat removes the card container for a more open feel. |
| `alignment` | `start` (default), `center` | Left-aligns or centers the text and button inside each card. |
| `image_position` | `top` (default), `bottom` | Places the card image above or below the text content. |
| `aspect_ratio` | `auto`, `1/1`, `4/3` (default), `3/2`, `3/4`, `16/9` | Controls the crop shape of card images. Square for headshots, portrait for product shots, wide for landscapes. |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Standard uses page background. Accent variants add `bg-secondary` to cards and borders. Highlight variants add section-level padding and contrast. |
| `top_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | `auto` (default), `small`, `none` | Same as above for the bottom edge |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `card` | `image` -- optional photo/graphic | Leave blank for icon-less text cards. Respects the widget-level `aspect_ratio` and `image_position`. |
| | `subtitle` -- eyebrow text above the card title | Good for category labels ("Design", "Phase 1", price tiers). |
| | `title` -- card heading | Heading level is automatically computed based on widget position and whether a section title exists. |
| | `description` -- richtext body | Supports formatted text, lists, bold/italic. Rendered with DOMPurify + `raw` filter. |
| | `button_link` -- CTA link with text, href, target | Renders as a secondary button. Set text blank to hide entirely. **Only use when cards genuinely link to dedicated pages.** Most small business presets should leave this blank — the card grid is a showcase, not a navigation hub. Don't add "Learn More" buttons just for the sake of it. |

---

## Layout Recipes

### 1. Services Overview (3 columns, box cards)

| Setting | Value |
|---|---|
| `columns_desktop` | 3 |
| `card_layout` | box |
| `alignment` | center |
| `image_position` | top |
| `aspect_ratio` | 4/3 |
| `color_scheme` | standard-secondary |
| `heading_alignment` | center |

**Good for:** Primary services page section where each card links to a dedicated service page.

---

### 2. Team / Staff Grid (4 columns, square portraits)

| Setting | Value |
|---|---|
| `columns_desktop` | 4 |
| `card_layout` | box |
| `alignment` | center |
| `aspect_ratio` | 1/1 |
| `image_position` | top |
| `color_scheme` | standard-primary |

Use `subtitle` for job title, `description` for a short bio, and hide the button or link to a full profile.

**Good for:** Meet-the-team pages, staff directories, advisory boards.

---

### 3. Product / Menu Carousel (5 columns, wide images)

| Setting | Value |
|---|---|
| `layout` | carousel |
| `columns_desktop` | 4 |
| `card_layout` | flat |
| `alignment` | start |
| `aspect_ratio` | 16/9 |
| `image_position` | top |
| `color_scheme` | standard-primary |

Load 6-10 cards and let users swipe through. Works well when you have more items than fit on screen.

**Good for:** Featured dishes, product highlights, portfolio pieces, seasonal specials.

---

### 4. Pricing / Plan Comparison (3 columns, no images)

| Setting | Value |
|---|---|
| `columns_desktop` | 3 |
| `card_layout` | box |
| `alignment` | center |
| `image_position` | top |
| `aspect_ratio` | auto |
| `color_scheme` | highlight-secondary |
| `heading_alignment` | center |

Leave the card `image` blank. Use `subtitle` for the plan name, `title` for the price, and `description` for a bullet list of features. Button becomes "Choose Plan".

**Good for:** SaaS pricing tables, membership tiers, service packages.

---

### 5. Process / How-It-Works Steps (4 columns, flat layout)

| Setting | Value |
|---|---|
| `columns_desktop` | 4 |
| `card_layout` | flat |
| `alignment` | start |
| `image_position` | top |
| `aspect_ratio` | 1/1 |
| `color_scheme` | standard-primary |
| `heading_alignment` | start |

Use `subtitle` for step numbers ("01", "02", "03", "04"), `title` for the step name, and a one-sentence `description`. Hide the button.

**Good for:** Explaining a workflow, onboarding steps, order process, how-to guides.

---

### 6. Testimonial Cards (2 columns, bottom images)

| Setting | Value |
|---|---|
| `columns_desktop` | 2 |
| `card_layout` | box |
| `alignment` | start |
| `image_position` | bottom |
| `aspect_ratio` | 1/1 |
| `color_scheme` | highlight-primary |
| `heading_alignment` | start |

Put the quote in `description`, the person's name in `title`, and their role or company in `subtitle`. The portrait photo at the bottom grounds each testimonial.

**Good for:** Client testimonials, case study previews, review showcases.

---

### 7. Location / Branch Cards (3 columns, landscape images)

| Setting | Value |
|---|---|
| `columns_desktop` | 3 |
| `card_layout` | box |
| `alignment` | start |
| `image_position` | top |
| `aspect_ratio` | 3/2 |
| `color_scheme` | standard-secondary |
| `heading_alignment` | center |

Use a storefront photo as the image, the city or neighborhood as `title`, address and hours in `description`, and "Get Directions" as the button linking to Google Maps.

**Good for:** Multi-location businesses, franchise directories, branch listings.

---

## Differentiation Tips

- **Box vs. Flat** is the biggest visual lever. Box cards feel structured and corporate; flat cards feel editorial and modern. Match the site's overall tone.
- **Carousel only pays off at 5+ cards.** With 3-4 cards, grid is almost always cleaner because everything is visible at once without interaction.
- **Image-bottom creates surprisingly interesting layouts.** It flips the typical card pattern — text becomes the entry point and the image becomes illustrative rather than dominant. Works for testimonials and bios, but also for service cards where the description matters more than the photo, or any card where you want the reader to engage with the text first. Use it as a differentiation lever across presets, not just for testimonials.
- **Hiding optional fields changes the card's personality entirely.** No image + no button = a simple text tile. No subtitle + no description = an image gallery with titles. Experiment with which fields to leave blank.
- **Default to no buttons for small business presets.** Most small businesses use card grids to showcase services, features, or highlights — not to link to individual pages for each one. Only add `button_link` when the industry genuinely needs per-card destinations (e.g., a real estate agent linking to property listings, or a SaaS product linking to feature docs). A grid of cards with empty "Learn More" buttons is worse than no buttons at all.
- **Color scheme accent variants** add borders and secondary backgrounds to individual cards. This creates visual separation when you have many cards. On a highlight background, the accent variant makes cards pop as distinct objects rather than blending in.
- **Aspect ratio choice should follow the content.** Square for people, 4/3 or 3/2 for places and products, 16/9 for wide scenic shots, 3/4 for tall product photography. Mixing ratios across a single grid looks unintentional, so pick one and stick with it.
- **2-column layouts create a different reading rhythm** than 3 or 4. Two columns make each card feel substantial and article-like, which suits longer descriptions. Four or five columns push toward a scannable, icon-grid feel with minimal text.
