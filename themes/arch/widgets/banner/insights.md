# banner — Widget Insights

Full-width section with optional background image, color overlay, and a flexible stack of content blocks. Serves two distinct roles: as a **homepage hero** (immersive, image-backed, large-scale) and as an **inner page title** (clean, imageless, setting the page context). The block variety — headings, text, icons, features, numbered items, countdown, rating, buttons — makes it the most versatile opening widget in the theme.

## Settings levers

| Setting | Values | Visual effect |
|---------|--------|---------------|
| `image` | any uploaded image | Background photo; when set the widget gains `has-bg-image` and `has-overlay` classes, triggering the overlay layer. When blank, the widget relies on `color_scheme` for its surface |
| `overlay_color` | any color with alpha (default `#0a1e38bf`) | Tint layer between background image and content. Only visible when `image` is set. Adjust hue and alpha to match brand or create mood |
| `height` | `auto` (default), `small`, `medium`, `large` | `auto` uses content-driven padding; `small`/`medium`/`large` apply fixed viewport-relative heights. `large` fills most of the screen. For inner page titles, `auto` is almost always right |
| `fullwidth` | `true` (default) / `false` | When true, the banner bleeds edge-to-edge. When false, it gains max-width, auto margins, and rounded corners — creating a contained card-style section. **Important:** when the banner is the first widget on a page with a highlight color scheme or background image, it must stay fullwidth — a contained colored/image banner under a solid header looks broken. Non-fullwidth only works as the first widget with `standard-primary` and no image. Deeper in the page, contained banners with colored backgrounds work fine as callout cards |
| `content_width` | `narrow`, `medium`, `wide` (default) | Controls the max-width of the content stack inside the banner. `narrow` focuses text into a tight reading column (good for centered titles with long subtitles), `wide` lets content breathe across the full container |
| `alignment` | `center` (default), `start` | Horizontal text alignment. `center` produces classic centered layouts; `start` left-aligns everything for an editorial feel |
| `vertical_alignment` | `start`, `center` (default), `end` | Pushes content to the top, middle, or bottom of the banner — only meaningful when `height` is not `auto` |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary` (default), `highlight-secondary` | Background/text palette. For homepage heroes with images, this mostly controls text color. For imageless inner page titles, this IS the visual identity of the section |
| `top_spacing` | `auto` (default), `small`, `none` | `none` removes top spacing — essential when the banner is the first widget and should sit flush under a transparent header. `small` reduces spacing for tighter rhythm |
| `bottom_spacing` | `auto` (default), `small`, `none` | `none` removes bottom spacing — useful when the next section should visually touch the banner |

**Transparent header support:** This widget has `supportsTransparentHeader: true`. When the theme header is set to `transparent_on_hero`, it overlays on top of this widget. This only makes visual sense when the banner has a background image or a highlight color scheme — a transparent header over `standard-primary` with no image looks broken.

## Available blocks

| Block | Key settings | Notes |
|-------|-------------|-------|
| `heading` | `text`, `size` (lg..9xl, default 5xl) | Renders as `<h1>` when the banner is the first widget on the page, `<h2>` otherwise. The main attention-grabber |
| `text` | `text` (richtext), `size` (sm/base/lg, default lg), `uppercase`, `muted` | Body copy or kicker text. Use `sm` + `uppercase` above a heading for an eyebrow effect; use `lg` below for a subtitle. Default `muted` is false |
| `image` | `image`, `width` (5-100%, default 20%) | Inline image within the content stack — logos, badges, app screenshots. Width is percentage of content area. **Not used in preset generation** — this is a user-added enhancement |
| `icon` | `icon`, `style` (plain/outline/filled), `size` (sm/md/lg/xl), `shape` (sharp/rounded/circle) | Decorative or brand icon placed in the content flow. Good for anchoring a section visually without photography |
| `features` | `features` (newline-separated, `+` prefix = checkmark, `-` prefix = x) | Bulleted/checked feature list overlaid on the hero — good for quick value props |
| `numbered-item` | `title`, `description`, `size` (small/medium/large/xlarge), `shape` (sharp/rounded/circle) | Auto-numbered items (counter increments per occurrence). Works for step previews or key stats |
| `countdown` | `target_date` (datetime string), `expired_message`, `show_seconds` (bool, default true) | Live countdown timer showing days, hours, minutes, and optionally seconds. Displays `expired_message` when the date passes |
| `rating` | `rating` (3, 4, or 5 stars, default 5) | Star rating display — social proof right in the hero |
| `button` | `link`, `link_2`, `style`/`style_2` (primary/secondary), `size` (small/medium/large/xlarge) | Up to 2 buttons per block. Primary is filled, secondary is outlined |

## Layout recipes

### Homepage heroes

**1. Classic centered photo hero**
- Settings: `height: large`, `fullwidth: true`, `content_width: wide`, `alignment: center`, `vertical_alignment: center`, `image: set`, `overlay_color: dark brand-tinted ~75% opacity`, `top_spacing: none`
- Blocks: text (sm, uppercase) as eyebrow → heading (6xl-7xl) → text (lg) as subtitle → button (primary + secondary, medium)
- Good for: The default homepage opener. Big, confident, tells visitors exactly what the business does

**2. Left-aligned editorial hero**
- Settings: `height: large`, `fullwidth: true`, `content_width: medium`, `alignment: start`, `vertical_alignment: center`, `image: set`, `overlay_color: slightly lighter ~75% opacity`, `top_spacing: none`
- Blocks: heading (5xl) → text (lg) → button (primary only, medium)
- Good for: Professional services where left-aligned text feels more authoritative and easier to scan

**3. Social-proof hero with rating**
- Settings: `height: medium`, `fullwidth: true`, `content_width: medium`, `alignment: center`, `vertical_alignment: center`, `image: set`, `overlay_color: warm dark ~75% opacity`, `top_spacing: none`
- Blocks: rating (5 stars) → heading (5xl) → text (lg) with a short testimonial quote → button (primary, large)
- Good for: Trust-first pages where the visitor needs immediate social validation before scrolling

**4. Feature-forward hero**
- Settings: `height: auto`, `fullwidth: true`, `content_width: medium`, `alignment: start`, `image: set`, `overlay_color: brand-tinted ~75% opacity`, `top_spacing: none`
- Blocks: heading (6xl) → text (base) → features ("+Free consultation", "+Same-day response", "+Licensed & insured") → button (primary, medium)
- Good for: Immediately communicating key differentiators without requiring the visitor to scroll

**5. Bottom-anchored cinematic hero**
- Settings: `height: large`, `fullwidth: true`, `content_width: wide`, `alignment: start`, `vertical_alignment: end`, `image: set`, `overlay_color: lower opacity ~60-65%`, `top_spacing: none`
- Blocks: heading (7xl-8xl, short — two or three words max) → text (sm, muted) with one-liner → button (secondary, small)
- Good for: Letting the photography dominate while anchoring minimal text at the bottom edge, like a film title card

**6. Countdown launch hero**
- Settings: `height: medium`, `fullwidth: true`, `content_width: medium`, `alignment: center`, `vertical_alignment: center`, `image: set`, `overlay_color: dark ~80% opacity`, `top_spacing: none`
- Blocks: text (sm, uppercase) as eyebrow "Grand Opening" → heading (5xl) → countdown (target_date set, show_seconds true) → button (primary "Reserve Your Spot", large)
- Good for: Grand openings, product launches, or seasonal events with a specific target date

### Inner page titles

**7. Clean page header (the workhorse for inner pages)**
- Settings: `height: auto`, `fullwidth: true`, `content_width: medium`, `alignment: center`, `color_scheme: standard-primary`, no image
- Blocks: text (sm, uppercase) as eyebrow "About Us" → heading (4xl-5xl) → text (base) as subtitle
- Good for: Setting the page context with a clear hierarchy — eyebrow names the section, heading states the promise, subtitle adds one line of context. No button needed.

**8. Highlighted page header**
- Settings: `height: auto`, `fullwidth: true`, `content_width: medium`, `alignment: center`, `color_scheme: highlight-primary` or `highlight-secondary`, no image
- Blocks: text (sm, uppercase) as eyebrow → heading (4xl) → text (lg) as subtitle
- Good for: Inner pages that need more visual weight at the top — the colored band separates the page title from content below and creates a distinct landing moment

**9. Left-aligned editorial page header**
- Settings: `height: auto`, `fullwidth: true`, `content_width: wide`, `alignment: start`, `color_scheme: standard-primary` or `standard-secondary`, no image
- Blocks: heading (3xl-4xl) → text (base) as description
- Good for: Pages where the content below is also left-aligned (e.g., a portfolio list, service details). Feels editorial and direct rather than ceremonial

**10. Contained card page header**
- Settings: `height: auto`, `fullwidth: false`, `content_width: medium`, `alignment: center`, `color_scheme: standard-primary`, no image
- Blocks: icon (filled, lg, circle) → heading (4xl) → text (base)
- Good for: A softer, more contained page header that doesn't span edge-to-edge. The rounded corners and icon give it a friendlier tone. **Must use `standard-primary` when this is the first widget** — contained banners with colored backgrounds under a solid header look broken

**11. Step-preview page header**
- Settings: `height: auto`, `fullwidth: false`, `content_width: wide`, `alignment: center`, `color_scheme: standard-secondary`, no image
- Blocks: text (sm, uppercase) as eyebrow "How It Works" → heading (4xl) → numbered-item x3 (medium, circle, with title + short description each) → button (primary "Schedule Now")
- Good for: Immediately showing the customer journey in three easy steps at the top of a services or booking page

## Differentiation tips

- **The banner is not just a photo hero.** Its richest use in preset generation is as a flexible page opener — with or without images. Every inner page needs a title section, and banner gives you eyebrows, icons, numbered items, and features that rich-text cannot.
- **Vary the height setting across presets.** `large` produces a full viewport hero but using it everywhere makes every page feel identical. Inner page titles should almost always use `auto`. Mix in `medium` for secondary heroes.
- **Toggle `fullwidth` on and off — but with care.** The contained card-style banner (fullwidth: false) is visually distinct, but it only works as the first widget when using `standard-primary` with no image. A contained banner with a highlight scheme or image under a solid header looks broken — there's an awkward gap between the header and the floating colored box. Use contained banners deeper in pages as callout cards, or as first widgets only on `standard-primary`.
- **Use `content_width` to control text density.** `narrow` with center alignment creates a focused, pull-quote feel. `wide` gives breathing room for features lists and numbered items. `medium` is the safe default for most text-heavy headers.
- **Don't always center-align.** Left-aligned (`start`) banners feel editorial and professional. Alternate between `center` and `start` across presets and across pages within a preset.
- **Use `vertical_alignment: end` at least once.** Bottom-anchored text over a tall hero creates a cinematic layout that feels radically different from the default center-center pattern. Only meaningful with fixed heights.
- **Change up the overlay color, not just the opacity.** A warm brown overlay creates a completely different mood from the default navy. Tint the overlay toward the brand's accent color for variety.
- **Lean on different block combinations.** The default heading + text + button combo is reliable, but rating + heading, icon + heading, numbered-items + button, or countdown + heading feel like entirely different widgets even though the underlying structure is the same.
- **Swap the eyebrow and heading order.** Placing a small uppercase text block above the heading (eyebrow pattern) versus placing descriptive text below (subtitle pattern) creates two distinct visual rhythms from the same two blocks.
- **Use the no-image variants intentionally for inner pages.** A `standard-primary` banner with no photo, eyebrow + heading + subtitle, is the cleanest possible page header. A `highlight-primary` variant of the same adds visual weight. These are not lesser versions — they are the right choice for pages where photography would be filler.
- **The countdown block is situational.** Only use it when the preset genuinely supports a time-bound event (grand opening, seasonal launch). Don't add countdowns just because the block exists.
