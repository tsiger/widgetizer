# Video Popup Widget

A full-width (or contained) hero-style background image with a centered play button that opens a YouTube or Vimeo video in a lightbox modal.

## Settings levers

| Setting | Values | Visual effect |
|---------|--------|---------------|
| `image` | Any uploaded image | The background photograph or still frame visible behind the overlay. Sets the entire mood of the section. |
| `video_url` | YouTube or Vimeo URL (standard, short, or embed formats) | Determines the video that plays inside the modal. No visual change on the section itself. |
| `video_title` | Free text (default: "Video") | Used as the accessible `aria-label` on the play button and as the modal title. Not rendered visually on the page. |
| `overlay_color` | Any color with alpha (default: `#0a1e38bf`) | Tints the background image. Dark overlays add drama and improve play-button contrast; lighter or branded overlays shift the feeling entirely. |
| `height` | `small` / `medium` / `large` | Controls the vertical size of the section via a CSS class (`widget-height-*`). Small works for inline accents; large dominates the viewport. |
| `fullwidth` | `true` / `false` (default: true) | When true the section bleeds edge-to-edge. When false it is capped at `--container-max-width` with rounded corners (`--radius-lg`), giving a card-like appearance. |
| `play_button_style` | `light` / `dark` | Switches the SVG circle-and-triangle play icon between white-on-transparent and dark-on-transparent. Choose based on overlay brightness. |
| `top_spacing` | `auto` / `none` | Removes the default top margin so the widget can sit flush against the section above it. |
| `bottom_spacing` | `auto` / `none` | Removes the default bottom margin so the widget can sit flush against the section below it. |

## Available blocks

This widget has no configurable blocks. It is a single-purpose section: one background image, one overlay, one play button, one video.

## Layout recipes

**1. "Cinematic Hero" (above the fold)**
- Settings: `height: large`, `fullwidth: true`, `overlay_color: #000000aa`, `play_button_style: light`
- Image: wide-angle drone shot of the business location or landscape
- Blocks: none
- Good for: making the homepage feel like a film trailer, immediately communicating scale and ambition
- Industries: real estate agencies, destination hotels, adventure tourism, architecture firms

**2. "Behind the Scenes" (mid-page trust builder)**
- Settings: `height: medium`, `fullwidth: false`, `overlay_color: #1a1a1a99`, `play_button_style: light`
- Image: candid workshop or kitchen photo showing the team at work
- Blocks: none
- Good for: breaking up text-heavy pages with a contained, card-style video moment that feels approachable rather than cinematic
- Industries: bakeries, craft breweries, woodworking studios, ceramics workshops

**3. "Brand Manifesto" (about page centrepiece)**
- Settings: `height: large`, `fullwidth: true`, `overlay_color: brand primary at ~70% opacity (e.g. #2E5C8Abb)`, `play_button_style: light`
- Image: abstract or close-up texture related to the brand (fabric, metal, water)
- Blocks: none
- Good for: reinforcing brand colour while inviting visitors to watch a founder story or mission video
- Industries: fashion labels, design agencies, nonprofits, personal brands

**4. "Quick Explainer" (services or product page)**
- Settings: `height: small`, `fullwidth: false`, `overlay_color: #00000066`, `play_button_style: dark`, `top_spacing: none`, `bottom_spacing: none`
- Image: screenshot or stylised product still
- Blocks: none
- Good for: embedding a short product demo or how-it-works clip inline without dominating the page. The small height and contained width keep it subordinate to surrounding content.
- Industries: SaaS startups, e-commerce stores, online course creators, app landing pages

**5. "Event Teaser" (landing page or announcement)**
- Settings: `height: medium`, `fullwidth: true`, `overlay_color: #0a1e38bf` (default dark navy), `play_button_style: light`
- Image: highlights reel still from last year's event -- crowd shot, stage lighting, keynote moment
- Blocks: none
- Good for: driving ticket sales or registrations by letting the energy of a previous event speak for itself
- Industries: conference organisers, music venues, fitness studios, community organisations

**6. "Testimonial Spotlight" (social proof section)**
- Settings: `height: medium`, `fullwidth: false`, `overlay_color: #ffffff33`, `play_button_style: dark`
- Image: professional headshot or on-location portrait of the customer giving the testimonial
- Blocks: none
- Good for: placing a contained, light-overlay video testimonial between written reviews. The rounded-corner card style makes it feel personal rather than promotional.
- Industries: consulting firms, dental practices, home renovation contractors, wedding photographers

**7. "Process Walkthrough" (portfolio or case study page)**
- Settings: `height: small`, `fullwidth: true`, `overlay_color: #1a1a1a55`, `play_button_style: light`, `bottom_spacing: none`
- Image: time-lapse still or before/after composite of the project
- Blocks: none
- Good for: a compact, edge-to-edge strip that invites visitors to watch a project unfold. Removing bottom spacing lets the next section (e.g. a gallery or stats bar) flow directly underneath.
- Industries: interior designers, construction firms, tattoo artists, landscape architects

## Differentiation tips

- **Pair overlay colour with your brand palette.** The default navy is safe but generic. A deep burgundy, forest green, or even a semi-transparent white can make the same widget feel like a completely different site. Adjust play button style (light/dark) to maintain contrast.
- **Use `fullwidth: false` more than you think.** The rounded-corner contained mode is underused. It turns the video popup into a card that sits inside the content flow rather than interrupting it, which works especially well on pages with multiple sections.
- **Stack two video popups with different heights.** A `large` cinematic hero at the top and a `small` explainer further down the page create rhythm and avoid visual monotony without introducing a different widget type.
- **Choose the still image carefully -- it is 90% of the impact.** The play button is small and minimal by design. The background image does all the heavy lifting before anyone clicks. Invest in a strong, high-resolution photograph rather than relying on the overlay to compensate.
- **Remove spacing to create seamless transitions.** Setting `top_spacing: none` or `bottom_spacing: none` lets the video popup merge visually with adjacent full-width sections (headers, colour blocks, footers), creating a more editorial, magazine-style flow.
- **Light overlays with dark play buttons flip the mood.** Most users default to dark overlays, but a subtle white or pastel overlay with a dark play button feels modern, airy, and unexpected -- great for wellness brands, minimalist portfolios, and lifestyle businesses.
