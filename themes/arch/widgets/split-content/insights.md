# split-content — Widget Insights

Two-column freeform layout. Every block has a `position: left | right` setting, so content can be distributed freely between the two columns. This is the most compositionally flexible widget in the theme — a **two-column canvas** where either column can hold any combination of blocks, or be left intentionally empty.

**Core philosophy:** This widget is a layout composition tool, not a CTA section. Never use it as a call-to-action pattern (heading + text + button = "convert now"). Its power lies in creating asymmetric, editorial layouts that no other widget can produce. Think of it as a design primitive — minimal, smart, and endlessly combinable.

## Settings levers

| Setting | Values | Visual effect |
|---------|--------|---------------|
| `balance` | `left-heavy` (70/30), `equal` (default, 50/50), `right-heavy` (30/70) | Controls column width ratio. The asymmetric splits (`left-heavy`, `right-heavy`) create visual tension and feel more designed than `equal`. |
| `sticky_column` | `none` (default), `left`, `right` | Pins one column while the other scrolls — useful when one side has significantly more content than the other |
| `color_scheme` | `standard-primary` (default), `standard-secondary`, `highlight-primary`, `highlight-secondary` | Background/text color palette |
| `top_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | `auto` (default), `small`, `none` | Same as above for the bottom edge |

## Available blocks (all have `position: left | right`)

| Block | Key settings | Notes |
|-------|-------------|-------|
| `heading` | `text`, `size` (lg..9xl, default 5xl) | Can place headings on either side |
| `text` | `text` (richtext), `size` (sm/base/lg, default base), `uppercase`, `muted` | Body copy, can be muted for secondary info |
| `image` | `image`, `width` (5-100%, default 20) | Inline image within a column, width is % of column |
| `icon` | `icon`, `style` (plain/outline/filled, default plain), `size` (sm-xl, default md), `shape` (sharp/rounded/circle, default circle) | Decorative or functional icon |
| `features` | `features` (newline-separated, `+` prefix = checkmark, `-` prefix = x) | Bulleted/checked list |
| `numbered-item` | `title`, `description`, `size` (small-xlarge, default medium), `shape` (sharp/rounded/circle, default circle) | Auto-numbered items (counter increments per column) |
| `rating` | `rating` (3-5 stars, default 5) | Star rating display |
| `button` | `link`, `link_2`, `style`/`style_2` (primary/secondary), `size` (small-xlarge, default medium), `alignment` (start/center, default start) | Up to 2 buttons per block |

## Layout recipes

**1. Minimal image + text (sparse editorial)**
- Balance: `right-heavy`
- Left: _(empty)_
- Right: image (width 100%) + text (base)
- Good for: A deliberately minimal content section where a photo sits above a short paragraph in the narrow right column, leaving the left as white space. Feels gallery-like and unhurried.

**2. Two-column text (newspaper feel)**
- Balance: `left-heavy`
- Left: text (base or lg) — the main body
- Right: text (base) — continuation or secondary angle
- Good for: About pages, founder letters, long-form descriptions that benefit from a two-column reading format instead of a single wide paragraph. The 70/30 split gives the left column natural primacy.

**3. Mixed media columns (image + text on both sides)**
- Balance: `equal`
- Left: image (width 100%) + text (base)
- Right: heading (3xl) + image (width 100%)
- Good for: Sections where both columns carry visual weight — a photo with supporting copy on one side, a title with a different photo on the other. Creates a magazine spread feel.

**4. Zigzag image sequence (multi-instance rhythm)**
- Use 3 split-content widgets stacked with `top_spacing: none` and `bottom_spacing: none` between them:
  - 1st: `right-heavy` — image (width 100%) on left only
  - 2nd: `equal` — image (width 100%) on right only
  - 3rd: `left-heavy` — image (width 100%) on left only
- Good for: A portfolio or project gallery that feels hand-composed rather than grid-based. The alternating balance and empty columns create a dynamic visual rhythm no gallery widget can replicate.

**5. Large heading + body text (editorial opener)**
- Balance: `left-heavy`
- Left: text (sm, uppercase, muted — acts as eyebrow label) + heading (7xl or 8xl)
- Right: text (lg)
- Good for: Dramatic section openers on Home or About pages. The oversized heading dominates the left while the right column carries the readable explanation. No buttons — let the content breathe.

**6. Sticky sidebar + scrolling content**
- Balance: `right-heavy`, sticky: `left`
- Left: heading (4xl) + text (sm, muted) — stays pinned
- Right: multiple numbered-items or text blocks that scroll past
- Good for: Services overview, process explanation, or any section where one side has significantly more content. The pinned heading keeps context visible while visitors read through the details.

**7. Image with caption (gallery detail)**
- Balance: `equal`
- Left: image (width 100%)
- Right: heading (2xl) + text (sm, muted) as caption/description
- Good for: A single featured photo with an adjacent description — project detail, portfolio piece, or a highlighted space. More intentional than a plain image widget, less heavy than image-text.

**8. Dual feature columns (parallel comparison)**
- Balance: `equal`
- Left: icon + heading (2xl) + features list
- Right: icon + heading (2xl) + features list
- Good for: Comparing two service tiers, two specialties, or two locations side by side. Each column is a self-contained unit. The numbered-item counter increments independently per column, so parallel processes (1-2-3 | 1-2-3) work naturally.

## Differentiation tips

- **Never use split-content as a CTA section.** If the layout is "heading + paragraph + button," use image-text or image-callout instead. Split-content exists for flexible, editorial compositions that other widgets can't produce.
- **Empty columns are a feature, not a bug.** Leaving one column blank creates deliberate white space. A single image in a `right-heavy` layout with nothing on the left feels intentionally minimal, not broken.
- **Chain multiple instances for compositional rhythm.** Stacking 2-3 split-content widgets with `spacing: none` and alternating balance/image sides produces a zigzag flow that feels custom-designed. This is one of the widget's most powerful and unique uses.
- **Vary the balance aggressively.** Don't default to `equal` — the 70/30 splits create visual tension and asymmetry that feel more designed. Alternate between `left-heavy` and `right-heavy` across adjacent instances.
- **The image block at width 100% fills its column.** In a `right-heavy` layout, a 100%-width image on the left occupies 30% of the total section width — producing a small, intentional photo placement that no other widget offers at that scale.
- **Two-column text is underrated.** A simple left text + right text with `left-heavy` balance creates a newspaper-column reading experience. No images, no buttons, just content with a clear visual hierarchy between primary and secondary columns.
- **Sticky columns shine with uneven content.** If one side has 3+ blocks and the other has just a heading, pin the short side. This makes the long content feel intentional rather than sprawling.
- **`text` with `muted` + `sm` + `uppercase` makes great labels.** Use it for eyebrows, captions, metadata, or category markers — especially paired with a large heading below it.
- **Combine with a full-width image widget above.** Place a standalone image widget (full width, no spacing bottom) directly above a split-content widget (no spacing top) that has only a text block on the right. The result is a full-bleed photo with a minimal text caption offset below it — a layout pattern common in editorial and portfolio design that no single widget can produce alone. This pairing also works with the image on top and split-content carrying heading + text across both columns beneath it.
- **Think in sequences, not single instances.** Split-content's real power emerges when combined with itself or with other minimal widgets (image, rich-text, scrolling-text). A page built from 3-4 split-content instances with varied balance, interspersed with a full-width image or a scrolling-text divider, feels like a custom-designed editorial layout rather than a template.
