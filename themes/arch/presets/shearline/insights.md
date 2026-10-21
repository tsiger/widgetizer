# Shearline

## Suits

- An appointment-based hair salon where the client chooses a stylist first and a time second. The `index` page is built around that idea: a `large` photo `banner`, a `card-grid` of six core services, a `profile-grid` of stylists, a `masonry-gallery` of recent cuts, a `highlight-primary` `image-callout` about consulting before cutting, `testimonials` in a `grid` and an `action-bar` that says pick a stylist.
- `services` is a transparent price list: three `priced-list` sections in `two-column` (cuts, colour, treatments), an `icon-card-grid` of the small things included, and an `accordion` explaining why prices are ranges. `stylists` pairs a `profile-grid` with an `icon-card-grid` that matches people to goals. `work` shows results through `project-showcase` and another `masonry-gallery`.
- `new-clients` is the onboarding page most salons lack: `steps` from booking to leaving, an `image-text` on colour consultations and an `accordion` of first-visit questions. Suitability is not functionality: nothing here books an appointment; the header phone line and the `action-bar` sections carry visitors to a call or the `contact` page.
- Every inner page opens with `rich-text` rather than a hero image, which keeps the focus on the words and prices; only `index` opens on a photo.
- Seeds `news` with five posts used as salon notices (late nights, a new stylist, a charity cut) and `services` with five treatments, so a service detail page exists for each core offer. No `projects` items.

## Look

Cool, muted and quietly fashionable: pale warm-grey surfaces rather than white, a deep plum-wine accent, and near-black aubergine highlight bands where the accent softens to a dusty mauve. Headings are an old-style serif at a medium weight (EB Garamond) over a modern, slightly rounded sans (Onest), a pairing that feels editorial and calm. The header is `sticky`, `full_width`, `transparent_on_hero` with `center_nav`, floating over the home hero only. `corner_style` and `button_shape` are `sharp`, `spacing_density` is `default`: the look is sleek, square-edged and more fashion than spa.

## Adapting

- Barbershop: keep the stylist-first structure, cut `services` to two `priced-list` sections and rewrite `new-clients` around walk-ins versus bookings.
- Nail or brow studio, lash bar: the `priced-list` ranges and the `steps` onboarding translate directly; drop `work` or reduce it to one `masonry-gallery`.
- Tattoo or piercing studio: `stylists` becomes artists, `work` becomes the portfolio with `project-showcase` by style, and `new-clients` covers consultations and aftercare.
- Physiotherapy, massage or osteopathy practice: practitioners in `profile-grid`, treatments in `priced-list`, and `new-clients` as the first-appointment guide; drop `work`.
- Poor fit for a shop that sells products, since there is no catalogue or ordering, and for a business that needs a bright, airy, image-heavy feel: the grey-plum palette and `sharp` corners are deliberately understated and most pages open on text.
