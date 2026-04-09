# Footer Widget — Insights

Configurable multi-column footer with logo, text, navigation, and social blocks arranged on a 5-column desktop grid.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `color_scheme` | `standard-primary` | Uses the page's default background; footer blends into the page naturally |
| | `standard-secondary` | Default background with accent-tinted text and link colors |
| | `highlight-primary` (default) | Switches to `--bg-primary` fill, creating a strong contrast band at the bottom of the page |
| | `highlight-secondary` | `--bg-primary` fill combined with accent colors; the most visually prominent option |
| `copyright` | Any text / blank | When filled, renders a copyright line below the columns and adds bottom padding. When blank, the footer collapses to an 8 rem block of columns only |

---

## Available Blocks

Up to **4 blocks** can be added. They share a 5-column grid (`--grid-cols-desktop: 5`) with generous `--space-3xl` gaps.

| Block Type | Key Settings | Notes |
|---|---|---|
| `logo_text` | `logo` (image), `logo_text` (text fallback), `logo_width` (50-300 px), `text` (richtext) | Displays an image logo when provided; falls back to a styled text logo. The richtext area below is ideal for a tagline or short company description. Logo width slider prevents oversized logos from dominating the column |
| `text_block` | `title`, `text` (richtext) | General-purpose column. Title renders as an h3 heading. Richtext supports paragraphs, links, line breaks. Good for contact info, hours, addresses |
| `menu_block` | `title`, `menu` (menu reference, default `footer-menu`) | Pulls a site menu by name. Submenus are hidden by design, keeping the footer flat and scannable |
| `social_block` | `title` | Renders social icons from the global `theme.social` config. No per-block icon selection; the icon set is site-wide |

---

## Layout Recipes

### 1. Classic Four-Column

| Block 1 | Block 2 | Block 3 | Block 4 |
|---|---|---|---|
| logo_text | text_block | menu_block | social_block |

- **Settings:** `color_scheme: highlight`, copyright filled, logo_width ~100 px, text_block title "Contact", menu_block title "Quick Links", social_block title "Follow Us"
- **Good for:** Businesses that need a professional, balanced footer covering branding, contact details, navigation, and social presence in one row
- **Industries:** Law firms, accounting practices, consulting agencies, dental offices

### 2. Brand-Forward Minimal

| Block 1 | Block 2 |
|---|---|
| logo_text (wide richtext blurb) | social_block |

- **Settings:** `color_scheme: highlight-secondary`, copyright filled, logo_width 200 px, logo_text richtext with a two-sentence mission statement
- **Good for:** Creative studios and personal brands where the footer reinforces identity more than navigation
- **Industries:** Design agencies, photographers, freelance portfolios, artists

### 3. Contact-Heavy Service Footer

| Block 1 | Block 2 | Block 3 |
|---|---|---|
| logo_text | text_block ("Hours") | text_block ("Visit Us") |

- **Settings:** `color_scheme: standard-secondary`, copyright filled. First text_block lists weekday and weekend hours. Second text_block has address, phone, and email. No menu or social blocks
- **Good for:** Brick-and-mortar businesses where visitors primarily need location and availability info
- **Industries:** Restaurants, hair salons, auto repair shops, veterinary clinics

### 4. Navigation-Dense Footer

| Block 1 | Block 2 | Block 3 | Block 4 |
|---|---|---|---|
| logo_text | menu_block ("Services") | menu_block ("Company") | social_block |

- **Settings:** `color_scheme: highlight`, copyright filled, two separate menu_block instances pointing at different menus (e.g., `services-menu` and `company-menu`)
- **Good for:** Sites with many pages where the footer doubles as a secondary sitemap
- **Industries:** SaaS products, multi-location businesses, real estate agencies, educational institutions

### 5. Minimalist Single-Line

| Block 1 |
|---|
| logo_text |

- **Settings:** `color_scheme: standard`, copyright filled with the legal line, logo_text only (no richtext body), logo_width kept small (~80 px)
- **Good for:** Landing pages or single-page sites that want a quiet, unobtrusive footer
- **Industries:** Event pages, product launches, coming-soon sites, personal resumes

### 6. Community and Social Hub

| Block 1 | Block 2 | Block 3 |
|---|---|---|
| logo_text | text_block ("Newsletter / Join Us" blurb) | social_block |

- **Settings:** `color_scheme: highlight-secondary`, copyright filled. text_block richtext includes a CTA sentence and an email link. social_block title "Connect With Us"
- **Good for:** Organizations that want the footer to drive community engagement rather than just close the page
- **Industries:** Nonprofits, churches, local clubs, coworking spaces, fitness studios

---

## Differentiation Tips

- **Color scheme is the single biggest mood lever.** `highlight-primary` and `highlight-secondary` create a strong visual endpoint. `standard-primary` makes the footer nearly invisible, useful when the last content section already has a dark background.
- **Omit the copyright text to get a compact footer.** When copyright is blank the widget switches to a symmetric 8 rem padding block. This works well for sites that handle legal text elsewhere or want a tidier bottom edge.
- **Use two text_blocks instead of one when contact info is complex.** Splitting hours and address into separate columns improves scannability on desktop and stacks cleanly on mobile.
- **Logo width matters more than people expect.** A 50 px logo keeps the column compact and text-dominant; 200+ px turns the column into a visual brand anchor. Match the size to the footer's role: navigation-focused footers want a smaller logo, brand-focused footers want a larger one.
- **The social_block pulls icons globally.** You cannot show different social icons per page. If a client needs platform-specific links (e.g., Yelp for a restaurant but Behance for a portfolio), configure the global theme social settings to include all relevant platforms.
- **Menu blocks hide submenus intentionally.** The footer renders a flat list. If the client's sitemap is deep, create a dedicated shallow menu specifically for the footer rather than reusing the header's nested menu.
- **Pair `highlight-secondary` with a single logo_text block for maximum brand impact.** The accent tint plus a large logo creates a footer that reads as a signature rather than a utility bar.
