# Inkwell — Tattoo Studio

## Identity

**Name:** Inkwell Tattoo Studio
**Industry:** Tattoo Studio
**Personality:** Bold, unapologetic, and artistic. Inkwell is a custom tattoo studio that treats every piece as fine art. The site radiates dark energy and creative confidence — heavy contrast, sharp edges, and a crimson accent that reads as ink-on-skin intensity. Not a flash-shop vibe; this is an artist-led studio where consultations matter and portfolios speak louder than words.

---

## Sitemap

5 pages — creative portfolio business:

| Page | Slug | Purpose |
|------|------|---------|
| Home | `index` | Hero with attitude, scrolling text energy strip, tattoo style panels, artist spotlight, masonry portfolio preview, video, testimonial, CTA |
| Services | `services` | Service breakdown by type, process explanation, aftercare FAQ |
| Portfolio | `portfolio` | Full masonry gallery of completed work |
| About | `about` | Studio story, artist profiles, values |
| Contact | `contact` | Contact info, map, booking FAQ |

---

## preset.json Settings

### Color Palette

A high-contrast, ink-dark palette built around deep charcoal and blood crimson. The standard palette uses an off-white warm tone (not sterile white) to feel like parchment/skin. The highlight palette is nearly black with warm undertones.

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#faf5f0` | Warm parchment white — skin-tone warmth, not clinical |
| `standard_bg_secondary` | `#f0e8df` | Warmer cream — subtle banding with organic feel |
| `standard_text_heading` | `#1a1210` | Near-black with warm brown undertone |
| `standard_text_content` | `#3d342e` | Dark warm brown — readable, earthy |
| `standard_text_muted` | `#7a6e64` | Medium warm gray-brown |
| `standard_border_color` | `#d9cfc4` | Warm tan border |
| `standard_accent` | `#9b1b30` | Deep crimson — ink/blood intensity, unique across presets |
| `standard_accent_text` | `#ffffff` | White on crimson — 5.2:1 contrast |
| `standard_rating_star` | `#d4a017` | Warm gold |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#141010` | Near-black with warm red-brown undertone — not blue-navy |
| `highlight_bg_secondary` | `#0c0808` | Deeper black-brown |
| `highlight_text_heading` | `#f5ede5` | Warm off-white |
| `highlight_text_content` | `#b5a99d` | Warm light brown — 5.0:1 on dark bg |
| `highlight_text_muted` | `#7a6e64` | Medium warm gray |
| `highlight_border_color` | `#2e2420` | Dark warm brown border |
| `highlight_accent` | `#d4364e` | Brighter crimson for dark bg — 5.1:1 contrast |
| `highlight_accent_text` | `#141010` | Dark on bright accent |
| `highlight_rating_star` | `#d4a017` | Consistent gold |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Bebas Neue\", sans-serif", "weight": 400 }` | Tall, condensed, all-caps display font — screams tattoo studio energy. Not used in any existing preset. Only has weight 400. |
| `body_font` | `{ "stack": "\"Overpass\", sans-serif", "weight": 400 }` | Clean geometric sans with slight character — readable and modern without being corporate. Not used in any existing preset. |
| `heading_scale` | `110` | Slightly oversized headings — Bebas Neue is condensed so needs the bump to fill space |
| `body_scale` | `100` | Standard |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `sharp` | Hard edges — matches the bold, no-nonsense tattoo brand. Same as ironform/corkwell but different personality via color/typography. |
| `spacing_density` | `default` | Balanced breathing room — lets the artwork speak |
| `button_shape` | `sharp` | Consistent with corner style — blocky, assertive buttons |

---

## Header Configuration

```json
{
  "settings": {
    "logoText": "Inkwell",
    "contactDetailsLine1": "",
    "contactDetailsLine2": "",
    "contact_position": "logo",
    "headerNavigation": "main-menu",
    "center_nav": true,
    "ctaButtonLink": {
      "href": "contact.html",
      "text": "Book a Consultation",
      "target": "_self"
    },
    "ctaButtonStyle": "primary",
    "full_width": true,
    "sticky": true,
    "transparent_on_hero": true,
    "color_scheme": "highlight"
  }
}
```

**Differentiation:** Dark header (`highlight` scheme) + sticky + transparent on hero + centered nav + no contact details (clean and minimal) + primary CTA. The centered nav creates a gallery/editorial feel suited to a visual artist business. Different from sparkhaus (contact in nav, standard scheme), hue-and-co (non-transparent, compact), and framelight (slightly-rounded, airy).

---

## Footer Configuration

```json
{
  "settings": {
    "copyright": "\u00a9 2026 Inkwell Tattoo Studio. All rights reserved.",
    "color_scheme": "highlight-primary"
  },
  "blocks": {
    "logo": {
      "type": "logo_text",
      "settings": {
        "logo_text": "Inkwell",
        "text": "<p>Custom tattoo art. By appointment only.</p>"
      }
    },
    "hours": {
      "type": "text_block",
      "settings": {
        "title": "Studio Hours",
        "text": "<p>Tue\u2013Sat: 11am\u20138pm<br>Sun\u2013Mon: Closed<br>Consultations by appointment</p>"
      }
    },
    "links": {
      "type": "menu_block",
      "settings": {
        "title": "Explore",
        "menu": "footer-menu"
      }
    },
    "social": {
      "type": "social_block",
      "settings": {
        "title": "Follow Us"
      }
    }
  },
  "blocksOrder": ["logo", "hours", "links", "social"]
}
```

---

## Pages

### Home (`index`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Hero Banner | `banner` | highlight-primary | Large height, overlay (dark), center-aligned. Bold heading + short tagline + dual CTA (primary "Book a Consultation" + secondary "View Portfolio"). `top_spacing: none` |
| 2 | Energy Strip | `scrolling-text` | _(custom colors)_ | "Custom Ink \u2022 Fine Line \u2022 Blackwork \u2022 Color Realism" — bg_color: `#9b1b30` (accent crimson), text_color: `#ffffff`, speed: 10, rotate: -3, font_size: lg. `top_spacing: small`, `bottom_spacing: none` |
| 3 | Tattoo Styles | `sliding-panels` | standard-primary | 4 panels: Fine Line, Blackwork, Color Realism, Japanese. Each with style image + title + subtitle + "Explore Style" button. eyebrow: "Our Specialties" |
| 4 | Artist Spotlight | `testimonial-hero` | highlight-primary | Client photo right, quote about their tattoo experience. Author name + "Custom Sleeve Client". No logo. Creates a trust moment mid-page |
| 5 | Portfolio Preview | `masonry-gallery` | standard-secondary | 8 items, 4 columns, gap small, heading_alignment left, eyebrow "Portfolio", title "Recent Work". Image-only (no titles/categories) — tight portfolio wall recipe |
| 6 | Artist at Work | `video-embed` | highlight-primary | 21:9 cinematic aspect ratio. No title/eyebrow/description (stripped header). Artist tattooing process video. `top_spacing: none`, `bottom_spacing: none` |
| 7 | Testimonials | `testimonial-slider` | standard-primary | 4 client quotes with ratings, autoplay 5s |
| 8 | CTA | `action-bar` | highlight-primary | "Ready to Get Inked?" with booking button. `fullwidth: false` |

**Differentiation:** Uses `banner` as hero (framelight used `rich-text`, hue-and-co used `slideshow`). `scrolling-text` adds raw energy unique to tattoo brand. `sliding-panels` for tattoo styles instead of card grids. `testimonial-hero` mid-page for trust. `video-embed` in cinematic 21:9 for immersive process footage. `masonry-gallery` preview instead of `project-showcase`.

### Services (`services`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, overlay, "Our Services" heading + subtitle. `top_spacing: none`, `bottom_spacing: small` |
| 2 | Tattoo Styles | `icon-list` | standard-primary | 6 items, grid, 3 columns, icon_style: filled, icon_size: xl, icon_shape: sharp. Each style (Fine Line, Blackwork, Color Realism, Japanese, Geometric, Watercolor) with icon + title + description. heading_alignment: left, eyebrow: "What We Do" |
| 3 | Our Process | `steps` | standard-secondary | 4 steps with images: Consultation, Design, Session, Aftercare. Zigzag layout showing the tattoo journey |
| 4 | What to Expect | `split-content` | highlight-primary | Two-column: left has heading "Your First Visit" + paragraph text, right has checklist (features block with + items: Bring reference photos, Wear comfortable clothing, Eat before your session, Plan for breaks on long sessions). balance: equal |
| 5 | Aftercare FAQ | `accordion` | standard-primary | 5 items about healing, washing, sun exposure, touch-ups. Sidebar with `info` block: "Questions About Aftercare?" + phone/email, and `social` block. sidebar_position: right, heading_alignment: left |

### Portfolio (`portfolio`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `banner` | highlight-primary | Small height, overlay, "Portfolio" heading. `top_spacing: none`, `bottom_spacing: none` |
| 2 | Full Gallery | `masonry-gallery` | standard-primary | 12 items, 4 columns, gap small, heading_alignment left. Each with image + title (piece name) + category (style: Fine Line, Blackwork, etc.). eyebrow: "Our Work", title: "Custom Tattoo Art". `top_spacing: small` |
| 3 | Video Reel | `video-embed` | highlight-primary | 16:9 aspect ratio. eyebrow: "Behind the Scenes", title: "The Art of Ink". Video of tattooing process |
| 4 | Client Spotlight | `testimonial-hero` | standard-secondary | Image left, powerful client quote about their custom piece. No logo |

**Differentiation:** Portfolio page ends with `testimonial-hero` instead of `action-bar` — the client quote closes the page naturally before the footer. No CTA strip needed; the work and testimonial speak for themselves.

### About (`about`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Studio Story | `split-hero` | highlight-primary | Image left (studio interior shot), content right. text (sm, uppercase, muted: "Est. 2018"), heading (3xl: "Art on Skin"), text (base: studio story paragraph), button (primary "Book a Consultation"). `top_spacing: none` |
| 2 | The Artists | `profile-grid` | standard-primary | 3 profiles, 3 columns: Lead Artist, Resident Artist, Apprentice. Each with portrait, name, role, bio |
| 3 | Studio Values | `icon-card-grid` | standard-secondary | 3 cards, flat layout, 3 columns: Artistry First, Clean & Safe, Your Vision. No button_link on cards |
| 4 | Studio FAQ | `accordion` | highlight-primary | 4 items about the studio, walk-ins, age requirements, deposits. Separated style, heading_alignment: center |

**Differentiation:** About page opens with `split-hero` instead of banner — breaks the pattern. Different hero type from home page (banner). Ends with `accordion` instead of `action-bar`.

### Contact (`contact`)

| # | Widget | Type | Color Scheme | Key Details |
|---|--------|------|-------------|-------------|
| 1 | Page Banner | `rich-text` | highlight-primary | heading "Get in Touch", description text about booking process. heading_alignment: center. `top_spacing: none` — highlight scheme creates a colored header band |
| 2 | Contact Info | `contact-details` | standard-primary | 3 blocks: info (address, phone, email), text_block (hours: Tue-Sat 11am-8pm, closed Sun-Mon), social |
| 3 | Booking FAQ | `accordion` | standard-secondary | 5 items about booking, deposits, cancellation, minimum age, pricing. Sidebar with `info` block: "Ready to Book?" + phone/email. sidebar_position: left, heading_alignment: left |
| 4 | Find Us | `map` | standard-primary | Google Maps embed with sidebar showing address and parking info |

**Differentiation:** Contact page opens with `rich-text` (highlight scheme) instead of banner — variety in page openers. Ends with `map` (not `contact-details`, avoiding footer duplication). Accordion has sidebar on the left for variety.

---

## Menus

**main-menu.json:**
- Services → `services.html`
- Portfolio → `portfolio.html`
- About → `about.html`
- Contact → `contact.html`

**footer-menu.json:**
- Services → `services.html`
- Portfolio → `portfolio.html`
- About → `about.html`
- Contact → `contact.html`

---

## Widget Usage Summary

| Widget Type | Count |
|------------|-------|
| `banner` | 3 (1 hero + 2 inner pages) |
| `scrolling-text` | 1 |
| `sliding-panels` | 1 |
| `testimonial-hero` | 2 |
| `masonry-gallery` | 2 |
| `video-embed` | 2 |
| `testimonial-slider` | 1 |
| `action-bar` | 1 |
| `icon-list` | 1 |
| `steps` | 1 |
| `split-content` | 1 |
| `accordion` | 3 |
| `split-hero` | 1 |
| `profile-grid` | 1 |
| `icon-card-grid` | 1 |
| `rich-text` | 1 |
| `contact-details` | 1 |
| `map` | 1 |

**18 unique widget types across 5 pages.**

---

## Improvements Over Default Approach

1. **`masonry-gallery` (x2)** — The obvious portfolio widget for a tattoo studio. Tight portfolio wall on home, labeled gallery on portfolio page. Pinterest-style stagger showcases varied tattoo sizes/orientations perfectly.
2. **`scrolling-text`** — Adds raw, edgy energy between hero and content. Angled crimson strip with tattoo style names creates brand attitude no card grid can match.
3. **`video-embed` (x2)** — 21:9 cinematic on home page (atmospheric process video), 16:9 on portfolio page (behind-the-scenes). Tattoo artistry is kinetic — static images alone undersell the craft.
4. **`sliding-panels`** — Tattoo styles as expandable panels instead of card grid. Each style gets a full-width image reveal that shows the art, not a thumbnail.
5. **`testimonial-hero` (x2)** — Mid-page on home (trust moment), end of portfolio (client spotlight closing). Replaces generic testimonial grids with a single powerful story.
6. **`icon-list`** — Services page uses filled/sharp icon list for tattoo styles instead of another card grid. Dense, scannable, and visually distinct from the panels on the home page.
7. **About opens with `split-hero`** — Studio interior photo + story. Not another banner. Creates immersive introduction.
8. **Contact opens with `rich-text`** — Highlight scheme creates a colored band instead of a banner image. Page opener variety.
9. **Portfolio ends without `action-bar`** — Closes with `testimonial-hero` instead. Not every page needs a CTA strip.
10. **About ends without `action-bar`** — Closes with `accordion` FAQ. Two pages break the CTA strip pattern.

---

## Header Differentiation Notes

- **Dark header** (`highlight` scheme): moody, matches the tattoo studio brand — dark header flows into dark hero
- **Centered nav** (`center_nav: true`): editorial/gallery feel, uncommon across presets (only used here)
- **No contact details**: both lines empty — clean, minimal header with just logo + nav + CTA
- **Sticky + transparent on hero**: immersive hero experience, header always accessible
- **Primary CTA** ("Book a Consultation"): strong conversion button in crimson accent
- Differs from framelight (standard scheme, airy, slightly-rounded), hue-and-co (compact, non-transparent), sparkhaus (contact in nav)
