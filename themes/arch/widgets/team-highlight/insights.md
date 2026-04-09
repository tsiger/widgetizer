# Team Highlight Widget — Insights

A split-layout team section with a sticky intro column (eyebrow, headline, description, optional signature image) on the left and a responsive member photo grid on the right.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text (default "Meet Our Team") | Small label above the headline; omit to tighten the intro stack |
| `title` | Any text (default "Our leaders") | Main headline; renders as `h1` when the widget is first on the page, `h2` otherwise |
| `description` | Textarea (default provided) | Supporting paragraph below the headline |
| `heading_alignment` | `left` / **`center`** | Controls whether the intro text block is left-aligned or centered |
| `signature_image` | Image upload | Displays below the intro text (max-width 18 rem) — great for a founder's handwritten signature or a small brand mark |
| `columns_desktop` | **2** / 3 / 4 (range) | Number of member columns on desktop (mobile always collapses to 2) |
| `image_ratio` | **`portrait`** (3:4) / `square` (1:1) / `auto` (natural) | Crop shape for every member photo; portrait feels editorial, square feels modern, auto preserves originals |
| `color_scheme` | **`standard-primary`** / `standard-secondary` / `highlight-primary` / `highlight-secondary` | Background and text color palette; highlight variants add a padded container background |
| `top_spacing` | **`auto`** / `none` | Removes default top padding so the widget can butt up against the section above |
| `bottom_spacing` | **`auto`** / `none` | Removes default bottom padding |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `member` | `photo` (image), `name` (text), `role` (text), `link` (URL + new-tab toggle) | Each block is one team member card. Photo hover-scales on linked cards; name color shifts to the accent on hover. Heading level auto-adjusts (`h3` when a widget title exists, `h2` when it does not). |

Default blocks ship with 4 members (CEO, CMO, CTO, Head of Design) — enough to fill a 2-column grid without looking empty.

---

## Layout Recipes

### 1. Founder Duo

| Parameter | Value |
|-----------|-------|
| `columns_desktop` | 2 |
| `image_ratio` | portrait |
| `heading_alignment` | left |
| `signature_image` | Founder's handwritten signature |
| Blocks | 2 members |

**Good for:** Co-founder story, husband-and-wife businesses, small studios.
**Industries:** Architecture firms, law partnerships, craft breweries, boutique agencies.

---

### 2. Leadership Grid

| Parameter | Value |
|-----------|-------|
| `columns_desktop` | 3 |
| `image_ratio` | square |
| `heading_alignment` | center |
| `color_scheme` | highlight |
| Blocks | 6 members |

**Good for:** Mid-size companies that want to show depth without overwhelming the page.
**Industries:** SaaS startups, marketing agencies, financial advisory firms.

---

### 3. Full Roster Board

| Parameter | Value |
|-----------|-------|
| `columns_desktop` | 4 |
| `image_ratio` | square |
| `heading_alignment` | left |
| `color_scheme` | standard |
| Blocks | 8-12 members |

**Good for:** Showing the entire team when headcount is a selling point (trust signal).
**Industries:** Dental practices, real estate brokerages, consulting firms, veterinary clinics.

---

### 4. Editorial Spotlight

| Parameter | Value |
|-----------|-------|
| `columns_desktop` | 2 |
| `image_ratio` | portrait |
| `heading_alignment` | left |
| `color_scheme` | highlight-secondary |
| `eyebrow` | "The People Behind the Work" |
| Blocks | 3-4 members, each with a link to a personal bio page |

**Good for:** Creative businesses that want a magazine-feel introduction to key people.
**Industries:** Photography studios, design agencies, fashion brands, restaurants (chef profiles).

---

### 5. Minimal Team Strip

| Parameter | Value |
|-----------|-------|
| `columns_desktop` | 4 |
| `image_ratio` | square |
| `heading_alignment` | center |
| `eyebrow` | *(empty)* |
| `description` | *(empty)* |
| `title` | "Our Team" |
| `top_spacing` | none |
| Blocks | 4 members, no links |

**Good for:** A compact, no-frills team section near the footer — just faces, names, and roles.
**Industries:** Accounting firms, IT service providers, small nonprofits.

---

### 6. Linked Advisors Panel

| Parameter | Value |
|-----------|-------|
| `columns_desktop` | 3 |
| `image_ratio` | portrait |
| `heading_alignment` | left |
| `color_scheme` | standard-secondary |
| `eyebrow` | "Advisory Board" |
| Blocks | 3-6 members, each linked to a LinkedIn profile (new tab) |

**Good for:** Startups and nonprofits that want to showcase credibility through advisors or board members.
**Industries:** Tech startups, venture-backed companies, charitable foundations, educational institutions.

---

### 7. Solo Founder Hero

| Parameter | Value |
|-----------|-------|
| `columns_desktop` | 2 |
| `image_ratio` | auto |
| `heading_alignment` | left |
| `signature_image` | Signature or small logo |
| `description` | A personal founder statement |
| Blocks | 1 member |

**Good for:** Solopreneurs and personal brands where a single large portrait next to a personal message creates an intimate feel.
**Industries:** Freelance consultants, personal coaches, solo attorneys, independent financial planners.

---

## Differentiation Tips

- **Use the signature image.** Most team sections are interchangeable grids. Adding a handwritten signature or a small brand mark below the intro text immediately sets this widget apart and adds a personal, human touch.

- **Pair image ratio with the mood.** Portrait photos shot with shallow depth of field feel editorial and high-end. Square crops feel clean and contemporary. Use `auto` only when you have inconsistent source photography and cannot reshoot.

- **The sticky intro is the secret weapon.** On desktop the intro column stays fixed while the member grid scrolls. This works best when the intro has enough content (eyebrow + headline + description + signature) to anchor the left side. If the intro is too sparse, the stickiness looks odd — either add a signature image or switch to `heading_alignment: center` which visually balances a shorter intro.

- **Link strategically.** Member links are optional. Link only when there is a meaningful destination (a bio page, a LinkedIn profile, a personal site). Linking every card to nowhere erodes trust. When links are present, the hover animation (photo scale + name accent color) provides a clear affordance.

- **Control density with columns.** Two columns feel spacious and premium. Three columns are the workhorse layout for 6-9 people. Four columns pack in large teams but shrink photos — pair with square crops so faces stay readable at smaller sizes.

- **Use color scheme to create contrast.** If the sections above and below are on a standard background, switching this widget to `highlight-primary` or `highlight-secondary` visually separates the team from surrounding content and draws the eye.

- **Remove spacing to stack sections.** Set `top_spacing` or `bottom_spacing` to `none` when you want this widget to flow seamlessly into an adjacent section that shares the same color scheme — useful for building a cohesive "about" page sequence.
