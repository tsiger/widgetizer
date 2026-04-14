# Resource List Widget

A vertical list of downloadable files and documents, each with a title, description, and download button -- ideal for sharing PDFs, brochures, price lists, and forms.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---------|--------|---------------|
| `eyebrow` | Any text (default "Resources") | Small label above the headline for framing like "Downloads" or "Helpful Documents" |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | Any text (default "Downloads & Documents") | Section headline; renders as `<h1>` when the widget is the first on the page, `<h2>` otherwise |
| `description` | Any text (default "Browse our collection of useful resources and documents.") | Paragraph below the headline for context or instructions |
| `heading_alignment` | `start`, `center` (default) | Left-aligns the header block for editorial layouts; center works for standalone sections |
| `image` | Optional image | Adds a supporting image beside the resource list for visual context |
| `image_position` | `start` (default), `end` | Places the image to the start or end of the resource list |
| `color_scheme` | `standard-primary`, `standard-secondary`, `highlight-primary`, `highlight-secondary` | **standard-primary** -- clean, no background. **standard-secondary** -- adds secondary background + border to each resource row. **highlight-primary** -- tinted section background. **highlight-secondary** -- tinted section background + secondary row fill + border |
| `top_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | `auto` (default), `small`, `none` | Same as above for the bottom edge |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|------------|-------------|-------|
| `resource` | `title` (text, default "Document Title"), `description` (text, brief summary of the resource), `file` (file upload for the downloadable document), `button_label` (text, default "Download") | Each block renders as one resource row. The button label can be customized per resource (e.g. "Download PDF", "View Menu", "Get Form"). Leave the file blank during design -- the client uploads their actual documents later. |

---

## Layout Recipes

### 1. General Downloads Section
- **Settings**: title "Downloads", heading_alignment center, color_scheme standard-primary
- **Blocks**: 3 resources -- e.g. "Service Brochure", "Price List", "New Client Form" with "Download PDF" buttons
- **Good for**: A catch-all downloads area on any small business site where visitors grab key documents

### 2. Menu & Price Sheets with Photo
- **Settings**: eyebrow "Our Menu", title "Menus & Price Lists", image set to a food or storefront photo, image_position end, heading_alignment start, color_scheme standard-secondary
- **Blocks**: 3-4 resources -- "Lunch Menu", "Dinner Menu", "Catering Packages", "Wine List" with "View PDF" buttons
- **Good for**: Restaurants and food businesses that maintain downloadable menus alongside their website

### 3. Patient / Client Forms
- **Settings**: eyebrow "Before Your Visit", title "Patient Forms", description "Please download and complete these forms before your first appointment.", heading_alignment center, color_scheme highlight-primary
- **Blocks**: 3-5 resources -- "New Patient Registration", "Medical History", "Insurance Information", "HIPAA Consent", each with "Download Form" buttons
- **Good for**: Practices that need patients or clients to fill out paperwork ahead of appointments

### 4. Highlighted Resources with Accent Rows
- **Settings**: eyebrow "Resources", title "Helpful Guides", heading_alignment start, color_scheme highlight-secondary
- **Blocks**: 4-6 resources -- e.g. "Homeowner Maintenance Checklist", "Seasonal HVAC Tips", "Warranty Information", "Emergency Procedures" with "Download" buttons
- **Good for**: Service businesses that provide educational resources to build trust and demonstrate expertise

### 5. Legal & Compliance Documents
- **Settings**: title "Policies & Documents", heading_alignment start, color_scheme standard-primary
- **Blocks**: 3-4 resources -- "Terms of Service", "Privacy Policy", "Refund Policy", "Licensing Information" with "View Document" buttons
- **Good for**: Making required legal or regulatory documents easily accessible from a dedicated page

### 6. Class & Program Materials
- **Settings**: eyebrow "Class Materials", title "Downloads for Students", image set to a classroom or studio photo, image_position start, heading_alignment start, color_scheme standard-secondary
- **Blocks**: 4-5 resources -- "Class Schedule", "Beginner Handbook", "Practice Log", "Recital Information" with "Download PDF" buttons
- **Good for**: Businesses that run classes or programs and need to distribute materials to participants

### 7. Seasonal Specials & Promotions
- **Settings**: eyebrow "Special Offers", title "Current Promotions", description "Download our latest deals and seasonal specials.", heading_alignment center, color_scheme highlight-primary, top_spacing none
- **Blocks**: 2-3 resources -- "Spring Specials", "Loyalty Program Details", "Referral Rewards" with "Get Details" buttons
- **Good for**: Distributing promotional flyers, coupon sheets, or seasonal offer summaries as downloadable files

---

## Differentiation Tips

- **The download button is the whole point.** Unlike a card grid or icon list, every resource row ends with a clear call-to-action to grab a file. Keep button labels specific -- "Download PDF", "View Menu", "Get Form" -- so visitors know exactly what they are getting.
- **Keep descriptions short and functional.** One sentence explaining what the document is and why someone would want it. This is not a place for marketing copy -- visitors scanning a resource list want to find the right file fast.
- **The optional image adds warmth.** A resource list on its own can feel dry and utilitarian. Adding a relevant photo (storefront, team at work, product shot) alongside the list makes the section feel more inviting without cluttering the individual rows.
- **Three to five resources is the sweet spot.** Fewer than three and the section feels underpopulated -- consider folding the downloads into another widget. More than six and the list starts to feel like a filing cabinet. Group large document libraries across multiple sections with different eyebrows.
- **Pair with a highlight color scheme for visibility.** Resource lists are often buried at the bottom of pages. Using highlight-primary or highlight-secondary gives the section a distinct background that signals "stop and grab these" rather than blending into surrounding content.
- **Button label variety prevents monotony.** If every row says "Download", the list feels repetitive. Mix in "View PDF", "Get Form", "Download Menu" to give each resource its own identity and set expectations about the file type.
- **Use heading_alignment start when paired with an image.** Center-aligned headings with a side image create an awkward visual imbalance. Left-aligning the header block keeps everything anchored to the same edge as the content.
