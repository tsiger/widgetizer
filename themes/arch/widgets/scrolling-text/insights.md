# Scrolling Text Widget — Insights

## Description

An infinite-scroll marquee strip that repeats a short phrase across the viewport, optionally rotated at an angle, used as a visual divider or attention-grabbing banner between page sections.

---

## Settings Levers

| Setting | Type / Values | Visual Effect |
|---|---|---|
| **text** | Free text (default: "We build modern brands.") | The phrase that repeats across the strip. Keep it short for best rhythm. |
| **separator** | Free text (default: star symbol) | Glyph shown at 60% opacity between each text repetition. Leave blank to remove. |
| **speed** | Range 1 -- 20 (default: 8) | Higher = faster scroll. Internally mapped to a CSS duration (lower duration = faster). 1 is a slow crawl, 20 is rapid. |
| **rotate** | Range -15 to 15 degrees (default: -5) | Tilts the entire strip. Negative = top-left to bottom-right slant. 0 = perfectly horizontal. |
| **font_size** | sm / md / lg / xl (default: md) | Maps to CSS custom-property tiers from base up to 3xl. xl dominates the viewport. |
| **bg_color** | Color with alpha (default: #1e3a8a, deep blue) | Strip background. Alpha support means you can make it semi-transparent over the section behind it. |
| **text_color** | Color (default: #ffffff) | Color for both the text and the separator. |
| **top_spacing** | auto / none (default: auto) | Controls padding above the strip wrapper. "none" lets it sit flush against the previous section. |
| **bottom_spacing** | auto / none (default: auto) | Controls padding below the strip wrapper. "none" lets the next section sit flush. |

---

## Available Blocks

This widget has **no blocks**. All content is controlled through the top-level settings above.

---

## Layout Recipes

### 1. The Angled Accent Strip

| Setting | Value |
|---|---|
| text | "Now Accepting New Clients" |
| separator | (bullet or dash) |
| speed | 6 |
| rotate | -3 |
| font_size | md |
| bg_color | Brand accent color |
| text_color | #ffffff |
| top_spacing | none |
| bottom_spacing | none |

**Good for:** Placing between a hero section and the services grid to announce availability without a full banner. The slight angle adds energy without overwhelming the layout.

**Industries:** Freelance designers, consultants, law firms, therapists.

---

### 2. Bold Sale Takeover

| Setting | Value |
|---|---|
| text | "Summer Sale -- 30% Off Everything" |
| separator | (fire or sparkle emoji) |
| speed | 12 |
| rotate | 0 |
| font_size | xl |
| bg_color | #dc2626 (bright red) |
| text_color | #ffffff |
| top_spacing | none |
| bottom_spacing | none |

**Good for:** Inserting at the very top of the page as a full-width urgency banner. Zero rotation and large text make it scan like a news ticker. High speed keeps the eye moving.

**Industries:** Retail shops, boutiques, e-commerce storefronts, seasonal businesses.

---

### 3. Subtle Brand Whisper

| Setting | Value |
|---|---|
| text | "Crafted with care in Portland" |
| separator | (empty -- no separator) |
| speed | 3 |
| rotate | 0 |
| font_size | sm |
| bg_color | Brand color at low alpha, e.g. rgba with 0.08 opacity |
| text_color | Muted gray or brand color |
| top_spacing | auto |
| bottom_spacing | auto |

**Good for:** A quiet, textural divider between content sections. The slow speed and small text make it feel ambient rather than promotional. Semi-transparent background lets it blend into the page.

**Industries:** Artisan bakeries, craft studios, specialty coffee roasters, handmade goods shops.

---

### 4. Diagonal Event Countdown

| Setting | Value |
|---|---|
| text | "Grand Opening June 15th" |
| separator | star symbol |
| speed | 8 |
| rotate | -5 |
| font_size | lg |
| bg_color | #000000 |
| text_color | #facc15 (gold/yellow) |
| top_spacing | none |
| bottom_spacing | none |

**Good for:** Placed above the footer or between the about section and a contact form to build anticipation for a specific date. The black-and-gold contrast draws the eye. Default rotation gives it the "caution tape" energy that signals something is happening.

**Industries:** Restaurants, fitness studios, salons, new retail locations, event venues.

---

### 5. Testimonial Highlight Ribbon

| Setting | Value |
|---|---|
| text | "Rated 5 Stars by 200+ Happy Customers" |
| separator | (star symbol) |
| speed | 5 |
| rotate | 2 |
| font_size | md |
| bg_color | #065f46 (deep green) |
| text_color | #ffffff |
| top_spacing | auto |
| bottom_spacing | auto |

**Good for:** Positioned just before a testimonials or reviews section to prime the visitor with a social-proof headline. The positive rotation (tilting upward left-to-right) gives a subtle optimistic feel.

**Industries:** Home services (plumbers, electricians, cleaners), dentists, auto repair shops, pet groomers.

---

### 6. Minimalist Horizontal Rule

| Setting | Value |
|---|---|
| text | Single word or short phrase, e.g. "Design" |
| separator | (long dash or middot) |
| speed | 2 |
| rotate | 0 |
| font_size | sm |
| bg_color | Transparent or near-transparent |
| text_color | Light gray (#d1d5db) |
| top_spacing | none |
| bottom_spacing | none |

**Good for:** Replacing a plain `<hr>` between portfolio pieces or long-form content sections. At very slow speed and small size, it functions almost like a decorative border rather than a headline. Works best when the page already has strong visual content and just needs gentle separation.

**Industries:** Photographers, architects, interior designers, creative agencies.

---

## Differentiation Tips

- **Rotation is the signature move.** Most marquee widgets scroll flat. Even a small -3 to -5 degree tilt transforms the strip from a generic ticker into a design-forward element that feels intentional. Use it.
- **Separator choice sets the tone.** A star feels playful, a bullet feels corporate, an emoji feels casual, and no separator at all feels refined. Match it to the brand voice.
- **Speed signals intent.** Fast (10+) says "urgency, sale, action." Slow (1--4) says "ambient, crafted, calm." The default 8 is a safe middle. Push it to the extremes for a stronger personality.
- **Semi-transparent backgrounds unlock layering.** Because bg_color supports alpha, you can overlay the strip on a hero image or colored section below it. This is especially powerful when combined with `top_spacing: none` and `bottom_spacing: none` to eliminate the gap.
- **Pair rotation with flush spacing.** The angled strip looks best when it bleeds into neighboring sections (both spacings set to none). With auto spacing, the padding can make the rotation feel disconnected from the rest of the layout.
- **Keep the text short.** The phrase repeats 20 times in the markup. Long sentences create a wall of text that is hard to read at scroll speed. Aim for 3--6 words maximum.
- **Use it sparingly.** One scrolling strip per page is a statement. Two is a design system. Three is a headache. On most small business sites, a single placement between hero and content is the sweet spot.
