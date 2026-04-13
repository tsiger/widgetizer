# Image Callout Widget — Insights

A split-layout section that overlaps a large image with a bordered content card, designed for high-impact storytelling moments that pair a strong visual with a focused message and call to action.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `image` | Any uploaded image | The hero-sized photo or illustration that fills the image half; sets the emotional tone of the entire section |
| `image_position` | `start` (default), `end` | Controls whether the image sits on the left with content overlapping from the right, or vice versa. Alternating position between consecutive image-callout widgets creates a zigzag rhythm down the page |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | `standard-primary` keeps a transparent outer wrapper (content blends with page background). The other three add a padded, colored container behind the entire widget, making it read as a distinct band on the page |
| `top_spacing` | `auto` (default), `none` | `none` removes top padding so the widget butts directly against the section above — useful when stacking two image-callouts or following a full-width hero |
| `bottom_spacing` | `auto` (default), `none` | Same behaviour for bottom edge; set both to `none` on consecutive callouts for a seamless editorial scroll |

---

## Available Blocks

Blocks are placed inside the overlapping content card and rendered in the order they appear. Mix and match freely.

| Block Type | Key Settings | Notes |
|---|---|---|
| **heading** | `text`, `size` (lg through 9xl, default 2xl) | Renders as `<h1>` when the widget is the first on the page, `<h2>` otherwise. Use 2xl-3xl for most cases; reserve 4xl+ for hero-level callouts |
| **text** | `text` (richtext), `size` (sm / base / lg), `uppercase`, `muted` | Versatile block. A small + muted text block above the heading works as a kicker/eyebrow label. A base-size block below the heading serves as the supporting paragraph |
| **features** | `features` (one per line, prefix `+` for check icon, `-` for x icon) | Bullet list with icons. Great for summarizing benefits, included items, or comparison points. Lines without a prefix render as plain items |
| **button** | `link` + optional `link_2`, `style` (primary / secondary) per link, `size` (small / medium / large / xlarge) | Supports one or two side-by-side buttons. Pair a primary CTA with a secondary "Learn More" for a classic dual-action pattern |

---

## Layout Recipes

### 1. Service Spotlight

**Blocks:** kicker text (sm, muted) + heading (2xl) + paragraph text (base) + button (primary, medium)
**Settings:** image_position `left`, color_scheme `standard-primary`
**Good for:** Introducing a single core service with a compelling photo — e.g., a plumber at work, a finished kitchen remodel, a team in action.
**Industries:** Home services, trades, cleaning companies, landscaping.

### 2. Before/After Feature Comparison

**Blocks:** heading (2xl) + features list (mix of `+` and `-` prefixed lines) + button (secondary, medium)
**Settings:** image_position `right`, color_scheme `highlight-primary`
**Good for:** Showing what's included vs. what competitors lack, or comparing a basic vs. premium plan. The check/x icons make the comparison scannable at a glance.
**Industries:** SaaS, fitness studios, managed IT services, subscription boxes.

### 3. Zigzag Story Pair (use two widgets)

**Widget A:** image_position `left`, color_scheme `standard-primary`, top/bottom spacing `auto`
**Widget B:** image_position `right`, color_scheme `standard-primary`, top_spacing `none`
**Blocks (each):** kicker text + heading (2xl) + paragraph text + button
**Good for:** An About page that walks visitors through the company story in two beats — origin on the left, mission on the right — creating visual rhythm without repetition.
**Industries:** Restaurants, architecture firms, law offices, creative agencies.

### 4. Promotional Banner

**Blocks:** heading (3xl) + paragraph text (lg) + button (primary, large)
**Settings:** image_position `left`, color_scheme `highlight-secondary`
**Good for:** A seasonal promotion, grand opening announcement, or limited-time offer. The accent background and large button size create urgency. Use a vibrant, on-brand photo.
**Industries:** Retail shops, salons, dental practices, gyms running a sign-up deal.

### 5. Credibility Builder

**Blocks:** kicker text ("Why Choose Us", sm, muted) + heading (2xl) + features list (all `+` prefixed) + button (secondary, medium)
**Settings:** image_position `right`, color_scheme `standard-secondary`
**Good for:** A trust section on a homepage or landing page. The features list replaces a paragraph with concrete proof points (certifications, guarantees, years of experience).
**Industries:** Accounting firms, insurance agencies, auto repair shops, medical clinics.

### 6. Portfolio / Case Study Teaser

**Blocks:** kicker text ("Recent Project", sm, muted, uppercase) + heading (3xl) + paragraph text (base) + button pair (primary "View Project" + secondary "All Work")
**Settings:** image_position `left`, color_scheme `standard-primary`
**Good for:** Showcasing a single standout project with a hero photo, short description, and dual navigation — one link to the case study, another to the full portfolio.
**Industries:** Interior designers, photographers, web agencies, contractors.

### 7. Team / Founder Introduction

**Blocks:** heading (2xl) + paragraph text (base) + button (secondary, small, "Meet the Team")
**Settings:** image_position `right`, color_scheme `standard-primary`
**Good for:** A personal, human-centered section on an About or homepage. Use a candid team photo or founder portrait. Keep the copy warm and brief.
**Industries:** Family-owned businesses, boutique consultancies, therapy practices, real estate agents.

---

## Differentiation Tips

- **Overlap is the signature.** On desktop the content card deliberately overlaps the image by several columns. This is what separates Image Callout from a generic two-column image+text widget. Lean into it by choosing images with visual weight on the non-overlapped side so the card doesn't obscure the focal point.
- **Kicker + heading + paragraph is the power stack.** The default blocks demonstrate this pattern for a reason: a small muted text block above the heading acts as a category label or eyebrow, giving the heading context before the visitor even reads it.
- **Features block replaces bullet paragraphs.** Whenever you are tempted to write a paragraph that is really just a list of benefits, switch to a features block instead. The check icons add visual credibility and the list is far easier to scan on mobile.
- **Dual buttons earn their space here.** Because the content card has generous padding and visual weight, it can comfortably hold two side-by-side buttons without feeling cramped. Use this for divergent user intents (e.g., "Book Now" primary + "See Pricing" secondary).
- **Alternate image position to break monotony.** If you use more than one image-callout on a page, flip `image_position` between them. The zigzag creates a natural reading rhythm and prevents the layout from feeling like a repeating template.
- **Color scheme controls prominence.** Use `standard-primary` when the callout lives among other colored sections and needs to breathe. Switch to `highlight-primary` or an accent variant when the callout is the single most important conversion moment on the page and needs a background band to visually separate it.
- **Collapse spacing for editorial flow.** Setting top or bottom spacing to `none` between consecutive image-callouts (or between a hero and a callout) removes the gap and makes the page feel like a continuous narrative rather than a stack of independent sections.
