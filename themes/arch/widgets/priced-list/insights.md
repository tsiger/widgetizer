# Priced List Widget — Insights

A line-item list pairing names, descriptions, and prices — the digital equivalent of a printed menu or rate sheet.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (default: "Starters") | Small label above the headline; sets category context |
| `title` | Any text (default: "Appetizers") | Main heading for the section; first widget on page renders as h1 |
| `description` | Any text | Paragraph below the heading; useful for disclaimers or seasonal notes |
| `heading_alignment` | `center` (default), `left` | Centers the header block or pins it to the left edge |
| `layout` | `single-column` (default), `two-column` | One stacked list vs. a side-by-side grid (splits at 750 px) |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Controls background and text color palette; non-standard schemes add padded container and custom bg |
| `top_spacing` | `auto` (default), `none` | Normal top margin or flush against the widget above |
| `bottom_spacing` | `auto` (default), `none` | Normal bottom margin or flush against the widget below |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `item` | `name` (text), `description` (richtext), `price` (text), `image` (image) | Each item shows name + price on a single row with an optional thumbnail (80 x 80, rounded). Description is richtext so it can include bold, italic, or links. Price is plain text — supports any format ("$12", "from $8", "Market price"). Image appears to the right of the price. |

---

## Layout Recipes

### 1. Classic Restaurant Menu

- **Layout:** `single-column`
- **Heading alignment:** `center`
- **Color scheme:** `standard`
- **Eyebrow:** category name (e.g., "Mains", "Desserts")
- **Items:** 6-10 per section, no images, short descriptions
- **Good for:** Restaurants, cafes, bistros, wine bars
- **Industries:** Food and beverage
- **Tip:** Stack multiple priced-list widgets with different eyebrows and `top_spacing: none` / `bottom_spacing: none` between them to build a full multi-course menu on one page.

### 2. Salon / Spa Service Menu

- **Layout:** `two-column`
- **Heading alignment:** `left`
- **Color scheme:** `highlight`
- **Eyebrow:** "Our Services"
- **Items:** 8-12, no images, brief descriptions noting duration (e.g., "60 min")
- **Good for:** Hair salons, nail studios, spas, massage therapists
- **Industries:** Beauty and wellness
- **Tip:** Use the price field for "from $XX" ranges when service pricing varies by length or complexity.

### 3. Auto Shop Rate Card

- **Layout:** `single-column`
- **Heading alignment:** `left`
- **Color scheme:** `standard-accent`
- **Eyebrow:** "Pricing"
- **Items:** 5-8, no images, description explains what is included
- **Good for:** Auto mechanics, detailing shops, tire centers
- **Industries:** Automotive services
- **Tip:** Put disclaimers like "prices may vary by vehicle" in the widget description field rather than repeating them per item.

### 4. Bakery Showcase

- **Layout:** `two-column`
- **Heading alignment:** `center`
- **Color scheme:** `standard`
- **Eyebrow:** "Fresh Daily"
- **Items:** 6-8, each with a thumbnail image
- **Good for:** Bakeries, patisseries, ice cream shops, deli counters
- **Industries:** Food retail
- **Tip:** The 80 px thumbnail works best with tightly cropped, well-lit product shots. Two-column layout keeps the page compact even with images.

### 5. Freelancer / Agency Packages

- **Layout:** `single-column`
- **Heading alignment:** `left`
- **Color scheme:** `highlight-accent`
- **Eyebrow:** "Packages"
- **Items:** 3-5, no images, richtext descriptions with bullet lists of deliverables
- **Good for:** Freelance designers, copywriters, consultants, marketing agencies
- **Industries:** Professional services
- **Tip:** Use richtext descriptions to add a short bulleted list of what each package includes. Keep item names punchy ("Starter", "Growth", "Premium").

### 6. Venue Rental Options

- **Layout:** `two-column`
- **Heading alignment:** `center`
- **Color scheme:** `highlight`
- **Eyebrow:** "Spaces"
- **Items:** 4-6, with images of each room or area
- **Good for:** Event venues, coworking spaces, photography studios, community centers
- **Industries:** Hospitality, real estate
- **Tip:** Include capacity or square footage in the description and use the price field for per-hour or per-day rates (e.g., "$150/hr").

### 7. Pet Grooming or Daycare Rates

- **Layout:** `single-column`
- **Heading alignment:** `center`
- **Color scheme:** `standard`
- **Eyebrow:** "Grooming"
- **Items:** 4-6, no images, descriptions note breed-size tiers
- **Good for:** Pet groomers, doggy daycares, boarding facilities, veterinary add-on services
- **Industries:** Pet care
- **Tip:** Use separate priced-list widgets for each animal category (Dogs, Cats) stacked with no spacing between them.

---

## Differentiation Tips

- **Stack for depth.** Multiple priced-list widgets with collapsed spacing (`top_spacing: none` on the lower widget, `bottom_spacing: none` on the upper) read as a single long menu with distinct sections — much better than one massive list.
- **Alternate color schemes.** When stacking, alternate between `standard` and `highlight` (or their accent variants) to give each category its own visual band without needing extra divider widgets.
- **Two-column for density, single-column for scanning.** If visitors are likely browsing quickly (restaurant, salon), two-column packs more items above the fold. If they need to read descriptions carefully (consulting packages, venue details), stick with single-column.
- **Images are optional per item.** You can mix items with and without images in the same list. Use images only for hero items or best-sellers to draw the eye without slowing down the rest of the list.
- **Price field is freeform.** It is a plain text field, not a number. Take advantage of this: "Market price", "Free", "$20-$35", "from $99/mo" all work and are sometimes more useful than a flat number.
- **Left-align headings for utilitarian lists.** Service menus, rate cards, and price sheets feel more professional with left-aligned headings. Center alignment fits better on food menus or lifestyle brands where the page is more editorial.
- **Eyebrow as a category label.** On pages with many stacked priced-list widgets, the eyebrow becomes the primary wayfinding element. Keep it short (one or two words) and consistent in style across all sections.
