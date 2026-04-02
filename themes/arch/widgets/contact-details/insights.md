# Contact Details Widget — Insights

A structured footer/contact section that displays business information, hours, navigation links, and social icons in a multi-column grid.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text | Small label above the headline (e.g. "Get in Touch"). Hidden when blank. |
| `title` | Any text | Main `<h2>` headline for the section. Hidden when blank. |
| `description` | Any text | Supporting paragraph below the headline. Hidden when blank. |
| `heading_alignment` | `center` (default), `left` | Centers or left-aligns the eyebrow/title/description group. Left feels editorial; center feels formal. |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Controls background and text palette. `standard` has no padded container; the other three add `widget-container-padded` and set `--widget-bg-color`. Use highlight schemes to visually separate contact from surrounding content. |
| `top_spacing` | `auto` (default), `none` | Removes the top section padding when set to `none`. Useful for stacking directly beneath another widget. |
| `bottom_spacing` | `auto` (default), `none` | Removes the bottom section padding when set to `none`. Useful when this is the very last section on the page. |

---

## Available Blocks (max 4)

| Block Type | Key Settings | Notes |
|---|---|---|
| `info` | `title` (text), `text` (richtext) | The "hero" block of the widget. Its first-child CSS rule makes it span 2 grid columns, giving it more room. Best for the business name plus a short blurb or address. |
| `text_block` | `title` (text), `text` (richtext) | General-purpose column. Richtext lets you list hours, directions, or any formatted snippet. Can be used more than once for separate topics (Hours, Location, etc.). |
| `menu_block` | `title` (text), `menu` (menu reference, default `footer-menu`) | Renders a flat link list from a site menu. Submenu items are hidden by CSS, so keep the chosen menu one level deep. Good for legal links, service pages, or quick navigation. |
| `social_block` | `title` (text) | Pulls social icons from `theme.social` settings. No per-block URL config; icons are managed at the theme level. Always left-aligned within the column. |

---

## Layout Recipes

### 1. Classic Restaurant Footer

| Setting / Block | Value |
|---|---|
| `heading_alignment` | `center` |
| `color_scheme` | `highlight` |
| Block 1 — info | Title: restaurant name. Text: one-line tagline + full address. |
| Block 2 — text_block | Title: "Hours". Text: weekday and weekend hours. |
| Block 3 — menu_block | Title: "Explore". Menu: footer menu linking to Menu, Reservations, Private Events. |
| Block 4 — social_block | Title: "Follow Us" |

**Good for:** Restaurants, cafes, bars, bakeries.
**Industries:** Hospitality, food & beverage.

---

### 2. Professional Services — Minimal

| Setting / Block | Value |
|---|---|
| `heading_alignment` | `left` |
| `color_scheme` | `standard` |
| `eyebrow` | "Contact" |
| `title` | blank |
| Block 1 — info | Title: firm name. Text: street address, phone, email. |
| Block 2 — text_block | Title: "Office Hours". Text: Mon-Fri hours and a note about appointments. |
| Block 3 — menu_block | Title: "Quick Links". Menu: About, Services, Careers, Privacy Policy. |

**Good for:** Law firms, accounting firms, consultancies.
**Industries:** Professional services, B2B.

---

### 3. Retail Storefront

| Setting / Block | Value |
|---|---|
| `heading_alignment` | `center` |
| `color_scheme` | `standard-accent` |
| `title` | "Visit Us" |
| Block 1 — info | Title: shop name. Text: address + a short brand statement. |
| Block 2 — text_block | Title: "Store Hours". Text: daily hours with holiday note. |
| Block 3 — social_block | Title: "Stay Connected" |

**Good for:** Boutiques, gift shops, home goods stores.
**Industries:** Retail, e-commerce with a physical location.

---

### 4. Creative Studio / Agency

| Setting / Block | Value |
|---|---|
| `heading_alignment` | `left` |
| `color_scheme` | `highlight-accent` |
| `eyebrow` | "Let's Talk" |
| `title` | "Start a Project" |
| `description` | Brief CTA sentence inviting inquiries. |
| Block 1 — info | Title: studio name. Text: email + phone only (no postal address). |
| Block 2 — menu_block | Title: "Work". Menu: links to Portfolio, Case Studies, Process. |
| Block 3 — social_block | Title: "Follow" |

**Good for:** Design studios, marketing agencies, freelancers.
**Industries:** Creative services, tech, media.

---

### 5. Health & Wellness Practice

| Setting / Block | Value |
|---|---|
| `heading_alignment` | `center` |
| `color_scheme` | `highlight` |
| `title` | "Reach Out" |
| Block 1 — info | Title: practice name. Text: address, phone, "New patients welcome." |
| Block 2 — text_block | Title: "Hours". Text: weekday and Saturday hours, "Closed Sunday." |
| Block 3 — text_block | Title: "Emergencies". Text: after-hours phone number and brief instructions. |
| Block 4 — menu_block | Title: "Resources". Menu: links to Forms, Insurance, FAQ. |

**Good for:** Dental offices, physiotherapy clinics, veterinary practices.
**Industries:** Healthcare, wellness.

---

### 6. Community Organization / Nonprofit

| Setting / Block | Value |
|---|---|
| `heading_alignment` | `center` |
| `color_scheme` | `standard-accent` |
| `eyebrow` | "Get Involved" |
| `title` | organization name |
| Block 1 — info | Title: blank. Text: mission statement (2-3 sentences). |
| Block 2 — text_block | Title: "Visit". Text: address and office hours. |
| Block 3 — menu_block | Title: "Learn More". Menu: Programs, Donate, Volunteer, Events. |
| Block 4 — social_block | Title: "Connect" |

**Good for:** Nonprofits, churches, community centers, clubs.
**Industries:** Civic, nonprofit, education.

---

### 7. Trades & Home Services

| Setting / Block | Value |
|---|---|
| `heading_alignment` | `left` |
| `color_scheme` | `standard` |
| `title` | "Contact Us" |
| Block 1 — info | Title: company name. Text: service area description, phone, email. |
| Block 2 — text_block | Title: "Availability". Text: "Mon-Sat 7am-6pm. Emergency calls accepted 24/7." |
| Block 3 — menu_block | Title: "Services". Menu: links to Plumbing, Electrical, HVAC, etc. |

**Good for:** Plumbers, electricians, landscapers, cleaning services.
**Industries:** Trades, home services.

---

## Differentiation Tips

- **Lead with the info block.** It spans two columns and uses the heading font at XL size, making it the natural place for the business name and identity statement. Treat it as a mini brand moment, not just an address dump.
- **Use richtext strategically in text_block.** Hours with `<p>` per line are scannable. You can also embed a short "Closed on public holidays" note or a link to a booking page.
- **Keep the menu shallow.** The widget hides submenus by CSS, so assign a dedicated flat menu (e.g. "footer-menu") rather than reusing the main navigation. Five to seven links is the sweet spot.
- **Pick color_scheme to create contrast.** If the section above is standard background, switching to `highlight` or `highlight-accent` here draws the eye down and signals "this is the end of the page, here's how to reach us."
- **Omit the heading group for footers.** When the widget lives in the global footer, leaving eyebrow/title/description blank produces a cleaner result that feels structural rather than promotional.
- **Use heading_alignment left for editorial sites** and center for hospitality or event-driven brands. Left alignment pairs well with dropping the eyebrow and letting the info block title serve as the primary anchor.
- **Three blocks is often enough.** Not every site needs all four slots. A trades business with no social presence is better off with info + hours + services than adding an empty social block.
