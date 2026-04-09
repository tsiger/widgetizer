# Numbered Cards Widget — Insights

## Description

Displays a sequence of numbered steps or phases as zero-padded cards (01, 02, 03 ...) with a title and rich-text description per step, ideal for communicating processes, workflows, and how-it-works sections.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | any text | Small label above the headline, useful for category tags like "How It Works" or "Our Approach" |
| `title` | any text (default "Our Process") | Main section headline; renders as `<h1>` when the widget is the first on the page, `<h2>` otherwise |
| `description` | any text | Subtitle paragraph below the headline for additional context |
| `heading_alignment` | `left` / `center` | Controls whether the eyebrow, title, and description align left or center; left is better for asymmetric layouts |
| `layout` | `grid` / `carousel` | Grid shows all cards at once; carousel adds prev/next navigation and reveals cards in a swipeable track |
| `columns_desktop` | 2 -- 5 (default 4) | Number of columns on desktop; fewer columns = wider cards with more breathing room |
| `card_layout` | `box` / `flat` | Box renders cards with a background fill and border (on accent/highlight schemes); flat removes the card container for a cleaner, minimal look |
| `alignment` | `start` / `center` | Aligns the number, title, and description inside each card to the left edge or center |
| `color_scheme` | `standard-primary` / `standard-secondary` / `highlight-primary` / `highlight-secondary` | Standard uses the default page background; accent adds a secondary fill to cards; highlight inverts the section background; highlight-secondary combines both |
| `top_spacing` | `auto` / `none` | Removes top padding so the widget can sit flush against the section above |
| `bottom_spacing` | `auto` / `none` | Removes bottom padding for flush stacking with the section below |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `step` | `title` (text), `description` (richtext) | Each step becomes one numbered card. The number is auto-generated from the block order (01, 02, 03 ...). Richtext description supports bold, links, and lists inside each card. Reorder blocks to change numbering. The widget ships with four default steps: Consultation, Planning, Execution, Delivery. |

---

## Layout Recipes

### 1. Four-Step Service Process

| Setting | Value |
|---------|-------|
| `heading_alignment` | `center` |
| `layout` | `grid` |
| `columns_desktop` | `4` |
| `card_layout` | `box` |
| `alignment` | `center` |
| `color_scheme` | `standard-secondary` |
| Blocks | 4 steps |

**Good for:** Explaining how you work with clients from inquiry to delivery. The center alignment and boxed cards give each step equal weight.
**Industries:** Agencies, consultancies, home services, law firms.

---

### 2. Three-Column Highlight Strip

| Setting | Value |
|---------|-------|
| `heading_alignment` | `center` |
| `layout` | `grid` |
| `columns_desktop` | `3` |
| `card_layout` | `flat` |
| `alignment` | `center` |
| `color_scheme` | `highlight-primary` |
| Blocks | 3 steps |

**Good for:** A bold, attention-grabbing band across the page that walks visitors through a simple 3-phase journey. The highlight background sets it apart from surrounding sections.
**Industries:** SaaS onboarding, fitness studios, event planners.

---

### 3. Five-Step Onboarding Timeline

| Setting | Value |
|---------|-------|
| `heading_alignment` | `left` |
| `layout` | `grid` |
| `columns_desktop` | `5` |
| `card_layout` | `flat` |
| `alignment` | `start` |
| `color_scheme` | `standard-primary` |
| Blocks | 5 steps |

**Good for:** Compact, left-aligned timeline for detailed onboarding or enrollment processes where each step is brief.
**Industries:** Schools, clinics, real estate brokerages, insurance agencies.

---

### 4. Two-Column Deep Dive

| Setting | Value |
|---------|-------|
| `heading_alignment` | `left` |
| `layout` | `grid` |
| `columns_desktop` | `2` |
| `card_layout` | `box` |
| `alignment` | `start` |
| `color_scheme` | `highlight-secondary` |
| Blocks | 4 steps |

**Good for:** When each step needs a longer description (paragraph or bulleted list inside the richtext). Two wide columns give the text room to breathe.
**Industries:** Construction, architecture, financial planning, legal services.

---

### 5. Carousel Walkthrough

| Setting | Value |
|---------|-------|
| `heading_alignment` | `center` |
| `layout` | `carousel` |
| `columns_desktop` | `3` |
| `card_layout` | `box` |
| `alignment` | `center` |
| `color_scheme` | `standard-secondary` |
| Blocks | 6+ steps |

**Good for:** Longer processes that would crowd the page as a grid. The carousel lets visitors swipe through at their own pace without overwhelming them.
**Industries:** Manufacturing, logistics, wedding venues, medical procedures.

---

### 6. Minimal Flat Steps

| Setting | Value |
|---------|-------|
| `heading_alignment` | `center` |
| `layout` | `grid` |
| `columns_desktop` | `4` |
| `card_layout` | `flat` |
| `alignment` | `start` |
| `color_scheme` | `standard-primary` |
| Blocks | 4 steps |

**Good for:** Understated "how it works" section that blends into the page without heavy card styling. The large numbers do the visual work on their own.
**Industries:** Design studios, photography, minimalist brands, cafes.

---

### 7. Accented Left-Aligned Trio

| Setting | Value |
|---------|-------|
| `heading_alignment` | `left` |
| `layout` | `grid` |
| `columns_desktop` | `3` |
| `card_layout` | `box` |
| `alignment` | `start` |
| `color_scheme` | `standard-secondary` |
| `top_spacing` | `none` |
| Blocks | 3 steps |

**Good for:** Stacking directly below a hero or CTA section (top spacing removed) with a left-aligned header that reads naturally alongside the cards.
**Industries:** Accounting firms, dental practices, auto repair shops.

---

## Differentiation Tips

- **Numbers are the hero.** The zero-padded numbers (01, 02 ...) are styled at the largest heading scale. Keep step titles short so the numbers stay dominant and scannable.
- **Flat vs. box is a bigger decision than it looks.** Box cards create visual separation and work well over highlight backgrounds. Flat cards feel editorial and let whitespace do the heavy lifting -- choose flat when the surrounding page already has strong structure.
- **Use the carousel only when you truly have many steps.** For 3-4 steps, grid is almost always better. Switch to carousel at 5+ steps or when you want to avoid visual overwhelm on mobile.
- **Pair color schemes with adjacent sections.** A `highlight-primary` numbered-cards widget sandwiched between two `standard-primary` sections creates a natural focal point. Avoid stacking two highlight sections back to back.
- **Richtext descriptions unlock more than plain text.** Because the description field supports rich text, you can embed short bulleted lists, bold key terms, or inline links inside each step -- useful for steps that need a bit more detail without a separate FAQ.
- **Heading alignment should match the page rhythm.** If the rest of the page uses left-aligned headers, keep `heading_alignment` on `left` for consistency. Reserve center alignment for standalone, symmetrical sections.
- **Two columns for depth, four or five for scanning.** If each step is a single sentence, go wide (4-5 cols). If steps contain a paragraph of explanation, drop to 2-3 columns so line lengths stay comfortable.
