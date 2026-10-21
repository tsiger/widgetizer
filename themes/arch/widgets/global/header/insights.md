# header

## Purpose

The site's top bar on every page: logo or site name, the main navigation with dropdowns, optional phone or address lines, a call-to-action button and, on multilingual sites, a language switcher. It is a global part: one header, shared by every page, so a change here changes the whole site.

It can sit as a plain bar, stick to the top while scrolling, or float transparently over an image hero and turn solid as the visitor scrolls.

## When to use

- Every site has exactly one. Set it up once at the start, after the menus exist, and revisit it only when the brand, contact details or page structure change.
- Keep the navigation to five to seven top-level items; longer menus wrap or crowd the call to action. Deeper structure belongs in dropdowns of the menu itself.
- The call-to-action button is for the one thing the site wants most: `contact`, booking, a quote. Leave its text blank to have no button at all.
- `transparent_on_hero` suits image-led sites whose pages open with a photo hero; a text-first site is better served by a solid bar.
- `sticky` suits long pages and service sites where the phone number or button should stay in reach; portfolios and editorial sites often read better without it.
- `contactDetailsLine1` and `contactDetailsLine2` are for a phone number, an email address or a street address only, never a tagline, slogan or opening hours.

## Pitfalls

- `transparent_on_hero` engages whenever a page's first section is one that supports it (`banner`, `slideshow`, `video-popup`), with or without an image. In that state the header loses its background and border and renders its logo, links and button in the light over-image styling. An imageless light `banner` opener therefore gives a washed-out, unreadable header. With it on, inner pages must open with `rich-text` or `split-content` instead, and only pages with a real image or dark hero may start with a `banner`.
- In the transparent state the first section gets extra top padding so its content clears the header, and the header is laid over the hero, which is why the hero should have `top_spacing` `none`.
- `transparent_logo` is shown only while the header is transparent; without it the normal `logoImage` is used there, and a dark logo disappears on a dark photo. Supply a light version whenever `transparent_on_hero` is on.
- With `sticky` on as well, the header is transparent at the top and turns solid as soon as the visitor scrolls, swapping back to the normal logo. Without `sticky` it scrolls away with the hero.
- `sticky` on its own keeps the bar at the top with a soft shadow once scrolled. It takes screen height from every page; on small laptops a tall logo plus a sticky bar eats a quarter of the viewport, so keep `logoMaxWidth` modest.
- `logoMaxWidth` caps the logo's width, or its height for a vector logo. Match it to the navigation: a very wide logo next to a long menu wraps the links.
- `contact_position` `logo` shows the two lines beside the logo with a divider; `menu` moves them to the right end next to the button. Both lines blank hides the block entirely, which is the clean way to drop it. On phones the lines appear inside the open menu either way.
- `center_nav` splits the bar into three: logo left, links centred, button and language switcher right. It needs a short menu; long menus collide with both sides.
- `full_width` on stretches the bar edge to edge; off caps its contents to the content width, which feels editorial and pairs well with `center_nav`.
- `color_scheme` colours the whole bar. On `highlight-primary` or `highlight-secondary` the bar is dark on every page, which fights a transparent hero and makes a `primary` button compete with its background; `secondary` reads better there.
- `ctaButtonStyle` `primary` is the filled accent button, `secondary` the outlined one; in the transparent state the outline turns light so it stays visible over the image.
- `headerNavigation` takes a menu id. The presets ship `main-menu` for the header and `footer-menu` for the footer; point this at `main-menu` unless a dedicated menu exists.
- The language switcher appears only on sites with more than one language; `show_language_switcher` has no visible effect otherwise. `language_switcher_label`, `skip_link_text`, `nav_label`, `menu_title` and `menu_close_label` are wording for screen readers and the mobile menu; translate them on a non-English site.

## Recipes

### Classic service business

Phone and address beside the logo, a filled quote button, solid bar that stays in reach while scrolling. The user supplies the logo image and the real phone and address.

```json
{
  "type": "header",
  "settings": {
    "logoText": "Business name",
    "logoMaxWidth": 160,
    "contactDetailsLine1": "Call us: (555) 010-0100",
    "contactDetailsLine2": "100 Example Street, Springfield",
    "contact_position": "logo",
    "headerNavigation": "main-menu",
    "center_nav": false,
    "ctaButtonLink": { "text": "Get a quote", "href": "contact.html" },
    "ctaButtonStyle": "primary",
    "full_width": true,
    "sticky": true,
    "transparent_on_hero": false,
    "color_scheme": "standard-primary"
  }
}
```

### Immersive over the hero

Transparent over an image hero, sticky so it turns solid on scroll, centred navigation and no contact lines. The user supplies a dark logo and a light `transparent_logo`, and opens every imageless inner page with `rich-text` or `split-content`.

```json
{
  "type": "header",
  "settings": {
    "logoText": "Studio name",
    "logoMaxWidth": 180,
    "contactDetailsLine1": "",
    "contactDetailsLine2": "",
    "headerNavigation": "main-menu",
    "center_nav": true,
    "ctaButtonLink": { "text": "Inquire", "href": "contact.html" },
    "ctaButtonStyle": "secondary",
    "full_width": true,
    "sticky": true,
    "transparent_on_hero": true,
    "color_scheme": "standard-primary"
  }
}
```

### Quiet editorial

A contained, non-sticky bar with a wordmark, centred links and an outlined button, for portfolios, studios and writers. The user supplies a wordmark image or simply the site name.

```json
{
  "type": "header",
  "settings": {
    "logoText": "Studio name",
    "logoMaxWidth": 200,
    "contactDetailsLine1": "",
    "contactDetailsLine2": "",
    "headerNavigation": "main-menu",
    "center_nav": true,
    "ctaButtonLink": { "text": "Say hello", "href": "contact.html" },
    "ctaButtonStyle": "secondary",
    "full_width": false,
    "sticky": false,
    "transparent_on_hero": false,
    "color_scheme": "standard-primary"
  }
}
```

### Conversion bar

A dark sticky bar with the phone number at the right end next to a filled button, for lead-generation sites. The user supplies a light logo that reads on the dark bar.

```json
{
  "type": "header",
  "settings": {
    "logoText": "Business name",
    "logoMaxWidth": 120,
    "contactDetailsLine1": "(555) 010-0100",
    "contactDetailsLine2": "hello@example.com",
    "contact_position": "menu",
    "headerNavigation": "main-menu",
    "ctaButtonLink": { "text": "Get started", "href": "contact.html" },
    "ctaButtonStyle": "secondary",
    "full_width": true,
    "sticky": true,
    "transparent_on_hero": false,
    "color_scheme": "highlight-primary"
  }
}
```
