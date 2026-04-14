# Timeline Widget Insights

A sequential, numbered-step widget for presenting processes, histories, and roadmaps in vertical, horizontal, or centered alternating layouts.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text | Small label above the headline, adds a reveal-up animation step |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | Any text (default "Our Process") | Main section headline; renders as h1 when the widget is first on the page, h2 otherwise |
| `description` | Any text | Subtitle paragraph below the headline |
| `heading_alignment` | `start`, `center` (default) | Start-aligns the eyebrow/title/description block or keeps them centered |
| `layout` | `vertical` (default), `horizontal`, `centered` | Vertical: single-column list with a connecting line on the left. Horizontal: items in a row with a top connecting line (kicks in at 990px+). Centered: alternating left-right items split by a center line (990px+) |
| `color_scheme` | `standard-primary` (default), `standard-secondary`, `highlight-primary`, `highlight-secondary` | Standard uses no extra background; highlight variants swap background and add container padding |
| `top_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `item` | `date` (text, default "Week 1"), `duration` (text), `title` (text, default "Discovery"), `features` (textarea, newline-separated), `description` (richtext) | Each item renders a numbered accent-colored circle marker. `date` displays in accent color as a phase/date label. `duration` appears beside the date separated by a border. Features support `+` prefix for check icons and `-` prefix for X icons. All fields are optional; items collapse gracefully when fields are empty. |

---

## Layout Recipes

### 1. Agency Project Process

- **Layout:** `vertical` | **Heading alignment:** `center` | **Color scheme:** `standard-primary`
- **Blocks:** 4-5 items (Discovery, Design, Development, Testing, Launch)
- **Use date for:** Phase 1, Phase 2, etc. | **Use duration for:** Week ranges
- **Use features for:** Deliverables with `+` prefixes for check icons
- **Good for:** Web agencies, design studios, software consultancies

### 2. Company History / Milestones

- **Layout:** `centered` | **Heading alignment:** `center` | **Color scheme:** `highlight-primary`
- **Blocks:** 5-8 items spanning key years
- **Use date for:** Years (2015, 2018, 2021...) | **Leave duration empty**
- **Use description for:** Rich text with the story of each milestone
- **Leave features empty** to keep a narrative feel
- **Good for:** About pages, investor sections, anniversary campaigns

### 3. Service Onboarding Steps

- **Layout:** `horizontal` | **Heading alignment:** `center` | **Color scheme:** `standard-secondary`
- **Blocks:** 3-4 items (Book, Prepare, Execute, Follow-up)
- **Use date for:** Step 1, Step 2, etc. | **Leave duration empty**
- **Use features for:** Short bullet points of what the client does at each step
- **Good for:** Service pages that answer "how does it work?"

### 4. Seasonal Menu or Service Roadmap

- **Layout:** `vertical` | **Heading alignment:** `start` | **Color scheme:** `standard-primary`
- **Blocks:** 4-6 items for upcoming seasons or quarters
- **Use date for:** Spring, Summer, Q1, Q2, etc. | **Use duration for:** Month range
- **Use features for:** Planned offerings with `+` (confirmed) and `-` (removed/paused)
- **Use description for:** Brief context on each seasonal update
- **Good for:** Upcoming menu reveals, seasonal service changes, planned renovations

### 5. Event Schedule / Day-of Agenda

- **Layout:** `vertical` | **Heading alignment:** `start` | **Color scheme:** `highlight-secondary`
- **Blocks:** 5-8 items for time slots
- **Use date for:** Times (9:00 AM, 10:30 AM...) | **Use duration for:** Duration (45 min, 1 hr)
- **Use title for:** Session or activity name
- **Use description for:** Speaker name, location, or brief details
- **Leave features empty** unless listing sub-topics
- **Good for:** Conference pages, workshop schedules, wedding day timelines

### 6. Manufacturing / Order Fulfillment Pipeline

- **Layout:** `horizontal` | **Heading alignment:** `center` | **Color scheme:** `highlight-primary`
- **Blocks:** 3-4 items (Order Received, In Production, Quality Check, Shipped)
- **Use date for:** Step labels | **Use duration for:** Typical turnaround time
- **Use features for:** What happens at each stage with `+` prefixes
- **Good for:** "How we make it" or "Your order journey" sections

### 7. Educational Course Outline

- **Layout:** `centered` | **Heading alignment:** `center` | **Color scheme:** `standard-secondary`
- **Blocks:** 4-6 modules
- **Use date for:** Module 1, Module 2, etc. | **Use duration for:** Estimated hours
- **Use title for:** Module name
- **Use features for:** Learning objectives or topics covered
- **Use description for:** Brief module overview
- **Good for:** Course landing pages, bootcamp sites, workshop previews

---

## Differentiation Tips

- **Horizontal layout is best kept to 3-4 items.** More than four causes each column to become too narrow on most screens. For five or more steps, use vertical or centered instead.
- **Centered layout creates visual rhythm on long pages.** The alternating left-right pattern breaks monotony and works well between full-width hero or gallery widgets. It naturally draws the eye downward.
- **The features textarea is the secret weapon.** Most timeline widgets only offer a title and description. The newline-separated feature list with optional `+`/`-` icon prefixes lets you build scannable checklists inside each step without touching rich text.
- **Date and duration serve double duty.** They are free-text fields, not restricted to actual dates. Use them for phase labels, step numbers, cost tiers, difficulty levels, or any short metadata pair that helps visitors orient themselves.
- **Combine heading_alignment start with layout vertical for a documentation feel.** Start-aligned headings with a vertical timeline reads like a structured guide rather than a marketing section, which suits professional services and detail-oriented audiences.
- **Use color_scheme highlight-primary or highlight-secondary to visually separate the timeline from surrounding content.** This is especially effective when the timeline sits between two standard-background widgets and needs to stand out as a distinct narrative block.
- **Each marker auto-numbers sequentially.** You do not need to manually enter numbers anywhere; the numbered circles update automatically when items are reordered or added. This makes the widget low-maintenance for clients who edit their own sites.
