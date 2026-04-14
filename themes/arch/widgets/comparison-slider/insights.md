# Comparison Slider Widget — Insights

## Description

Interactive before/after image slider that lets visitors drag a handle to reveal the difference between two states, available in horizontal or vertical orientation.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (blank by default) | Small label above the headline; adds context like "Our Work" or "Results" |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | Any text (default: "See the Transformation") | Main headline above the slider |
| `description` | Any text (blank by default) | Supporting paragraph below the headline |
| `heading_alignment` | `start`, `center` | Controls whether the eyebrow/title/description block is centered or left-aligned |
| `before_image` | Image reference | The image shown on the left (horizontal) or bottom (vertical) side |
| `after_image` | Image reference | The image shown on the right (horizontal) or top (vertical) side |
| `before_label` | Any text (default: "Before") | Overlay badge on the before side of the slider |
| `after_label` | Any text (default: "After") | Overlay badge on the after side of the slider |
| `content_width` | `wide` (default), `fullwidth` | Controls the max-width of the slider container. `wide` keeps it within the standard content width; `fullwidth` stretches it edge-to-edge |
| `orientation` | `horizontal`, `vertical` | Horizontal splits left/right (16:9 aspect). Vertical splits top/bottom (9:16 aspect, narrower max-width) |
| `initial_position` | 0 -- 100 % (step 5, default 50) | Where the divider sits on load; 0 = all "before" visible, 100 = all "after" visible |
| `show_labels` | true / false (default true) | Toggles the floating Before/After badges inside the image |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Background and container treatment; non-standard schemes add padded container and swap background color |
| `top_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | `auto` (default), `small`, `none` | Same as above for the bottom edge |

---

## Available Blocks

This widget has **no blocks**. All content is configured through top-level settings only. There is a single before/after pair per widget instance.

---

## Layout Recipes

### 1. Classic Before/After Portfolio Piece

| Parameter | Value |
|---|---|
| `orientation` | horizontal |
| `heading_alignment` | center |
| `initial_position` | 50 |
| `show_labels` | true |
| `color_scheme` | standard-primary |
| `eyebrow` | Our Work |
| `title` | See the Transformation |

**Good for:** Showcasing a single flagship project front and center.

---

### 2. Product Restoration Showcase

| Parameter | Value |
|---|---|
| `orientation` | horizontal |
| `heading_alignment` | start |
| `initial_position` | 25 |
| `show_labels` | true |
| `before_label` | Damaged |
| `after_label` | Restored |
| `color_scheme` | highlight-primary |

**Good for:** Drawing the eye to the "after" result by starting the slider mostly on the before side, so the dramatic improvement is the first thing visitors notice.

---

### 3. Vertical Skincare / Cosmetic Result

| Parameter | Value |
|---|---|
| `orientation` | vertical |
| `heading_alignment` | center |
| `initial_position` | 50 |
| `show_labels` | true |
| `before_label` | Day 1 |
| `after_label` | Week 8 |
| `color_scheme` | standard-secondary |
| `eyebrow` | Real Results |

**Good for:** Portrait-oriented photos where a top-to-bottom reveal feels natural, such as face or body shots.

---

### 4. Seasonal Curb Appeal

| Parameter | Value |
|---|---|
| `orientation` | horizontal |
| `heading_alignment` | center |
| `initial_position` | 70 |
| `show_labels` | true |
| `before_label` | Winter |
| `after_label` | Summer |
| `color_scheme` | standard-primary |
| `title` | Year-Round Curb Appeal |
| `description` | Drag to see the difference a full-service landscape plan makes. |

**Good for:** Showing the same property across seasons to emphasize ongoing maintenance value. Starting at 70 % lets the "summer" side dominate on load.

---

### 5. Clean vs. Dirty — No-Headline Impact

| Parameter | Value |
|---|---|
| `orientation` | horizontal |
| `heading_alignment` | center |
| `initial_position` | 50 |
| `show_labels` | true |
| `before_label` | Before Cleaning |
| `after_label` | After Cleaning |
| `color_scheme` | highlight-secondary |
| `title` | *(leave blank)* |
| `top_spacing` | none |
| `bottom_spacing` | none |

**Good for:** A full-bleed visual break between text-heavy sections. Removing the headline and spacing lets the image speak for itself.

---

### 6. Interior Design Room Makeover

| Parameter | Value |
|---|---|
| `orientation` | horizontal |
| `heading_alignment` | start |
| `initial_position` | 40 |
| `show_labels` | true |
| `before_label` | Original |
| `after_label` | Redesigned |
| `color_scheme` | standard-secondary |
| `eyebrow` | Case Study |
| `title` | Living Room Reimagined |
| `description` | A full redesign completed in under three weeks. |

**Good for:** Telling a mini story with eyebrow, title, and description that gives context before the visitor interacts with the slider.

---

### 7. Dental / Smile Makeover

| Parameter | Value |
|---|---|
| `orientation` | horizontal |
| `heading_alignment` | center |
| `initial_position` | 40 |
| `show_labels` | true |
| `before_label` | Before Treatment |
| `after_label` | Your New Smile |
| `color_scheme` | standard-secondary |
| `eyebrow` | Patient Results |
| `title` | Smile Transformations |
| `content_width` | wide |

**Good for:** Showing treatment outcomes where the result speaks louder than any copy. Starting at 40% lets the "after" side dominate on load.

---

## Differentiation Tips

1. **Relabel the badges.** "Before/After" is the default but often too generic. Labels like "January / June", "Stock / Custom", or "Standard / Premium" tell a story and make the widget feel purposeful rather than templated.

2. **Bias the starting position.** Setting `initial_position` to 20--30 % shows mostly the "before" state, prompting curiosity. Setting it to 70--80 % leads with the impressive result. A 50/50 split is safe but forgettable.

3. **Use vertical orientation for portraits.** Faces, full-body shots, and tall product photos (bottles, doors, pillars) look awkward squished into a 16:9 frame. Switching to vertical gives them the 9:16 space they need and visually breaks up a page full of landscape sections.

4. **Strip the header for visual punch.** When the slider sits between two content-heavy sections, leaving the title, eyebrow, and description blank creates a breathing space that draws attention purely through interaction.

5. **Pair color schemes with intent.** Use `highlight-primary` or `highlight-secondary` when the slider is the hero of the page (services page, case study). Use `standard-primary` when it is one proof point among many, so it does not compete with surrounding sections.

6. **Match spacing to neighbors.** Set `top_spacing` or `bottom_spacing` to `none` when the widget sits directly above or below another section with its own colored background, avoiding a double-gap that breaks visual flow.

7. **Shoot photos from the same angle.** The widget works best when both images share identical framing and lighting. Even a slight shift in camera position will create a jarring jump at the divider line and undermine credibility.
