# Arch Header Widget — Insights

A professional site header combining logo, contact details, navigation menu, and a call-to-action button with flexible positioning, sticky behavior, and hero-overlay transparency.

---

## Settings Levers

| Setting | Type / Values | Visual Effect |
|---|---|---|
| `logoImage` | Image upload | Replaces text logo with an uploaded image (raster or SVG) |
| `logoMaxWidth` | Range 50-300 px (default 150) | Controls the maximum width (or height for SVGs) of the logo image |
| `logoText` | Text (default "Arch") | Displayed as a text link when no logo image is set |
| `contactDetailsLine1` | Text (default "Call us: (555) 203-9844") | Bold line shown beside the logo or in the menu bar, depending on position setting |
| `contactDetailsLine2` | Text (default "1450 Market St, Suite 200") | Smaller muted line beneath contactDetailsLine1 |
| `contact_position` | `logo` / `menu` (default `logo`) | `logo` places contact info next to the logo in the branding area; `menu` moves it to the right end of the navigation bar |
| `headerNavigation` | Menu reference (default "main-menu") | Which menu data set to render as the primary nav links |
| `center_nav` | Checkbox (default off) | When enabled, centers the navigation links between the logo and the CTA, creating a balanced three-column feel |
| `ctaButtonLink` | Link (href, text, target) | The call-to-action button destination, label text, and whether it opens in a new tab |
| `ctaButtonStyle` | `primary` / `secondary` (default `secondary`) | `primary` uses the theme's high-contrast button style; `secondary` uses the outlined or subdued variant |
| `full_width` | Checkbox (default on) | When on the header spans edge to edge; when off it snaps to `--container-max-width` and centers itself |
| `sticky` | Checkbox (default off) | Fixes the header to the top of the viewport on scroll |
| `transparent_on_hero` | Checkbox (default off) | Makes the header background transparent when sitting over a hero section (requires theme/CSS support) |
| `transparent_logo` | Image upload | Alternate logo shown when the header is in transparent mode (e.g., white version for dark hero images) |
| `color_scheme` | `standard-primary` / `standard-secondary` / `highlight-primary` / `highlight-secondary` (default `standard-primary`) | Switches the header's background and text colors using the theme's color-scheme classes |

---

## Available Blocks

This widget has no configurable blocks. All structural regions (branding, nav, contact, CTA) are controlled entirely through settings.

---

## Layout Recipes

### 1. The Classic Service Business

| Setting | Value |
|---|---|
| `logoImage` | Company logo |
| `logoMaxWidth` | 160 |
| `contact_position` | `logo` |
| `contactDetailsLine1` | Phone number |
| `contactDetailsLine2` | Street address |
| `ctaButtonStyle` | `primary` |
| `ctaButtonLink.text` | "Free Estimate" |
| `full_width` | on |
| `sticky` | off |
| `center_nav` | off |
| `color_scheme` | `standard-primary` |

**Good for:** Businesses where customers call before buying. Keeping the phone number visible next to the logo puts it front and center on every page.

---

### 2. Immersive Hero Overlay

| Setting | Value |
|---|---|
| `logoImage` | Full-color logo |
| `transparent_logo` | White logo variant |
| `transparent_on_hero` | on |
| `sticky` | on |
| `ctaButtonStyle` | `secondary` |
| `ctaButtonLink.text` | "Book Now" |
| `contact_position` | `menu` |
| `contactDetailsLine1` | (empty) |
| `contactDetailsLine2` | (empty) |
| `full_width` | on |
| `color_scheme` | `standard-primary` |

**Good for:** Image-driven sites where the hero photograph needs to bleed to the top of the page. The header floats transparently over the hero, then solidifies on scroll thanks to sticky mode.

---

### 3. Centered Editorial

| Setting | Value |
|---|---|
| `logoImage` | Wordmark or text logo |
| `logoMaxWidth` | 200 |
| `center_nav` | on |
| `contactDetailsLine1` | (empty) |
| `contactDetailsLine2` | (empty) |
| `ctaButtonStyle` | `secondary` |
| `ctaButtonLink.text` | "Subscribe" |
| `full_width` | off |
| `sticky` | off |
| `color_scheme` | `standard-primary` |

**Good for:** Content-first layouts where the navigation is a lightweight wayfinding tool, not a sales channel. Centered nav gives a magazine-style balance.

---

### 4. Bold Conversion Bar

| Setting | Value |
|---|---|
| `logoImage` | Compact logo |
| `logoMaxWidth` | 100 |
| `contact_position` | `menu` |
| `contactDetailsLine1` | "Call (555) 203-9844" |
| `contactDetailsLine2` | (empty) |
| `ctaButtonStyle` | `primary` |
| `ctaButtonLink.text` | "Get Started" |
| `sticky` | on |
| `full_width` | on |
| `color_scheme` | `highlight-primary` |

**Good for:** Lead-generation sites that need the CTA visible at all times. The highlight color scheme makes the header itself an attention-grabbing bar, and sticky keeps it locked on screen.

---

### 5. Understated Professional

| Setting | Value |
|---|---|
| `logoImage` | Monogram or small mark |
| `logoMaxWidth` | 80 |
| `contactDetailsLine1` | (empty) |
| `contactDetailsLine2` | (empty) |
| `ctaButtonStyle` | `secondary` |
| `ctaButtonLink.text` | "Contact" |
| `center_nav` | off |
| `sticky` | off |
| `full_width` | off |
| `color_scheme` | `standard-primary` |

**Good for:** Professional services where credibility comes from restraint. No contact banner, no color drama -- just a clean logo, tidy navigation, and a quiet CTA.

---

### 6. Local Authority

| Setting | Value |
|---|---|
| `logoImage` | Logo with tagline baked in |
| `logoMaxWidth` | 220 |
| `contact_position` | `logo` |
| `contactDetailsLine1` | "Serving Denver since 1998" |
| `contactDetailsLine2` | "1450 Market St, Suite 200" |
| `ctaButtonStyle` | `primary` |
| `ctaButtonLink.text` | "Request a Quote" |
| `sticky` | on |
| `full_width` | on |
| `color_scheme` | `standard-secondary` |

**Good for:** Established local businesses that want to lead with trust signals -- years in business, physical address. The accent color scheme adds warmth without being loud.

---

### 7. Minimal Portfolio

| Setting | Value |
|---|---|
| `logoImage` | (none) |
| `logoText` | "Jane Doe" |
| `contactDetailsLine1` | (empty) |
| `contactDetailsLine2` | (empty) |
| `ctaButtonLink.text` | (empty) |
| `center_nav` | on |
| `full_width` | off |
| `sticky` | off |
| `color_scheme` | `standard-primary` |

**Good for:** The absolute minimum: a text-only name and centered nav with no button, no contact info. Keeps the focus squarely on the work.

---

## Differentiation Tips

- **Contact position is the biggest personality switch.** Placing contact info next to the logo signals "service business that wants phone calls." Moving it to the menu row (or removing it) signals "modern brand that prefers online interactions." Pick intentionally.

- **Sticky + transparent is a high-impact combo but needs art direction.** If you enable both, always supply a `transparent_logo` that reads clearly against the hero image. A dark logo on a dark photo is invisible. Test with the actual hero content, not just in the settings panel.

- **The CTA button style should contrast its surroundings.** On a `standard-primary` color scheme header, a `primary` button pops well. On a `highlight-primary` scheme, the header background is already bold, so `secondary` often reads better because it does not compete.

- **`full_width: off` instantly makes a header feel more editorial.** Combined with `center_nav`, it creates generous whitespace on the sides that says "design studio" rather than "e-commerce warehouse."

- **Use `logoMaxWidth` to balance the header visually, not just to resize.** A 300 px logo next to a short nav feels top-heavy. A 80 px logo with a long nav and CTA feels balanced. Adjust the slider while looking at the overall header proportions.

- **Clearing both contact lines hides the contact block entirely.** This is the cleanest way to remove it rather than entering spaces or dashes. The template conditionally omits the whole `header-contact` div when both lines are blank.

- **Color schemes affect the entire header at once.** If you only want the CTA to stand out, keep the scheme on `standard-primary` and switch the button to `primary`. Reserve `highlight-primary` and `highlight-secondary` for cases where the whole header bar should draw attention.
