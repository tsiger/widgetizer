# Arch Theme Presets Tracker

30 presets for the Arch theme. Each preset needs: `preset.json` (settings overrides), `templates/`, `menus/`, `screenshot.png`.

## Presets

| # | ID | Name | Industry | Pages | Status |
|---|-----|------|----------|-------|--------|
| 1 | saffron | Saffron | Restaurant | Home, Menu, Gallery, About, Contact | pending |
| 2 | brewline | Brewline | Café / Coffee Shop | Home, Menu, Gallery, About, Contact | pending |
| 3 | crumbly | Crumbly | Bakery | Home, Menu, Gallery, About, Contact | pending |
| 4 | corkwell | Corkwell | Bar / Wine Bar | Home, Menu, Gallery, About, Contact | pending |
| 5 | stillpoint | Stillpoint | Yoga / Pilates Studio | Home, Services, Work, About, Contact | pending |
| 6 | velvet-touch | Velvet Touch | Spa / Massage | Home, Services, Work, About, Contact | pending |
| 7 | brightside | Brightside | Dentist | Home, Services, Work, About, Contact | pending |
| 8 | ironform | Ironform | Personal Trainer | Home, Services, Work, About, Contact | pending |
| 9 | greystone | Greystone | Lawyer / Law Firm | Home, Services, Work, About, Contact | pending |
| 10 | ledgerworks | Ledgerworks | Accountant | Home, Services, Work, About, Contact | pending |
| 11 | clearpath | Clearpath | Consultant | Home, Services, Work, About, Contact | pending |
| 12 | keystoned | Keystoned | Real Estate Agent | Home, Services, Work, About, Contact | pending |
| 13 | pipeworks | Pipeworks | Plumber / Electrician | Home, Services, Work, About, Contact | pending |
| 14 | greenfield | Greenfield | Landscaping | Home, Services, Work, About, Contact | pending |
| 15 | sparkhaus | Sparkhaus | Cleaning Service | Home, Services, Work, About, Contact | pending |
| 16 | hue-and-co | Hue & Co | Interior Designer | Home, Services, Portfolio, About, Contact | pending |
| 17 | framelight | Framelight | Photographer | Home, Services, Portfolio, About, Contact | pending |
| 18 | inkwell | Inkwell | Tattoo Studio | Home, Services, Portfolio, About, Contact | pending |
| 19 | pixelcraft | Pixelcraft | Graphic Designer | Home, Services, Portfolio, About, Contact | pending |
| 20 | formline | Formline | Architecture Firm | Home, Services, Portfolio, About, Contact | pending |
| 21 | petalry | Petalry | Flower Shop | Home, Menu, Gallery, About, Contact | pending |
| 22 | pawlish | Pawlish | Pet Grooming | Home, Services, Work, About, Contact | pending |
| 23 | torque | Torque | Auto Repair | Home, Services, Work, About, Contact | pending |
| 24 | noteworthy | Noteworthy | Tutoring / Music Lessons | Home, Services, Work, About, Contact | pending |
| 25 | little-oaks | Little Oaks | Daycare / Preschool | Home, Programs, Gallery, About, Contact | pending |
| 26 | tailside | Tailside | Veterinarian | Home, Services, Work, About, Contact | pending |
| 27 | codebase | Codebase | Freelance Developer / Agency | Home, Services, Work, About, Contact | pending |
| 28 | uplink | Uplink | IT Support | Home, Services, Work, About, Contact | pending |
| 29 | everafter | Everafter | Wedding Planner | Home, Services, Portfolio, About, Contact | pending |
| 30 | hearthstone | Hearthstone | Hotel / B&B | Home, Services, Rooms, About, Contact | pending |

## Page Name Variations

Most presets use the standard **Home, Services, Work, About, Contact**. Variations by category:

- **Food & Drink** (#1-4, #21): **Menu** instead of Services, **Gallery** instead of Work
- **Creative professionals** (#16-20, #29): **Portfolio** instead of Work
- **Daycare** (#25): **Programs** instead of Services, **Gallery** instead of Work
- **Hotel / B&B** (#30): **Rooms** instead of Work

## Per-Preset Checklist

Each preset requires:
- [ ] `preset.json` — color palette, fonts, style settings
- [ ] `templates/` — demo page content (industry-appropriate)
- [ ] `menus/` — navigation menu
- [ ] `screenshot.png` — 1280x720 preview image

## Notes

- Presets live in `themes/arch/presets/{preset-id}/`
- Registry file: `themes/arch/presets/presets.json`
- 4 existing presets in Electron build (financial, coaching, accounting, legal) — to be replaced by this new set

---

## Image Needs — Saffron (Restaurant)

All images need to be generated/sourced. No images are included in the templates yet.

### Home Page (`index.json`)
| Widget | Image Slot | Description | Suggested Size |
|--------|-----------|-------------|----------------|
| hero_banner | banner bg | Warm, inviting restaurant interior or plated dish — moody lighting, bokeh | 1920×1080 |
| intro_section | image-text image | Chef at work or fresh ingredients on a wooden board | 800×600 |
| featured_dishes | dish-1 card image | Roasted beet & burrata — overhead plating shot | 800×600 |
| featured_dishes | dish-2 card image | Pan-seared halibut — close-up plating | 800×600 |
| featured_dishes | dish-3 card image | Braised lamb shank — rustic, warm tones | 800×600 |
| experience_callout | image-callout image | Restaurant interior — dining room with warm lighting, exposed brick | 800×600 |
| cta_banner | banner bg | Table setting detail — wine glass, candlelight, napkin | 1920×600 |

### Menu Page (`menu.json`)
| Widget | Image Slot | Description | Suggested Size |
|--------|-----------|-------------|----------------|
| menu_hero | banner bg | Kitchen pass — dishes being plated, steam, action | 1920×600 |
| drinks_callout | image-callout image | Craft cocktail on bar counter, atmospheric lighting | 800×600 |

### Gallery Page (`gallery.json`)
| Widget | Image Slot | Description | Suggested Size |
|--------|-----------|-------------|----------------|
| gallery_hero | banner bg | Beautiful overhead shot of a full table spread | 1920×600 |
| food_gallery | food-1 | Roasted beet & burrata — styled plating | 800×varied |
| food_gallery | food-2 | Pan-seared halibut plating | 800×varied |
| food_gallery | food-3 | Braised lamb shank plating | 800×varied |
| food_gallery | food-4 | Handmade pappardelle, rustic styling | 800×varied |
| food_gallery | food-5 | Dark chocolate fondant with ice cream | 800×varied |
| food_gallery | food-6 | Seasonal cocktail, warm bar lighting | 800×varied |
| space_gallery | space-1 | Main dining room — full room shot | 800×600 |
| space_gallery | space-2 | Open kitchen — chefs at work | 800×600 |
| space_gallery | space-3 | Bar area — bottles, stools, mood lighting | 800×600 |
| space_gallery | space-4 | Outdoor patio — string lights, greenery | 800×600 |
| space_gallery | space-5 | Private dining room — table set for event | 800×600 |
| space_gallery | space-6 | Chef's table — intimate setting | 800×600 |
| events_callout | image-text image | Private event in progress — candlelit table | 800×600 |

### About Page (`about.json`)
| Widget | Image Slot | Description | Suggested Size |
|--------|-----------|-------------|----------------|
| about_hero | banner bg | The Saffron storefront exterior, golden hour | 1920×600 |
| founders_story | image-text image | Marco & Elena Reyes — couple portrait, casual/warm | 800×600 |
| philosophy | image-callout image | Hands kneading pasta dough or fresh produce close-up | 800×600 |
| team | profile-1 photo | Marco Reyes headshot — kitchen whites, confident | 400×400 |
| team | profile-2 photo | Elena Reyes headshot — front-of-house, welcoming | 400×400 |
| team | profile-3 photo | Aisha Okafor headshot — pastry station, creative | 400×400 |

### Total: ~30 images needed
- 5 banner/hero backgrounds (1920px wide)
- 3 headshots (400×400)
- ~22 content images (800px wide)
