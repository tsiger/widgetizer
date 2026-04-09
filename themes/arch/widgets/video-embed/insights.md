# Video Embed Widget — Insights

Embed a single YouTube or Vimeo video with an optional headline section, configurable aspect ratio, and theme-aware color schemes.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (blank by default) | Small label above the headline; adds a reveal-up animation step |
| `title` | Any text (default: "Watch the Video") | Main heading above the video; renders as `<h1>` when the widget is first on the page, `<h2>` otherwise |
| `description` | Any text (blank by default) | Supporting paragraph below the title |
| `heading_alignment` | `center` (default), `left` | Controls whether the eyebrow/title/description block is centered or left-aligned |
| `video_url` | YouTube or Vimeo URL | Parsed into an embed iframe; invalid URLs show a placeholder message instead |
| `video_title` | Any text (default: "Video") | Sets the iframe `title` attribute for accessibility / screen readers |
| `aspect_ratio` | `16 / 9` (default), `4 / 3`, `21:9`, `1 / 1` | Changes the padding-based aspect box: 56.25%, 75%, 42.86%, or 100% respectively |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Swaps background/text color palette; non-standard schemes add container padding and set `--widget-bg-color` |
| `top_spacing` | `auto` (default), `none` | Removes the top section margin when set to `none`; useful for stacking widgets tightly |
| `bottom_spacing` | `auto` (default), `none` | Removes the bottom section margin when set to `none` |

---

## Available Blocks

This widget has **no inner blocks**. It is a single-video embed with a fixed header + iframe structure. All customization happens through the settings listed above.

| Block Type | Key Settings | Notes |
|---|---|---|
| _(none)_ | N/A | The widget renders one iframe. To show multiple videos, add multiple video-embed widget instances to the page. |

---

## Layout Recipes

### 1. Hero Demo Video

| Setting | Value |
|---|---|
| `eyebrow` | "See It In Action" |
| `title` | "How It Works" |
| `description` | One sentence summarizing the product |
| `heading_alignment` | `center` |
| `aspect_ratio` | `16 / 9` |
| `color_scheme` | `highlight-primary` |
| `top_spacing` | `none` |

**Good for:** Landing pages where the video is the primary conversion driver, placed directly below the hero banner.
**Industries:** SaaS, online courses, mobile apps.

---

### 2. Cinematic Showreel

| Setting | Value |
|---|---|
| `eyebrow` | _(blank)_ |
| `title` | _(blank)_ |
| `description` | _(blank)_ |
| `aspect_ratio` | `21:9` |
| `color_scheme` | `highlight-primary` |
| `top_spacing` | `none` |
| `bottom_spacing` | `none` |

**Good for:** Full-width, letterbox-style video that acts as a visual break between text-heavy sections. The ultra-wide ratio feels filmic and immersive.
**Industries:** Architecture, photography studios, restaurants, hotels.

---

### 3. About Us Story

| Setting | Value |
|---|---|
| `eyebrow` | "Our Story" |
| `title` | "Meet the Team" |
| `description` | Brief intro about the company culture or mission |
| `heading_alignment` | `left` |
| `aspect_ratio` | `16 / 9` |
| `color_scheme` | `standard-primary` |

**Good for:** About pages where a founder video or team introduction sits alongside other content sections. Left alignment keeps it conversational rather than ceremonial.
**Industries:** Professional services, agencies, local businesses, nonprofits.

---

### 4. Tutorial / How-To

| Setting | Value |
|---|---|
| `eyebrow` | "Step-by-Step Guide" |
| `title` | "Getting Started" |
| `description` | "Watch this 3-minute walkthrough to set up your account." |
| `heading_alignment` | `center` |
| `aspect_ratio` | `4 / 3` |
| `color_scheme` | `standard-secondary` |

**Good for:** Support or documentation pages. The 4:3 ratio suits screencast-style content where the extra vertical space shows more of the UI being demonstrated.
**Industries:** Software, education platforms, membership sites.

---

### 5. Social Proof Testimonial

| Setting | Value |
|---|---|
| `eyebrow` | "Customer Stories" |
| `title` | "Hear From Our Clients" |
| `description` | _(blank)_ |
| `heading_alignment` | `center` |
| `aspect_ratio` | `16 / 9` |
| `color_scheme` | `highlight-secondary` |

**Good for:** Homepage or dedicated testimonials page. The accent color scheme makes the section stand out as a trust-building block between feature descriptions.
**Industries:** Home services, fitness studios, real estate, dental/medical practices.

---

### 6. Square Social Clip

| Setting | Value |
|---|---|
| `eyebrow` | _(blank)_ |
| `title` | "Latest Update" |
| `description` | _(blank)_ |
| `heading_alignment` | `center` |
| `aspect_ratio` | `1 / 1` |
| `color_scheme` | `standard-primary` |

**Good for:** Embedding repurposed social-media-style clips (Instagram Reels exported to YouTube, behind-the-scenes shorts). The square ratio matches the social media feel and works well on narrow screens.
**Industries:** Retail shops, food trucks, salons, personal brands.

---

### 7. Event Recap / Promo

| Setting | Value |
|---|---|
| `eyebrow` | "Annual Gala 2026" |
| `title` | "Relive the Night" |
| `description` | "Highlights from our biggest fundraising event yet." |
| `heading_alignment` | `center` |
| `aspect_ratio` | `16 / 9` |
| `color_scheme` | `highlight-secondary` |
| `bottom_spacing` | `none` |

**Good for:** Event pages or blog posts where the video recap sits at the top, followed immediately by a gallery or details section with no gap.
**Industries:** Nonprofits, event venues, community organizations, schools.

---

## Differentiation Tips

- **Heading alignment matters more than you think.** Center-aligned headers feel polished and presentational (product demos, testimonials). Left-aligned headers feel editorial and approachable (blog posts, about pages). Pick based on tone, not habit.

- **Use the eyebrow to set context before the user reads the title.** An eyebrow like "Customer Stories" or "Step-by-Step Guide" primes expectations so the title itself can be shorter and punchier.

- **Strip the header entirely for visual-first sections.** Leave eyebrow, title, and description all blank to get a clean, full-width video block. This works well between text-heavy widgets where the video should breathe on its own.

- **Pair aspect ratio with content type, not screen size.** 21:9 for cinematic brand films, 4:3 for screencasts, 1:1 for social clips. Using 16:9 for everything wastes an easy way to signal content intent.

- **Collapse spacing to create grouped sections.** Set `bottom_spacing` to `none` on the video widget and `top_spacing` to `none` on the widget below it to visually tie them together (e.g., video + CTA, video + text summary).

- **Color schemes create section rhythm.** Alternating between `standard-primary` and `highlight-primary` as you scroll down a page prevents visual monotony. Reserve `highlight-secondary` for the single most important video on the page.

- **Always fill in `video_title`.** It is the only accessibility label on the iframe. "Video" tells a screen reader nothing. "2-Minute Product Demo" or "Chef Marco's Kitchen Tour" tells them everything.
