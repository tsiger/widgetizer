# Image Widget Insights

A single responsive image with optional link wrapping, full-width bleed support, and reveal-fade entrance animation.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| **image** | Any uploaded image | The displayed photo or graphic. Falls back to a placeholder silhouette when empty. |
| **link** | URL + optional `_blank` target | Wraps the image in an anchor. On hover the image fades to 90 % opacity, signaling clickability. |
| **fullwidth** | `true` / `false` (default false) | **Off:** image is capped at `--container-max-width` with `border-radius: var(--radius-lg)` rounded corners, centered on the page. **On:** image bleeds edge-to-edge with no rounding and no max-width constraint. |
| **top_spacing** | `auto` (default) / `none` | `auto` uses the theme's standard section gap above the widget. `none` collapses it to zero -- useful for butting images directly against the section above. |
| **bottom_spacing** | `auto` (default) / `none` | Same as top_spacing but for the gap below the widget. |

---

## Available Blocks

None. This widget has no repeatable block slots -- it renders exactly one image per instance.

---

## Layout Recipes

### 1. Full-Bleed Hero Photograph

| Setting | Value |
|---------|-------|
| fullwidth | true |
| top_spacing | none |
| bottom_spacing | none |
| link | (empty) |

**Good for:** Landing pages that need an immersive first impression right below the header.
**Industries:** Hotels and resorts, architecture studios, event venues, real estate agencies.
**Tip:** Pair with a preceding "Hero" or "Banner" text widget and remove spacing on both so the photo feels continuous with the headline.

### 2. Contained Portfolio Showcase

| Setting | Value |
|---------|-------|
| fullwidth | false |
| top_spacing | auto |
| bottom_spacing | auto |
| link | (empty) |

**Good for:** Displaying a single standout project photo between text sections -- the rounded corners and centered max-width keep it feeling editorial rather than raw.
**Industries:** Photography studios, interior designers, landscaping companies, artisan bakeries.
**Tip:** Stack several of these between Richtext widgets to build a case-study page that reads like a magazine feature.

### 3. Clickable Promo Banner

| Setting | Value |
|---------|-------|
| fullwidth | true |
| top_spacing | auto |
| bottom_spacing | auto |
| link | `/specials` or external URL, target `_blank` for external |

**Good for:** Seasonal sale banners, event announcements, or sponsor graphics that need to link out.
**Industries:** Retail shops, restaurants (holiday menus), fitness studios (class sign-ups), auto detailers.
**Tip:** Design the image itself with a clear call-to-action baked in (e.g., "Book Now -- Spring Special"). The subtle hover opacity shift tells visitors it is clickable without needing a separate button.

### 4. Tight Image + Text Stack

| Setting | Value |
|---------|-------|
| fullwidth | false |
| top_spacing | none |
| bottom_spacing | none |
| link | (empty) |

**Good for:** Sandwiching a photo tightly between a heading widget above and a paragraph widget below, creating a compact content card feel within the page flow.
**Industries:** Coffee roasters (bean origin photos), salons (before/after), dog groomers, florists.
**Tip:** Removing both spacings lets the rounded image sit snugly against neighboring widgets -- visually groups the trio as one cohesive block.

### 5. Full-Bleed Section Divider

| Setting | Value |
|---------|-------|
| fullwidth | true |
| top_spacing | auto |
| bottom_spacing | auto |
| link | (empty) |

**Good for:** Breaking up long pages with a dramatic full-width photograph that acts as a visual breather between content sections.
**Industries:** Wineries, spas, coworking spaces, wedding planners.
**Tip:** Use a wide-aspect landscape image (at least 4:1 ratio) so it reads as a cinematic strip rather than a towering block. The standard auto spacing above and below keeps it from colliding with adjacent text.

### 6. Linked Logo or Partner Badge (Contained)

| Setting | Value |
|---------|-------|
| fullwidth | false |
| top_spacing | auto |
| bottom_spacing | auto |
| link | Partner or certification URL, target `_blank` |

**Good for:** Displaying a single certification badge, award logo, or partner emblem that links to the issuing organization.
**Industries:** Contractors (licensed/insured badges), dental offices (ADA member), organic farms (USDA certification), law firms (bar association).
**Tip:** The contained mode with rounded corners gives the badge a polished card-like presentation. For multiple logos, use a gallery or columns widget instead.

---

## Differentiation Tips

- **Full-width is the main creative lever.** Toggling it changes the entire personality of the widget -- from a polished, contained editorial image to an immersive edge-to-edge bleed. Decide which mode serves the page's rhythm before uploading the photo.
- **Spacing removal creates visual grouping.** Setting top or bottom spacing to `none` is how you fuse this widget with its neighbors. Use it intentionally to build compound sections (hero + photo, photo + caption) rather than leaving gaps.
- **The link wrapping is invisible until hover.** There is no button or underline -- just a 90 % opacity fade on hover. This means linked images work best when the image itself contains visual cues (text overlays, arrows, or obvious CTAs). Do not rely on the link alone to communicate interactivity.
- **Responsive srcset is automatic.** The widget generates multiple image sizes via the `{% image %}` tag with `srcset: true`. There is no manual sizing to configure -- the browser picks the best resolution. Full-width images use `100vw` sizing; contained images cap at `1420px`.
- **Reveal animation is built in.** Every image enters with a `reveal-fade` class. This is not configurable per-instance, but it means the widget always feels alive on scroll without extra setup.
- **No caption or overlay support.** If you need text on top of the image or a caption below it, pair this widget with a Richtext widget rather than trying to hack text into the image file. Keep the image widget focused on what it does well: one clean photograph.
