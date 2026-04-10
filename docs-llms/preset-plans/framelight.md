# Framelight - Photographer

## Identity

**Name:** Framelight  
**Industry:** Photographer  
**Personality:** Cinematic, calm, and editorial. Framelight is positioned as a modern photographer for weddings, portraits, and brand stories who values natural movement over stiff posing. The preset should feel quiet but confident: generous whitespace, strong imagery, restrained typography, and a palette that feels like warm film stock with olive undertones.

**Structural constraint:** The previous preset (`hue-and-co`) opens with a `slideshow`, so Framelight avoids a slideshow homepage opener. The homepage leads with a `rich-text` hero paired directly with a full-bleed `image` for a more editorial opening sequence.

---

## preset.json Settings

### Color Palette

An olive-film palette built from warm paper tones, soft charcoals, and a muted botanical accent. The accent hue is intentionally different from the brighter greens already used in Brewline and Greenfield.

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#f7f2eb` | Warm paper white with a photographic print feel |
| `standard_bg_secondary` | `#eee7dc` | Soft linen beige for alternating sections |
| `standard_text_heading` | `#231d18` | Deep espresso for editorial contrast |
| `standard_text_content` | `#4d443d` | Soft charcoal-brown for readable body copy |
| `standard_text_muted` | `#7b7067` | Dusty neutral for metadata and secondary text |
| `standard_border_color` | `#d9d0c4` | Warm border tone that fits the paper base |
| `standard_accent` | `#6c7351` | Muted olive accent - distinctive, understated, photographic |
| `standard_accent_text` | `#ffffff` | Clean white on olive |
| `standard_rating_star` | `#d1a54a` | Warm brass highlight |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#171812` | Near-black olive charcoal |
| `highlight_bg_secondary` | `#10110c` | Deeper film-dark variant |
| `highlight_text_heading` | `#f5efe8` | Warm off-white for headlines |
| `highlight_text_content` | `#c8c2b6` | Soft parchment body text on dark |
| `highlight_text_muted` | `#9b9589` | Low-contrast supporting text |
| `highlight_border_color` | `#313328` | Olive-charcoal border tone |
| `highlight_accent` | `#d4ddb5` | Light sage accent for buttons on dark sections |
| `highlight_accent_text` | `#171812` | Dark text on light sage |
| `highlight_rating_star` | `#d1a54a` | Consistent brass highlight |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Prata\", serif", "weight": 400 }` | Elegant high-contrast serif that feels editorial without becoming fashion-cliche |
| `body_font` | `{ "stack": "\"Public Sans\", sans-serif", "weight": 400 }` | Neutral, highly readable sans that keeps the layout modern |
| `heading_scale` | `110` | Gives headlines cinematic presence |
| `body_scale` | `95` | Slightly tighter body copy for a refined, magazine-like rhythm |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `slightly-rounded` | Softer than sharp, but still polished and editorial |
| `spacing_density` | `airy` | Photography benefits from breathing room |
| `button_shape` | `sharp` | Keeps CTAs crisp against the softer photography palette |

---

## Header Configuration

```json
{
  "logoMaxWidth": 170,
  "logoText": "Framelight",
  "contactDetailsLine1": "Portraits / Weddings / Brand Stories",
  "contactDetailsLine2": "Seattle / Available Worldwide",
  "contact_position": "menu",
  "headerNavigation": "main-menu",
  "center_nav": false,
  "ctaButtonLink": {
    "href": "contact.html",
    "text": "Check Availability",
    "target": "_self"
  },
  "ctaButtonStyle": "secondary",
  "full_width": false,
  "sticky": true,
  "transparent_on_hero": false,
  "color_scheme": "highlight-secondary"
}
```

**Header differentiation:** A contained, sticky, dark editorial header with contact details in the menu bar rather than beside the logo. It feels more like a portfolio studio than a service business, and it differs clearly from the centered transparent header used by `hue-and-co`.

---

## Footer Configuration

```json
{
  "copyright": "(c) 2026 Framelight Photography. All rights reserved.",
  "color_scheme": "highlight-primary"
}
```

**Blocks:**

| # | Type | Settings |
|---|------|----------|
| 1 | `logo_text` | `logo_text`: "Framelight", `text`: "<p>Editorial photography for weddings, portraits, and brand stories that feel lived-in and cinematic.</p>" |
| 2 | `text_block` | `title`: "Studio", `text`: "<p>1410 Western Ave, Studio 5<br>Seattle, WA 98101<br><br>hello@framelightphoto.com</p>" |
| 3 | `menu_block` | `title`: "Explore", `menu`: "footer-menu" |
| 4 | `social_block` | `title`: "Follow" |

---

## Pages

### Home (`index.json`) - 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Intro Hero | `rich-text` | `highlight-primary` | Left-aligned, wide content width, `top_spacing: none`, `bottom_spacing: none`. Muted uppercase intro line, 6xl headline, lg supporting copy, dual CTA buttons to portfolio and contact. |
| 2 | Hero Photograph | `image` | N/A | Full-bleed image directly under the hero text. `fullwidth: true`, `top_spacing: none`. Creates an editorial headline + image stack. |
| 3 | Specialties | `sliding-panels` | `standard-secondary` | Left-aligned heading, 4 panels for Weddings, Brand Campaigns, Editorials, and Portraits. Every panel includes a CTA to `services.html`. |
| 4 | Client Spotlight | `testimonial-hero` | `highlight-secondary` | Large client quote with portrait on the left. Quiet-authority social proof section between services and work. |
| 5 | Selected Work | `masonry-gallery` | `standard-primary` | Left-aligned heading, 4 columns, small gap, 8 captioned items mixing weddings, portraits, and brand projects. A lighter, browsable recipe rather than an image-only wall. |

### Services (`services.json`) - 4 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Page Intro | `split-content` | `standard-secondary` | `left-heavy`, `top_spacing: none`. Left column holds eyebrow-style text and a 6xl heading; right column explains the experience, includes a feature list, and CTA buttons. |
| 2 | Signature Packages | `pricing` | `standard-primary` | Left-aligned heading. 3 plans: Portrait Sessions, Brand Content Days, Wedding Weekends. Brand Content Days is featured. Pricing uses "Starting at" wording instead of monthly billing. |
| 3 | Behind the Camera | `video-embed` | `highlight-primary` | Left-aligned heading and description with a 21:9 cinematic reel. This is the behind-the-scenes proof point for the photographer preset. |
| 4 | Custom Coverage CTA | `rich-text` | `highlight-secondary` | Narrow centered text block with a short note about custom briefs, travel, and commissions plus a primary booking CTA. Not an action bar. |

### Portfolio (`portfolio.json`) - 3 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Portfolio Wall | `masonry-gallery` | `standard-primary` | First widget on the page, `top_spacing: none`, left-aligned heading, 4 columns, small gap, 10 image-focused items. Denser than the homepage gallery. |
| 2 | Cinematic Divider | `image` | N/A | Full-bleed wide photograph used as a visual pause between the gallery wall and the inquiry CTA. `fullwidth: true`, `top_spacing: none`, `bottom_spacing: none`. |
| 3 | Inquiry Prompt | `rich-text` | `standard-secondary` | Centered narrow content with a 3xl heading and a single primary CTA to `contact.html`. |

### About (`about.json`) - 3 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | On-Set Film | `video-embed` | `standard-secondary` | First widget on the page, `top_spacing: none`, left-aligned heading and description. This opener makes the About page feel personal and process-led instead of text-heavy. |
| 2 | Story & Approach | `split-content` | `standard-primary` | `left-heavy` with `sticky_column: left`. Left column carries the section label and headline; right column holds the story, experience notes, and a feature list about Framelight's working style. |
| 3 | Studio Portrait | `image` | N/A | Contained editorial portrait or studio still. Not full width - this keeps the page intimate and personal. |

### Contact (`contact.json`) - 3 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Contact Intro | `rich-text` | `standard-secondary` | Left-aligned, wide content width, `top_spacing: none`. Uses a muted uppercase intro line, a 5xl heading, supporting text, and a primary inquiry CTA. |
| 2 | Studio Location | `map` | `standard-primary` | Left-aligned heading, left sidebar, medium height. Sidebar holds a Studio info card and a Travel / Availability info card. |
| 3 | Booking FAQ | `accordion` | `standard-secondary` | Left-aligned heading, `style: connected`, `allow_multiple: true`, sidebar on the right. Includes 4 FAQ items plus an `info` sidebar block with response time and planning notes. This satisfies the "use the accordion sidebar" requirement. |

---

## Menus

### main-menu.json

| Label | URL |
|-------|-----|
| Services | services.html |
| Portfolio | portfolio.html |
| About | about.html |
| Contact | contact.html |

### footer-menu.json

| Label | URL |
|-------|-----|
| Home | index.html |
| Services | services.html |
| Portfolio | portfolio.html |
| About | about.html |
| Contact | contact.html |

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `rich-text` | 4 |
| `image` | 4 |
| `sliding-panels` | 1 |
| `testimonial-hero` | 1 |
| `masonry-gallery` | 2 |
| `split-content` | 2 |
| `pricing` | 1 |
| `video-embed` | 2 |
| `map` | 1 |
| `accordion` | 1 |

**Total:** 19 widget instances, **10 unique widget types**.

Underused / priority widgets used:
- `masonry-gallery`
- `video-embed`
- `testimonial-hero`
- `image`
- `pricing`

---

## Page Opening Widget Diversity

| Page | First Widget | Why it works |
|------|-------------|--------------|
| Home | `rich-text` | Editorial statement first, then the full-bleed image lands immediately after |
| Services | `split-content` | Service positioning needs explanation, not a generic banner |
| Portfolio | `masonry-gallery` | The portfolio page should begin with the work itself |
| About | `video-embed` | A behind-the-scenes opener makes the story feel human and immediate |
| Contact | `rich-text` | Clean inquiry intro before practical details below |

---

## Header Differentiation Notes

Framelight is defined by this combination:
- Sticky contained header (`full_width: false`) instead of an edge-to-edge bar
- Contact details moved into the menu area instead of beside the logo
- Dark `highlight-secondary` header with a restrained secondary CTA
- A more editorial studio feel than the nearby creative preset `hue-and-co`
