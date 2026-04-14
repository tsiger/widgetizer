# Image Tabs Widget — Insights

Tabbed content section that pairs clickable text tabs with a large swappable image area, letting visitors explore features or services without scrolling.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text | Small label above the headline — adds category context ("Our Process", "Why Us") |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | Any text (default "Our Features") | Main headline for the section; first widget on page renders as `<h1>` |
| `description` | Any text | Subheading paragraph below the title — sets expectations for what the tabs cover |
| `heading_alignment` | `start`, `center` (default) | Centers or left-aligns the eyebrow/title/description block; left suits editorial layouts |
| `image_position` | `start` (default), `end` | Which side the image panel sits on desktop; flips the active-tab accent bar direction too |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Controls background and text palette; accent/highlight variants add padded container with themed background |
| `top_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | `auto` (default), `small`, `none` | Same as above for the bottom edge |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `tab` | `title` (text), `description` (richtext), `image` (image) | Each tab is one block. Title appears as a heading inside the tab button. Description supports formatted text (bold, links, lists). Image fills a 4:3 area on mobile, 3:2 on desktop. Placeholder shown when no image is uploaded. |

---

## Layout Recipes

### 1. Service Showcase (3 tabs, image left, centered header)

- **Settings:** `heading_alignment: center`, `image_position: start`, `color_scheme: standard-primary`, eyebrow "What We Do"
- **Tabs:** One per core service (e.g., "Design", "Build", "Maintain"), each with a photo of the work and a two-sentence summary.
- **Good for:** Quickly communicating a service lineup without forcing visitors to click away to subpages.

### 2. Before/After Process (4 tabs, image right, highlight background)

- **Settings:** `heading_alignment: start`, `image_position: end`, `color_scheme: highlight-primary`, title "How It Works"
- **Tabs:** Sequential steps ("Consultation", "Planning", "Execution", "Handoff") with a relevant photo per step.
- **Good for:** Walking prospective clients through a multi-step engagement so they know what to expect.

### 3. Treatment / Service Deep-Dive (4-5 tabs, image left, accent scheme)

- **Settings:** `heading_alignment: center`, `image_position: start`, `color_scheme: standard-secondary`, eyebrow "Treatments", title "What We Offer"
- **Tabs:** One service per tab with a photo of the treatment or result and a short richtext description including key benefits.
- **Good for:** Service businesses where each offering deserves its own visual and explanation.

### 4. Location/Space Tour (4-6 tabs, image right, no top spacing)

- **Settings:** `heading_alignment: start`, `image_position: end`, `color_scheme: standard-primary`, `top_spacing: none`, title "Explore Our Space"
- **Tabs:** One per room or area ("Main Dining", "Private Room", "Patio", "Bar"), each with a high-quality interior photo and a sentence about capacity or vibe.
- **Good for:** Letting visitors virtually walk through a physical space before booking or visiting.

### 5. Team/Role Spotlight (3-4 tabs, image left, highlight-secondary)

- **Settings:** `heading_alignment: center`, `image_position: start`, `color_scheme: highlight-secondary`, eyebrow "Our Team", title "Meet the Experts"
- **Tabs:** One per team member or department with a portrait photo, their role as the tab title, and a short bio in the description.
- **Good for:** Putting faces to the business on an About page without a separate team grid widget.

### 6. Menu/Category Preview (4-5 tabs, image right, centered header)

- **Settings:** `heading_alignment: center`, `image_position: end`, `color_scheme: standard-primary`, title "Our Menu"
- **Tabs:** One per category ("Appetizers", "Mains", "Desserts", "Drinks") with a hero dish photo and a richtext description listing a few highlights.
- **Good for:** Giving visitors a visual taste of offerings without embedding a full menu.

### 7. Case Study Sampler (3 tabs, image left, left-aligned header)

- **Settings:** `heading_alignment: start`, `image_position: start`, `color_scheme: standard-secondary`, eyebrow "Results", title "Recent Projects"
- **Tabs:** One per project with a result photo and a richtext description that includes a bold metric ("40% increase in foot traffic").
- **Good for:** Building credibility on a homepage or services page without a dedicated portfolio section.

---

## Differentiation Tips

- **Keep tab count between 3 and 5.** Fewer than 3 makes the tabbed format feel unnecessary; more than 5 buries later tabs since there is no scroll indicator on the tab list.
- **Lead with the strongest image.** The first tab is visible on load, so use your most compelling photo there to hook attention.
- **Write tab titles as scannable labels, not sentences.** Visitors skim the tab list before clicking. Short titles ("24/7 Support", "Free Estimates") outperform long ones.
- **Use the richtext description sparingly.** One to three sentences is ideal. If you need more depth, link out to a dedicated page from the description.
- **Pair image position with page flow.** If the section above has a right-aligned image (e.g., a split hero), set `image_position: start` here so the page feels balanced rather than lopsided.
- **Combine color scheme with spacing removal for seamless stacking.** Setting `color_scheme: highlight-primary` with `top_spacing: none` on this widget and `bottom_spacing: none` on the widget above creates a continuous colored band that visually groups related content.
- **Optimize images for the 3:2 / 4:3 crop.** The image area uses `object-fit: cover`, so square or portrait photos will lose their edges. Shoot or crop for landscape orientation.
