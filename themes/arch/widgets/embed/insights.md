# Embed Widget Insights

## Description

A flexible container for injecting raw HTML, iframes, or third-party embed codes into a page, wrapped with an optional eyebrow/title/description header and configurable width and alignment.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (blank by default) | Small label above the title; adds a subtle category or context tag above the embed |
| `title` | Any text (default "Watch Our Video") | Large headline rendered as `<h1>` when widget is first on page, `<h2>` otherwise |
| `description` | Any text (default placeholder sentence) | Supporting paragraph below the title, sets expectation for the embedded content |
| `heading_alignment` | `left`, `center` | Shifts eyebrow/title/description to the left edge or centers them above the embed |
| `code` | Raw HTML / iframe / embed snippet | The actual embedded content; rendered unescaped inside the embed wrapper |
| `max_width` | `narrow`, `medium`, `wide`, `fullwidth` | Controls horizontal spread of the content area (maps to `widget-content-sm/md/lg` or no cap) |
| `alignment` | `start`, `center`, `end` | Positions the embed block horizontally within its container via flexbox alignment |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Changes background and text color palette; non-standard schemes add padded container |
| `top_spacing` | `auto`, `none` | Removes default top padding when set to `none`; useful for stacking widgets tightly |
| `bottom_spacing` | `auto`, `none` | Removes default bottom padding when set to `none`; useful for stacking widgets tightly |

---

## Available Blocks

This widget has no blocks. All content is controlled through settings alone.

---

## Layout Recipes

### 1. Hero Video Intro

| Setting | Value |
|---|---|
| `eyebrow` | "See It In Action" |
| `title` | "How We Build Custom Furniture" |
| `description` | "A 90-second look inside our workshop." |
| `heading_alignment` | center |
| `code` | YouTube or Vimeo iframe |
| `max_width` | wide |
| `alignment` | center |
| `color_scheme` | standard |
| `top_spacing` | auto |
| `bottom_spacing` | auto |

**Good for:** Above-the-fold product or brand video that immediately shows the business in motion.
**Industries:** Woodworking shops, renovation contractors, custom fabricators, artisan bakeries.

---

### 2. Booking Calendar Strip

| Setting | Value |
|---|---|
| `eyebrow` | (blank) |
| `title` | "Book Your Appointment" |
| `description` | "Pick a time that works for you." |
| `heading_alignment` | center |
| `code` | Calendly / Acuity inline embed |
| `max_width` | medium |
| `alignment` | center |
| `color_scheme` | highlight |
| `top_spacing` | auto |
| `bottom_spacing` | auto |

**Good for:** Dedicated scheduling section on a services page so visitors can book without leaving the site.
**Industries:** Hair salons, dental offices, personal trainers, consultants, photography studios.

---

### 3. Google Map Pinned Left

| Setting | Value |
|---|---|
| `eyebrow` | "Visit Us" |
| `title` | "Our Location" |
| `description` | "123 Main St, Portland, OR" |
| `heading_alignment` | left |
| `code` | Google Maps iframe (fixed height, 100% width) |
| `max_width` | fullwidth |
| `alignment` | start |
| `color_scheme` | standard |
| `top_spacing` | none |
| `bottom_spacing` | none |

**Good for:** Contact or footer area where the map spans the full width and the heading sits left-aligned like an address block.
**Industries:** Restaurants, retail stores, auto repair shops, real estate offices.

---

### 4. Social Proof Feed

| Setting | Value |
|---|---|
| `eyebrow` | "Follow Along" |
| `title` | "What We've Been Up To" |
| `description` | (blank) |
| `heading_alignment` | center |
| `code` | Instagram or Facebook feed embed (e.g., Elfsight, Smash Balloon, or native embed) |
| `max_width` | wide |
| `alignment` | center |
| `color_scheme` | standard-accent |
| `top_spacing` | auto |
| `bottom_spacing` | auto |

**Good for:** A social media gallery section that keeps the site feeling current without manual updates.
**Industries:** Florists, event planners, fitness studios, boutique clothing shops, food trucks.

---

### 5. Review / Testimonial Carousel

| Setting | Value |
|---|---|
| `eyebrow` | (blank) |
| `title` | "What Our Clients Say" |
| `description` | "Real reviews from real customers." |
| `heading_alignment` | center |
| `code` | Google Reviews or Yelp widget embed |
| `max_width` | narrow |
| `alignment` | center |
| `color_scheme` | highlight-accent |
| `top_spacing` | auto |
| `bottom_spacing` | auto |

**Good for:** A focused, trust-building section that pulls live reviews from a third-party platform.
**Industries:** Plumbers, electricians, cleaning services, accountants, veterinary clinics.

---

### 6. Payment / Donation Form

| Setting | Value |
|---|---|
| `eyebrow` | "Support Our Mission" |
| `title` | "Make a Donation" |
| `description` | "Every contribution helps us serve the community." |
| `heading_alignment` | center |
| `code` | Stripe Payment Links iframe or PayPal donate button embed |
| `max_width` | narrow |
| `alignment` | center |
| `color_scheme` | highlight |
| `top_spacing` | auto |
| `bottom_spacing` | auto |

**Good for:** A contained, centered payment form that feels intentional rather than bolted on.
**Industries:** Nonprofits, churches, community organizations, youth sports leagues, animal shelters.

---

## Differentiation Tips

- **Drop the default title.** The default "Watch Our Video" screams template. Replace it with something specific to the business or remove it entirely if the embed is self-explanatory.
- **Match max_width to the embed's natural aspect ratio.** A narrow Calendly widget looks lost at fullwidth. A panoramic Google Map looks cramped at narrow. Let the content dictate the container.
- **Use `heading_alignment: left` for utilitarian embeds.** Maps, forms, and booking tools feel more grounded with left-aligned headers. Save center alignment for showcase content like videos and social feeds.
- **Stack spacing intentionally.** Set `top_spacing: none` when the embed sits directly below a hero or another full-bleed widget to avoid a double-gap. Use `bottom_spacing: none` when a CTA section follows immediately.
- **Lean on color_scheme to create visual separation.** A `highlight` or `highlight-accent` background makes an embed section feel like a distinct zone rather than just another block of content. This is especially effective for booking and payment embeds where you want the visitor to pause and take action.
- **Keep the code field clean.** Paste only the embed snippet itself. Wrapping it in extra divs or inline styles beyond what the provider gives you often fights the widget's own responsive handling.
