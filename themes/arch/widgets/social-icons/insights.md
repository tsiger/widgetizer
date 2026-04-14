# Social Icons Widget — Insights

Displays a row of linked social-media icons pulled from the global theme social settings, with an optional eyebrow, headline, and description above.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| **eyebrow** | Any text (blank by default) | Small label above the headline; adds a reveal-up animation step. Useful for phrases like "Stay in Touch" or "Join the Community". |
| **eyebrow_uppercase** | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment. |
| **title** | Any text (default "Follow Us") | Main headline. Renders as `<h1>` when the widget is the first on the page, `<h2>` otherwise. Leave blank to hide. |
| **description** | Any text (default "Stay connected with us on social media.") | Supporting paragraph beneath the headline. Leave blank to hide. |
| **heading_alignment** | `start`, `center` (default) | Controls text alignment of the header block *and* icon row alignment (`center` vs `flex-start`). |
| **icon_size** | Range 1.6 -- 4.8 rem, step 0.2 (default 2.4) | Sets the SVG icon dimension. The clickable box is always icon_size + 1.6 rem, so at default the tap target is 4 rem square. |
| **color_scheme** | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Background and text treatment. `standard-primary` has no padded container; all other schemes add padding and set `--widget-bg-color`. |
| **top_spacing** | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking. |
| **bottom_spacing** | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking. |

---

## Available Blocks

This widget has **no blocks**. The icons are generated automatically from whichever social URLs are filled in under Theme Settings > Social Media. Supported platforms (16 total): Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok, Pinterest, GitHub, Mastodon, Bluesky, Discord, Reddit, Telegram, Threads, WhatsApp, and Email (mailto).

---

## Layout Recipes

### 1. Footer Follow Strip

| Setting | Value |
|---------|-------|
| title | *(blank)* |
| description | *(blank)* |
| eyebrow | *(blank)* |
| heading_alignment | center |
| icon_size | 2.0 |
| color_scheme | standard-primary |
| top_spacing | none |
| bottom_spacing | none |

**Good for:** A compact icon row at the very bottom of a page (or just above the footer) where the surrounding context already explains what the icons are. No heading means zero vertical overhead.

---

### 2. Community Callout Banner

| Setting | Value |
|---------|-------|
| eyebrow | Join the Community |
| title | Let's Connect |
| description | Follow along for project updates, behind-the-scenes, and more. |
| heading_alignment | center |
| icon_size | 3.2 |
| color_scheme | highlight-primary |
| top_spacing | auto |
| bottom_spacing | auto |

**Good for:** A prominent, full-width social section that acts as a secondary CTA. The highlight background makes it visually distinct from surrounding content, and the larger icons invite clicking.

---

### 3. Professional Left-Aligned Block

| Setting | Value |
|---------|-------|
| eyebrow | *(blank)* |
| title | Connect With Us |
| description | *(blank)* |
| heading_alignment | start |
| icon_size | 2.4 |
| color_scheme | standard-secondary |
| top_spacing | auto |
| bottom_spacing | auto |

**Good for:** Corporate or consultancy sites where centered text feels too casual. Left-alignment pairs well with two-column page layouts and keeps the section feeling editorial. The secondary scheme provides a subtle tint without being loud.

---

### 4. Compact Contact Companion

| Setting | Value |
|---------|-------|
| eyebrow | *(blank)* |
| title | Find Us Online |
| description | *(blank)* |
| heading_alignment | start |
| icon_size | 1.8 |
| color_scheme | standard-primary |
| top_spacing | none |
| bottom_spacing | auto |

**Good for:** Placing immediately below a Contact Details or Map widget. Removing the top spacing makes it feel like a continuation of the contact block. Small icons keep it secondary to the phone/email/address information above.

---

### 5. Big Brand Moment

| Setting | Value |
|---------|-------|
| eyebrow | @yourbrand |
| title | Follow Us |
| description | Tag us in your photos for a chance to be featured. |
| heading_alignment | center |
| icon_size | 4.0 |
| color_scheme | highlight-secondary |
| top_spacing | auto |
| bottom_spacing | auto |

**Good for:** Lifestyle and retail brands that treat social media as a primary revenue channel. Oversized icons, bold background, and a UGC prompt all encourage engagement. Works best mid-page between a gallery and a testimonials widget.

---

### 6. Minimal Sign-Off

| Setting | Value |
|---------|-------|
| eyebrow | *(blank)* |
| title | *(blank)* |
| description | Stay connected with us on social media. |
| heading_alignment | center |
| icon_size | 2.4 |
| color_scheme | standard-primary |
| top_spacing | auto |
| bottom_spacing | none |

**Good for:** A quiet ending to a single-page site. No headline keeps the tone modest; the description does just enough to explain the icons. Removing bottom spacing lets it sit flush against the footer.

---

## Differentiation Tips

- **The icons themselves are not configured here.** All platform URLs come from the global theme social settings. This means every social-icons widget instance (and the footer snippet) share the same links. If a client only fills in Instagram and Facebook, every instance shows exactly those two icons -- no per-widget override is possible.
- **Pair with a CTA or embed for stronger conversion.** The widget shows icons but does not embed a feed. Placing it directly after an image gallery or testimonials section creates a natural "see more on our socials" moment.
- **Use icon_size intentionally.** Smaller sizes (1.6--2.0) say "these links exist"; larger sizes (3.2--4.8) say "this is important, click here." Match the size to the role the section plays on the page.
- **Color scheme stacking matters.** Two adjacent `highlight-primary` widgets look like one merged block. Alternate between `standard-primary` and `highlight-primary` (or use spacing overrides) to keep sections visually distinct.
- **Heading alignment affects the icon row too.** Setting `left` alignment shifts both the text and the icons to the start. This is easy to overlook and can look odd if only one or two icons are present -- centered alignment tends to work better with fewer platforms.
- **The email link gets special treatment.** Unlike the other platforms, the mail URL is automatically prefixed with `mailto:` if the user forgets to include it. This is the only icon that opens a native app rather than a browser tab.
