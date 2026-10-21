# Arch

Arch is a general-purpose business theme: one header, one footer, and pages built from a stack of full-width sections. Every section shares the same four colour schemes, the same spacing rhythm and the same type scale, so a page looks composed when those three systems are used deliberately, and busy when they are used for variety. This guide says how to use them. Each section type's own guidance says what that section is for.

## Colour schemes

Every section has a `color_scheme`. The four values are surfaces with fixed roles, not decoration:

- `standard-primary`: the page's default surface. Most sections use it. If there is no reason to change the surface, don't.
- `standard-secondary`: a soft alternate surface. Use it to separate long runs of `standard-primary` sections. One to three per page is enough; never two in a row.
- `highlight-primary`: the strongest surface, a dark or coloured band. Reserve it for the one or two moments that carry the most value on the page: the closing call to action, the key proof, a pricing decision.
- `highlight-secondary`: the alternate strong surface, for a second highlighted moment on the same page without repeating the first.

Rules of thumb: one or two highlighted sections per page, never adjacent to each other. Assign a highlight for the content's value, not to "break up the page". Utility sections (`accordion`, `map`, `schedule-table`, `contact-details`, `embed`, `social-icons`) carry functional content and almost always stay on a standard surface. Keep the meaning consistent across the site: if `highlight-primary` is the call-to-action surface on the home page, it plays the same role on every page.

Any scheme other than `standard-primary` fills the section's own background, and the section pads its content inside that band. That matters for spacing (below) and for what sits next to it: two filled sections back to back read as one block.

## Rhythm and spacing

The gap between sections comes from the site-wide `spacing_density` (`compact`, `default`, `airy`). Every section's `top_spacing` and `bottom_spacing` should stay `auto` unless there is a specific reason:

- `small` is for lightweight bridge sections that feel better with less air: `trust-bar`, `scrolling-text`, `logo-cloud`, a compact `key-figures` strip. Decide it per section type and apply it the same way everywhere, not page by page.
- `small` is also the docking setting. A filled section's spacing is padding inside its own band, so the section below it gets no gap from it; give that section `top_spacing: small` for the docked-but-not-touching look (the classic trust strip under a hero). `none` there makes the content collide with the band's edge.
- `none` is right only when the gap is already provided or deliberately unwanted: a grid directly under an unfilled `rich-text` opener whose own bottom margin is the gap; two sections meant to read as one band (same-scheme filled sections, back-to-back `split-content` zigzags, a full-width `image` glued to the section below); or the first section of a page under a transparent header, so the hero slides under it.
- Never use `small` or `none` on a page's first section just because it is the opener, and never fine-tune a page section by section. Uneven rhythm across pages is the most common way an Arch site starts to look assembled rather than designed.

On a filled section, `none` also removes its inside padding, not just the gap. That is a strong move; use it on purpose.

## Opening a page

The first section on a page sets its tone and renders the page's main heading, so every page needs exactly one clear opener.

- Home pages open with a photo hero: `banner` with an image, `split-hero`, `slideshow` or `video-popup`.
- Inner pages open with a title section. When the header is solid, an imageless `banner` (`height: auto`, a small uppercase eyebrow, a heading and one line of text) is the workhorse. When the header is transparent (below), open inner pages with `rich-text` or `split-content` instead.
- Keep the opener's heading to a few words, and let the second section do the explaining.

## Header and footer

The header and footer are the site's global parts: one of each, shared by every page.

- `transparent_on_hero` lays the header over the first section of a page, in its light over-image styling. It engages whenever the first section is one that supports it (`banner`, `slideshow`, `video-popup`), with or without an image. An imageless light `banner` under a transparent header therefore renders light text on a light background. With this setting on, only pages that open with a real photo or dark hero may start with a `banner`; every other page opens with `rich-text` or `split-content`.
- The first section under a transparent header gets `top_spacing: none` so the hero reaches the top of the window.
- `contactDetailsLine1` and `contactDetailsLine2` hold a phone number, an email address or an address line. Never a tagline or a slogan.
- `ctaButtonLink` is the one action the site wants most (book, call, get a quote). Give it a verb.
- `sticky` keeps the header in view while scrolling; `center_nav` puts the menu between the logo and the actions; `full_width` lets the header span the window on wide screens.
- The footer is built from blocks: `logo_text` for the name or logo, `text_block` for a short description or hours, `menu_block` for a menu, `social_block` for the site's social links, `business_details` for address and contact lines, `badges_block` for certifications. Three or four blocks are plenty; the `copyright` line is written once.

## Collections

Arch has three collection types. Items are edited as collection items, each with its own page; listing sections on pages show them.

- `news`: articles. `title`, `date` and `excerpt` are what a listing shows; `featured_image` is the card's picture; `body` is the article itself. Listed by `news-grid`.
- `projects`: case studies or portfolio pieces. `title`, `summary` and `featured_image` carry the card; `gallery`, `description`, `client`, `year` and `external_url` belong to the item page. Listed by `projects-grid`.
- `services`: what the business offers. `title`, `icon`, `summary`, `price` and `duration` show in listings; `description`, `gallery` and `cta_link` make the service page. Listed by `services-grid`.

Each listing section has `limit` (how many items) and a `view_all_link` for the page that lists everything. Only `news-grid` has `sort` (by date or title); project and service listings show their items in the collection's own order, which is changed by reordering the items. The editor adds two more controls to every listing section: `listing_anchor` marks the one listing that item pages link back to and that holds the collection's address, so exactly one listing per collection should have it (usually on the page named after the collection); `paginate` splits a long listing into pages, and only one section per page may paginate. To change what a card says, edit the item, not the section. To change which items appear, change `limit` (and `sort` on `news-grid`), reorder the items, or add and remove them.

Keep items consistent within a collection: the same fields filled in for every item, summaries of similar length, pictures of the same shape.

## Pages that work

A typical Arch page has five to eight sections with one clear job each: an opener that says what the page is about, one or two sections that make the case, one proof section (`testimonials`, `key-figures`, `logo-cloud`, `trust-bar`), and a close that asks for the one action (`action-bar`, a highlighted `banner`, `contact-details`, or the form). Think in pairs rather than in single sections: an editorial intro followed by a full-width `image`; a process in `steps` followed by `pricing`; a `gallery` next to a quote; a `map` beside an `accordion` of practical questions.

Avoid the default sequence of opener, services grid, about, testimonials and call to action on every page and every site. Choose each section for what it lets the page say that another would not, and use the less common sections (`sliding-panels`, `bento-grid`, `timeline`, `comparison-slider`, `masonry-gallery`) where the business genuinely has that kind of content.

## Writing and images

- Headings say what the section is about; someone reading only the headings should still get the point. Hero headings are a few words; card texts two or three sentences.
- Never insert line breaks in text to control where it wraps. Shorten the text instead.
- Wide pictures go in heroes and full-width sections; square or tall ones in cards and portraits. Keep important detail away from the edges, where a section crops it.
- Photos that came with the starting preset are placeholders. Keep them until the user has their own, but never describe their people, places or products as the user's business.

## Forms

The `core-form` section only receives submissions when the site is published on Widgetizer Hosting. On any other host the form looks right and submissions fail. Say so whenever you add one.

## Dos and don'ts

- Do keep `standard-primary` as the default and change a surface only for a reason.
- Do settle spacing once, per section type, and leave the rest on `auto`.
- Do open inner pages with `rich-text` or `split-content` when the header is transparent.
- Don't put two highlighted sections next to each other, or more than two on a page.
- Don't give the opener `small` or `none` spacing to make it "fit"; fix the section below it instead.
- Don't rebuild what a collection does with blocks: news, projects and services belong in their collections, so every listing and item page stays in step.
