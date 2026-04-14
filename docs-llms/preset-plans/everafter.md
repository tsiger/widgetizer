## Phase 0 — Industry Strategy Brief

- **Business archetype:** Boutique wedding planning and event design studio for full-service, partial, and wedding-weekend coordination.
- **Primary conversion:** Inquiry submission for a consultation call.
- **Trust mechanism:** Portfolio atmosphere, process clarity, calm expertise, and proof that logistics and aesthetics are handled together.
- **Decision mode:** Emotional and considered. Couples buy on taste, trust, and the feeling that the planner will reduce stress.
- **Brand personality:** Romantic, refined, calm, editorial, and quietly premium.
- **Content posture:** Image-led and process-led. Atmosphere opens the door, but process earns the booking.
- **Audience model:** Primarily engaged couples. Secondary audience: families or friends helping evaluate planners, plus destination couples needing remote confidence.
- **Required page jobs:** Home, Services, Portfolio, About, Contact.
- **No-go patterns:** Corporate minimalism, hard-sell urgency, loud luxury cliches, overly playful styling, too much operational text before emotional proof.
- **Opener candidates:** Cinematic image opener, editorial text opener, process-first opener.
- **Closing pattern:** Soft but confident inquiry handoff with practical reassurance.

## Identity

- **Preset ID:** `everafter`
- **Preset name:** Everafter
- **Industry:** Wedding Planner
- **Positioning:** A Charleston-based planning studio for couples who want a wedding weekend that feels intimate, elegant, and fully held together behind the scenes.

## Industry Translation

Everafter should feel like a boutique planning studio, not a generic event company. The site needs to balance beauty with reassurance: couples should see tasteful, editorial imagery immediately, but the deeper trust signal is the planner's ability to lead the process calmly from inquiry to wedding weekend.

That means the preset should avoid shouting. The palette should feel warm and romantic without becoming pastel-sweet. Typography should feel ceremonial and editorial. Section flow should move from atmosphere to process, then into collections, proof, and practical inquiry questions.

## Sitemap Rationale

- **Home (`index`)** establishes tone, shows the planning path, previews collections, and ends with pre-inquiry reassurance.
- **Services (`services`)** explains planning collections and the working relationship in enough detail to justify a consultation.
- **Portfolio (`portfolio`)** proves taste, versatility, and event quality through imagery.
- **About (`about`)** humanizes the studio and explains the values behind the work.
- **Contact (`contact`)** reduces friction, answers final questions, and gives couples a clear next step.

This is intentionally a compact five-page structure. Wedding planners need proof, process, personality, and a direct inquiry path. Extra pages would add noise more than clarity.

## `preset.json` Settings

### Colors

- `standard_bg_primary`: `#fbf8f4`
- `standard_bg_secondary`: `#f3ece7`
- `standard_text_heading`: `#2f2430`
- `standard_text_content`: `#5d4b58`
- `standard_text_muted`: `#9a8692`
- `standard_border_color`: `#ddcfda`
- `standard_accent`: `#b68b63`
- `standard_accent_text`: `#ffffff`
- `standard_rating_star`: `#d4b06a`
- `highlight_bg_primary`: `#463641`
- `highlight_bg_secondary`: `#352833`
- `highlight_text_heading`: `#fff9f7`
- `highlight_text_content`: `#eadde5`
- `highlight_text_muted`: `#beaeb9`
- `highlight_border_color`: `#6b5764`
- `highlight_accent`: `#e3c7a2`
- `highlight_accent_text`: `#352833`
- `highlight_rating_star`: `#d4b06a`

### Typography

- `heading_font`: `"Cormorant Garamond", serif` at `600`
- `body_font`: `"Jost", sans-serif` at `400`

### Style

- `corner_style`: `slightly-rounded`
- `spacing_density`: `airy`
- `button_shape`: `auto`

### Social

- `instagram_url`: `https://instagram.com/everafter.events`
- `pinterest_url`: `https://pinterest.com/everafterevents`
- `mail_url`: `hello@everafterevents.com`

## Header Configuration

- `logoText`: `Everafter`
- `contactDetailsLine1`: `Wedding Planning & Design`
- `contactDetailsLine2`: `Charleston and destination weekends`
- `contact_position`: `menu`
- `center_nav`: `true`
- `sticky`: `true`
- `transparent_on_hero`: `true`
- Header CTA: `Start Your Inquiry` -> `contact.html`

This header should feel elegant and light on the homepage, then settle into a clean solid navigation state as visitors scroll.

## Footer Configuration

- Layout: `first-featured`
- Surface: `highlight-primary`
- Columns:
  - brand description
  - studio contact details
  - footer navigation
  - social links

The footer should close the site with reassurance rather than a hard sell.

## Page Strategy

### Home

**Job:** Establish emotional tone, prove the work feels elevated, and show that the planning process is calm and structured.

| Order | Role | Widget | Surface | Notes |
|---|---|---|---|---|
| 1 | Hero opener | `banner` | `highlight-primary` | Cinematic image opener with transparent header. Editorial, centered, large-height, image-led. |
| 2 | Process preview | `steps` | `standard-primary` | Four-step planning path with no images so the message stays easy and calm. |
| 3 | Collections preview | `pricing` | `standard-secondary` | Three planning collections with the signature offer featured. |
| 4 | Proof wall | `gallery` | `standard-primary` | Portrait-led gallery showing detail, tablescape, ceremony, and candid moments. |
| 5 | Pre-inquiry reassurance | `accordion` | `highlight-primary` | FAQ with sidebar info block and social block. |

### Services

**Job:** Explain what couples can book and what the working relationship actually feels like.

| Order | Role | Widget | Surface | Notes |
|---|---|---|---|---|
| 1 | Editorial intro | `rich-text` | `highlight-secondary` | Text-led opener that frames the collections page in a more direct voice. |
| 2 | Full collections | `pricing` | `standard-primary` | Three packages with parallel feature structure and featured middle option. |
| 3 | Engagement flow | `steps` | `standard-secondary` | Four-step process walkthrough with planning imagery. |
| 4 | Scope FAQ | `accordion` | `standard-primary` | Service questions with sidebar info block for inquiry handoff. |

### Portfolio

**Job:** Prove range, atmosphere, and taste without becoming cluttered or salesy.

| Order | Role | Widget | Surface | Notes |
|---|---|---|---|---|
| 1 | Page header | `banner` | `standard-primary` | Contained first-widget banner with no image and a softer editorial intro. |
| 2 | Main proof gallery | `gallery` | `standard-primary` | Large portrait-led gallery with staggered layout. |
| 3 | Soft CTA | `rich-text` | `highlight-primary` | Short inquiry nudge after the gallery. |

### About

**Job:** Make the studio feel personal, intentional, and experienced.

| Order | Role | Widget | Surface | Notes |
|---|---|---|---|---|
| 1 | Story intro | `rich-text` | `standard-secondary` | Calm editorial statement about how Everafter works. |
| 2 | Team section | `team-highlight` | `standard-primary` | Founder-duo layout with portrait imagery. |
| 3 | Values close | `rich-text` | `highlight-secondary` | Short values statement plus CTA to contact page. |

### Contact

**Job:** Turn interest into action while answering the last practical questions.

| Order | Role | Widget | Surface | Notes |
|---|---|---|---|---|
| 1 | Inquiry intro | `rich-text` | `highlight-primary` | Warm page opener that frames the inquiry step as collaborative and easy. |
| 2 | Studio details | `map` | `standard-primary` | Map with left sidebar, contact details, hours, and social links. |
| 3 | Final FAQ | `accordion` | `standard-secondary` | Practical answers for timing, destination work, and next steps. |

## Menus

### Main Menu

- Home -> `index.html`
- Services -> `services.html`
- Portfolio -> `portfolio.html`
- About -> `about.html`
- Contact -> `contact.html`

### Footer Menu

- Planning Collections -> `services.html`
- Portfolio -> `portfolio.html`
- About -> `about.html`
- Contact -> `contact.html`

## Widget Usage Summary

| Widget | Count | Why it belongs |
|---|---:|---|
| `banner` | 2 | One cinematic homepage hero and one contained editorial portfolio header |
| `steps` | 2 | Natural fit for a planning business where clarity reduces stress |
| `pricing` | 2 | Wedding planners sell scoped collections; package comparison is essential |
| `gallery` | 2 | Portfolio atmosphere is a core trust signal |
| `accordion` | 3 | Handles objection-reduction and final practical questions |
| `rich-text` | 5 | Supports editorial intros and soft CTA closes without overcomplicating layouts |
| `team-highlight` | 1 | Strong underused fit for a boutique founder-led studio |
| `map` | 1 | Contact utility and destination credibility |

Underused widgets used naturally: `steps`, `team-highlight`.

## Differentiation Notes

- **Opener type:** cinematic, romantic image hero on Home rather than proof-first or offer-first.
- **Proof pattern:** editorial portrait gallery rather than testimonial-heavy social proof.
- **Process pattern:** steps are central because wedding planning is sold through calm structure, not urgency.
- **Header pattern:** centered nav with transparent-on-hero behavior for a polished top-of-site moment.
- **Palette family:** warm ivory, blush, champagne, and plum instead of default navy-based contrast.
- **Typography family:** ceremonial serif + clean sans pairing to keep the preset elegant but usable.

Everafter should feel like a planner who is both aesthetically exacting and operationally calming. That balance is what makes the preset specific.
