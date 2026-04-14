# Action Bar Widget

A horizontal call-to-action strip that pairs a headline and supporting text on the left with one or two buttons on the right, collapsing to a centered stack on mobile. Supports an optional background image with overlay (like banner), but in preset generation we never set the image — it works as a user-added upgrade, not a preset default.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `image` | any uploaded image | Background photo; when set the widget gains `has-bg-image` and `has-overlay` classes, triggering the overlay layer. Text renders over the image just like a banner, making the action bar feel like a mini-hero CTA. **Not used in preset generation** — this is a user-added enhancement, not something we generate with placeholder images |
| `overlay_color` | any color with alpha (default `#0a1e38bf`) | Tint layer between background image and content. Only visible when `image` is set. Adjust hue and alpha to match brand or mood. **Not used in preset generation** |
| `fullwidth` | `true` / `false` (default) | When true, removes the max-width constraint so the inner container stretches edge-to-edge. **Never use `fullwidth: true` in preset generation** — the contained version always looks better |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary` (default), `highlight-secondary` | Controls background and text color pairing. `standard-primary` uses no padded container and no custom bg; the other three add padding and set `--widget-bg-color`. When a background image is set, the color scheme still controls text color tokens but the image replaces the solid background |
| `top_spacing` | `auto` (default), `small`, `none` | `none` removes the top margin/padding so the bar sits flush against the widget above. `small` reduces spacing for tighter section rhythm |
| `bottom_spacing` | `auto` (default), `small`, `none` | Same as above but for the bottom edge |

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
| **Settings** | `color_scheme: highlight-primary`, `fullwidth: false` |
| **Good for** | Driving a single clear action at the bottom of a services or about page |

### 2. Dual-Path Conversion Bar

| | |
|---|---|
| **Blocks** | heading (3xl) + button (primary "Get a Quote" + secondary "Call Us", large) |
| **Settings** | `color_scheme: highlight-secondary`, `fullwidth: false` |
| **Good for** | Giving visitors two entry points — one digital, one personal — to lower friction |

### 3. Soft Informational Strip

| | |
|---|---|
| **Blocks** | heading (lg) + text (sm, muted, uppercase) |
| **Settings** | `color_scheme: standard-secondary`, `fullwidth: false` |
| **Good for** | Non-pushy announcements like new hours, a relocation notice, or a policy update. No button keeps it purely informational. |

### 4. Event / Launch Countdown Prompt

| | |
|---|---|
| **Blocks** | heading (3xl) + text (lg, muted: false) + button (primary "Reserve Your Spot" + secondary "Learn More", large) |
| **Settings** | `color_scheme: highlight-secondary`, `fullwidth: false` |
| **Good for** | Grand openings, product launches, webinars, or workshops where you want maximum presence |

### 5. Minimal Single-Line Nudge

| | |
|---|---|
| **Blocks** | heading (lg) + button (secondary "View Menu", small) |
| **Settings** | `color_scheme: standard-primary`, `fullwidth: false`, `top_spacing: none` |
| **Good for** | A lightweight, low-contrast nudge between two content-heavy sections, guiding without shouting |

---

## Differentiation Tips

- **One button vs. two.** A single primary button keeps the eye focused; add the second button only when there is a genuinely distinct alternative path (e.g., "Call" vs. "Email"). Two primary-styled buttons compete — always pair primary with secondary.
- **Heading size signals urgency.** Sizes below 2xl read as informational; 3xl and above feel promotional. Match the size to the emotional temperature of the message.
- **Muted text is your friend.** Leave it on for supporting copy so the heading and button remain the dominant elements. Turn it off only when the body text itself carries critical information (e.g., a date or address).
- **Never use `fullwidth: true`.** The contained version always looks better. This is a hard rule for preset generation.
- **Spacing collapse for visual continuity.** Set `top_spacing: none` when the action bar immediately follows a section with the same color scheme to make them feel like one unified block. This is especially effective for pairing with hero or feature sections.
- **Skip the text block for brevity.** When the heading says it all ("Free consultation — limited spots"), dropping the text block entirely makes the bar punchier and faster to scan on mobile.
- **Uppercase text for labels, not sentences.** The uppercase option on the text block works well for short tags like "LIMITED TIME" or "NEW LOCATION" but harms readability on anything longer than three or four words.
