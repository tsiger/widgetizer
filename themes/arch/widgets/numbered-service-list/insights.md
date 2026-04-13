# Numbered Service List

A vertically stacked, zero-padded numbered list of services with optional dividers, descriptions, and arrow-link affordances -- ideal for presenting a focused menu of offerings with clear visual hierarchy.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text | Small label above the headline; adds a contextual cue like "What We Do" or "Our Process" |
| `title` | Any text (default: "Our Services") | Main section headline; when this is the first widget on the page it renders as `<h1>` |
| `description` | Any text | Supporting paragraph below the headline; useful for a one-liner about your approach |
| `heading_alignment` | `start` / `center` (default) | Left-aligns the header block for editorial layouts; center for symmetrical pages |
| `show_dividers` | `true` (default) / `false` | Toggles thin horizontal rules between items and a top border on the list; turning off gives a cleaner, more minimal look |
| `color_scheme` | `standard-primary` / `standard-secondary` / `highlight-primary` / `highlight-secondary` | Controls background and text palette; accent variants add subtle color contrast, highlight variants use a bold background fill |
| `top_spacing` | `auto` (default) / `none` | Removes the default top padding when set to none; useful for stacking tightly against a hero or another full-bleed section |
| `bottom_spacing` | `auto` (default) / `none` | Same as above for the bottom edge |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `service` | `title` (text), `description` (richtext), `link` (url + text + target) | Each block becomes one numbered row. The number is auto-generated (01, 02, 03...). When a link is present the entire row becomes a clickable anchor with a circular arrow button that animates on hover. Without a link, the row renders as a static `<div>`. |

---

## Layout Recipes

### 1. Three Core Services (Classic)

- **Blocks:** 3 service blocks
- **Settings:** `heading_alignment: center`, `show_dividers: true`, `color_scheme: standard`
- **Good for:** A concise "what we do" section right below the hero
- **Industries:** Consulting firms, accounting practices, law offices

Keep titles short (2-3 words) and descriptions to one sentence. The numbered format implies a deliberate, prioritized offering without needing to say so.

### 2. Capabilities Deep-Dive (5-7 items)

- **Blocks:** 5-7 service blocks
- **Settings:** `heading_alignment: start`, `show_dividers: true`, `color_scheme: standard`, `eyebrow: "Capabilities"`
- **Good for:** A dedicated services page where visitors drill into individual offerings
- **Industries:** Architecture studios, engineering firms, IT managed services

Left-align the header and use a descriptive eyebrow to frame the list editorially. Each link should point to a detail page. The numbered format helps visitors mentally track how many specialties you cover.

### 3. Minimal Process Steps (No Links)

- **Blocks:** 3-4 service blocks, all with empty link fields
- **Settings:** `heading_alignment: center`, `show_dividers: false`, `color_scheme: standard`
- **Good for:** Explaining a working process (Discovery, Design, Deliver) rather than linking to separate pages
- **Industries:** Creative agencies, freelance designers, wedding planners

Removing links hides the arrow buttons entirely, and turning off dividers creates a quiet, spacious feel. The numbers naturally communicate sequence.

### 4. Bold Services Highlight

- **Blocks:** 3-4 service blocks
- **Settings:** `heading_alignment: center`, `show_dividers: true`, `color_scheme: highlight-secondary`, `top_spacing: none`, `bottom_spacing: none`
- **Good for:** A visually distinct band that breaks up a long page with a contrasting background
- **Industries:** Marketing agencies, SaaS companies, fitness studios

Use `highlight-secondary` to make the section pop against standard white sections above and below. Remove spacing on both ends so it reads as a full-bleed stripe.

### 5. Single Focus Service + Upsells

- **Blocks:** 1 primary block (detailed description), 2-3 shorter blocks
- **Settings:** `heading_alignment: start`, `show_dividers: true`, `color_scheme: standard-secondary`, `eyebrow: "How We Help"`
- **Good for:** A landing page for one main service with related add-ons listed below
- **Industries:** Dental clinics, home remodeling contractors, tutoring services

Write a rich, multi-sentence description for the first block and keep the rest brief. The numbered hierarchy does the work of distinguishing the primary offering from the supporting ones.

### 6. Compact Footer Services

- **Blocks:** 4-6 service blocks with short titles, no descriptions
- **Settings:** `heading_alignment: start`, `show_dividers: true`, `color_scheme: highlight`, `bottom_spacing: none`
- **Good for:** A quick navigation list near the bottom of a homepage before the actual footer
- **Industries:** Multi-location clinics, cleaning companies, property management

Leave descriptions blank so each row collapses to just a number, title, and arrow. This creates a tight, directory-style list that works well as a final call-to-action section.

### 7. Two-Service Comparison

- **Blocks:** 2 service blocks with longer descriptions
- **Settings:** `heading_alignment: center`, `show_dividers: true`, `color_scheme: standard`, `title: "Choose Your Path"`, `description: "We offer two distinct engagement models."`
- **Good for:** Presenting two tiers or approaches side-by-side in a vertical format
- **Industries:** Financial advisors (fee-only vs. commission), photographers (packages), coaches (1:1 vs. group)

Two items with the numbered format creates an "Option A / Option B" feel. Use the richtext description to include bullet lists of what each option includes.

---

## Differentiation Tips

- **Numbers as credibility signal.** The 01, 02, 03 format gives a small list the feeling of a curated, deliberate set of offerings rather than a dumping ground. Use it when you want fewer than eight items to look intentional, not sparse.
- **Pair with a hero, not with a grid.** This widget works best directly under a text-focused hero or a full-width image. Avoid placing it next to card grids or icon blocks -- the competing visual density cancels out the clean, editorial feel the numbers create.
- **Use empty descriptions sparingly.** When all descriptions are blank the widget becomes a glorified bulleted list. At minimum, fill in descriptions for your top two items so the layout earns its vertical space.
- **Arrow affordance signals depth.** Visitors interpret the circular arrow as "there is a dedicated page behind this." Only add links when you genuinely have a landing page or anchor to point to. Dead-end links erode trust.
- **Dividers on, spacing off for banding.** Combine `show_dividers: true` with a highlight color scheme and `none` spacing on both ends to create a strong horizontal band. This is the fastest way to add visual rhythm to a monotonous page.
- **Short titles outperform long ones.** The four-column desktop grid (number, title, description, arrow) gets cramped with titles longer than about four words. If you need more context, move it to the description.
- **Richtext descriptions allow inline emphasis.** Because descriptions use richtext, you can bold key phrases or add short inline lists. This is especially useful for service pages where visitors scan for specific keywords like "free consultation" or "same-day service."
