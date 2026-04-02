# Accordion Widget Insights

Collapsible question-and-answer sections with optional sidebar, two visual styles, and multi-open support — built for FAQs, policies, and structured info pages.

---

## Settings Levers

| Setting | Values | Visual Effect |
|---|---|---|
| `eyebrow` | Any text (default: "Support") | Small label above the headline; omit to remove |
| `title` | Any text (default: "Frequently Asked Questions") | Main section heading (renders as h1 if first widget on page, h2 otherwise) |
| `description` | Any text | Subtitle paragraph below the headline |
| `heading_alignment` | `center` (default), `left` | Centers or left-aligns the entire header block |
| `style` | `separated` (default), `connected` | Separated: individual rounded cards with gaps. Connected: single bordered container, items divided by hairlines |
| `allow_multiple` | `false` (default), `true` | When off, opening one item closes others. When on, any number can stay open simultaneously |
| `sidebar_position` | `right` (default), `left` | Places the info/social sidebar on the right or left of the accordion list (only visible when info or social blocks exist) |
| `color_scheme` | `standard`, `standard-accent`, `highlight`, `highlight-accent` | Standard: transparent background. Accent variants: items get secondary background. Highlight: themed section background with padding |
| `top_spacing` | `auto` (default), `none` | Removes top padding when set to none — useful for stacking sections tightly |
| `bottom_spacing` | `auto` (default), `none` | Removes bottom padding when set to none |

---

## Available Blocks

| Block Type | Key Settings | Notes |
|---|---|---|
| `item` | `question` (text), `answer` (richtext) | The actual accordion row. Add as many as needed. Answer supports rich formatting — links, lists, bold, etc. |
| `info` | `title` (text), `text` (richtext) | Appears in the sidebar alongside the accordion. Good for contact details, office hours, or a CTA. Adding any info or social block activates the 70/30 sidebar layout. |
| `social` | None (pulls from theme social settings) | Renders social media icon links in the sidebar. Useful paired with an info block above it. |

---

## Layout Recipes

### 1. Classic FAQ Page

- **Settings:** style `separated`, heading alignment `center`, allow_multiple `false`, color_scheme `standard`
- **Blocks:** 6-10 item blocks, no sidebar blocks
- **Good for:** Dedicated FAQ pages where visitors scan for one specific answer
- **Industries:** SaaS, e-commerce, subscription services

### 2. Support Hub with Contact Sidebar

- **Settings:** style `separated`, heading alignment `left`, sidebar_position `right`, color_scheme `standard-accent`
- **Blocks:** 5-8 item blocks + 1 info block ("Still need help?" with email/phone) + 1 social block
- **Good for:** Support pages that funnel unanswered questions to a human
- **Industries:** Professional services, agencies, dental/medical offices

### 3. Compact Policy Section

- **Settings:** style `connected`, heading alignment `left`, allow_multiple `true`, color_scheme `standard`, bottom_spacing `none`
- **Blocks:** 3-5 item blocks covering shipping, returns, warranty, etc. No sidebar.
- **Good for:** Embedding below a product page or checkout flow so buyers can self-serve policy questions without leaving the page
- **Industries:** E-commerce, handmade goods, retail

### 4. Service Breakdown

- **Settings:** style `separated`, heading alignment `center`, allow_multiple `false`, color_scheme `highlight`
- **Blocks:** 4-6 item blocks, each question being a service name ("What does a full kitchen remodel include?"), answers detailing scope and pricing notes
- **Good for:** Service pages where each accordion item explains one offering in depth
- **Industries:** Contractors, cleaning companies, landscapers, event planners

### 5. Onboarding / Getting Started

- **Settings:** style `connected`, heading alignment `left`, allow_multiple `true`, color_scheme `standard-accent`, eyebrow "Getting Started"
- **Blocks:** 4-6 item blocks covering sequential steps + 1 info block linking to a video tutorial or help docs
- **Good for:** Post-signup pages or knowledge bases walking new users through setup
- **Industries:** SaaS, online courses, membership sites

### 6. Pre-Sale Objection Handler

- **Settings:** style `separated`, heading alignment `center`, allow_multiple `false`, color_scheme `highlight-accent`
- **Blocks:** 4-6 item blocks with questions like "Is this right for beginners?" and "What if it doesn't work for me?" No sidebar.
- **Good for:** Landing pages directly above or below a pricing section to overcome purchase hesitation
- **Industries:** Coaches, fitness programs, online education, consultants

### 7. Location / Hours Info Panel

- **Settings:** style `connected`, heading alignment `left`, sidebar_position `left`, color_scheme `standard`
- **Blocks:** 1 info block (address, phone, email) + 1 social block on the left sidebar; 3-5 item blocks on the right covering parking, accessibility, appointment policies
- **Good for:** Contact or location pages for businesses with physical premises
- **Industries:** Restaurants, salons, clinics, co-working spaces

---

## Differentiation Tips

- **Sidebar changes everything.** The moment you add an info or social block, the layout shifts from a single centered column to a 70/30 grid. Use this intentionally — a sidebar with contact info turns a generic FAQ into a support section with a clear escalation path.
- **Connected vs. separated signals formality.** Connected (single bordered box) reads as documentation or policy — compact and utilitarian. Separated (individual cards with gaps) feels more approachable and scannable. Match the tone to your content.
- **Allow-multiple is a content decision, not just a preference.** If items are independent (unrelated FAQs), single-open keeps the page tidy. If items are sequential or users need to compare (steps, pricing tiers, feature lists), multi-open lets them hold context.
- **Accent color schemes add depth without heaviness.** The `standard-accent` and `highlight-accent` schemes give accordion items a secondary background, which helps them stand out on pages that already have a lot of flat white space.
- **Pair heading alignment with sidebar position.** Left-aligned headings look natural with a sidebar layout. Centered headings work better for standalone, full-width FAQ sections with no sidebar.
- **Use the eyebrow to set context.** Changing the eyebrow from "Support" to "Before You Buy" or "How It Works" reframes the entire section without touching the accordion content itself.
- **Stack with spacing overrides.** Setting top or bottom spacing to `none` lets you butt this widget against a CTA banner or hero section above/below it for a seamless visual flow.
