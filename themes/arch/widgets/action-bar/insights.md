# Action Bar Widget

A horizontal call-to-action strip that pairs a headline and supporting text on the left with one or two buttons on the right, collapsing to a centered stack on mobile.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `fullwidth` | `true` / `false` (default) | When true, removes the max-width constraint so the inner container stretches edge-to-edge. Good for bold, immersive CTAs. |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary` (default), `highlight-secondary` | Controls background and text color pairing. `standard-primary` uses no padded container and no custom bg; the other three add padding and set `--widget-bg-color` to the primary background variable, pulling their palette from the theme's color-scheme classes. |
| `top_spacing` | `auto` (default), `none` | `none` removes the top margin/padding so the bar sits flush against the widget above it. Useful for visually connecting it to a preceding section. |
| `bottom_spacing` | `auto` (default), `none` | Same as above but for the bottom edge. Set to `none` when the bar should bleed into the footer or next section. |

---

## Available Blocks

Up to **4 blocks** total, in any combination.

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| **heading** | `text` (plain text), `size` (lg through 9xl, default 2xl) | Renders as an `<h2>`. Only one is typical, but the schema allows multiples. Placed in the left content column. |
| **text** | `text` (richtext/HTML), `size` (sm, base, lg), `uppercase` (bool), `muted` (bool, default true) | Richtext body copy rendered with `| raw`. `muted` lowers the text contrast for a softer supporting tone. Sits below the heading in the content column. |
| **button** | `link` + `link_2` (each with text, href, target), `style` / `style_2` (primary or secondary), `size` (small, medium, large, xlarge) | Holds up to two buttons in a single block. Gap between them scales with the size setting. Rendered in the right-side actions column, so buttons are visually separated from the text content. |

---

## Layout Recipes

### 1. Classic Appointment CTA

| | |
|---|---|
| **Blocks** | heading (2xl) + text (base, muted) + button (primary "Book Now", medium) |
| **Settings** | `color_scheme: highlight`, `fullwidth: false` |
| **Good for** | Driving a single clear action at the bottom of a services or about page |
| **Industries** | Salons, dental offices, physiotherapy clinics, veterinary practices |

### 2. Dual-Path Conversion Bar

| | |
|---|---|
| **Blocks** | heading (3xl) + button (primary "Get a Quote" + secondary "Call Us", large) |
| **Settings** | `color_scheme: highlight-secondary`, `fullwidth: false` |
| **Good for** | Giving visitors two entry points -- one digital, one personal -- to lower friction |
| **Industries** | Contractors, HVAC companies, roofing, landscaping, auto repair shops |

### 3. Urgent Full-Width Banner

| | |
|---|---|
| **Blocks** | heading (4xl) + button (primary "Shop the Sale", xlarge) |
| **Settings** | `color_scheme: highlight`, `fullwidth: true`, `top_spacing: none`, `bottom_spacing: none` |
| **Good for** | Time-limited promotions or seasonal sales that need maximum visual weight |
| **Industries** | Retail boutiques, e-commerce storefronts, restaurants with specials |

### 4. Soft Informational Strip

| | |
|---|---|
| **Blocks** | heading (lg) + text (sm, muted, uppercase) |
| **Settings** | `color_scheme: standard-secondary`, `fullwidth: false` |
| **Good for** | Non-pushy announcements like new hours, a relocation notice, or a policy update. No button keeps it purely informational. |
| **Industries** | Law firms, accounting offices, medical practices, government services |

### 5. Newsletter / Lead Magnet Teaser

| | |
|---|---|
| **Blocks** | heading (2xl) + text (base, muted: true) + button (primary "Subscribe", medium) |
| **Settings** | `color_scheme: standard-secondary`, `fullwidth: false` |
| **Good for** | Encouraging email signups or free-resource downloads, linking out to a dedicated signup page |
| **Industries** | Fitness studios, real estate agents, marketing consultants, photographers |

### 6. Event / Launch Countdown Prompt

| | |
|---|---|
| **Blocks** | heading (3xl) + text (lg, muted: false) + button (primary "Reserve Your Spot" + secondary "Learn More", large) |
| **Settings** | `color_scheme: highlight-secondary`, `fullwidth: true` |
| **Good for** | Grand openings, product launches, webinars, or workshops where you want maximum presence |
| **Industries** | Event venues, coworking spaces, SaaS startups, yoga studios |

### 7. Minimal Single-Line Nudge

| | |
|---|---|
| **Blocks** | heading (lg) + button (secondary "View Menu", small) |
| **Settings** | `color_scheme: standard`, `fullwidth: false`, `top_spacing: none` |
| **Good for** | A lightweight, low-contrast nudge between two content-heavy sections, guiding without shouting |
| **Industries** | Cafes, bakeries, bed-and-breakfasts, florists |

---

## Differentiation Tips

- **One button vs. two.** A single primary button keeps the eye focused; add the second button only when there is a genuinely distinct alternative path (e.g., "Call" vs. "Email"). Two primary-styled buttons compete -- always pair primary with secondary.
- **Heading size signals urgency.** Sizes below 2xl read as informational; 3xl and above feel promotional. Match the size to the emotional temperature of the message.
- **Muted text is your friend.** Leave it on for supporting copy so the heading and button remain the dominant elements. Turn it off only when the body text itself carries critical information (e.g., a date or address).
- **Fullwidth for emphasis, contained for polish.** Fullwidth bars work best with the highlight or highlight-secondary scheme where the colored background benefits from stretching. Standard scheme with fullwidth can feel empty because there is no visible background fill.
- **Spacing collapse for visual continuity.** Set `top_spacing: none` when the action bar immediately follows a section with the same color scheme to make them feel like one unified block. This is especially effective for pairing with hero or feature sections.
- **Skip the text block for brevity.** When the heading says it all ("Free consultation -- limited spots"), dropping the text block entirely makes the bar punchier and faster to scan on mobile.
- **Uppercase text for labels, not sentences.** The uppercase option on the text block works well for short tags like "LIMITED TIME" or "NEW LOCATION" but harms readability on anything longer than three or four words.
