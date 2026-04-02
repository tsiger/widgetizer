# Image-Text Widget Insights

A side-by-side split layout that pairs a single image with a flexible stack of content blocks, supporting left/right image placement and independent color schemes for the text panel.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `image` | Any uploaded image | The hero visual occupying 50% width on desktop, full width on mobile |
| `image_position` | `left` (default), `right` | Swaps which side the image sits on; `right` reverses the flexbox direction |
| `text_position` | `flex-start`, `center` (default), `flex-end` | Vertically aligns the text column to the top, middle, or bottom of the image |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Background and text colors for the entire widget section |
| `content_color_scheme` | `none` (default), `standard`, `standard-accent`, `highlight`, `highlight-accent` | When set to anything other than `none`, gives the text column its own padded, rounded background panel. On desktop, the image and text panel stretch edge-to-edge with no gap and squared-off corners, creating a magazine-style card |
| `top_spacing` | `auto` (default), `none` | Removes the top margin so the widget can butt against the section above |
| `bottom_spacing` | `auto` (default), `none` | Removes the bottom margin so the widget can butt against the section below |

---

## Available Blocks

Blocks are stacked vertically inside the text column. Mix and order freely.

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| **heading** | `text`, `size` (lg through 9xl) | Renders as `<h1>` when the widget is the first on the page, `<h2>` otherwise. The main title of the section. |
| **text** | `text` (richtext), `size` (sm/base/lg), `uppercase`, `muted` | General paragraph or label. Use `muted` + `sm` + `uppercase` for eyebrow/kicker text above a heading. Richtext supports inline formatting. |
| **button** | `link` + `link_2`, `style`/`style_2` (primary/secondary), `size` (small-xlarge) | Supports one or two side-by-side CTAs. Pair a primary action with a secondary fallback. |
| **features** | `features` (newline-separated list) | Prefix lines with `+` for a check icon or `-` for an x icon. Plain lines get no icon. Great for quick benefit lists. |
| **icon** | `icon`, `style` (plain/outline/filled), `size` (sm-xl), `shape` (sharp/rounded/circle) | Decorative icon badge above the heading. Useful for branding a section with a visual anchor. |
| **image** | `image`, `width` (5-100%) | Inline image inside the text column, like a logo, badge, or certification mark. Independent of the main widget image. |
| **rating** | `rating` (3-5 stars) | Star rating display. Ideal for review snippets or trust signals. |
| **numbered-item** | `title`, `description`, `size` (small-xlarge), `shape` (sharp/rounded/circle) | Auto-incrementing numbered badge with title and description. Stack several to create a step-by-step process. |

---

## Layout Recipes

### 1. About-Us Story Block

| Setting | Value |
|---------|-------|
| `image_position` | `right` |
| `text_position` | `center` |
| `color_scheme` | `standard` |
| `content_color_scheme` | `none` |
| Blocks | text (muted, sm, uppercase) as eyebrow "Our Story" > heading (2xl) > text (base) > button (secondary, "Meet the Team") |

**Good for:** Founder story, company history, mission statement.
**Industries:** Restaurants, law firms, local service businesses, nonprofits.

---

### 2. Product Feature Highlight

| Setting | Value |
|---------|-------|
| `image_position` | `left` |
| `text_position` | `center` |
| `color_scheme` | `standard` |
| `content_color_scheme` | `none` |
| Blocks | icon (filled, md, circle) > heading (3xl) > text (base) > features (+ lines) > button (primary "Get Started" + secondary "Learn More") |

**Good for:** SaaS feature tour, product detail page sections, app landing pages.
**Industries:** Software, tech startups, digital agencies.

---

### 3. Trust-Building Testimonial Card

| Setting | Value |
|---------|-------|
| `image_position` | `left` |
| `text_position` | `center` |
| `color_scheme` | `highlight` |
| `content_color_scheme` | `highlight-accent` |
| Blocks | rating (5) > heading (xl) as pull-quote > text (base, muted) as attribution > image (width 15%) as client logo |

**Good for:** Featured review, case study teaser, customer spotlight.
**Industries:** E-commerce, SaaS, home services, real estate agents.

---

### 4. Step-by-Step Process Explainer

| Setting | Value |
|---------|-------|
| `image_position` | `right` |
| `text_position` | `flex-start` |
| `color_scheme` | `standard-accent` |
| `content_color_scheme` | `none` |
| Blocks | text (muted, sm, uppercase) "How It Works" > heading (2xl) > numbered-item x3 (medium, circle) > button (primary, "Book Now") |

**Good for:** Explaining a service workflow, onboarding steps, booking process.
**Industries:** Cleaning companies, dental offices, fitness studios, consultants.

---

### 5. Portfolio / Project Showcase

| Setting | Value |
|---------|-------|
| `image_position` | `left` |
| `text_position` | `flex-end` |
| `color_scheme` | `standard` |
| `content_color_scheme` | `standard-accent` |
| Blocks | text (sm, muted, uppercase) as category label > heading (2xl) > text (base) describing the project > button (secondary, "View Project") |

**Good for:** Architecture portfolio pieces, photography projects, interior design case studies.
**Industries:** Architects, photographers, interior designers, creative agencies.

---

### 6. Service Offering with Benefits

| Setting | Value |
|---------|-------|
| `image_position` | `right` |
| `text_position` | `center` |
| `color_scheme` | `highlight` |
| `content_color_scheme` | `none` |
| Blocks | icon (outline, lg, rounded) > heading (3xl) > text (lg) as value proposition > features (+ and - lines comparing included vs. not included) > button (primary, xlarge, "Get a Quote") |

**Good for:** Service page hero, pricing tier explanation, package comparison.
**Industries:** Marketing agencies, accounting firms, landscaping, HVAC.

---

### 7. Event or Class Promotion

| Setting | Value |
|---------|-------|
| `image_position` | `left` |
| `text_position` | `center` |
| `color_scheme` | `standard` |
| `content_color_scheme` | `highlight` |
| `top_spacing` | `none` |
| Blocks | heading (2xl) > text (base) with event details > features (+ lines for what's included) > button (primary "Register Now" + secondary "See Schedule") |

**Good for:** Workshop promo, class schedule teaser, seasonal event callout.
**Industries:** Yoga studios, cooking schools, coworking spaces, community centers.

---

## Differentiation Tips

- **Alternate image sides when stacking multiple image-text widgets.** Place the first with `image_position: left`, the next with `right`, and so on. This creates a zigzag rhythm that keeps long pages from feeling monotonous.

- **Use `content_color_scheme` for visual weight.** Setting it to a value other than `none` turns the text column into a distinct card panel. This is the widget's most unique visual mode -- on desktop the image and panel lock together edge-to-edge with no gap and no border-radius, producing a magazine-spread look that most split-layout widgets cannot replicate.

- **Combine `text_position: flex-start` with a tall image** to pin content to the top, leaving breathing room below. This works well when the image is a vertical portrait or a tall product shot.

- **Eyebrow + heading + body is a reliable content hierarchy.** Use a muted/uppercase/sm text block as the eyebrow, then a heading, then a base-size text block. This three-layer stack gives readers a scannable entry point before committing to the paragraph.

- **Numbered items replace the need for a separate "how it works" widget.** Three numbered-item blocks with circle badges and short descriptions communicate a process clearly without requiring a dedicated process or timeline widget.

- **Features block with `+`/`-` prefixes creates instant comparison.** Mixing check and x icons in a single features list is a fast way to show what's included versus what's not, useful for pricing tiers or plan differences without needing a full comparison table.

- **The inline image block is for logos and badges, not hero imagery.** Keep its width small (10-25%) for certification marks, partner logos, or award badges that add credibility without competing with the main image.

- **Collapse spacing to chain sections.** Set `bottom_spacing: none` on one image-text widget and `top_spacing: none` on the next to make them appear as a single continuous section, useful for before/after or multi-step narratives.
