import { PLATFORM_INSTRUCTIONS } from "./instructions.js";

// Short, assistant-neutral guidance served on request. Advisory: the user's own
// preferences and the site's existing voice come first.
export const GUIDANCE = {
  core: `${PLATFORM_INSTRUCTIONS}
- Everything you can see is the saved site. The user may have unsaved edits open in Widgetizer.
- Work in the language the user is working in; every content tool takes a language.
- Use only what the theme offers (theme_catalog, section_details). If something isn't possible with this theme, say so instead of approximating it.
- Before building or restructuring pages, read theme_guide: it says how this theme composes pages (colour schemes, spacing, openers, header and footer, collections). Section recipes (section_details with recipe) are ready-made starting points; adapt their placeholder text, never present it as the user's own.
- When you're unsure what the user wants, ask one focused question.
- Write for the site's visitors, not for the site owner.
- To change a site: start_job, read what you'll change (read_page or read_site_part give its version), edit_sections with basedOn = that version, then finish_job. Pages, menus, the look, site details, collection items, image descriptions and languages have their own tools. Tell the user what you changed; they can undo it.
- Deleting, removing more than half of something, or changing more than 3 pages in one job needs the user's OK: the call answers NEEDS_APPROVAL; call wait_for_approval until it says allowed, then repeat the call with its approvalId.
- Open another site or create a new one (open_site, create_site) only when the user asked.`,

  writing: `- Match the site's existing voice unless the user asks for a change. Read a page or two first.
- Lead with what the visitor gets. Short sentences, concrete words, no filler ("world-class", "solutions").
- Headings say what the section is about; a visitor skimming only the headings should still get the point.
- Keep each text within what its place can hold: a hero heading is a few words, a card text two or three sentences.
- Calls to action are verbs that say what happens next ("Book a table", not "Submit").
- Never invent facts: prices, opening hours, team members, numbers, reviews or testimonials. Ask, or leave a clearly marked placeholder.`,

  seo: `- Each page gets its own title (about 50–60 characters) and description (about 140–160), written for people reading search results.
- Put the page's main topic and, for local businesses, the place near the start of the title.
- One main heading per page; headings in order without skipping levels.
- Descriptive link text ("See our catering menu"), never "click here".
- Don't stuff keywords or repeat the same title across pages.
- Image alt text describes the image for people who can't see it; it is not a keyword slot.`,

  translation: `- Translate meaning and tone, not word by word. Use what a native speaker would naturally write on a business website.
- Keep names, brand names and product names unless the user says otherwise; adapt dates, numbers and currency formats to the language.
- Keep headings and buttons as short as the original; some languages run longer, so prefer the shorter natural phrasing.
- Translate page titles and descriptions too, and the menu labels.
- Don't translate content you can't read confidently; say so.`,

  images: `- Choose images by what they show and by their shape: wide images for banners and heroes, square or tall ones for cards and portraits.
- Look before you choose (list_media with thumbnails, view_image); file names and descriptions are only hints.
- Demo images from the starting preset are fine to keep, but never present the people, places or products in them as the user's own business.
- Avoid images with important details near the edges where a section crops them.
- Describe an image only from what you can actually see; don't guess who someone is.`,

  new_site: `- A new site starts from a theme and one of its presets (list_themes, then preset_details for the likely ones). Choosing well matters more than filling fast.
- Rank presets by what the user's business needs (which pages and sections carry its story, which collections it seeds) and by how little must change, not by the niche label alone. A preset's guidance says what it suits and how it adapts.
- Suitability is not functionality: no preset takes bookings, sells online or processes payments. Forms only receive submissions on Widgetizer Hosting. Say so when the user expects it.
- Recommend one best fit. Offer two or three only when the alternatives genuinely differ for this user, each in one line with its live demo link. Ask one focused question when you can't choose.
- With no matching niche, start from the closest kind of business, adapt it, and tell the user which preset it started from. The blank preset is for an explicit minimalist request or a last resort.
- After create_site the pages still hold the preset's demo text and photos. Replace the text in a job; the preset's photos can stay as placeholders, but never describe their people, places or products as the user's own.`,

  accessibility: `- Meaningful images need alt text that says what matters about them in context. Purely decorative images should have empty alt text; don't fill it in.
- Alt text belongs to the media library item and is shared by every place the image is used; say so when you change it.
- Headings in order, one main heading per page, link text that makes sense on its own.
- Keep enough contrast between text and background; light text on light images is hard to read.
- Don't rely on colour alone to convey meaning.`,
};
