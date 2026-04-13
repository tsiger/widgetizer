# Map Widget Insights

Embeddable Google Maps section with optional address bar, directions link, and a sidebar for contact info or social links.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text | Small label above the headline, useful for "Our Location" or "Visit Us" |
| `title` | Any text (default: "Find Us") | Section headline, rendered as `<h1>` when first widget on page, `<h2>` otherwise |
| `description` | Any text | Subtext paragraph below the headline |
| `heading_alignment` | `start`, `center` | Left-aligns or centers the eyebrow/title/description block |
| `address` | Any text (default: "123 Main Street, New York, NY 10001") | Displayed below the map with a pin icon; also used in the iframe title attribute |
| `embed_url` | Google Maps embed URL | The actual map iframe source; if empty, a placeholder with instructions is shown |
| `directions_link` | Link object (text + href + target) | "Get Directions" style link shown next to the address |
| `height` | `small` (300px), `medium` (450px), `large` (600px) | Controls iframe/placeholder height |
| `show_address` | `true` / `false` | Toggles the address + pin icon row beneath the map |
| `sidebar_position` | `start`, `end` | Puts the info/social sidebar on the chosen side; grid flips from 7fr/3fr to 3fr/7fr |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | Changes background and container styling; non-standard schemes add padded container |
| `top_spacing` | `auto`, `none` | Removes top section padding when set to `none` -- useful for stacking with adjacent widgets |
| `bottom_spacing` | `auto`, `none` | Removes bottom section padding when set to `none` |

---

## Available Blocks

| Block Type | Purpose | Settings |
|------------|---------|----------|
| **info** | Sidebar card with a title and richtext body. Stack multiple for hours, phone, email, parking notes, etc. | `title` (text), `text` (richtext) |
| **social** | Renders the site-wide social media icon row pulled from theme settings. No per-block settings. | None |

Default configuration ships with one **info** block ("Need Help?" / email address).

---

## Layout Recipes

### 1. Simple Locator

| Setting | Value |
|---------|-------|
| `heading_alignment` | `center` |
| `height` | `medium` |
| `show_address` | `true` |
| `directions_link` | "Get Directions" pointing to Google Maps |
| Blocks | None (remove default info block) |

**Good for:** Single-location businesses that just need a "where to find us" section.
**Industries:** Hair salons, coffee shops, dry cleaners, florists.

---

### 2. Contact Hub

| Setting | Value |
|---------|-------|
| `heading_alignment` | `start` |
| `height` | `large` |
| `sidebar_position` | `right` |
| `show_address` | `true` |
| Blocks | Info: "Hours" with weekday schedule. Info: "Contact" with phone + email. Social block. |

**Good for:** Replacing a full contact page -- map plus all the details visitors need in one section.
**Industries:** Restaurants, dental offices, law firms, auto repair shops.

---

### 3. Minimal Footer Map

| Setting | Value |
|---------|-------|
| `title` | (empty) |
| `eyebrow` | (empty) |
| `height` | `small` |
| `show_address` | `false` |
| `color_scheme` | `highlight-primary` |
| `bottom_spacing` | `none` |
| Blocks | None |

**Good for:** A quiet map strip just above the footer that shows location without competing with other content.
**Industries:** Any service business -- accountants, yoga studios, coworking spaces.

---

### 4. Multi-Info Sidebar

| Setting | Value |
|---------|-------|
| `eyebrow` | "Visit Our Studio" |
| `heading_alignment` | `start` |
| `height` | `medium` |
| `sidebar_position` | `right` |
| Blocks | Info: "Studio Hours". Info: "Parking". Info: "Accessibility". Social block. |

**Good for:** Locations where visitors need practical details before arriving (parking, accessibility, transit).
**Industries:** Art galleries, fitness studios, event venues, co-working spaces.

---

### 5. Left-Sidebar Brand Moment

| Setting | Value |
|---------|-------|
| `heading_alignment` | `start` |
| `height` | `large` |
| `sidebar_position` | `start` |
| `color_scheme` | `highlight-secondary` |
| Blocks | Info: Business name + tagline in richtext. Info: Full address + phone. Social block. |

**Good for:** Making the location section feel like a branded destination rather than a utility. The left sidebar draws the eye before the map.
**Industries:** Boutique hotels, architecture firms, real estate offices, design studios.

---

### 6. Event / Pop-Up Location

| Setting | Value |
|---------|-------|
| `eyebrow` | "This Saturday" |
| `title` | "Find Us at the Market" |
| `description` | Short note about the event |
| `heading_alignment` | `center` |
| `height` | `small` |
| `show_address` | `true` |
| `directions_link` | Deep link to Google Maps directions |
| Blocks | Info: "What to Expect" with a short richtext blurb. |

**Good for:** Temporary or seasonal locations, farmers market stalls, pop-up shops, food trucks.
**Industries:** Catering, craft vendors, mobile pet grooming, food trucks.

---

### 7. Professional Office Locator

| Setting | Value |
|---------|-------|
| `heading_alignment` | `start` |
| `height` | `medium` |
| `sidebar_position` | `right` |
| `color_scheme` | `standard-secondary` |
| `show_address` | `true` |
| Blocks | Info: "Office Hours" with weekday availability. Info: "Appointments" with booking instructions or link in richtext. |

**Good for:** Professional services where clients visit by appointment and need clear hours and booking info next to the map.
**Industries:** Therapists, accountants, insurance agents, veterinary clinics.

---

## Differentiation Tips

- **Stack multiple info blocks deliberately.** The sidebar is the real differentiator over a plain embed. Use it to answer the questions people actually have before visiting: parking, transit, accessibility, hours, dress code.
- **Kill the headline when the context is obvious.** If the map sits on a page already titled "Contact" or "Visit," remove the title and eyebrow to avoid redundancy. The `small` height + `none` bottom spacing makes this feel integrated rather than sectioned off.
- **Pair color schemes with intent.** Use `highlight-primary` or `highlight-secondary` when the map is a standalone destination section. Keep `standard-primary` when it sits among other content-heavy widgets so it does not fight for attention.
- **Left sidebar is underused.** Most sites default to right. Flipping to `left` breaks the expected scan pattern and gives the contact details more prominence, which is valuable for businesses where the visit itself is the conversion (studios, showrooms, clinics).
- **The directions link earns its space.** A direct Google Maps link with pre-filled destination saves mobile visitors a copy-paste step. Always fill it in rather than relying on the embed's built-in controls, which are small on phones.
- **Use the social block sparingly.** It works well as the last sidebar item to cap off the contact info, but if the footer already has social icons, doubling up adds clutter without value.
