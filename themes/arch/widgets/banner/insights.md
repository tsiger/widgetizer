# banner — Widget Insights

Full-width hero section with a background image, color overlay, and stacked content blocks. The primary "above-the-fold" widget, designed to make a strong first impression with large typography over photography or solid color schemes.

## Settings levers

| Setting | Values | Visual effect |
|---------|--------|---------------|
| `image` | any uploaded image | Background photo; when set the widget gains `has-bg-image` and `has-overlay` classes, triggering the overlay layer |
| `height` | `auto`, `small`, `medium`, `large` | Controls section height. `auto` uses content-driven padding; `small`/`medium`/`large` apply fixed height classes, useful for viewport-filling heroes |
| `fullwidth` | `true` / `false` | When true, the banner bleeds edge-to-edge. When false, it gains `max-width`, `margin-inline: auto`, and rounded corners — creating a contained "card-style" hero |
| `alignment` | `center`, `start` | Horizontal text alignment. `center` produces a classic centered hero; `start` left-aligns everything, giving a more editorial feel |
| `vertical_alignment` | `start`, `center`, `end` | Pushes content to the top, middle, or bottom of the banner — only meaningful when `height` is not `auto` |
| `overlay_color` | any color with alpha | Tint layer between background image and content. Default is a dark navy at ~75% opacity. Adjust hue and alpha to match brand or create mood |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Background/text palette when no image is set. `highlight-primary` variants produce strong contrast backgrounds |
| `top_spacing` | `auto`, `none` | Removes top margin — essential when the banner is the first widget and should sit flush under a transparent header |
| `bottom_spacing` | `auto`, `none` | Removes bottom margin — useful when the next section should visually "touch" the banner |

## Available blocks

| Block | Key settings | Notes |
|-------|-------------|-------|
| `heading` | `text`, `size` (lg..9xl) | Renders as `<h1>` when the banner is the first widget on the page, `<h2>` otherwise. The main attention-grabber |
| `text` | `text` (richtext), `size` (sm/base/lg), `uppercase`, `muted` | Body copy or kicker text. Use `sm` + `uppercase` above a heading for a label/eyebrow effect; use `lg` below for a subtitle |
| `image` | `image`, `width` (5-100%) | Inline image within the content stack — logos, badges, app screenshots. Width is percentage of content area |
| `icon` | `icon`, `style` (plain/outline/filled), `size` (sm/md/lg/xl), `shape` (sharp/rounded/circle) | Decorative or brand icon placed in the content flow |
| `features` | `features` (newline-separated, `+` prefix = checkmark, `-` prefix = x) | Bulleted/checked feature list overlaid on the hero — good for quick value props |
| `numbered-item` | `title`, `description`, `size` (small/medium/large/xlarge), `shape` (sharp/rounded/circle) | Auto-numbered items (counter increments per occurrence). Works for step previews or key stats |
| `rating` | `rating` (3, 4, or 5 stars) | Star rating display — social proof right in the hero |
| `button` | `link`, `link_2`, `style`/`style_2` (primary/secondary), `size` (small/medium/large/xlarge) | Up to 2 buttons per block. Primary is filled, secondary is outlined. Size controls padding and gap between buttons |

## Layout recipes

**1. "Classic centered hero with photo" (the workhorse)**
- Height: `large`, Fullwidth: `true`, Alignment: `center`, Vertical alignment: `center`
- Image: dramatic wide-angle photo, Overlay: dark navy `#0a1e38bf`
- Blocks: text (sm, uppercase, muted: false) as eyebrow -> heading (6xl-7xl) -> text (lg) as subtitle -> button (primary "Book Now" + secondary "View Menu")
- Good for: The default homepage opener. Big, confident, tells visitors exactly what the business does
- Industries: Restaurant, hotel, event venue, winery — anywhere with strong photography

**2. "Left-aligned editorial hero"**
- Height: `large`, Fullwidth: `true`, Alignment: `start`, Vertical alignment: `center`
- Image: moody portrait or workspace photo, Overlay: slightly lighter `#1a2a3abf`
- Blocks: heading (5xl) -> text (lg) -> button (primary only, medium size)
- Good for: Professional services where left-aligned text feels more authoritative and easier to scan
- Industries: Law firm, architecture studio, financial advisor, consulting agency

**3. "Compact color-block hero" (no photo)**
- Height: `auto`, Fullwidth: `false`, Color scheme: `highlight-secondary`, Alignment: `center`
- No image — relies entirely on the color scheme for visual interest
- Blocks: icon (filled, lg, circle) -> heading (5xl) -> text (base) -> button (primary + secondary, small)
- Good for: Interior pages, landing pages for specific services, or sites that lack professional photography
- Industries: SaaS product, tech startup, accountant, insurance agency — businesses where stock photos feel inauthentic

**4. "Social-proof hero with rating"**
- Height: `medium`, Fullwidth: `true`, Alignment: `center`, Vertical alignment: `center`
- Image: happy customer or team photo, Overlay: warm dark `#2a1a0abf`
- Blocks: rating (5 stars) -> heading (5xl) -> text (lg, muted: false) with a short testimonial quote -> button (primary "Get a Free Quote", large)
- Good for: Trust-first pages where the visitor needs immediate social validation before scrolling
- Industries: Dentist, spa, home contractor, auto repair, cleaning service — local businesses that live or die by reviews

**5. "Feature-forward hero"**
- Height: `auto`, Fullwidth: `true`, Alignment: `start`, Vertical alignment: `center`
- Image: abstract or textured background, Overlay: brand-tinted `#0a3828bf`
- Blocks: heading (6xl) -> text (base) -> features ("+Free consultation", "+Same-day response", "+Licensed & insured", "+Satisfaction guaranteed") -> button (primary, medium)
- Good for: Immediately communicating key differentiators without requiring the visitor to scroll
- Industries: Plumber, electrician, pest control, landscaper — trade services where trust signals close the deal

**6. "Brand logo + tagline splash"**
- Height: `large`, Fullwidth: `true`, Alignment: `center`, Vertical alignment: `center`
- Image: atmospheric or aerial brand photo, Overlay: very dark `#000000cc`
- Blocks: image (logo, width 20%) -> heading (4xl) as tagline -> button (secondary "Explore", small)
- Good for: Brand-first impressions where the logo and a single tagline carry the message. Minimal and elegant
- Industries: Photographer, design studio, boutique hotel, jewelry brand, fashion label

**7. "Step preview hero"**
- Height: `auto`, Fullwidth: `false`, Color scheme: `standard-secondary`, Alignment: `center`
- No image — contained card style with rounded corners
- Blocks: text (sm, uppercase) as eyebrow "How It Works" -> heading (5xl) -> numbered-item ("Schedule", "We Visit", "Enjoy Results", all medium/circle) -> button (primary "Schedule Now")
- Good for: Immediately showing the customer journey in three easy steps, reducing friction before they even scroll
- Industries: House cleaning, mobile car wash, personal trainer, dog groomer — appointment-based services

**8. "Bottom-anchored cinematic hero"**
- Height: `large`, Fullwidth: `true`, Alignment: `start`, Vertical alignment: `end`
- Image: wide cinematic landscape or interior shot, Overlay: gradient-dark `#0a1e38a0` (lower opacity to let the photo breathe)
- Blocks: heading (7xl-8xl, short — two or three words max) -> text (sm, muted) with one-liner -> button (secondary, small)
- Good for: Letting the photography dominate while anchoring minimal text at the bottom edge, like a film title card
- Industries: Real estate agency, resort, travel tour operator, wedding venue — businesses that sell through visuals

## Differentiation tips

- **Vary the height setting across presets.** `large` produces a full viewport hero but using it everywhere makes every page feel identical. Mix in `auto` and `medium` for secondary pages and interior landing pages.
- **Toggle `fullwidth` on and off.** The contained card-style hero (fullwidth: false) is visually distinct and works especially well as a second banner deeper in a page or when the site already has a full-bleed hero on the homepage.
- **Don't always center-align.** Left-aligned (`start`) banners feel editorial and professional. Alternate between `center` and `start` across presets so pages don't all share the same symmetrical look.
- **Use `vertical_alignment: end` at least once.** Bottom-anchored text over a tall hero creates a cinematic layout that feels radically different from the default center-center pattern.
- **Change up the overlay color, not just the opacity.** A warm brown overlay creates a completely different mood from the default navy. Tint the overlay toward the brand's accent color for variety.
- **Lean on different block combinations.** The default heading + text + button combo is reliable, but rating + heading or image (logo) + heading or numbered-items + button feel like entirely different widgets even though the underlying structure is the same.
- **Swap the eyebrow and heading order.** Placing a small uppercase text block above the heading (eyebrow pattern) versus placing descriptive text below (subtitle pattern) creates two distinct visual rhythms from the same two blocks.
- **Use the no-image color-scheme variants intentionally.** A `highlight-secondary` banner with no photo, paired with fullwidth: false, reads as a callout card rather than a hero — excellent for breaking up long pages without needing more photography.
