# Sliding Panels Widget

Full-width interactive panel accordion where panels expand on click/tap to reveal image, title, subtitle, and CTA. On mobile the layout stacks vertically.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text (optional) | Small label above the headline, adds context like "Portfolio" or "What We Do" |
| `title` | Any text, default "Our Work" | Main section headline; renders as `<h1>` when widget is first on the page |
| `description` | Any text (optional) | Supporting paragraph below the headline |
| `heading_alignment` | `center` (default), `left` | Centers or left-aligns the eyebrow/title/description block |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Controls section background and text contrast; non-standard schemes add padded container and override `--widget-bg-color` |
| `top_spacing` | `auto` (default), `none` | Removes top padding when set to `none` -- useful for stacking widgets edge-to-edge |
| `bottom_spacing` | `auto` (default), `none` | Removes bottom padding when set to `none` |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `panel` (max 6) | `image` -- background photo, `title` -- overlay heading, `subtitle` -- secondary line, `button_link` -- CTA with text/href/target | First panel starts expanded (`.is-active`). Panels transition with `flex 0.5s ease`. Content overlay uses a bottom-to-top dark gradient so white text stays readable on any image. |

---

## Layout Recipes

### 1. Service Showcase (3 panels)

- **Panels:** 3, each representing a core service
- **Settings:** `eyebrow` = "What We Do", `title` = "Our Services", `heading_alignment` = left, `color_scheme` = standard
- **Panel content:** Service photo + service name as title, one-liner as subtitle, "Learn More" button linking to service page
- **Good for:** Letting visitors quickly scan your top offerings with strong imagery
- **Industries:** Landscaping, home remodeling, cleaning companies, salons

### 2. Project Portfolio (4-5 panels)

- **Panels:** 4-5, each a completed project
- **Settings:** `eyebrow` = "Portfolio", `title` = "Recent Projects", `heading_alignment` = center, `color_scheme` = standard
- **Panel content:** Hero project photo, project name as title, location or scope as subtitle, "View Project" button
- **Good for:** Visual-first businesses that sell through finished work
- **Industries:** Architecture firms, interior designers, photographers, custom builders

### 3. Location Selector (3-4 panels)

- **Panels:** 3-4, one per physical location or service area
- **Settings:** `title` = "Find Us Near You", `heading_alignment` = center, `color_scheme` = highlight
- **Panel content:** Storefront or area photo, neighborhood/city as title, address as subtitle, "Get Directions" button
- **Good for:** Multi-location businesses that want visitors to self-select
- **Industries:** Restaurant groups, dental practices, fitness studios, retail chains

### 4. Team or Expertise Spotlight (4-6 panels)

- **Panels:** 4-6, each a team member or area of expertise
- **Settings:** `eyebrow` = "Meet the Team", `title` = "Our Experts", `heading_alignment` = center, `color_scheme` = standard-accent
- **Panel content:** Professional headshot, name as title, role or specialty as subtitle, "Read Bio" button
- **Good for:** Building trust by putting faces to the business
- **Industries:** Law firms, medical practices, consulting agencies, real estate teams

### 5. Before/After Transformations (4 panels)

- **Panels:** 4 projects, each showing the "after" result
- **Settings:** `title` = "Transformations", `description` = "See what's possible.", `heading_alignment` = left, `color_scheme` = standard
- **Panel content:** Dramatic after photo, project label as title, scope description as subtitle (e.g., "Full kitchen renovation"), "See Details" button
- **Good for:** Businesses where visual transformation is the selling point
- **Industries:** Contractors, auto detailers, lawn care, painters, organizers

### 6. Menu or Product Categories (3-5 panels)

- **Panels:** 3-5, one per category
- **Settings:** `title` = "Explore Our Menu", `heading_alignment` = center, `color_scheme` = highlight-accent
- **Panel content:** Appetizing category photo, category name as title (e.g., "Wood-Fired Pizzas"), brief descriptor as subtitle, "View Menu" button
- **Good for:** Giving visitors a visual entry point into a product catalog or menu
- **Industries:** Restaurants, bakeries, florists, boutique retailers, craft breweries

### 7. Event or Venue Spaces (3-4 panels)

- **Panels:** 3-4, each a venue or event type
- **Settings:** `eyebrow` = "Host With Us", `title` = "Our Spaces", `heading_alignment` = center, `color_scheme` = standard, `top_spacing` = none
- **Panel content:** Venue photo, space name as title, capacity or style as subtitle, "Book a Tour" button
- **Good for:** Venues that want visitors to envision their event in each space
- **Industries:** Event venues, hotels, wineries, community centers, coworking spaces

---

## Differentiation Tips

- **Lead with your strongest image in panel 1.** It starts expanded, so it gets the most attention on page load. Put your best project, signature service, or hero product there.
- **Keep panel count between 3 and 5.** At 6 the collapsed panels become too narrow on desktop to be visually meaningful. Three panels give each image generous space.
- **Write short, punchy titles.** The overlay text sits on a gradient over the image -- long titles compete with the photo. Aim for 2-4 words.
- **Use subtitles to add context, not repeat the title.** Good: title "Kitchen Remodel", subtitle "Westlake, Austin". Bad: title "Kitchen Remodel", subtitle "A Beautiful Kitchen Remodel".
- **Choose images with a clear subject and some negative space at the bottom** so the gradient overlay and text remain readable.
- **Pair with `highlight` or `highlight-accent` color scheme** when the section sits between two standard-background widgets -- the contrast creates a visual break that keeps visitors scrolling.
- **Remove spacing (`top_spacing` = none) when stacking below a hero widget** to create a seamless visual flow from the hero into the panels.
- **Every panel should have a CTA button.** The whole point of expanding a panel is to invite the next click -- don't leave visitors at a dead end.
