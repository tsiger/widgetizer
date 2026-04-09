# Trust Bar Widget — Insights

A horizontal strip of icon-plus-text items that communicates key selling points, guarantees, or differentiators at a glance.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `icon_style` | `plain` / `outline` / `filled` | Plain shows a bare icon; outline adds a stroke border; filled places the icon on a solid background shape. Filled draws the most attention. |
| `icon_size` | `sm` / `md` / `lg` (default) / `xl` | Controls how prominent icons are relative to the text. XL works when the bar is the hero's main supporting element; SM keeps it subtle. |
| `icon_shape` | `sharp` / `rounded` / `circle` (default) | Shape of the icon container when using outline or filled style. Sharp feels corporate, rounded feels modern, circle feels friendly. |
| `alignment` | `left` (default) / `centered` | Left keeps icon and text side-by-side; centered stacks icon above text. Centered needs short titles to look clean. |
| `show_dividers` | `true` (default) / `false` | Draws vertical border lines between items on desktop. Dividers add visual structure; removing them creates a more open, airy feel. |
| `color_scheme` | `standard-primary` / `standard-secondary` / `highlight-primary` / `highlight-secondary` | Standard inherits page background; highlight swaps to the alternate background. Accent variants shift text or icon colors for contrast. |
| `top_spacing` | `auto` / `none` | Controls gap above the widget. Set to none when butting the bar directly against a hero or header. |
| `bottom_spacing` | `auto` / `none` | Controls gap below the widget. Set to none when the next section should feel visually connected. |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `item` | `icon` (icon picker), `title` (short text), `text` (description) | Each item becomes one column on desktop, one row on mobile. The default setup ships four items. Title and text are both optional, so you can use icon-only or title-only layouts. |

---

## Layout Recipes

### 1. "Why Choose Us" Strip Below the Hero

- **Items:** 3-4 (e.g., "20 Years Experience," "Licensed & Insured," "Free Estimates," "5-Star Rated")
- **Settings:** `icon_style: filled`, `icon_size: lg`, `icon_shape: circle`, `alignment: left`, `show_dividers: true`, `color_scheme: highlight`
- **Good for:** Immediately reinforcing credibility after the hero image and CTA.
- **Industries:** Contractors, roofers, HVAC, landscaping, any local service business.

### 2. Compact Shipping & Returns Bar (E-Commerce)

- **Items:** 3 (e.g., "Free Shipping Over $50," "30-Day Returns," "Secure Checkout")
- **Settings:** `icon_style: plain`, `icon_size: sm`, `icon_shape: sharp`, `alignment: left`, `show_dividers: true`, `color_scheme: standard`
- **Good for:** Sitting just above the footer or below the product grid to reduce purchase anxiety.
- **Industries:** Online stores, boutiques, DTC brands.

### 3. Centered Icon Showcase

- **Items:** 4-5 (e.g., "Organic Ingredients," "Cruelty-Free," "Eco Packaging," "Handmade," "Family Owned")
- **Settings:** `icon_style: outline`, `icon_size: xl`, `icon_shape: circle`, `alignment: centered`, `show_dividers: false`, `color_scheme: standard-secondary`
- **Good for:** A standalone values section on an About page or midway through a long landing page.
- **Industries:** Skincare, food producers, wellness brands, artisan goods.

### 4. Minimal Dark Highlight Band

- **Items:** 3 (e.g., "Award-Winning Design," "Published in Arch Digest," "50+ Projects Completed")
- **Settings:** `icon_style: plain`, `icon_size: md`, `icon_shape: rounded`, `alignment: left`, `show_dividers: false`, `color_scheme: highlight-secondary`, `top_spacing: none`, `bottom_spacing: none`
- **Good for:** A full-width accent band that breaks up two light sections with a bold, confident statement.
- **Industries:** Architecture firms, interior designers, photography studios.

### 5. Service Guarantees Bar

- **Items:** 4 (e.g., "Same-Day Response," "No Hidden Fees," "Background-Checked Staff," "Satisfaction Guaranteed")
- **Settings:** `icon_style: filled`, `icon_size: md`, `icon_shape: rounded`, `alignment: left`, `show_dividers: true`, `color_scheme: standard`
- **Good for:** Placing directly above a contact form or booking widget to nudge conversions.
- **Industries:** Cleaning services, plumbers, electricians, pest control.

### 6. Stats / Numbers Strip

- **Items:** 3-4 — use the `title` field for the number and `text` for the label (e.g., title: "1,200+", text: "Projects Delivered")
- **Settings:** `icon_style: plain`, `icon_size: sm`, `icon_shape: sharp`, `alignment: centered`, `show_dividers: true`, `color_scheme: highlight`
- **Good for:** Social proof section where big numbers tell the story. De-emphasize icons (or leave the icon field blank) so the numbers dominate.
- **Industries:** Agencies, consultancies, SaaS landing pages, nonprofits showing impact.

### 7. Certification / Badge Row

- **Items:** 3-5 (e.g., "BBB A+ Rated," "EPA Certified," "Veteran Owned," "Google Guaranteed")
- **Settings:** `icon_style: outline`, `icon_size: lg`, `icon_shape: sharp`, `alignment: centered`, `show_dividers: false`, `color_scheme: standard`
- **Good for:** A quiet but authoritative section near the footer that signals third-party validation.
- **Industries:** Any regulated trade — electrical, plumbing, medical clinics, financial advisors.

---

## Differentiation Tips

- **Strip it down.** You can omit the `text` field entirely and use only icon + title for a punchy, scannable bar that works at small sizes. This is great for mobile-first sites.
- **Use it more than once.** Place a compact bar (small icons, no dividers, standard scheme) at the top of the page for shipping/guarantee info, and a larger centered version mid-page for brand values. Different settings make them read as distinct sections.
- **Leverage color scheme to create visual breaks.** A highlight trust bar between two standard-background sections acts as a visual divider itself, so you can often remove a separate spacer or divider widget.
- **Match icon style to the brand personality.** Filled circles feel approachable (great for home services, family businesses). Plain icons with sharp shapes feel precise and corporate (accounting, law, consulting). Outline with rounded shapes strikes a middle ground.
- **Three items is often better than five.** On mobile, each item stacks vertically. More than four items pushes the trust bar into scroll territory. For mobile-heavy audiences, keep it tight.
- **Remove spacing to dock it.** Setting `top_spacing: none` lets the bar sit flush against the hero, making it feel like a continuation of the hero rather than a separate section. This creates a stronger visual connection between the main message and the supporting proof points.
