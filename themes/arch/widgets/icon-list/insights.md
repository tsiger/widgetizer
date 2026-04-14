# Icon List Widget — Insights

A grid or carousel of icon+label items used to communicate features, amenities, services, or capabilities at a glance.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | any text | Small label above the headline — adds context like "What We Offer" or "Included With Every Stay" |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | any text | Section headline (renders as `<h1>` when first widget on page, `<h2>` otherwise) |
| `description` | any text | Supporting paragraph below the headline |
| `heading_alignment` | `start`, **`center`** | Left-aligns the header block for editorial feel; center (default) is formal and symmetrical |
| `layout` | **`grid`**, `carousel` | Grid shows all items at once; carousel adds prev/next navigation and horizontal scrolling |
| `columns_desktop` | 2 -- 8 (default **4**) | Number of columns at 1200 px+. Lower values = larger icons with more breathing room; higher values = dense, scannable lists |
| `icon_style` | **`plain`**, `outline`, `filled` | Plain is minimal (icon only), outline adds a border ring, filled puts the icon on a solid background shape |
| `icon_size` | `sm`, `md`, `lg`, **`xl`** | Controls icon dimensions. Smaller sizes suit dense grids (6--8 cols); larger sizes suit hero-style feature callouts (2--3 cols) |
| `icon_shape` | `sharp`, `rounded`, **`circle`** | Shape of the outline/filled container. Sharp = square corners, rounded = soft corners, circle = pill/circle |
| `color_scheme` | **`standard-primary`**, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Standard uses page background; highlight flips to contrast background. Accent variants tint the section for visual separation |
| `top_spacing` | **`auto`**, `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | **`auto`**, `small`, `none` | Same as above for the bottom edge |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `item` | `icon` (icon picker), `title` (text), `description` (text) | Each item is one icon card. Description is optional — omitting it produces a tighter, icon+label-only layout. Default set ships with 12 hospitality-themed items (Wi-Fi, Parking, Pool, etc.) |

---

## Layout Recipes

### 1. Hotel Amenities Banner
- **Settings**: layout `grid`, columns_desktop `6`, icon_style `plain`, icon_size `lg`, icon_shape `circle`, heading_alignment `center`, color_scheme `highlight-primary`
- **Blocks**: 6--12 items, title only (no description) — Wi-Fi, Parking, Pool, Gym, Spa, Pet Friendly
- **Good for**: Communicating included amenities quickly without reading

### 2. Core Services Showcase
- **Settings**: layout `grid`, columns_desktop `3`, icon_style `filled`, icon_size `xl`, icon_shape `rounded`, heading_alignment `start`, color_scheme `standard-primary`
- **Blocks**: 3--6 items with both title and description — e.g., "Deep Cleaning / Thorough top-to-bottom clean for your home"
- **Good for**: Homepage services section where each service needs a short explanation

### 3. Why Choose Us — Trust Strip
- **Settings**: layout `grid`, columns_desktop `4`, icon_style `outline`, icon_size `md`, icon_shape `circle`, heading_alignment `center`, color_scheme `standard-secondary`
- **Blocks**: 4 items, title only — "Licensed & Insured", "Free Estimates", "Same-Day Service", "Satisfaction Guaranteed"
- **Good for**: Trust-building strip placed between hero and content sections

### 4. Treatment Menu (Carousel)
- **Settings**: layout `carousel`, columns_desktop `4`, icon_style `plain`, icon_size `xl`, icon_shape `circle`, heading_alignment `center`, color_scheme `highlight-secondary`
- **Blocks**: 8--12 items with title and short description — "Deep Tissue / 60 min session", "Hot Stone / Relaxation therapy"
- **Good for**: Browsable service menus that exceed comfortable grid display

### 5. What's Included — Service Breakdown
- **Settings**: layout `grid`, columns_desktop `4`, icon_style `outline`, icon_size `lg`, icon_shape `sharp`, heading_alignment `start`, color_scheme `standard-primary`
- **Blocks**: 8 items with title and description — "Initial Consultation / We assess your needs", "Detailed Quote / Transparent pricing upfront"
- **Good for**: Detailing what a service package includes so customers know exactly what they're getting

### 6. Facilities at a Glance (Dense Grid)
- **Settings**: layout `grid`, columns_desktop `8`, icon_style `plain`, icon_size `sm`, icon_shape `circle`, heading_alignment `center`, color_scheme `highlight-primary`
- **Blocks**: 8--16 items, title only — compact pictogram strip
- **Good for**: Space-efficient listing where quantity matters more than detail (event venues, coworking spaces)

### 7. Process Steps
- **Settings**: layout `grid`, columns_desktop `3`, icon_style `filled`, icon_size `xl`, icon_shape `circle`, heading_alignment `center`, color_scheme `standard-secondary`
- **Blocks**: 3 items with title and description — "1. Consult / Tell us your vision", "2. Design / We craft the plan", "3. Build / We bring it to life"
- **Good for**: Explaining a simple workflow or engagement process

---

## Differentiation Tips

- **Icon-only vs. icon+description** is the biggest mood shift. Dropping descriptions turns the widget into a scannable pictogram strip; adding them turns it into a mini feature-card section. Decide based on whether visitors need explanation or just recognition.
- **Filled + sharp** creates a bold, modern, "tech product" feel. **Plain + circle** feels lighter and more hospitality-oriented. Match icon_style and icon_shape to the brand personality.
- **Carousel layout** is not just for overflow. Even with 4 items, carousel adds interactivity and draws attention. Use it when the icon list is the primary content of a section, not a supporting element.
- **Column count drives information density.** 2--3 columns with xl icons works as a hero-adjacent feature callout. 6--8 columns with sm icons works as a compact amenities bar. Avoid mid-range (4--5 columns) with sm icons — the items feel lost in whitespace.
- **Color scheme layering**: Alternate between `standard-primary` and `highlight-primary` across consecutive widgets to create visual rhythm on long pages. Use accent variants when the icon list sits between two same-background widgets and needs separation without a hard break.
- **Eyebrow text** is underused. Adding a short eyebrow like "Everything Included" or "Our Process" above the headline gives the section editorial polish and helps with scan-reading on mobile.
