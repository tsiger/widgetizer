# Keystoned — Real Estate Agent

## Identity

**Name:** Keystoned Real Estate
**Industry:** Real Estate Agent / Brokerage
**Personality:** Polished, aspirational, locally rooted. Keystoned is the agent who knows every street, every school district, every zoning quirk. The site leads with stunning property visuals and backs it up with market expertise and personal trust. Warm tones, clean architecture, and a sense of home — luxury positioning that doesn't alienate first-time buyers.

---

## Sitemap

6 pages, tailored to how real estate clients actually browse:

| Page | Slug | Purpose |
|------|------|---------|
| Home | `index` | Hero slideshow of featured properties, trust stats, services preview, testimonials |
| Properties | `properties` | Showcase of current/featured/sold listings |
| Neighborhoods | `neighborhoods` | Area guides showing local expertise |
| Buyers & Sellers | `guides` | Dedicated guidance for each audience |
| About | `about` | Agent bio, personal story, credentials |
| Contact | `contact` | Scheduling, office location, FAQ |

---

## preset.json Settings

### Color Palette

A warm, luxurious palette built around deep wine and cream. The wine accent is unique — clearly red-brown, distinct from Velvet Touch's pink-mauve (#8c5e6b) and Greystone's bronze (#8c6434).

**Standard palette (light):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `standard_bg_primary` | `#faf8f6` | Warm off-white — like cream-painted walls |
| `standard_bg_secondary` | `#f2eee9` | Warm beige — travertine, natural stone |
| `standard_text_heading` | `#1f1a17` | Near-black with warm undertone |
| `standard_text_content` | `#453d36` | Warm dark brown — inviting, readable |
| `standard_text_muted` | `#7d7369` | Warm medium gray |
| `standard_border_color` | `#ddd6cd` | Warm light border |
| `standard_accent` | `#6e3b3b` | Deep wine — premium, established, warm |
| `standard_accent_text` | `#ffffff` | White on wine — 7.2:1 contrast |
| `standard_rating_star` | `#d4a843` | Warm gold |

**Highlight palette (dark):**

| Token | Value | Rationale |
|-------|-------|-----------|
| `highlight_bg_primary` | `#1f1a17` | Dark warm brown-black — like walnut |
| `highlight_bg_secondary` | `#151210` | Deeper dark |
| `highlight_text_heading` | `#f5f0eb` | Warm off-white |
| `highlight_text_content` | `#bfb5a8` | Warm light gray — 5.9:1 on bg_primary |
| `highlight_text_muted` | `#8a7f73` | Warm muted |
| `highlight_border_color` | `#3a322b` | Dark warm border |
| `highlight_accent` | `#c07070` | Lighter wine for dark backgrounds — 4.8:1 |
| `highlight_accent_text` | `#1f1a17` | Dark text on light accent |
| `highlight_rating_star` | `#d4a843` | Consistent gold |

### Typography

| Setting | Value | Rationale |
|---------|-------|-----------|
| `heading_font` | `{ "stack": "\"Cinzel\", serif", "weight": 600 }` | Elegant display serif — classical, premium, architectural. Not yet used. Perfect for real estate. |
| `body_font` | `{ "stack": "\"Barlow\", sans-serif", "weight": 400 }` | Clean geometric sans — crisp readability against the ornate headings. Not yet used. |
| `heading_scale` | `100` | Standard — Cinzel carries presence at default size |
| `body_scale` | `100` | Standard |

### Style

| Setting | Value | Rationale |
|---------|-------|-----------|
| `corner_style` | `sharp` | Architectural, clean lines — like a building's facade |
| `spacing_density` | `airy` | Premium, spacious. Luxury real estate needs breathing room |
| `button_shape` | `pill` | Soft CTAs — elegant contrast with sharp corners. Sharp + airy + pill is a unique combo |

---

## Header Configuration

```json
{
  "logoText": "Keystoned",
  "contactDetailsLine1": "(617) 555-0189",
  "contactDetailsLine2": "",
  "contact_position": "logo",
  "headerNavigation": "main-menu",
  "center_nav": false,
  "ctaButtonLink": {
    "href": "properties.html",
    "text": "View Properties",
    "target": "_self"
  },
  "ctaButtonStyle": "primary",
  "full_width": true,
  "sticky": false,
  "transparent_on_hero": true,
  "color_scheme": "standard"
}
```

**Header differentiation:** Transparent on hero + phone number + primary CTA pointing to Properties (not Contact). This is the first preset where the CTA links to a non-contact page — because in real estate, the primary action is browsing listings. Transparent overlay on the slideshow hero creates an immersive property showcase.

---

## Footer Configuration

```json
{
  "copyright": "\u00a9 2026 Keystoned Real Estate. All rights reserved.",
  "color_scheme": "highlight"
}
```

**Blocks:**

| # | Type | Settings |
|---|------|----------|
| 1 | `logo_text` | `logo_text`: "Keystoned", `text`: "<p>Your trusted real estate partner in Greater Boston. Buying, selling, and investing since 2009.</p>" |
| 2 | `text_block` | `title`: "Contact", `text`: "<p>(617) 555-0189</p><p>sarah@keystoned.com</p><p>84 Charles St<br>Boston, MA 02114</p>" |
| 3 | `menu_block` | `title`: "Pages", `menu`: "footer-menu" |
| 4 | `social_block` | `title`: "Follow" |

---

## Pages

### Home (`index.json`) — 7 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Hero | `slideshow` | per-slide | **Large** height, center-aligned, autoplay 6000ms. 3 slides — each a featured property with full-bleed photo, dark overlay, heading 5xl (property address), text lg (price + beds/baths), button primary "View Details" → properties.html. Slide 1: highlight, Slide 2: highlight, Slide 3: highlight. `top_spacing: none`. |
| 2 | Trust Stats | `trust-bar` | `standard-accent` | Filled icons md rounded, left alignment, dividers on. 4 items: trophy/"15+ Years Experience", home/"200+ Homes Sold", chart-bar/"$250M+ in Sales", star/"5-Star Reviews". |
| 3 | Featured Listings | `card-grid` | `standard` | 3 columns, grid, box, 4/3 aspect, start alignment, heading left. Eyebrow "On the Market", title "Featured Properties". 3 cards: each with property photo, subtitle (neighborhood), title (address), description (beds/baths/sqft + price), button_link "View Property" → properties.html. |
| 4 | About Teaser | `image-text` | `standard` | Image right (agent portrait), text_position center. Eyebrow "YOUR AGENT", heading 3xl "Sarah Caldwell", text about experience and approach, button secondary "About Sarah" → about.html. |
| 5 | Testimonials | `testimonials` | `standard-accent` | 3 columns, grid, box, heading center. Eyebrow "Client Stories", title "What Buyers & Sellers Say". 3 quotes with 5-star ratings. |
| 6 | Buyer/Seller CTA | `icon-card-grid` | `highlight` | 3 columns, grid, flat, center alignment, outline icons lg circle, heading center. Title "Whether You're Buying or Selling". 3 cards: home/"First-Time Buyers" (guidance + button → guides.html), key/"Ready to Sell" (strategy + button → guides.html), growth/"Property Investors" (portfolio advice + button → guides.html). |
| 7 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Ready to Make Your Move?", text sm uppercase muted "Free market analysis for your home.", button primary medium "Get in Touch" → contact.html. |

### Properties (`properties.json`) — 4 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Header | `banner` | `standard-accent` | Small height, center alignment. Heading 3xl "Properties", text base "Current listings and recently sold homes." No image. `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Listings | `project-showcase` | `standard` | 3 columns, grid, 4/3 aspect, always text, heading left. Eyebrow "Currently Available", title "Featured Listings". 6 projects: properties with photos, address as title, description with beds/baths/sqft/price. |
| 3 | Sold | `key-figures` | `highlight` | 4 columns, grid, flat, animate true. Eyebrow "Track Record", title "Recent Results". 4 figures: "200+"/"Homes Sold", "$1.2M"/"Average Sale Price", "98%"/"Asking Price Achieved", "14"/"Avg. Days on Market". |
| 4 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Don't See What You're Looking For?", text sm uppercase muted "We have access to off-market listings.", button primary "Contact Sarah" → contact.html. |

### Neighborhoods (`neighborhoods.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Header | `banner` | `standard-accent` | Small height, center alignment. Heading 3xl "Neighborhoods", text base "Explore the communities we know best." No image. `top_spacing: none`, `bottom_spacing: none`. |
| 2 | Areas | `card-grid` | `standard` | 3 columns, grid, box, 4/3 aspect, center alignment, heading center. No section heading. 6 cards: Beacon Hill, Back Bay, South End, Cambridge, Brookline, Somerville. Each with area photo, title, description (character + price range), button_link "Explore". |
| 3 | Expertise | `image-callout` | `highlight` | Image left. Heading 3xl "Local Knowledge Makes the Difference", text about 15 years of area expertise, features "+School district and zoning expertise\n+Off-market and pre-listing access\n+Neighborhood-specific pricing strategy", button secondary "About Sarah" → about.html. |
| 4 | Testimonials | `testimonials` | `standard` | 2 columns, grid, flat, heading center. Title "From Our Neighbors". 2 quotes from local buyers. |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Considering a Move?", button primary "Free Consultation" → contact.html. |

### Buyers & Sellers (`guides.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Intro | `split-content` | `standard-accent` | Balance left-heavy, sticky_column none. Left: eyebrow "GUIDES", heading 4xl "Buying or Selling — We've Got You Covered", button primary "Contact Sarah" → contact.html. Right: text base with overview of services for both audiences. `top_spacing: none`. |
| 2 | For Buyers | `image-text` | `standard` | Image left (couple touring a home), text_position center. Eyebrow "FOR BUYERS", heading 3xl "Find Your Next Home", text about buyer representation, features "+Personalized property search\n+Negotiation strategy\n+Home inspection coordination\n+Closing support from offer to keys". |
| 3 | For Sellers | `image-text` | `highlight` | Image right (staged living room), text_position center. Eyebrow "FOR SELLERS", heading 3xl "Sell With Confidence", text about listing strategy, features "+Comparative market analysis\n+Professional staging & photography\n+Strategic pricing & marketing\n+Open house management". |
| 4 | Process | `steps` | `standard-accent` | Heading center. Eyebrow "How It Works", title "From First Call to Closing Day". 4 steps: Consultation (discuss goals), Strategy (build a plan), Execute (find/list the property), Close (navigate paperwork to keys). Each with image + description. |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Let's Start the Conversation", text sm uppercase muted "No pressure. Just honest answers.", button primary "Book a Call" → contact.html. |

### About (`about.json`) — 5 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Agent Story | `image-text` | `highlight` | Image left (agent portrait), text_position center. Eyebrow "MEET SARAH", heading 3xl "Real Estate Is Personal", text about personal background, approach, and why she became an agent — 2 paragraphs. `top_spacing: none`. |
| 2 | Stats | `key-figures` | `standard-accent` | 4 columns, grid, flat, animate true. No heading. 4 figures: "15+"/"Years in Real Estate", "200+"/"Homes Closed", "$250M+"/"Total Sales Volume", "98%"/"Client Satisfaction". |
| 3 | Testimonials | `testimonial-slider` | `standard` | Autoplay true, 5000ms. 4 quotes with avatars, 5-star ratings, names, and context (buyer/seller). |
| 4 | FAQ | `accordion` | `standard-accent` | Separated style, heading center, allow_multiple true. Title "Common Questions". 5 items about working with Sarah: "What areas do you cover?", "Do you work with first-time buyers?", "How do you determine the right listing price?", "What are your fees?", "How quickly can we get started?". |
| 5 | CTA | `action-bar` | `highlight` | `fullwidth: false`. Heading 2xl "Let's Work Together", text sm uppercase muted "Your first consultation is always free.", button primary "Get in Touch" → contact.html. |

### Contact (`contact.json`) — 3 widgets

| # | Widget | Type | Color Scheme | Configuration |
|---|--------|------|-------------|---------------|
| 1 | Intro | `features-split` | `standard-accent` | Heading left, content_position left, divider on, filled icons lg rounded. Eyebrow "Get in Touch", title "Ready When You Are". 3 features: message-circle/"Free Consultation" (30-min call to discuss your goals), home/"Market Analysis" (complimentary CMA for your property), calendar/"Property Tour" (schedule viewings of current listings). `top_spacing: none`. |
| 2 | Map | `map` | `standard` | Medium height, sidebar right, show_address true. Address: "84 Charles St, Boston, MA 02114". Directions link → Google Maps. Sidebar: 1 info block (title "Office Hours", weekday/weekend/by-appointment). |
| 3 | FAQ | `accordion` | `standard-accent` | Separated style, heading center, allow_multiple true. Title "Frequently Asked Questions". 4 items about the process: "What should I prepare for our first meeting?", "How long does it take to buy/sell a home?", "Do I need to be pre-approved before we start looking?", "Can you help with investment properties?". |

---

## Menus

### main-menu.json

| Label | URL |
|-------|-----|
| Properties | properties.html |
| Neighborhoods | neighborhoods.html |
| Buyers & Sellers | guides.html |
| About | about.html |
| Contact | contact.html |

### footer-menu.json

| Label | URL |
|-------|-----|
| Home | index.html |
| Properties | properties.html |
| Neighborhoods | neighborhoods.html |
| Buyers & Sellers | guides.html |
| About | about.html |
| Contact | contact.html |

---

## Widget Usage Summary

| Widget Type | Count |
|-------------|-------|
| `slideshow` | 1 (home hero) |
| `trust-bar` | 1 |
| `card-grid` | 2 (home listings, neighborhoods) |
| `image-text` | 3 (home, buyers, sellers) |
| `testimonials` | 2 (home, neighborhoods) |
| `icon-card-grid` | 1 |
| `action-bar` | 5 |
| `banner` | 2 (properties, neighborhoods headers) |
| `project-showcase` | 1 |
| `key-figures` | 2 (properties, about) |
| `split-content` | 1 |
| `image-callout` | 1 |
| `steps` | 1 |
| `testimonial-slider` | 1 |
| `accordion` | 2 |
| `features-split` | 1 |
| `map` | 1 |

**Total:** 28 widget instances across 6 pages, **17 unique types**.

---

## Header Differentiation Notes

Keystoned is the **first preset** where:
- **CTA links to a content page** (Properties) instead of Contact — because in real estate, browsing listings is the primary action
- **Transparent header** + **phone number visible** + not sticky — immersive hero that still shows the agent's phone number
- Transparent + standard + phone + primary CTA is a unique combination
