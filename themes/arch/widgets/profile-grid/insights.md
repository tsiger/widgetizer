# Profile Grid Widget - Insights

Circular-photo people grid with name, role, specialty, bio, and social links -- works as a team page, staff directory, or expert showcase.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | any text | Small label above the headline ("Our Team", "Leadership", etc.) |
| `title` | any text | Main section headline; first widget on page renders as `<h1>` |
| `description` | any text | Paragraph below the headline for context |
| `heading_alignment` | `center` (default), `left` | Centers or left-aligns the entire header block |
| `columns_desktop` | `2` - `5` (default `3`) | Number of columns in the grid on desktop; directly controls density |
| `layout` | `grid` (default), `carousel` | Grid shows all cards at once; carousel adds prev/next buttons and horizontal scrolling |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Controls background and text color pairing for the whole section |
| `top_spacing` | `auto` (default), `none` | Removes top padding when set to `none`; useful for stacking sections flush |
| `bottom_spacing` | `auto` (default), `none` | Removes bottom padding when set to `none` |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `profile` | `photo` (image), `name`, `role`, `specialty`, `bio` | Core content fields. Photo renders as a 160px circle with a border. Placeholder shown when no photo is set. |
| | `linkedin`, `twitter`, `instagram`, `facebook`, `email`, `github`, `youtube`, `tiktok`, `pinterest`, `bluesky`, `discord`, `meta`, `reddit`, `telegram`, `threads`, `whatsapp` | Social links. Each renders as a circular icon button. Only populated links appear, so cards stay clean. Email uses `mailto:`. |

---

## Layout Recipes

### 1. Classic Team Page (3-column grid)

| Setting | Value |
|---------|-------|
| `eyebrow` | "Our Team" |
| `title` | "Meet the People Behind [Business]" |
| `columns_desktop` | `3` |
| `layout` | `grid` |
| `heading_alignment` | `center` |
| `color_scheme` | `standard-primary` |

Fill each profile with photo, name, role, and a one-sentence bio. Add LinkedIn for professional credibility.

**Good for:** About pages, company overview sections.
**Industries:** Consulting firms, agencies, law offices, accounting practices.

---

### 2. Restaurant Kitchen Brigade

| Setting | Value |
|---------|-------|
| `eyebrow` | "The Kitchen" |
| `title` | "Our Chefs" |
| `columns_desktop` | `3` |
| `layout` | `grid` |
| `heading_alignment` | `center` |
| `color_scheme` | `highlight-primary` |

Use the `specialty` field for cuisine focus (e.g., "Italian & Mediterranean"). Keep bios short and personality-driven. Add Instagram links for food content.

**Good for:** Chef introductions, kitchen team showcases.
**Industries:** Restaurants, catering companies, food trucks, bakeries.

---

### 3. Instructor / Expert Carousel

| Setting | Value |
|---------|-------|
| `eyebrow` | "Instructors" |
| `title` | "Learn From the Best" |
| `columns_desktop` | `3` |
| `layout` | `carousel` |
| `heading_alignment` | `center` |
| `color_scheme` | `standard-secondary` |

Best when you have 6+ profiles. Carousel keeps the section compact while letting visitors browse. Use `specialty` for certifications or focus areas. Link YouTube or TikTok for instructors who create content.

**Good for:** Course catalogs, gym trainer pages, workshop facilitator lists.
**Industries:** Fitness studios, yoga centers, music schools, tutoring services, coding bootcamps.

---

### 4. Leadership Spotlight (2-column)

| Setting | Value |
|---------|-------|
| `eyebrow` | "Leadership" |
| `title` | "Guided by Experience" |
| `columns_desktop` | `2` |
| `layout` | `grid` |
| `heading_alignment` | `left` |
| `color_scheme` | `standard-primary` |

Two columns give each leader more horizontal space, making bios easier to read. Use longer bios here (2-3 sentences). Add LinkedIn and email for direct contact. Skip `specialty` and use `role` for the full title.

**Good for:** Executive team sections, board of directors pages.
**Industries:** Startups, nonprofits, financial services, healthcare practices.

---

### 5. Salon / Spa Staff Directory (4-column)

| Setting | Value |
|---------|-------|
| `eyebrow` | "Our Stylists" |
| `title` | "Book With Your Favorite" |
| `columns_desktop` | `4` |
| `layout` | `grid` |
| `heading_alignment` | `center` |
| `color_scheme` | `highlight-secondary` |

High column count works when bios are omitted and you lean on photo + name + specialty. Use `specialty` for services ("Color Specialist", "Balayage & Extensions"). Link Instagram so clients can see portfolios.

**Good for:** Staff booking pages, stylist directories.
**Industries:** Hair salons, spas, nail studios, tattoo shops, barbershops.

---

### 6. Real Estate Agent Roster (5-column, minimal)

| Setting | Value |
|---------|-------|
| `eyebrow` | "" (empty) |
| `title` | "Our Agents" |
| `columns_desktop` | `5` |
| `layout` | `grid` |
| `heading_alignment` | `center` |
| `color_scheme` | `standard-primary` |

Maximum density. Drop bios entirely; use only photo, name, and role ("Senior Agent", "Buyer Specialist"). Add email and Facebook links. Works well on a dedicated "Agents" page rather than as a homepage section.

**Good for:** Large team directories where scanning matters more than reading.
**Industries:** Real estate brokerages, insurance agencies, car dealerships.

---

### 7. Creative Studio Showcase (3-column carousel, highlight)

| Setting | Value |
|---------|-------|
| `eyebrow` | "The Studio" |
| `title` | "Creatives & Collaborators" |
| `description` | A short sentence about the team culture |
| `columns_desktop` | `3` |
| `layout` | `carousel` |
| `heading_alignment` | `center` |
| `color_scheme` | `highlight-primary` |

Use the `description` field to set a vibe ("A collective of designers, developers, and dreamers"). Populate multiple social links per person -- Instagram, Bluesky, GitHub -- to show each person's creative presence. The highlight background separates this section visually from portfolio work above or below.

**Good for:** Agency about sections, freelance collective pages.
**Industries:** Design studios, development agencies, photography collectives, architecture firms.

---

## Differentiation Tips

- **Photo quality is everything.** Circular crops are unforgiving -- use consistent lighting, framing, and background across all headshots. Mismatched photos make even a great layout look amateurish.
- **Specialty vs. Role:** Use `role` for the job title and `specialty` for what makes the person unique. A dentist's role is "Orthodontist" but their specialty might be "Invisalign & Early Intervention." This two-line approach adds depth without extra UI.
- **Carousel vs. Grid decision:** Use carousel only when you have more profiles than columns (e.g., 7+ people with 3 columns). A carousel with exactly 3 items and 3 columns has no scrolling and just adds useless navigation buttons.
- **Social link restraint:** One or two social links per person looks intentional. Five or more looks cluttered and the circular icons start competing with the profile photo. Pick the platform where each person is most active.
- **Color scheme pairing:** Use `highlight-primary` or `highlight-secondary` when the profile grid sits between two `standard-primary` sections -- it creates a visual break that draws attention to the people. Avoid highlight when adjacent sections already use it.
- **Empty bio strategy:** It is perfectly fine to skip bios for large teams (5+ columns). The widget gracefully collapses the space. But if one person has a bio, give everyone a bio -- inconsistency looks like some people matter more than others.
- **Left-aligned headers** work better when the profile grid follows a text-heavy section (like a mission statement). Center alignment is the safer default and works on standalone about pages.
