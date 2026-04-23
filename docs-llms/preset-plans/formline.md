# Formline - Architecture Firm

Preset plan for the Arch theme. Industry: architecture firm.

---

## Phase 0 - Industry Strategy Brief

- **Business archetype:**
  A boutique architecture practice handling residential projects, adaptive renovations, and selected hospitality work. The site functions as both portfolio and filter: it should attract clients who value clarity, restraint, and process.

- **Primary conversion:**
  A first consultation about site, scope, timeline, and budget fit.

- **Trust mechanism:**
  Built work, disciplined process, and strong judgment. The site has to show that the studio can think clearly before it ever starts styling.

- **Decision mode:**
  Considered and high-ticket. Visitors are choosing for fit, rigor, and design intelligence, not speed or discount.

- **Brand personality:**
  Bright, calm, precise, and contemporary. Not gloomy, not luxurious-for-show, and not corporate.

- **Content posture:**
  Project-led, supported by editorial text. Images matter, but the site must still read well before photography is added.

- **Audience model:**
  Homeowners, developers of small hospitality spaces, and clients evaluating substantial renovations or new-build homes.

- **Required page jobs:**
  - **Home** - establish point of view, show project range, and explain how the studio works.
  - **Projects** - present selected work in a way that feels curated rather than crowded.
  - **Approach** - explain the working process and answer fit questions.
  - **Studio** - humanize the practice and describe how the studio is structured.
  - **Contact** - reduce friction and tell prospects what to send first.

- **No-go patterns:**
  - Dark, cinematic surfaces dominating the site
  - Decorative luxury styling that reads more hotel-brand than architecture studio
  - Widget novelty used as the design itself
  - Corporate services-grid language
  - Aggressive CTA stacking

- **Opener candidates:**
  - Editorial split opener with a concise thesis
  - Quiet page banner with strong type and no image dependency
  - Project-first proof immediately after a short positioning statement

- **Closing pattern:**
  A contained invitation bar that asks for a conversation without sounding salesy.

---

## Phase 1 - Plan

### Identity

- **Name:** Formline
- **Industry label:** Architecture Firm
- **Positioning:** Architecture for homes and adaptive spaces shaped by clarity, light, and long-term use.
- **Site character:** Light, restrained, and disciplined.

### Industry translation

Formline should feel like a real architecture practice, not a theme demo wearing architecture copy. The key decisions are:

1. **Keep the site bright.** The practice should feel calm and exact, not moody.
2. **Let typography do more of the work.** Strong type and measured spacing carry authority better than dramatic widget moves.
3. **Use project widgets plainly.** Projects should read as selected work, not interactive spectacle.
4. **Make process legible.** Architecture clients need to understand how a project moves, not just what a finished room looks like.

### `preset.json` settings

Palette: pale limestone and warm paper on standard surfaces, with a restrained charcoal highlight used only for contained CTA moments.

```json
{
  "settings": {
    "standard_bg_primary": "#fbf7f0",
    "standard_bg_secondary": "#efe8de",
    "standard_text_heading": "#1b1f1c",
    "standard_text_content": "#4f544f",
    "standard_text_muted": "#838880",
    "standard_border_color": "#d8d0c4",
    "standard_accent": "#4f6b5d",
    "standard_accent_text": "#fbf7f0",
    "standard_rating_star": "#c8a063",
    "highlight_bg_primary": "#2a2f2b",
    "highlight_bg_secondary": "#1f2421",
    "highlight_text_heading": "#f6f1e8",
    "highlight_text_content": "#cbc5bb",
    "highlight_text_muted": "#9a9e98",
    "highlight_border_color": "#434943",
    "highlight_accent": "#c8b08a",
    "highlight_accent_text": "#1f2421",
    "highlight_rating_star": "#d6b078",
    "heading_font": { "stack": "\"Space Grotesk\", sans-serif", "weight": 500 },
    "heading_scale": 95,
    "body_font": { "stack": "\"IBM Plex Sans\", sans-serif", "weight": 400 },
    "body_scale": 100,
    "corner_style": "sharp",
    "spacing_density": "airy",
    "button_shape": "sharp"
  }
}
```

### Header configuration

Simple, bright, and restrained:

```json
{
  "type": "header",
  "settings": {
    "logoText": "Formline",
    "contactDetailsLine1": "hello@example.com",
    "contactDetailsLine2": "By appointment",
    "contact_position": "logo",
    "headerNavigation": "main-menu",
    "center_nav": false,
    "ctaButtonLink": { "href": "contact.html", "text": "Start a conversation", "target": "_self" },
    "ctaButtonStyle": "secondary",
    "full_width": true,
    "sticky": true,
    "transparent_on_hero": false,
    "color_scheme": "standard-primary"
  }
}
```

### Footer configuration

The footer stays light and informational:

```json
{
  "type": "footer",
  "settings": {
    "copyright": "(c) 2026 Formline Studio. All rights reserved.",
    "layout": "first-featured",
    "color_scheme": "standard-secondary"
  }
}
```

### Sitemap rationale

| Slug | Name | Job |
|---|---|---|
| `index` | Home | Set the tone, show selected work, and explain process. |
| `projects` | Projects | Present a curated portfolio and project framing. |
| `approach` | Approach | Explain how the studio works and answer fit questions. |
| `studio` | Studio | Describe the practice and its working philosophy. |
| `contact` | Contact | Give visitors a low-friction way to reach out well. |

### Page strategy

The widget system should stay narrow and disciplined:

- `split-content` for editorial openings and practice statements
- `project-showcase` for portfolio structure
- `rich-text` for architectural point of view
- `timeline` for process
- `accordion` for practical questions
- `action-bar` for contained closing invitations

Avoid using the more novelty-driven widgets as the core identity of the preset.

### Page-by-page widget plan

#### Home

1. `split-content` - editorial opener
2. `project-showcase` - selected projects
3. `rich-text` - studio point of view
4. `timeline` - process summary
5. `action-bar` - contained invitation

#### Projects

1. `banner` - page framing
2. `project-showcase` - broader selected work
3. `image-text` - project spotlight 1
4. `image-text` - project spotlight 2
5. `split-content` - note on what the studio values in a project
6. `action-bar` - consultation invite

#### Approach

1. `banner` - process opener
2. `split-content` - working philosophy
3. `timeline` - phased process
4. `accordion` - practical questions
5. `action-bar` - consultation invite

#### Studio

1. `banner` - studio opener
2. `split-content` - practice thesis
3. `rich-text` - longer studio profile
4. `accordion` - studio working model
5. `action-bar` - consultation invite

#### Contact

1. `banner` - contact framing
2. `contact-details` - contact routes and scope notes
3. `accordion` - inquiry questions

### Menus

**Main menu**

1. Home
2. Projects
3. Approach
4. Studio
5. Contact

**Footer menu**

1. Projects
2. Approach
3. Studio
4. Contact

### Differentiation notes

Formline should now differentiate through restraint rather than novelty:

- bright, non-depressing palette
- contemporary sans-led typography
- architecture-appropriate editorial layout
- project-first proof without gimmicky interaction
- process clarity as a core trust signal

### Image rule reminder

No template JSON in this preset should include image file references. Any image-bearing settings must be omitted entirely.
