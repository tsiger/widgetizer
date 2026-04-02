# Logo Cloud Widget — Insights

Displays a grid or carousel of partner/client logos with optional heading, building trust and social proof at a glance.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text (default: "Trusted By") | Small label above the headline; omit to remove |
| `title` | Any text | Main headline; renders as `<h1>` when the widget is first on the page, `<h2>` otherwise |
| `description` | Any text (optional) | Supporting paragraph beneath the headline |
| `heading_alignment` | `center` (default), `left` | Centers or left-aligns the entire header block |
| `layout` | `grid` (default), `carousel` | Static equal-column grid vs. horizontally scrollable carousel with prev/next arrows |
| `columns_desktop` | 2 -- 8 (default: 6) | Number of columns on desktop; in carousel mode this sets visible slides per view |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Controls background and border palette; non-standard schemes add padded container and override `--widget-bg-color` |
| `top_spacing` | `auto` (default), `none` | Removes the top section padding when set to `none` |
| `bottom_spacing` | `auto` (default), `none` | Removes the bottom section padding when set to `none` |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `logo` | `image` (image picker), `name` (text, default "Company"), `link` (URL, optional, target support) | Each block is one logo card. Images render grayscale at 60 % opacity and transition to full color on hover. When no image is uploaded a placeholder is shown. If a link is provided the entire card becomes an anchor. The `name` text is used as the image `alt` attribute for accessibility. |

---

## Layout Recipes

### 1. "Client Wall" -- Full-Width Grid

| Setting | Value |
|---------|-------|
| layout | grid |
| columns_desktop | 6 |
| heading_alignment | center |
| eyebrow | Trusted By |
| title | Companies that rely on us |
| color_scheme | standard |

**Good for:** Homepage social-proof section immediately below the hero.
**Industries:** SaaS, marketing agencies, IT services.

---

### 2. "Partner Carousel" -- Scrollable Strip

| Setting | Value |
|---------|-------|
| layout | carousel |
| columns_desktop | 4 |
| heading_alignment | center |
| eyebrow | Our Partners |
| title | _(leave blank)_ |
| color_scheme | standard |
| top_spacing | none |
| bottom_spacing | none |

**Good for:** Compact trust bar between two content-heavy sections; works well when you have 10+ logos and don't want to overwhelm the page.
**Industries:** Real estate brokerages, franchise businesses, event planners.

---

### 3. "Featured Certifications" -- Narrow Highlight Strip

| Setting | Value |
|---------|-------|
| layout | grid |
| columns_desktop | 3 |
| heading_alignment | center |
| eyebrow | Certifications |
| title | Licensed & Insured |
| color_scheme | highlight |

**Good for:** Showing 3-4 certification or association badges (BBB, chamber of commerce, trade license) on a contrasting background to make them pop.
**Industries:** Home services (HVAC, plumbing, electrical), contractors, cleaning companies.

---

### 4. "As Seen In" -- Press Logo Bar

| Setting | Value |
|---------|-------|
| layout | grid |
| columns_desktop | 5 |
| heading_alignment | center |
| eyebrow | As Seen In |
| title | _(leave blank)_ |
| description | _(leave blank)_ |
| color_scheme | standard-accent |
| top_spacing | none |

**Good for:** A slim press-mention strip placed right under a hero or testimonial section. Keeping title and description blank lets the logos speak for themselves.
**Industries:** Consumer products, restaurants, fitness studios, local boutiques featured in media.

---

### 5. "Supplier Showcase" -- Left-Aligned with Description

| Setting | Value |
|---------|-------|
| layout | grid |
| columns_desktop | 4 |
| heading_alignment | left |
| eyebrow | Our Suppliers |
| title | We work with the best brands |
| description | All products are sourced from authorized distributors. |
| color_scheme | standard |

**Good for:** Product or service pages where you want to explain the relationship with the brands you carry, not just flash logos.
**Industries:** Auto parts shops, building supply stores, veterinary clinics (pet food brands).

---

### 6. "Membership Badges" -- Two-Column Accent Grid

| Setting | Value |
|---------|-------|
| layout | grid |
| columns_desktop | 2 |
| heading_alignment | center |
| eyebrow | _(leave blank)_ |
| title | Proud Member |
| color_scheme | highlight-accent |

**Good for:** Displaying just 2 important association or membership logos at large size with high visual weight (e.g., on an About page).
**Industries:** Law firms, accounting practices, dental offices.

---

### 7. "Integration Partners" -- Wide Carousel with Copy

| Setting | Value |
|---------|-------|
| layout | carousel |
| columns_desktop | 5 |
| heading_alignment | center |
| eyebrow | Integrations |
| title | Connects with the tools you already use |
| description | Seamless data sync with your favorite platforms. |
| color_scheme | standard |

**Good for:** A feature-rich integrations section on a product or pricing page where the logo count is large (12+) and you want to keep vertical space tight.
**Industries:** SaaS platforms, CRMs, e-commerce tools, payment processors.

---

## Differentiation Tips

- **Grayscale-to-color hover effect is built in.** Every logo image starts desaturated and faded; it becomes full-color on hover. This keeps the section visually calm and draws the eye only on interaction -- no extra CSS needed.
- **Grid vs. carousel is a content-volume decision.** Use grid when you have up to roughly 8 logos and want them all visible at once. Switch to carousel when the count exceeds one row's worth so the page doesn't stretch.
- **Pair `highlight` color schemes with minimal text.** The contrasting background already draws attention. A short eyebrow plus logos (no title, no description) is often more effective than adding a headline.
- **Use the `link` setting sparingly.** Linking every logo to an external site can send visitors away from your page. Reserve links for strategic partners or required attribution; leave the rest unlinked.
- **Collapse spacing to glue sections together.** Setting `top_spacing` or `bottom_spacing` to `none` lets you visually attach the logo cloud to an adjacent hero, CTA, or testimonial widget for a seamless flow.
- **Column count signals importance.** Fewer columns (2-3) with large logos feel premium and exclusive. More columns (6-8) with smaller logos communicate broad adoption. Choose based on the story you want to tell.
