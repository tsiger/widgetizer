# Codebase — Freelance Developer / Agency Preset Plan

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Portfolio-led studio / consultancy. A freelance developer or small dev agency that wins clients through demonstrated capability, process clarity, and technology credibility. Revenue comes from project-based contracts and retainers.

- **Primary conversion:** Project inquiry or consultation request. The visitor needs to see enough proof and process clarity to feel confident reaching out with a project.

- **Trust mechanism:** Portfolio quality, technology expertise, process transparency, and client testimonials. Unlike visual industries (photography, design), a dev business proves itself through structured case studies, named technologies, and clear articulation of how work gets done — not just pretty screenshots.

- **Decision mode:** High-ticket, considered. Clients are typically comparing 2-4 developers or agencies. They evaluate based on relevant experience, communication quality, technical depth, and whether the dev/agency understands their problem. Price is discussed later — the site must earn the conversation first.

- **Brand personality:** Sharp, modern, and technically confident without being cold or intimidating. Should feel like a developer who also understands business — precise but approachable. Not corporate, not startup-flashy, not hacker-cave dark mode.

- **Content posture:** Process-led with portfolio support. The site must explain how the developer works (discovery, development, launch, support) and show examples of completed projects. Text and structure carry the site more than imagery — this is not a visual portfolio like a photographer's.

- **Audience model:** Single primary audience — business owners, startup founders, and project managers looking to hire a developer or small agency for web projects. They may not be technical themselves, so the site must translate capabilities without jargon overload.

- **Required page jobs:**
  - **Home** — Establish technical credibility, surface key services, show select work, drive inquiry
  - **Services** — Break down service offerings with enough detail to self-qualify
  - **Work** — Portfolio of completed projects as proof of capability
  - **About** — Story, values, team/solo profile, technology stack
  - **Contact** — Low-friction inquiry form equivalent, availability, response expectations

- **No-go patterns:**
  - Dark mode / hacker aesthetic (too niche, alienates non-technical clients)
  - Overly corporate enterprise language ("synergy," "digital transformation")
  - Startup-style hyperbole ("revolutionary," "disruptive")
  - Generic stock photos of people at laptops
  - Too much text before showing work
  - Aggressive CTA stacking

- **Opener candidates:**
  - Clean text-led hero with a clear value proposition and inquiry CTA — lets the copy do the positioning
  - Editorial opener: bold heading + compact subtitle, no image dependency

- **Closing pattern:**
  - Soft invitation — "Have a project in mind?" with a single inquiry CTA. Not pushy. The decision mode is considered, so the close should feel like an open door, not a countdown timer.

---

## Phase 1 — Full Plan

### Identity

- **Preset ID:** codebase
- **Preset name:** Codebase
- **Industry:** Freelance Developer / Agency
- **Description:** Freelance developer / agency

### Industry Translation

Codebase is a freelance developer or small dev agency site. The site leads with a text-driven hero that states what they build and for whom — no image dependency. It surfaces services through a numbered list (structured, deliberate), shows a portfolio of completed projects, and closes pages with a soft inquiry invitation. The tone is confident and precise without being cold. Typography is modern and slightly technical. The palette is clean with a sophisticated accent.

### Sitemap

| Page | Slug | Job |
|------|------|-----|
| Home | index | Establish credibility, surface services, show select work, drive inquiry |
| Services | services | Break down service offerings with detail |
| Work | work | Portfolio of completed projects |
| About | about | Story, values, team, tech stack |
| Contact | contact | Inquiry, availability, location |

### preset.json Settings

**Colors — Standard:**
- `standard_bg_primary`: `#fafafa`
- `standard_bg_secondary`: `#f0f0ee`
- `standard_text_heading`: `#18181b`
- `standard_text_content`: `#3f3f46`
- `standard_text_muted`: `#71717a`
- `standard_border_color`: `#d4d4d8`
- `standard_accent`: `#2563eb` (confident blue — technical, trustworthy, not corporate)
- `standard_accent_text`: `#ffffff`
- `standard_rating_star`: `#f59e0b`

**Colors — Highlight:**
- `highlight_bg_primary`: `#18181b`
- `highlight_bg_secondary`: `#0f0f12`
- `highlight_text_heading`: `#fafafa`
- `highlight_text_content`: `#a1a1aa`
- `highlight_text_muted`: `#71717a`
- `highlight_border_color`: `#2e2e35`
- `highlight_accent`: `#3b82f6` (brighter blue for dark surfaces)
- `highlight_accent_text`: `#ffffff`
- `highlight_rating_star`: `#f59e0b`

**Typography:**
- `heading_font`: `{ "stack": "\"Space Grotesk\", sans-serif", "weight": 600 }` — geometric, modern, slightly technical character. Distinctive without being gimmicky.
- `body_font`: `{ "stack": "\"DM Sans\", sans-serif", "weight": 400 }` — clean, highly readable, pairs well with geometric headings.

**Style:**
- `corner_style`: `slightly-rounded`
- `spacing_density`: `airy` — gives the text-heavy content room to breathe
- `button_shape`: `auto`

### Header Configuration

- `logoText`: `"Codebase"`
- `contactDetailsLine1`: `"hello@codebase.dev"`
- `contactDetailsLine2`: `""`
- `contact_position`: `"logo"`
- `ctaButtonLink`: `{ "href": "contact.html", "text": "Start a Project", "target": "_self" }`
- `ctaButtonStyle`: `"primary"`
- `full_width`: `true`
- `sticky`: `true`
- `transparent_on_hero`: `false`
- `color_scheme`: `"standard-primary"`

### Footer Configuration

- `copyright`: `"© 2026 Codebase. All rights reserved."`
- `layout`: `"first-featured"`
- `color_scheme`: `"highlight-primary"`
- Blocks:
  1. `logo_text` — short agency description
  2. `text_block` — title: "Get In Touch", contact info
  3. `menu_block` — title: "Navigate"
  4. `social_block` — title: "Connect"

### Menus

**Main Menu:**
- Home → index.html
- Services → services.html
- Work → work.html
- About → about.html
- Contact → contact.html

**Footer Menu:**
- Services → services.html
- Work → work.html
- About → about.html
- Contact → contact.html

---

### Page Strategy

#### Homepage (index)

**Job:** Establish credibility, surface services, show select work, drive inquiry.

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | hero_banner | highlight-primary | Text-led hero — value proposition, no image |
| 2 | logo-cloud | client_logos | standard-secondary | Social proof: "Trusted by" client logos |
| 3 | numbered-service-list | services_list | standard-primary | 4 core services with auto-numbering |
| 4 | project-showcase | featured_work | standard-secondary | 3 featured projects, hover-reveal |
| 5 | testimonial-hero | client_quote | standard-primary | Single featured client testimonial |
| 6 | steps | process_overview | highlight-primary | 4-step development process |
| 7 | action-bar | inquiry_cta | highlight-secondary | "Have a project in mind?" CTA |

**Spacing notes:**
- logo-cloud: `top_spacing: small`, `bottom_spacing: small`

#### Services (services)

**Job:** Break down offerings with enough detail for self-qualification.

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | services_hero | highlight-primary | Inner page title — "What We Build" |
| 2 | features-split | services_detail | standard-primary | 4 services with icons, descriptions, split layout |
| 3 | icon-card-grid | tech_stack | standard-secondary | 6 technology/skill cards with icons |
| 4 | testimonials | services_reviews | standard-primary | 2 client testimonials about working together |
| 5 | action-bar | services_cta | highlight-primary | "Ready to build?" CTA |

#### Work (work)

**Job:** Portfolio of completed projects as proof of capability.

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | work_hero | highlight-primary | Inner page title — "Our Work" |
| 2 | project-showcase | portfolio_grid | standard-primary | 6 projects, hover-reveal titles |
| 3 | bento-grid | case_study | standard-secondary | Highlighted case study with mixed tiles |
| 4 | testimonial-hero | work_quote | highlight-primary | Client quote about project outcome |
| 5 | action-bar | work_cta | highlight-secondary | "Let's build something together" CTA |

#### About (about)

**Job:** Story, values, team, technology credibility.

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | about_hero | highlight-primary | Inner page title — "About Codebase" |
| 2 | rich-text | story_section | standard-primary | Founding story / mission statement |
| 3 | image-text | approach_section | standard-secondary | Development philosophy with text |
| 4 | profile-grid | team_grid | standard-primary | 3 team members with roles and links |
| 5 | key-figures | stats_section | highlight-primary | 4 credibility numbers |
| 6 | action-bar | about_cta | highlight-secondary | "Start a conversation" CTA |

#### Contact (contact)

**Job:** Low-friction inquiry, availability, response expectations.

| # | Widget | Instance ID | Color Scheme | Purpose |
|---|--------|-------------|--------------|---------|
| 1 | banner | contact_hero | highlight-primary | Inner page title — "Get In Touch" |
| 2 | accordion | contact_faq | standard-primary | 4 FAQs about working together, with sidebar info |
| 3 | map | location_map | standard-secondary | Location with sidebar contact details |
| 4 | action-bar | contact_cta | highlight-primary | "Ready to start?" CTA |

---

### Widget Usage Summary

| Widget | Count | Pages |
|--------|-------|-------|
| banner | 5 | All pages (hero/title) |
| action-bar | 5 | All pages (closing CTA) |
| numbered-service-list | 1 | Home |
| project-showcase | 2 | Home, Work |
| logo-cloud | 1 | Home |
| testimonial-hero | 2 | Home, Work |
| steps | 1 | Home |
| features-split | 1 | Services |
| icon-card-grid | 1 | Services |
| testimonials | 1 | Services |
| bento-grid | 1 | Work |
| rich-text | 1 | About |
| image-text | 1 | About |
| profile-grid | 1 | About |
| key-figures | 1 | About |
| accordion | 1 | Contact |
| map | 1 | Contact |

**Underused widgets featured:** numbered-service-list (perfect for a dev agency's curated service list), bento-grid (case study highlight with mixed tiles), testimonial-hero (featured single client quote), project-showcase (hover-reveal portfolio).

### Differentiation Notes

- **Opener:** Text-only banner on highlight — no image dependency. Clean, editorial, lets the copy position the business.
- **Composition:** Process-led home with numbered services + project showcase + single testimonial hero — not the typical grid-of-cards approach.
- **Typography:** Space Grotesk + DM Sans — geometric and technical without being monospace. Distinct from serif/sans pairings used in most service presets.
- **Palette:** Warm zinc grays (#18181b / #fafafa) with confident blue accent (#2563eb) — modern dev aesthetic without dark-mode cliché.
- **Style:** Slightly-rounded corners + airy spacing — approachable, breathable, not the sharp edges of a corporate site.
- **Numbered-service-list:** Deliberate, curated feel that matches how dev agencies present offerings (01, 02, 03...).
- **Project-showcase with hover:** Portfolio feel without gallery heaviness — titles revealed on hover keeps it clean.
- **Closing:** Every page ends with a soft "Have a project?" action-bar — consistent but never pushy.
