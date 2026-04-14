# Icon Card Grid Widget

A flexible icon-plus-text card grid for showcasing services, features, or value propositions in a scannable, visually consistent layout.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text | Small label above the main headline (e.g. "Our Services"). Leave blank to hide. |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | Any text | Primary section headline. Renders as `<h1>` when the widget is first on the page, `<h2>` otherwise. |
| `description` | Any text | Subheading paragraph below the title. Useful for a one-sentence value statement. |
| `heading_alignment` | `start`, `center` (default) | Centers or left-aligns the eyebrow/title/description header block. Left works better when a featured image is present. |
| `featured_image` | Image or blank | Adds a large photo beside the card grid in a 50/50 split layout. Forces grid to 2 columns. Available but **not used in preset generation** — this is a user-added enhancement. |
| `featured_image_position` | `start` (default), `end` | Places the featured image on the left or right of the card grid. Only relevant when `featured_image` is set. |
| `layout` | `grid` (default), `carousel` | Grid shows all cards at once; carousel makes them horizontally scrollable with prev/next buttons. |
| `columns_desktop` | 2--5 (default 4) | Number of columns on desktop. Ignored when featured image is set (locked to 2) or in carousel mode (used as visible slide count). |
| `card_layout` | `box` (default), `flat` | Box gives cards a contained background/border treatment. Flat removes the card chrome for a more minimal look. |
| `alignment` | `start` (default), `center` | Left-aligns or centers icon, text, and button inside each card. |
| `icon_style` | `plain` (default), `outline`, `filled` | Plain shows the raw icon. Outline adds a border ring. Filled places the icon on a solid background circle/shape. |
| `icon_size` | `sm`, `md`, `lg` (default), `xl` | Scales the icon from subtle to dominant. |
| `icon_shape` | `sharp`, `rounded`, `circle` (default) | Controls the corner radius of the outline/filled icon container. Only visible when icon_style is outline or filled. |
| `color_scheme` | `standard-primary` (default), `standard-secondary`, `highlight-primary`, `highlight-secondary` | Standard uses the page background. Highlight inverts to the theme's contrast palette. Accent variants add a secondary background or border to each card for extra separation. |
| `top_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | `auto` (default), `small`, `none` | Same as above for the bottom edge |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `card` | `icon` -- any theme icon name | The visual anchor of the card. Choose icons that are quickly recognisable at small sizes. |
| | `subtitle` -- short text | Rendered as an eyebrow above the card title. Good for categories ("Design", "Support") or numbering ("Step 1"). |
| | `title` -- short text | Card headline. Keep to 2--4 words for scannability. |
| | `description` -- richtext | Body copy. Supports bold, links, and lists. Sanitised with DOMPurify. |
| | `button_link` -- text, href, target | Optional CTA rendered as a secondary button. Only use when cards genuinely link to dedicated pages. Most small business presets should omit buttons entirely. |

---

## Layout Recipes

### 1. Services Overview (the classic)

| Setting | Value |
|---------|-------|
| `columns_desktop` | 3 |
| `card_layout` | box |
| `alignment` | center |
| `icon_style` | filled |
| `icon_size` | lg |
| `icon_shape` | circle |
| `color_scheme` | standard-secondary |
| Cards | 3 or 6 |

**Good for:** The main "What We Do" section on a homepage.

---

### 2. Why Choose Us -- Flat & Minimal

| Setting | Value |
|---------|-------|
| `columns_desktop` | 4 |
| `card_layout` | flat |
| `alignment` | start |
| `icon_style` | plain |
| `icon_size` | md |
| `color_scheme` | standard-primary |
| Cards | 4 |

**Good for:** A secondary differentiators section that should not compete visually with the hero or primary services grid.

---

### 3. Feature Carousel

| Setting | Value |
|---------|-------|
| `layout` | carousel |
| `columns_desktop` | 3 |
| `card_layout` | box |
| `alignment` | center |
| `icon_style` | outline |
| `icon_size` | lg |
| `icon_shape` | rounded |
| `color_scheme` | highlight-primary |
| Cards | 6--8 |

**Good for:** Showcasing many features or services without overwhelming the page. The carousel invites interaction and keeps the section compact.

---

### 4. Compact Benefits Strip

| Setting | Value |
|---------|-------|
| `columns_desktop` | 4 |
| `card_layout` | flat |
| `alignment` | center |
| `icon_style` | filled |
| `icon_size` | sm |
| `icon_shape` | rounded |
| `color_scheme` | standard-primary |
| Cards | 4 (icon + title only, no descriptions or buttons) |

**Good for:** A tight "why us" strip with just icons and short labels — works well between a hero and a content section.

---

### 5. Process Steps

| Setting | Value |
|---------|-------|
| `columns_desktop` | 4 |
| `card_layout` | flat |
| `alignment` | center |
| `icon_style` | outline |
| `icon_size` | xl |
| `icon_shape` | circle |
| `color_scheme` | highlight-secondary |
| Cards | 4 (use subtitle for "Step 1", "Step 2", etc.) |

**Good for:** Visualising a numbered process such as "How It Works" or an onboarding flow.

---

### 6. Narrow Two-Column Highlights

| Setting | Value |
|---------|-------|
| `columns_desktop` | 2 |
| `card_layout` | box |
| `alignment` | start |
| `icon_style` | filled |
| `icon_size` | lg |
| `icon_shape` | sharp |
| `color_scheme` | standard-secondary |
| Cards | 2 |

**Good for:** A focused comparison or two primary offerings displayed side-by-side with generous whitespace.

---

### 7. Dense Feature Matrix

| Setting | Value |
|---------|-------|
| `columns_desktop` | 5 |
| `card_layout` | flat |
| `alignment` | center |
| `icon_style` | plain |
| `icon_size` | sm |
| `color_scheme` | standard-primary |
| Cards | 10 (no descriptions, icon + title only) |

**Good for:** A compact "everything included" checklist. Strip descriptions and buttons so each card is just an icon and label.

---

## Differentiation Tips

- **Box vs. Flat is the biggest mood lever.** Box cards feel structured and corporate-friendly; flat cards feel editorial and modern. Pick one per page and stay consistent with other grid widgets.
- **Icon style carries more weight than icon size.** A small filled icon on a coloured circle draws more attention than a large plain icon. Use filled or outline when icons need to anchor the card; use plain when the title is the star.
- **Carousel is best above 5 cards.** Below that threshold, a standard grid is easier to scan. Carousel shines when you want to pack 8+ items without vertical scroll.
- **Default to no buttons for small business presets.** Most small businesses use icon card grids to showcase services, features, or highlights — not to link to individual pages for each one. Only add `button_link` when the industry genuinely needs per-card destinations.
- **Subtract before you add.** Leave subtitle blank if the title is self-explanatory. Remove button_link if there is no dedicated page to link to. Every empty field tightens the card and improves readability.
- **Color scheme stacking matters.** If the section above uses `highlight-primary`, set this widget to `standard-primary` (or vice versa) so there is a clear visual break. Avoid placing two `highlight-primary` widgets back-to-back.
- **Use `top_spacing: none` or `bottom_spacing: none`** to visually merge this widget with an adjacent section that shares the same color scheme, creating a seamless content flow.
