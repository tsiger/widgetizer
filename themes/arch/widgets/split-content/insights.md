# split-content — Widget Insights

Two-column freeform layout. Every block has a `position: left | right` setting, so content can be distributed freely between the two columns. This is the most compositionally flexible widget in the theme.

## Settings levers

| Setting | Values | Visual effect |
|---------|--------|---------------|
| `balance` | `left-heavy` (70/30), `equal` (50/50), `right-heavy` (30/70) | Controls column width ratio |
| `sticky_column` | `none`, `left`, `right` | Pins one column while the other scrolls — great when one side has a lot of content |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Background/text color palette |

## Available blocks (all have `position: left | right`)

| Block | Key settings | Notes |
|-------|-------------|-------|
| `heading` | `text`, `size` (lg..9xl) | Can place headings on either side |
| `text` | `text` (richtext), `size` (sm/base/lg), `uppercase`, `muted` | Body copy, can be muted for secondary info |
| `image` | `image`, `width` (5-100%) | Inline image within a column, width is % of column |
| `icon` | `icon`, `style` (plain/outline/filled), `size`, `shape` (sharp/rounded/circle) | Decorative or functional icon |
| `features` | `features` (newline-separated, `+` prefix = checkmark, `-` prefix = x) | Bulleted/checked list |
| `numbered-item` | `title`, `description`, `size`, `shape` | Auto-numbered items (counter increments per column) |
| `rating` | `rating` (3-5 stars) | Star rating display |
| `button` | `link`, `link_2`, `style`/`style_2`, `size` | Up to 2 buttons per block |

## Layout recipes

**1. "Headline left, explanation right" (classic intro)**
- Balance: `left-heavy`
- Left: heading (5xl-7xl) + button
- Right: text (base/lg) + features list
- Good for: Home page intro sections, about page openers
- Industries: Consultant, lawyer, accountant — authoritative headline with supporting details

**2. "Sticky sidebar + scrolling content"**
- Balance: `right-heavy`, sticky: `left`
- Left: heading (4xl) + text (sm, muted) — stays pinned
- Right: multiple numbered-items or feature blocks that scroll past
- Good for: Services overview, process explanation
- Industries: Plumber/electrician (service list), IT support (support tiers), wedding planner (planning phases)

**3. "Stats + narrative"**
- Balance: `equal`
- Left: rating block + heading + text (the story)
- Right: multiple numbered-items (the proof points)
- Good for: About page credibility section
- Industries: Personal trainer (achievements), dentist (credentials), real estate (track record)

**4. "Dual feature columns"**
- Balance: `equal`
- Left: icon + heading + features list
- Right: icon + heading + features list
- Good for: Comparing two service tiers, two specialties, two locations
- Industries: Spa (body vs. face treatments), vet (dogs vs. cats), auto repair (maintenance vs. repair)

**5. "Big image + call to action"**
- Balance: `right-heavy`
- Left: image (width: 100%)
- Right: heading + text + button
- Good for: Mid-page conversion nudge, portfolio teaser
- Industries: Photographer, tattoo studio, interior designer — show the work, invite the click

**6. "Numbered process + CTA"**
- Balance: `left-heavy`, sticky: `right`
- Left: 3-4 numbered-items (title + description)
- Right: heading ("Ready to start?") + text + button — pinned
- Good for: How-it-works sections that lead to a booking action
- Industries: Cleaning service, landscaping, pet grooming — simple step processes

**7. "Eyebrow + hero text" (editorial style)**
- Balance: `left-heavy`
- Left: text (sm, uppercase, muted — acts as eyebrow) + heading (7xl-9xl)
- Right: text (lg) + button
- Good for: Dramatic section openers, especially on Home or About pages
- Industries: Architecture firm, graphic designer — bold editorial feel

**8. "Icon-anchored explainer"**
- Balance: `equal`
- Left: icon (filled, lg, circle) + heading + text
- Right: icon (filled, lg, circle) + heading + text
- Variation: Use `left-heavy` with 3 blocks left, 1 summary block right
- Good for: "Why choose us" sections
- Industries: Daycare (safety + learning), hotel (comfort + location), tutoring (method + results)

## Differentiation tips

- **Don't default to `equal` balance everywhere.** The 70/30 splits create visual tension and feel more designed. Alternate between `left-heavy` and `right-heavy` across presets.
- **Sticky columns are underused.** Any preset with a long right column (3+ blocks) should consider pinning the left. This makes long content feel intentional rather than sprawling.
- **Mix block types within a column.** A column with icon + heading + text + button feels complete. A column with just a heading feels like a label. Both are valid — use the sparse side intentionally.
- **Numbered items auto-count per column.** If you put 3 numbered-items on the left, they'll be 1-2-3. If you split 2 left + 2 right, each side counts independently (1-2 | 1-2). Use this for parallel processes.
- **The `image` block is not the same as the `image-text` widget.** Here the image lives *inside* a column alongside other blocks. Use it for small accent images (logos, badges, product shots) not hero photography.
- **`rating` block works as social proof.** Place it above a heading on the left for a "4.9 stars / Trusted by thousands" pattern.
- **`text` with `muted` + `sm` makes great metadata.** Use it for dates, categories, fine print — especially paired with a bold heading above it.
