# Project Showcase Widget

Image-forward portfolio grid (or carousel) with hover-reveal text overlay, built for displaying completed work, case studies, and visual portfolios.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `heading_alignment` | `left`, `center` | Controls whether the eyebrow/title/description block sits flush-left or centered above the grid |
| `layout` | `grid`, `carousel` | Grid shows all items at once in a responsive multi-column layout; carousel displays a swipeable strip with prev/next buttons |
| `columns_desktop` | `2` -- `5` | Number of columns on desktop viewports; fewer columns = larger cards with more visual impact |
| `aspect_ratio` | `auto`, `contain`, `1/1`, `4/3`, `3/2`, `3/4`, `16/9` | Determines image crop shape. `auto` uses the natural image ratio; `contain` fits the full image inside a fixed-height container; portrait (`3/4`) is unusual and attention-grabbing |
| `text_display` | `hover`, `always` | `hover` keeps cards image-only until mouseover reveals the gradient overlay with title and description; `always` shows the overlay permanently |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Background treatment for the entire section. Standard uses the default page background; highlight and accent variants pull from theme color variables |
| `top_spacing` | `auto`, `none` | Removes top padding so the widget can butt up against the section above it |
| `bottom_spacing` | `auto`, `none` | Removes bottom padding for the same edge-to-edge stacking effect |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `project` | `image` (image picker), `title` (text), `description` (text), `link` (URL, target) | Each block is one portfolio card. The link wraps the entire card as a clickable overlay. `link.target` defaults to `_self`. If no image is set, a placeholder landscape graphic renders instead. |

---

## Layout Recipes

### 1. Architect / Interior Design Portfolio

| Setting | Value |
|---------|-------|
| `layout` | `grid` |
| `columns_desktop` | `2` |
| `aspect_ratio` | `3/2` |
| `text_display` | `hover` |
| `heading_alignment` | `left` |
| `color_scheme` | `standard-primary` |

Large, cinematic cards that let the photography do the talking. Hover-reveal keeps the grid clean. Two columns give each project room to breathe.

**Good for:** Architecture firms, interior designers, landscape architects, construction companies.
**Industries:** Architecture, real estate, construction, home staging.

---

### 2. Photography / Creative Agency Mosaic

| Setting | Value |
|---------|-------|
| `layout` | `grid` |
| `columns_desktop` | `3` |
| `aspect_ratio` | `1/1` |
| `text_display` | `hover` |
| `heading_alignment` | `center` |
| `color_scheme` | `highlight-primary` |

Square thumbnails on a dark (highlight) background create an Instagram-style grid that feels familiar to visual audiences. Three columns balances density with detail.

**Good for:** Photographers, videographers, creative agencies, tattoo artists.
**Industries:** Photography, film production, design studios, visual arts.

---

### 3. Contractor Before/After Strip

| Setting | Value |
|---------|-------|
| `layout` | `carousel` |
| `columns_desktop` | `2` |
| `aspect_ratio` | `16/9` |
| `text_display` | `always` |
| `heading_alignment` | `center` |
| `color_scheme` | `standard-primary` |

Wide cinematic ratio works well for before/after shots of renovations or landscaping jobs. Carousel lets you load many projects without overwhelming the page. Always-visible text ensures project names are readable without interaction.

**Good for:** General contractors, landscapers, painters, flooring installers.
**Industries:** Home services, renovation, landscaping, property maintenance.

---

### 4. Restaurant / Hospitality Highlights

| Setting | Value |
|---------|-------|
| `layout` | `grid` |
| `columns_desktop` | `3` |
| `aspect_ratio` | `4/3` |
| `text_display` | `always` |
| `heading_alignment` | `center` |
| `color_scheme` | `highlight-secondary` |

The 4:3 ratio suits food photography and venue shots. Always-on overlay text labels each dish, event space, or catering package. The highlight-secondary scheme adds warmth against a rich background.

**Good for:** Restaurants, caterers, event venues, hotels, bakeries.
**Industries:** Hospitality, food service, event planning, tourism.

---

### 5. Web / App Development Case Studies

| Setting | Value |
|---------|-------|
| `layout` | `grid` |
| `columns_desktop` | `3` |
| `aspect_ratio` | `4/3` |
| `text_display` | `hover` |
| `heading_alignment` | `left` |
| `color_scheme` | `standard-primary` |

Clean, professional grid with left-aligned heading that matches a typical tech-company layout. Link each card to a dedicated case-study page. Hover-reveal keeps the interface minimal. Use the description field for short outcome lines like "40% conversion lift."

**Good for:** Web agencies, software studios, freelance developers, digital consultancies.
**Industries:** Technology, SaaS, digital marketing, IT services.

---

### 6. Salon / Beauty Lookbook Carousel

| Setting | Value |
|---------|-------|
| `layout` | `carousel` |
| `columns_desktop` | `4` |
| `aspect_ratio` | `3/4` |
| `text_display` | `hover` |
| `heading_alignment` | `center` |
| `color_scheme` | `standard-secondary` |

Portrait ratio is perfect for hair, makeup, and fashion shots where the subject is vertical. Four visible columns create a dense lookbook feel that invites swiping. Hover-reveal keeps the focus on the imagery.

**Good for:** Hair salons, barbershops, nail studios, makeup artists, fashion boutiques.
**Industries:** Beauty, fashion, personal care, wellness.

---

### 7. Nonprofit / Community Impact Wall

| Setting | Value |
|---------|-------|
| `layout` | `grid` |
| `columns_desktop` | `4` |
| `aspect_ratio` | `1/1` |
| `text_display` | `always` |
| `heading_alignment` | `center` |
| `color_scheme` | `highlight-primary` |
| `top_spacing` | `none` |
| `bottom_spacing` | `none` |

Dense four-column square grid creates an impactful wall of faces, events, and outcomes. Always-visible overlay makes every project title scannable without interaction, which matters for accessibility. Edge-to-edge spacing lets this section act as a bold visual divider.

**Good for:** Nonprofits, schools, community organizations, churches, municipal departments.
**Industries:** Civic, education, philanthropy, social services.

---

## Differentiation Tips

- **Hover vs. always-on text is the single biggest mood lever.** Hover creates a gallery feel where images dominate. Always-on feels more informational and editorial. Default to hover for visual industries (design, photography, beauty) and always-on for service industries (contractors, nonprofits) where the project name matters more than the image alone.

- **Two columns signals premium; four or five signals volume.** A roofing company with 50 completed jobs should use 4--5 columns to communicate experience. An architecture firm with six flagship projects should use 2 columns to communicate selectiveness.

- **Portrait ratio (3/4) is underused and distinctive.** Most portfolio sections default to landscape. Switching to portrait immediately sets a page apart and works especially well for people-centric businesses (salons, fashion, fitness trainers).

- **Pair carousel layout with higher column counts (4--5) for a peek effect.** The carousel naturally crops the last visible item, hinting that more content exists. This encourages interaction and works well when you have 8+ projects.

- **Use the highlight color scheme when the section sits between two standard sections.** The background contrast creates a natural visual break and draws the eye to the portfolio, which is usually the most persuasive section on a small business site.

- **Remove spacing (`none`) when stacking this widget directly below a full-width hero.** The seamless transition from hero image into project grid feels intentional and modern. Combine with `highlight-primary` to make the portfolio section feel like a continuation of the hero rather than a separate block.

- **Keep descriptions short -- six to ten words max.** The overlay text area is compact by design. Long descriptions get clipped or crowd the card. Treat the description as a subtitle ("Complete kitchen renovation in Oak Park") rather than a paragraph.
