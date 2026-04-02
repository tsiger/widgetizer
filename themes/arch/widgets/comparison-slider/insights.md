# Comparison Slider Widget — Insights

## Description

Interactive before/after image slider that lets visitors drag a handle to reveal the difference between two states, available in horizontal or vertical orientation.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (blank by default) | Small label above the headline; adds context like "Our Work" or "Results" |
| `title` | Any text (default: "See the Transformation") | Main headline above the slider |
| `description` | Any text (blank by default) | Supporting paragraph below the headline |
| `heading_alignment` | `left`, `center` | Controls whether the eyebrow/title/description block is centered or left-aligned |
| `before_image` | Image reference | The image shown on the left (horizontal) or bottom (vertical) side |
| `after_image` | Image reference | The image shown on the right (horizontal) or top (vertical) side |
| `before_label` | Any text (default: "Before") | Overlay badge on the before side of the slider |
| `after_label` | Any text (default: "After") | Overlay badge on the after side of the slider |
| `orientation` | `horizontal`, `vertical` | Horizontal splits left/right (16:9 aspect). Vertical splits top/bottom (9:16 aspect, narrower max-width) |
| `initial_position` | 0 -- 100 % (step 5, default 50) | Where the divider sits on load; 0 = all "before" visible, 100 = all "after" visible |
| `show_labels` | true / false (default true) | Toggles the floating Before/After badges inside the image |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Background and container treatment; non-standard schemes add padded container and swap background color |
| `top_spacing` | `auto`, `none` | Removes default top margin when set to none; useful for stacking sections flush |
| `bottom_spacing` | `auto`, `none` | Removes default bottom margin when set to none |

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
| `color_scheme` | standard |
| `eyebrow` | Our Work |
| `title` | See the Transformation |

**Good for:** Showcasing a single flagship project front and center.
**Industries:** Renovation contractors, painters, landscapers, pressure washing services.

---

### 2. Product Restoration Showcase

| Parameter | Value |
|---|---|
| `orientation` | horizontal |
| `heading_alignment` | left |
| `initial_position` | 25 |
| `show_labels` | true |
| `before_label` | Damaged |
| `after_label` | Restored |
| `color_scheme` | highlight |

**Good for:** Drawing the eye to the "after" result by starting the slider mostly on the before side, so the dramatic improvement is the first thing visitors notice.
**Industries:** Auto body shops, furniture restoration, electronics repair, art conservation.

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
| `color_scheme` | standard-accent |
| `eyebrow` | Real Results |

**Good for:** Portrait-oriented photos where a top-to-bottom reveal feels natural, such as face or body shots.
**Industries:** Med spas, dermatology clinics, hair salons, cosmetic dentistry.

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
| `color_scheme` | standard |
| `title` | Year-Round Curb Appeal |
| `description` | Drag to see the difference a full-service landscape plan makes. |

**Good for:** Showing the same property across seasons to emphasize ongoing maintenance value. Starting at 70 % lets the "summer" side dominate on load.
**Industries:** Landscaping companies, lawn care, property management, real estate staging.

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
| `color_scheme` | highlight-accent |
| `title` | *(leave blank)* |
| `top_spacing` | none |
| `bottom_spacing` | none |

**Good for:** A full-bleed visual break between text-heavy sections. Removing the headline and spacing lets the image speak for itself.
**Industries:** Pressure washing, carpet cleaning, commercial janitorial, pool services.

---

### 6. Interior Design Room Makeover

| Parameter | Value |
|---|---|
| `orientation` | horizontal |
| `heading_alignment` | left |
| `initial_position` | 40 |
| `show_labels` | true |
| `before_label` | Original |
| `after_label` | Redesigned |
| `color_scheme` | standard-accent |
| `eyebrow` | Case Study |
| `title` | Living Room Reimagined |
| `description` | A full redesign completed in under three weeks. |

**Good for:** Telling a mini story with eyebrow, title, and description that gives context before the visitor interacts with the slider.
**Industries:** Interior designers, home stagers, kitchen/bath remodelers, architects.

---

### 7. Technical / Engineering Comparison

| Parameter | Value |
|---|---|
| `orientation` | vertical |
| `heading_alignment` | left |
| `initial_position` | 50 |
| `show_labels` | true |
| `before_label` | v1.0 |
| `after_label` | v2.0 |
| `color_scheme` | highlight |
| `title` | Interface Evolution |

**Good for:** Comparing two versions of a UI, blueprint, or technical drawing where vertical orientation matches the natural scroll direction of the content.
**Industries:** SaaS products, app developers, engineering firms, 3D visualization studios.

---

## Differentiation Tips

1. **Relabel the badges.** "Before/After" is the default but often too generic. Labels like "January / June", "Stock / Custom", or "Standard / Premium" tell a story and make the widget feel purposeful rather than templated.

2. **Bias the starting position.** Setting `initial_position` to 20--30 % shows mostly the "before" state, prompting curiosity. Setting it to 70--80 % leads with the impressive result. A 50/50 split is safe but forgettable.

3. **Use vertical orientation for portraits.** Faces, full-body shots, and tall product photos (bottles, doors, pillars) look awkward squished into a 16:9 frame. Switching to vertical gives them the 9:16 space they need and visually breaks up a page full of landscape sections.

4. **Strip the header for visual punch.** When the slider sits between two content-heavy sections, leaving the title, eyebrow, and description blank creates a breathing space that draws attention purely through interaction.

5. **Pair color schemes with intent.** Use `highlight` or `highlight-accent` when the slider is the hero of the page (services page, case study). Use `standard` when it is one proof point among many, so it does not compete with surrounding sections.

6. **Match spacing to neighbors.** Set `top_spacing` or `bottom_spacing` to `none` when the widget sits directly above or below another section with its own colored background, avoiding a double-gap that breaks visual flow.

7. **Shoot photos from the same angle.** The widget works best when both images share identical framing and lighting. Even a slight shift in camera position will create a jarring jump at the divider line and undermine credibility.
