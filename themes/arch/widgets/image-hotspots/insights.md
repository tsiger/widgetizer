# Image Hotspots Widget

An interactive image overlay that places clickable marker pins on a photo, each revealing a tooltip with a title, rich-text description, and optional call-to-action link.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text / blank | Small label above the headline. Adds context or category framing ("Our Showroom", "How It Works"). Leave blank to hide. |
| `title` | Any text (default "Interactive Image") | Main headline rendered as `<h1>` on the first widget of a page, `<h2>` otherwise. Blank hides the entire header row if description and eyebrow are also empty. |
| `description` | Any text / blank | Supporting paragraph beneath the headline. Good for a one-sentence setup ("Tap any pin to learn more"). |
| `heading_alignment` | `left` / `center` (default) | Left-aligns the header block for editorial layouts; center keeps it balanced above the image. |
| `image` | Image upload / blank | The base photo all hotspots sit on. Rendered at full container width with responsive srcset. Falls back to a landscape placeholder when empty. |
| `image_alt` | Any text (default "Interactive image with hotspots") | Alt text for the base image. Important for accessibility and SEO. |
| `color_scheme` | `standard-primary` / `standard-secondary` / `highlight-primary` / `highlight-secondary` | Controls the section background and overall palette. `standard-primary` has no extra padding; the other three add padded container treatment and override `--widget-bg-color`. |
| `top_spacing` | `auto` / `none` | `auto` uses theme default top margin; `none` removes it so the widget can butt directly against its neighbor. |
| `bottom_spacing` | `auto` / `none` | Same as above for the bottom edge. |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `hotspot` | `title` (text), `description` (richtext), `button_link` (link), `position_x` (range 0-100), `position_y` (range 0-100) | Each block is a single pin on the image. Position values are percentages from the top-left corner. Tooltip appears below the pin on desktop with smart edge-detection repositioning; on mobile (<750 px) the tooltip renders inline beneath the image instead. The close button and Escape key dismiss it. Defaults ship two blocks at (30,40) and (70,30). |

---

## Layout Recipes

### 1. Product Feature Callouts

- **Settings**: 4-6 hotspots on a hero product photo. `heading_alignment: left`, eyebrow "Product Details", `color_scheme: standard`.
- **Hotspot strategy**: Pin each key feature (material, button, screen, strap) at its physical location. Short title + 1-sentence description + link to specs page.
- **Good for**: E-commerce product pages, Kickstarter-style landing sections.
- **Industries**: Consumer electronics, fashion accessories, sporting goods, furniture.

### 2. Floor Plan / Venue Tour

- **Settings**: 5-8 hotspots on an overhead floor-plan image or wide interior photo. `heading_alignment: center`, title "Explore Our Space", `color_scheme: highlight`.
- **Hotspot strategy**: Mark key areas (reception, lounge, kitchen, patio). Description includes capacity or amenities. Link each to a gallery or booking page.
- **Good for**: Event venues, coworking spaces, real-estate listings.
- **Industries**: Hospitality, commercial real estate, wedding venues, restaurants.

### 3. Before/After Explainer

- **Settings**: 2-3 hotspots on a single "after" photo. `heading_alignment: left`, eyebrow "The Transformation", `color_scheme: standard-secondary`.
- **Hotspot strategy**: Pinpoint specific changes (new countertop, replaced windows, landscaping). Description explains the upgrade and materials used.
- **Good for**: Portfolio case studies, renovation showcases.
- **Industries**: Home remodeling, landscaping, auto detailing, salon makeovers.

### 4. Team / Office Culture Snapshot

- **Settings**: 3-5 hotspots on a team group photo or office panorama. `heading_alignment: center`, title "Meet the Team", `color_scheme: standard`.
- **Hotspot strategy**: Pin individuals or areas (design corner, coffee bar). Title is the person's name or area name; description is a fun fact or role summary. Link to a full bio page.
- **Good for**: About pages, recruitment landing pages.
- **Industries**: Agencies, startups, law firms, dental practices.

### 5. Menu / Dish Highlights

- **Settings**: 4-6 hotspots on a beautifully plated spread or table scene. `heading_alignment: center`, eyebrow "Chef's Selection", `color_scheme: highlight-secondary`, `top_spacing: none` (to pair tightly with a hero above).
- **Hotspot strategy**: Tag each dish. Description includes key ingredients and dietary info. Link to the full menu or online ordering.
- **Good for**: Restaurant homepages, catering brochures, food-truck sites.
- **Industries**: Restaurants, bakeries, catering companies, meal-kit services.

### 6. Anatomy of a Service

- **Settings**: 3-4 hotspots on an infographic-style image or process photo. `heading_alignment: left`, title "What's Included", `color_scheme: standard-secondary`.
- **Hotspot strategy**: Each pin represents a phase or deliverable (consultation, design mockup, installation, follow-up). Descriptions set expectations and timelines.
- **Good for**: Service overview pages, pricing sections.
- **Industries**: Web agencies, HVAC contractors, cleaning services, photography studios.

### 7. Campus / Property Map

- **Settings**: 6-8 hotspots on a campus aerial or illustrated map. `heading_alignment: center`, title "Find Your Way", `color_scheme: highlight`.
- **Hotspot strategy**: Mark buildings, parking, entrances, amenities. Descriptions include hours or quick directions. Links go to individual department pages.
- **Good for**: Universities, resorts, large retail complexes, hospitals.
- **Industries**: Education, healthcare, hospitality, amusement parks.

---

## Differentiation Tips

- **Pair with a preceding hero or full-bleed image widget** using `top_spacing: none` to create a seamless visual flow where the hotspot image feels like a continuation of the hero rather than a separate section.
- **Keep hotspot count between 3 and 6.** Fewer than 3 and the widget looks underused; more than 6 and the pins start competing for attention, especially on mobile where tooltips stack vertically.
- **Spread pins across quadrants.** Clustering pins in one corner makes the image feel lopsided and causes tooltip overlap on desktop. Aim for at least 20% separation on both axes between adjacent pins.
- **Use the link sparingly.** Not every hotspot needs a button. Reserve links for the 1-2 pins that drive the strongest conversion action (book now, view product, get quote) so the call to action stands out.
- **Write tooltip descriptions that complement, not repeat.** The title should name the feature; the description should answer "why should I care." Avoid restating the title in longer form.
- **Choose the right color scheme for contrast.** If the base image is dark, `highlight-primary` or `highlight-secondary` schemes frame the section with a lighter surround, making the pin markers more visible at the edges. For light images, `standard-primary` keeps things clean.
- **Test mobile behavior early.** On screens below 750 px, tooltips appear as stacked cards below the image rather than floating overlays. Make sure description text is concise enough to avoid excessive scrolling.
