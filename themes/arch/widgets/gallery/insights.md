# Gallery Widget

Responsive image gallery with grid or carousel layout, lightbox viewing, optional staggered masonry effect, and hover-reveal captions.

## Settings levers

| Setting | Values | Visual effect |
|---|---|---|
| `eyebrow` | Any text (optional) | Small label above the title, adds editorial context |
| `eyebrow_uppercase` | `true` / `false` (default) | Uppercases the eyebrow text for a more formal label treatment |
| `title` | Any text (default "Project Gallery") | Section heading; renders as h1 if first widget on page, h2 otherwise |
| `description` | Any text (optional) | Paragraph below the title, sets expectations for the gallery |
| `heading_alignment` | `start`, `center` (default) | Left-aligns the header block for editorial layouts or centers it for showcase pages |
| `layout` | `grid` (default), `carousel` | Grid shows all images at once in a responsive grid; carousel displays a horizontal scrollable strip with prev/next arrows |
| `columns_desktop` | 2 -- 5 (default 4) | Number of columns on desktop; fewer columns mean larger thumbnails and more visual weight per image |
| `staggered` | `true` / `false` (default) | Even-numbered cards drop down by a large vertical offset, creating a masonry-like rhythm; only visible at 750px+ |
| `aspect_ratio` | `auto`, `contain`, `1/1`, `4/3` (default), `3/2`, `3/4`, `16/9` | Controls thumbnail cropping. Auto uses native proportions, contain fits the full image inside a fixed height, fixed ratios crop to uniform cards |
| `color_scheme` | `standard-primary` (default), `standard-secondary`, `highlight-primary`, `highlight-secondary` | Switches the section background and text colors using theme palette variables |
| `top_spacing` | `auto` (default), `small`, `none` | `small` reduces spacing for tighter rhythm; `none` removes it entirely for flush stacking |
| `bottom_spacing` | `auto` (default), `small`, `none` | Same as above for the bottom edge |

## Available blocks

| Block | Key settings | Notes |
|---|---|---|
| image | `image` (image picker), `caption` (text) | The only block type. Each block is one gallery item. Caption appears on hover inside a dark gradient overlay at the bottom of the card. Images without a caption still open in the lightbox on click. Responsive srcset is generated automatically at medium size. |

## Layout recipes

**1. "Portfolio Wall" (creative professional)**
Settings: layout `grid`, columns_desktop `3`, aspect_ratio `4/3`, staggered `true`, heading_alignment `start`, color_scheme `standard-primary`.
Blocks: 6--9 project photos with captions naming each project.
Good for: photographers, architects, interior designers, illustrators.

**2. "Before & After Strip" (service showcase)**
Settings: layout `carousel`, columns_desktop `2`, aspect_ratio `3/2`, staggered `false`, heading_alignment `center`.
Blocks: 6--8 images alternating before/after shots, captions labeling each ("Kitchen -- Before", "Kitchen -- After").
Good for: showing transformation results without overwhelming the page.

**3. "Product Lookbook" (retail/e-commerce)**
Settings: layout `grid`, columns_desktop `4`, aspect_ratio `1/1`, staggered `false`, color_scheme `highlight-primary`, heading_alignment `center`, eyebrow "New Collection".
Blocks: 8 square product shots, captions with product names.
Good for: seasonal launches, catalog browsing, lifestyle product display.

**4. "Team at Work" (company culture)**
Settings: layout `grid`, columns_desktop `3`, aspect_ratio `16/9`, staggered `false`, heading_alignment `start`, color_scheme `standard-secondary`.
Blocks: 6 candid workplace or event photos, captions optional.
Good for: about-us pages where showing the team and workspace builds trust.

**5. "Full-Width Cinema Reel" (visual impact)**
Settings: layout `carousel`, columns_desktop `2`, aspect_ratio `16/9`, staggered `false`, top_spacing `none`, bottom_spacing `none`, color_scheme `highlight-primary`.
Blocks: 5--7 wide cinematic images, short captions.
Good for: hero-adjacent storytelling, event recaps, travel highlights.

**6. "Mosaic Feature" (editorial/blog)**
Settings: layout `grid`, columns_desktop `4`, aspect_ratio `auto`, staggered `true`, heading_alignment `start`.
Blocks: 8+ images of varying native proportions; captions describe each scene.
Good for: mixed-media storytelling where image proportions differ naturally.

**7. "Minimal Proof" (service-based landing page)**
Settings: layout `grid`, columns_desktop `5`, aspect_ratio `1/1`, staggered `false`, heading_alignment `center`, eyebrow "Our Work", color_scheme `standard-primary`.
Blocks: 5 images, no captions.
Good for: a compact trust strip that shows volume of work without taking up much vertical space.

## Differentiation tips

- **Staggered + auto aspect ratio** is the most organic-feeling combination. Use it when images have different native proportions and you want the layout to feel curated rather than mechanical.
- **Carousel at 2 columns with 16/9** creates a cinematic feel that works well right below a hero section, especially with both spacing values set to `none` so the gallery bleeds into surrounding content.
- Captions are hover-only, so they should be supplementary, not essential. If the caption carries critical information (like a price or a CTA), consider using a different widget where the text is always visible.
- Pair the eyebrow with a left-aligned heading to create an editorial hierarchy that feels more intentional than a centered title alone.
- The lightbox fires on every image click. If the gallery sits on a page where you want users to navigate away (e.g., to individual project pages), the lightbox may slow that intent down -- in those cases a card-based widget with links may serve better.
- Square aspect ratio at 4--5 columns is the safest default for mixed-quality photography because the tight crop hides composition problems and the small size forgives resolution issues.
- Use `highlight-primary` or `highlight-secondary` color schemes to visually separate the gallery from adjacent text-heavy sections; the background color change acts as a natural scroll landmark.
