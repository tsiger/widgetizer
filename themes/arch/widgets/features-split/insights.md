# Features Split Widget

A two-column split layout that pairs a heading area (eyebrow, title, description) on one side with a stacked list of icon-led feature items on the other, separated by an optional vertical divider line.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text | Small label above the headline; leave blank to hide entirely |
| `title` | Any text | Main headline; renders as `h1` when widget is first on the page, `h2` otherwise |
| `description` | Any text | Supporting paragraph below the headline |
| `heading_alignment` | `left` / `center` | Controls whether the eyebrow-title-description block aligns left or centers within its column |
| `content_position` | `left` / `right` | Determines which column holds the heading block; the feature list takes the opposite side. On `right`, the divider border flips to the right edge of the list |
| `show_divider` | on / off | Toggles a thin vertical border on the feature-list side, adding a clean editorial separation between the two columns |
| `icon_style` | `plain` / `outline` / `filled` | Changes icon rendering: bare icon, outlined container, or solid-filled container |
| `icon_size` | `sm` / `md` / `lg` / `xl` | Scales the icon; `xl` default gives the icons visual weight as anchor points |
| `icon_shape` | `sharp` / `rounded` / `circle` | Container corner style when using outline or filled icon styles |
| `color_scheme` | `standard-primary` / `standard-secondary` / `highlight-primary` / `highlight-secondary` | Background and text treatment; non-standard schemes add section padding and a visible background color |
| `top_spacing` | `auto` / `none` | Removes top padding when `none`, useful for stacking sections tightly |
| `bottom_spacing` | `auto` / `none` | Removes bottom padding when `none` |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `feature` | `icon` (icon picker), `title` (plain text), `description` (rich text) | Each feature renders as a list item with the icon to the left and title + description stacked to the right. The heading level of the title auto-adjusts (`h3` normally, `h2` if the widget-level title is blank). Description supports rich text formatting (bold, links, lists). |

---

## Layout Recipes

### 1. Market Segments Overview

**Settings:** `heading_alignment: left`, `content_position: left`, `show_divider: true`, `icon_style: filled`, `icon_size: xl`, `icon_shape: circle`, `color_scheme: standard`
**Blocks:** 3 features (e.g., Individuals, Small Business, Enterprise)

**Good for:** Communicating that the business serves distinct customer types, each with tailored value.
**Industries:** B2B SaaS, consulting firms, insurance agencies, managed IT services.

---

### 2. Core Services Breakdown

**Settings:** `heading_alignment: center`, `content_position: left`, `show_divider: true`, `icon_style: outline`, `icon_size: lg`, `icon_shape: rounded`, `color_scheme: highlight`
**Blocks:** 4 features (e.g., Design, Development, Marketing, Support)

**Good for:** A services page where the heading side carries a strong value proposition and the list side enumerates what the business actually delivers.
**Industries:** Digital agencies, architecture studios, engineering consultancies, freelance professionals.

---

### 3. Why Choose Us (Differentiators)

**Settings:** `heading_alignment: left`, `content_position: right`, `show_divider: false`, `icon_style: plain`, `icon_size: md`, `icon_shape: sharp`, `color_scheme: standard-secondary`
**Blocks:** 3-4 features (e.g., 24/7 Support, No Contracts, Local Team, Certified Experts)

**Good for:** A compact trust-building section near the bottom of a homepage where the heading asks a question and the features answer it.
**Industries:** Home services (plumbing, HVAC, electrical), auto repair shops, cleaning companies, pest control.

---

### 4. Process Steps

**Settings:** `heading_alignment: left`, `content_position: left`, `show_divider: true`, `icon_style: filled`, `icon_size: md`, `icon_shape: sharp`, `color_scheme: standard`
**Blocks:** 3-5 features using numbered or sequential icons (e.g., clipboard, wrench, check-circle)

**Good for:** Explaining a linear workflow so the visitor knows what to expect after contacting the business. The vertical divider line reinforces the sequential nature.
**Industries:** Law firms, accounting practices, custom fabrication, home renovation contractors.

---

### 5. Location or Department Highlights

**Settings:** `heading_alignment: center`, `content_position: right`, `show_divider: true`, `icon_style: outline`, `icon_size: xl`, `icon_shape: circle`, `color_scheme: highlight-secondary`
**Blocks:** 3 features (e.g., Downtown Office, Westside Clinic, Mobile Unit)

**Good for:** Multi-location businesses that need to convey where they operate with a brief note about each location's specialties or hours.
**Industries:** Dental practices, veterinary clinics, fitness studios, real estate brokerages.

---

### 6. Product Tier Comparison (Lightweight)

**Settings:** `heading_alignment: left`, `content_position: left`, `show_divider: false`, `icon_style: filled`, `icon_size: lg`, `icon_shape: rounded`, `color_scheme: standard`
**Blocks:** 3 features (e.g., Starter, Professional, Premium) with brief descriptions of what each includes

**Good for:** A softer alternative to a full pricing table when the business wants to outline tiers without showing prices publicly.
**Industries:** SaaS products, subscription box services, membership-based gyms, co-working spaces.

---

### 7. Audience-Specific Value Props

**Settings:** `heading_alignment: center`, `content_position: left`, `show_divider: true`, `icon_style: plain`, `icon_size: lg`, `icon_shape: circle`, `color_scheme: highlight`
**Blocks:** 2-3 features (e.g., For Parents, For Teachers, For Administrators)

**Good for:** Quickly segmenting messaging when a single product serves multiple user groups with different pain points.
**Industries:** EdTech, childcare centers, non-profits, community organizations, healthcare platforms.

---

## Differentiation Tips

- **Flip the content position** to break visual monotony when stacking multiple sections. If the section above has a left-aligned image or heading, set `content_position: right` on features-split so the eye moves in a Z-pattern down the page.

- **Use the divider strategically.** Enable it when features represent a sequential process or distinct categories. Disable it when the features are loosely related benefits and you want a softer, less structured feel.

- **Pair with a highlight color scheme** to visually separate this section from adjacent standard-background widgets. This works especially well when the features-split section is the primary conversion argument on the page.

- **Keep block count between 3 and 5.** Two items look sparse in the vertical list; six or more creates a wall of text that undermines the split layout's readability advantage.

- **Leverage the eyebrow for context switching.** When the main title is broad (e.g., "How We Help"), the eyebrow can specify the audience or context (e.g., "For Retail Businesses") without requiring a separate widget per segment.

- **Choose icon style to match brand personality.** Plain icons feel minimal and modern, filled icons feel confident and corporate, outline icons feel approachable and lightweight. Match the choice to the overall site tone rather than varying it section by section.

- **Combine with spacing overrides** (`top_spacing: none` or `bottom_spacing: none`) when placing features-split directly below a hero or above a CTA banner to create a visually connected flow rather than disconnected blocks.
