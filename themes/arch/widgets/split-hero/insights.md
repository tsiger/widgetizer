# Split Hero

A full-width, two-column hero section that pairs a large background image (50%) with a vertically centered content area (50%), supporting flexible block combinations and image placement on either side.

## Settings levers

| Setting | Values | Visual effect |
|---------|--------|---------------|
| image | Image upload | The background image filling the left or right half; uses a placeholder landscape if empty |
| overlay_color | Any color with alpha | Tints or darkens the image half -- useful for ensuring contrast or adding mood (e.g. semi-transparent black for cinematic feel, brand color at 30% for tinting) |
| image_position | `start` (default), `end` | Swaps which side the photo appears on; `end` reverses the flex direction on desktop |
| color_scheme | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Controls the background/text palette of the content half; non-standard schemes add a `has-highlight-background` class that tints the content area |
| top_spacing | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| bottom_spacing | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |

## Available blocks

| Block | Key settings | Notes |
|-------|-------------|-------|
| **heading** | `text` (plain text), `size` (lg through 9xl) | Renders as `<h1>` when the widget is the first on the page, `<h2>` otherwise; size maps to typographic scale classes |
| **text** | `text` (richtext/HTML), `size` (sm, base, lg), `uppercase` (bool), `muted` (bool) | Versatile paragraph or label block; `muted` reduces opacity for secondary text; `uppercase` + `sm` size is great for kickers/eyebrows above a heading |
| **features** | `features` (textarea, one per line) | Lines starting with `+` get a check icon, lines starting with `-` get an x icon, plain lines render without icons; ideal for quick benefit lists |
| **rating** | `rating` (5 (default), 4, 3) | Displays a star rating row; useful for social proof near a heading or testimonial quote |
| **image** | `image` (upload), `width` (5-100%, default 20) | Inline image block within the content column; handy for logos, badges, or trust marks |
| **icon** | `icon` (icon picker, default "star"), `style` (plain (default), outline, filled), `size` (sm, md (default), lg, xl), `shape` (sharp, rounded, circle (default)) | Decorative icon block; filled + circle creates a badge look, plain keeps it minimal |
| **numbered-item** | `title` (text), `description` (text), `size` (small, medium (default), large, xlarge), `shape` (sharp, rounded, circle (default)) | Numbered step block; auto-increments based on position; great for process steps in a hero |
| **countdown** | `target_date` (text, default "2027-01-01 00:00"), `expired_message` (text, default "The wait is over!"), `show_seconds` (true (default) / false) | Live countdown timer block; ideal for launch dates or event heroes |
| **button** | `link` + `link_2` (text, href, target), `style`/`style_2` (primary, secondary), `size` (small, medium, large, xlarge) | Supports up to two side-by-side buttons with independent style control; primary is filled, secondary is outlined |

## Layout recipes

**1. "The Bold Welcome" (homepage hero)**
- image_position: start
- color_scheme: standard-primary
- overlay_color: none
- top_spacing: none, bottom_spacing: auto
- Blocks: text (sm, muted, uppercase: "Welcome to Our Studio") > heading (4xl) > text (base) > button (primary "Book a Tour" + secondary "View Portfolio")
- Good for: Homepage first impression with a strong photo and clear CTA

**2. "The Dark Cinematic" (brand story section)**
- image_position: end
- color_scheme: highlight-primary
- overlay_color: rgba(0,0,0,0.35)
- top_spacing: auto, bottom_spacing: auto
- Blocks: heading (3xl) > text (lg) > button (primary large "Discover Our Story")
- Good for: Mid-page storytelling section that feels immersive and editorial

**3. "The Benefit Breakdown" (service overview)**
- image_position: start
- color_scheme: standard-secondary
- overlay_color: none
- Blocks: text (sm, muted, uppercase: "Why Choose Us") > heading (2xl) > features ("+ Same-day appointments\n+ Board-certified specialists\n+ Family-friendly office\n+ Insurance accepted") > button (primary medium "Schedule a Visit")
- Good for: Highlighting service advantages with scannable checkmarks alongside a friendly team photo

**4. "The Minimal Invite" (event or launch)**
- image_position: end
- color_scheme: standard-primary
- overlay_color: rgba(255,255,255,0.15)
- top_spacing: none, bottom_spacing: none
- Blocks: text (sm, uppercase, muted: "June 14, 2026") > heading (5xl) > text (base: one short sentence) > button (secondary medium "RSVP Now")
- Good for: Single-event landing page or product launch announcement with maximum whitespace and elegance

**5. "The Trust Builder" (about page)**
- image_position: start
- color_scheme: highlight-secondary
- overlay_color: rgba(0,0,0,0.2)
- Blocks: heading (2xl) > text (base: two-sentence bio or mission) > features ("+ 20 years of experience\n+ 500+ projects completed\n+ Award-winning team") > button (primary "Meet the Team" + secondary "Our Process")
- Good for: About or credentials section that combines narrative with proof points

**6. "The Quick Pitch" (landing page above the fold)**
- image_position: end
- color_scheme: standard-primary
- overlay_color: none
- top_spacing: none, bottom_spacing: none
- Blocks: heading (6xl) > text (lg) > button (primary xlarge "Get Started Free")
- Good for: Conversion-focused landing page with oversized heading and a single dominant CTA; no distractions

**7. "The Warm Introduction" (services or menu page)**
- image_position: start
- color_scheme: standard-secondary
- overlay_color: rgba(0,0,0,0.1)
- Blocks: text (sm, muted: "Our Services") > heading (3xl) > text (base: short paragraph describing the service philosophy) > button (secondary medium "View Full Menu")
- Good for: Top-of-page orientation section that sets context before detailed content below

**8. "The Comparison Closer" (pricing or packages page)**
- image_position: end
- color_scheme: highlight-primary
- overlay_color: none
- Blocks: text (sm, uppercase, muted: "What's Included") > heading (2xl) > features ("+ Unlimited revisions\n+ Dedicated project manager\n+ 30-day money-back guarantee\n- No hidden fees\n- No long-term contracts") > button (primary large "Choose Your Plan")
- Good for: Pre-pricing persuasion section mixing positive checks with reassuring "no negatives" using the x-icon lines

## Differentiation tips

- Alternate `image_position` between `start` and `end` when using multiple split-hero instances on the same page to create a zigzag visual rhythm and avoid a monotonous layout.
- Vary `color_scheme` across instances -- pair a `standard-primary` hero at the top with a `highlight-primary` or `highlight-secondary` one further down the page to create clear visual section breaks.
- Change the block composition rather than just the text: one instance might use heading + text + button, while the next uses heading + features + button. Avoid repeating the same block stack verbatim.
- Use `overlay_color` strategically and sparingly -- reserve dark overlays for atmospheric or cinematic sections and leave others clean. If every hero has the same overlay it flattens the page.
- Scale heading sizes intentionally: the primary page hero might use 4xl-6xl, while a secondary split-hero deeper on the page should drop to 2xl-3xl to maintain clear hierarchy.
- Mix button configurations: use dual buttons (primary + secondary) for decision points, but switch to a single button for simpler calls to action. Not every split-hero needs two buttons.
- Vary the text block role: use the text block as a muted uppercase kicker above the heading in one instance, and as a body paragraph below the heading in another. This prevents the "label + title + paragraph" formula from becoming stale.
- Leverage the features block as a differentiator -- most hero widgets do not have a built-in checklist, so using it in one or two instances (but not all) adds variety and scannable content.
- When stacking two split-heroes back to back, set `bottom_spacing: none` on the first and `top_spacing: none` on the second to create a seamless edge-to-edge pair with no gap.
