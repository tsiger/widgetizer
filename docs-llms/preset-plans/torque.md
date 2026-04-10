# Torque — Auto Repair

## Identity

**Business name:** Torque Auto Repair  
**Industry:** Auto repair / fleet maintenance  
**Brand personality:** Direct, competent, industrial-warm. A full-service shop that leads with diagnostics and documentation—not hype.  
**Primary conversion:** Book service / call the shop  
**Trust mechanism:** ASE certifications, digital inspections, warranty language, fleet references  
**Emotional tone:** Confident, no-nonsense, safety-first  
**Image style:** Shop floor, lifts, clean bays, fleet vans  
**Content density:** Medium-high (services + fleet need clarity)  
**Homepage emphasis:** Credibility in the first fold, then process proof, then social proof

---

## Industry Translation

Auto repair is **trust + clarity + urgency**:

1. **Diagnostics before sales** — customers fear upsells; the site stresses inspection-first workflow and approval before work.
2. **Dual audience** — retail drivers and fleet operators need different proof (reviews vs. PM programs and billing).
3. **Process visibility** — steps widget and comparison slider reinforce “we show our work.”
4. **Fleet page earns its own URL** — separate from generic “services” to capture B2B expectations (invoicing, DOT-minded language).

---

## Sitemap

| Page | Slug | Purpose |
|------|------|---------|
| Home | `index` | Split-hero positioning, trust bar, audience split, visit steps, comparison proof, stats, reviews, CTA |
| Services | `services` | Numbered service categories, maintenance packages (pricing), FAQ + fleet sidebar |
| Fleet | `fleet` | Commercial value prop, benefits (icon list), fleet CTA |
| About | `about` | Story + leadership / certifications (profile grid) |
| Contact | `contact` | Contact-details + map |

---

## preset.json Settings

- **Palette:** Cool zinc neutrals (`#f4f4f5`, `#e4e4e7`) with **racing red** accents (`#b91c1c` on light, `#ef4444` on dark highlights). Surfaces are **true black / zinc-950** (`#09090b`, `#000000`) for a motorsport, high-contrast feel. Stars use **gold** (`#eab308`) for a trophy / performance cue.
- **Typography:** `Chivo` 700 + `IBM Plex Sans` 400 (mechanical headline + readable technical body).
- **Style:** `slightly-rounded`, `default` density, `auto` buttons—utilitarian, not playful.

---

## Header / Footer

- **Header:** Sticky, phone + address in logo area, primary CTA “Book service” → `contact.html`.
- **Footer:** Highlight scheme, shop hours + fleet email mention, standard blocks.

---

## Widget usage summary

| Widget | Role |
|--------|------|
| `split-hero` | Homepage opener (not a full-bleed banner—distinct from trades presets that use `banner`) |
| `scrolling-text` | Service-line ticker |
| `trust-bar` | ASE / warranty / inspections / reviews |
| `features-split` | Consumer vs fleet vs hybrid lanes |
| `steps` | Appointment flow |
| `comparison-slider` | “Typical quick shop” vs Torque documentation standard |
| `key-figures` | Shop scale proof |
| `testimonials` | Mixed retail + fleet quotes |
| `numbered-service-list` | Services page depth |
| `pricing` | Maintenance packages |
| `accordion` | FAQ + sidebar info/social |
| `icon-list` | Fleet program benefits |
| `contact-details` | Structured contact page |

---

## Differentiation notes

- Opener: **split-hero** on dark highlight with image right (shop energy), not the same `banner`+emergency pattern as Pipeworks.
- Proof pattern: **steps + comparison-slider** instead of default testimonial-only arc.
- Fleet: dedicated **fleet.html** with icon-list (not a generic “About” paragraph).
- Typography pairing (Chivo + IBM Plex Sans) is distinct from recent presets using Fredoka, Rubik, etc.
