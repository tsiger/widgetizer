# Rich Text Widget

Flexible text content section that stacks headings, body copy, and call-to-action buttons in a single vertically-flowing column with alignment, width, and color scheme control.

## Settings levers

| Setting | Values | Visual effect |
|---|---|---|
| text_alignment | `start` (default), `center`, `end` | Aligns the entire content column left, center, or right within the section |
| content_width | `narrow`, `medium` (default), `wide`, `fullwidth` | Controls the max-width of the text column; narrow creates a focused reading lane, fullwidth spans the entire container |
| color_scheme | `standard` (default), `standard-accent`, `highlight`, `highlight-accent` | Swaps background and text colors; non-standard schemes add padded container backgrounds via `--widget-bg-color` |
| top_spacing | `auto` (default), `none` | Removes the top padding/margin when set to none; useful for stacking sections edge-to-edge |
| bottom_spacing | `auto` (default), `none` | Removes the bottom padding/margin when set to none; pairs with top_spacing for seamless color-band transitions |

## Available blocks

| Block | Key settings | Notes |
|---|---|---|
| heading | `text` (plain string), `size` (lg through 9xl, default 2xl) | Renders as `<h1>` when the widget is first on the page (index 1), otherwise `<h2>`; auto-escaped, no HTML allowed |
| text | `text` (richtext/HTML), `size` (sm, base, lg), `uppercase` (bool), `muted` (bool) | Output uses `| raw` so DOMPurify-sanitized HTML is rendered; muted reduces opacity, uppercase transforms casing |
| button | `link` + `link_2` (text, href, target), `style` / `style_2` (primary, secondary), `size` (small, medium, large, xlarge) | Supports up to two side-by-side buttons; either link can be left blank to show a single CTA; size applies to both buttons equally |

## Layout recipes

**1. "Bold statement hero" (homepage above the fold)**
Settings: text_alignment `center`, content_width `medium`, color_scheme `highlight`.
Blocks: heading (size 5xl or 6xl) + text (size lg) + button (primary "Get Started" + secondary "Learn More", size large).
Good for: making a strong first impression with a concise value proposition.
Industries: SaaS landing pages, creative agencies, tech startups.

**2. "About us narrative" (about page or mid-page story section)**
Settings: text_alignment `start`, content_width `narrow`, color_scheme `standard`.
Blocks: heading (size 2xl) + text (size base, muted off) + text (size base, muted on for a secondary paragraph).
Good for: longer readable prose where a narrow measure improves line length and readability.
Industries: law firms, consulting practices, nonprofits, architecture studios.

**3. "Announcement banner" (promotions, seasonal notices)**
Settings: text_alignment `center`, content_width `wide`, color_scheme `highlight-accent`, top_spacing `none`, bottom_spacing `none`.
Blocks: heading (size xl) + text (size sm, uppercase on) + button (primary, size small).
Good for: a compact, eye-catching color band that interrupts the page flow to highlight a time-sensitive offer.
Industries: retail shops, restaurants, event venues, salons.

**4. "Policy / legal text" (terms, privacy, refund pages)**
Settings: text_alignment `start`, content_width `medium`, color_scheme `standard`.
Blocks: heading (size 2xl) + multiple text blocks (size base, muted off) stacked sequentially.
Good for: long-form structured content that needs clear hierarchy without visual distraction.
Industries: e-commerce, healthcare clinics, financial advisors, any business with compliance pages.

**5. "Centered mission statement" (nonprofit or brand manifesto)**
Settings: text_alignment `center`, content_width `narrow`, color_scheme `standard-accent`.
Blocks: heading (size 3xl) + text (size lg, muted on).
Good for: a single impactful sentence or short paragraph that communicates purpose; the accent background adds subtle visual separation.
Industries: nonprofits, churches, environmental orgs, community foundations.

**6. "CTA strip" (conversion section between content blocks)**
Settings: text_alignment `center`, content_width `medium`, color_scheme `highlight`, top_spacing `none`, bottom_spacing `none`.
Blocks: heading (size xl) + button (primary, size xlarge).
Good for: a punchy call-to-action that sits between two other sections and drives clicks without paragraph text.
Industries: gyms, online courses, subscription boxes, freelance portfolios.

**7. "Feature explainer intro" (top of a features or services page)**
Settings: text_alignment `start`, content_width `wide`, color_scheme `standard`.
Blocks: heading (size 3xl) + text (size lg) + button (secondary "View All Services", size medium).
Good for: setting context before a grid of feature cards or service tiles below; the wide width gives breathing room alongside sidebars.
Industries: IT services, marketing agencies, home improvement contractors, dental practices.

## Differentiation tips

- **Stack multiple text blocks with alternating muted/normal** to create visual rhythm without adding extra widgets. A muted intro line above a normal-weight paragraph mimics a subtitle pattern cheaply.
- **Pair highlight-accent with no spacing** on both top and bottom to create a full-bleed color band. Follow it immediately with another rich-text widget using standard scheme and no top spacing for a sharp color transition.
- **Use narrow width + center alignment** sparingly as a design signature. It creates a "pull quote" feel that stands out from wider sections above and below.
- **Combine a large heading (5xl+) with small uppercase muted text** above it (place the text block first in block order) to create a super/eyebrow + headline pattern without needing a separate widget.
- **Reserve the primary button style for one CTA per page** and use secondary everywhere else. When both button slots are used, put the main action in link (primary) and the softer alternative in link_2 (secondary) to create a clear visual hierarchy.
- **Use the heading block for SEO-critical text** since it renders as an actual h1/h2 element, and keep decorative or secondary headings inside the richtext block using HTML heading tags where semantic weight matters less.
