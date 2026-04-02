# Slideshow Widget Insights

Full-width rotating banner carousel with up to 5 slides, each supporting a background image, overlay, headline, body text, and dual CTAs.

## Settings levers

| Setting | Values | Visual effect |
|---------|--------|---------------|
| height | `auto`, `small`, `medium`, `large` | Controls the vertical size of the slideshow container. `auto` adds internal padding instead of a fixed height; `small`/`medium`/`large` apply preset height classes for increasingly dramatic hero presence. |
| fullwidth | `true` / `false` | When true (default), the slideshow spans edge-to-edge. When false, the slideshow is constrained to the site's content width with visible margins. |
| alignment | `center`, `start` | Positions headline, body text, and buttons. `center` creates a classic hero feel; `start` left-aligns everything for an editorial or portfolio look. |
| autoplay | `true` / `false` | Enables automatic slide rotation. When off, visitors must use arrows or dots to navigate. |
| autoplay_speed | `3000`--`10000` ms (step 1000) | Duration each slide is visible before advancing. Lower values create energy; higher values give visitors time to read longer copy. |

## Available blocks

| Block | Key settings | Notes |
|-------|-------------|-------|
| **slide** (max 5) | `image` -- background photo | When present, adds `has-bg-image` and `has-overlay` classes; the overlay color is layered on top. Without an image the slide uses its color scheme background. |
| | `heading_text` | Main headline. Rendered as `<h1>` on the very first slide of the first widget on the page, `<h2>` otherwise -- important for SEO. |
| | `heading_size` (`lg` -- `9xl`) | Tailwind-scale type sizing. Smaller sizes work for informational slides; `5xl`+ for bold hero statements. |
| | `text_content` | Supporting paragraph beneath the headline. |
| | `text_size` (`sm`, `base`, `lg`) | Controls body text prominence. |
| | `text_uppercase` | Applies uppercase transform -- useful for short taglines or category labels. |
| | `text_muted` | Reduces text opacity for a softer, less dominant subheading. |
| | `button_link` / `button_link_2` | Primary and optional secondary CTA. Each link has `text`, `href`, and `target`. |
| | `button_style` / `button_style_2` (`primary`, `secondary`) | Visual weight of each button. Primary is filled/solid; secondary is outline/ghost. |
| | `button_size` (`small`, `medium`, `large`, `xlarge`) | Shared size for both buttons. |
| | `overlay_color` (color with alpha) | Tints the background image. Default is a deep navy at ~75% opacity (`#0a1e38bf`). Changing hue or reducing opacity dramatically shifts mood. |
| | `color_scheme` (`standard`, `standard-accent`, `highlight`, `highlight-accent`) | Drives the overall palette for the slide -- backgrounds, text colors, and button colors all follow the scheme. Each slide can use a different scheme. |

## Layout recipes

**1. "Bold single hero" (homepage anchor)**
- 1 slide, height `large`, fullwidth `true`, alignment `center`
- heading_size `7xl`, text_size `lg`, single primary button `large`
- Dark overlay (`#000000aa`) over a high-contrast photograph
- color_scheme `highlight`
- Good for: Immediate brand statement. Works for architecture firms, law offices, luxury spas, boutique hotels.

**2. "Dual-CTA storefront" (product launch)**
- 2 slides, height `medium`, fullwidth `true`, alignment `center`, autoplay `true`, speed `6000`
- Each slide: heading_size `5xl`, both buttons active (primary "Shop Now" + secondary "Learn More"), button_size `medium`
- Slide 1 highlight scheme, Slide 2 highlight-accent for variety
- Good for: Promoting two key offers simultaneously. Retail shops, bakeries, florists, online stores.

**3. "Left-aligned editorial" (services overview)**
- 3 slides, height `medium`, fullwidth `true`, alignment `start`
- heading_size `4xl`, text_size `lg`, text_muted `true`, single secondary button `medium`
- Lighter overlay (`#00000040`) to let photography show through
- Good for: Professional services that want to feel approachable, not salesy. Consultancies, accounting firms, marketing agencies, dental clinics.

**4. "Compact announcement bar" (promotions / events)**
- 2--3 slides, height `small`, fullwidth `false` (constrained), alignment `center`
- heading_size `2xl`, text_size `sm`, text_uppercase `true`, no body text or very short tagline
- Single primary button `small`
- No background images -- rely on color_scheme `standard-accent` and `highlight-accent` alternating
- autoplay `true`, speed `4000` for quick rotation
- Good for: Time-sensitive promos, event countdowns, seasonal notices. Restaurants, fitness studios, salons, event venues.

**5. "Full-bleed photo story" (portfolio / about)**
- 4--5 slides, height `large`, fullwidth `true`, alignment `center`, autoplay `true`, speed `8000`
- heading_size `6xl`, no body text, no buttons -- purely visual with a single headline per slide
- Very light overlay (`#00000020`) to keep images vivid
- Mix of color schemes across slides to give each image its own mood
- Good for: Telling a visual brand story. Photographers, interior designers, wedding venues, travel agencies, real estate agents.

**6. "Text-forward brand pitch" (no images)**
- 2 slides, height `medium`, fullwidth `true`, alignment `center`
- No background images; alternate between `highlight` and `standard-accent` color schemes for contrast
- heading_size `8xl`, text_size `lg`, single primary button `xlarge`
- Good for: Startups or service businesses without strong photography. SaaS landing pages, tutoring services, freelance developers, cleaning companies.

**7. "Seasonal campaign rotator" (multi-offer)**
- 5 slides (max), height `medium`, fullwidth `true`, alignment `center`, autoplay `true`, speed `5000`
- Each slide has a unique background image, unique overlay color tint (warm amber for summer, cool blue for winter, etc.), heading_size `5xl`
- Dual buttons on every slide: primary "Shop the Sale" + secondary "See Details"
- button_size `large`
- Good for: Businesses with multiple active promotions or product lines. Gift shops, garden centers, clothing boutiques, pet stores, home decor retailers.

**8. "Minimal single-slide hero with muted subtitle" (professional landing)**
- 1 slide, height `large`, fullwidth `true`, alignment `start`
- heading_size `9xl` (maximum impact), text_content as a short one-liner, text_size `sm`, text_muted `true`, text_uppercase `true`
- Single secondary button `medium` for understated elegance
- Dark background image with heavy overlay (`#0a1e38e0`)
- color_scheme `highlight`
- Good for: High-end professional presence where restraint signals quality. Architects, private wealth advisors, fine dining restaurants, bespoke tailors.

## Differentiation tips

- Vary the **height** setting across presets -- do not default everything to `large`. A `small` slideshow above a content-heavy page feels very different from a `large` full-bleed hero.
- Alternate **alignment** between `center` and `start` across different page presets. Left-aligned text creates an editorial feel that immediately distinguishes one preset from another.
- Use **image-free slides** in at least one preset. Relying on color schemes alone (especially `standard-accent` or `highlight-accent`) produces a graphic, modern look that stands apart from photo-heavy banners.
- Change the **number of slides** deliberately. A single-slide hero with no navigation arrows is a completely different component psychologically than a 5-slide auto-rotating carousel.
- Exploit the **overlay_color** setting beyond the default navy. A warm overlay (`#3b1a00a0`) over a food photo evokes a very different mood than a cool overlay (`#001a33b0`) over a cityscape. Adjust the alpha channel to control how much of the image shows through.
- Mix **button configurations**: some presets should have no buttons (visual-only), some one button, some two. Varying button_style (primary vs secondary) and button_size (small vs xlarge) also prevents visual repetition.
- Use **text_uppercase** and **text_muted** sparingly and intentionally. An uppercase muted subtitle under a massive headline gives a refined, luxury feel; saving this combination for specific presets keeps it distinctive.
- Vary **autoplay_speed** to match the content density of each preset. Image-only slides can rotate quickly (3000--4000 ms), while slides with long text and dual CTAs need more reading time (7000--10000 ms).
- Alternate **color_scheme** within a single slideshow instance to give each slide its own personality, especially in presets with 3+ slides.
