# Bedrock — Image Usage Map

Bridge between [bedrock-images.json](bedrock-images.json) (generator input, `.jpg`) and the template/collection JSON (references, `.webp` after `optimize-images.js`). Paths in JSON are `/uploads/images/<basename>.webp`.

## index

| Widget ID | Block ID | Image file | Dimensions |
|---|---|---|---|
| `hero` (banner) | — (widget `image`) | bedrock-hero.webp | 1920×1080 |
| `service_categories` (card-grid) | `cat-kitchens` | bedrock-service-kitchens.webp | 1024×768 |
| `service_categories` | `cat-additions` | bedrock-service-additions.webp | 1024×768 |
| `service_categories` | `cat-wholehome` | bedrock-service-wholehome.webp | 1024×768 |
| `service_categories` | `cat-commercial` | bedrock-service-commercial.webp | 1024×768 |
| `before_after` (comparison-slider) | — (`before_image`) | bedrock-before-kitchen.webp | 1600×1067 |
| `before_after` | — (`after_image`) | bedrock-after-kitchen.webp | 1600×1067 |
| `homeowner_quote` (testimonial-hero) | — (`author_image`) | bedrock-testimonial-portrait.webp | 1024×1280 |

No images: `credentials`, `by_the_numbers`, `how_we_work`, `closing_cta`. `recent_projects` renders collection items' featured images (see Collections below).

## services

| Widget ID | Block ID | Image file | Dimensions |
|---|---|---|---|
| `one_team` (image-text) | — (widget `image`) | bedrock-oneteam.webp | 1024×1280 |

No images: `page_opener`, `service_list`, `objections`, `closing_cta`.

## projects

| Widget ID | Block ID | Image file | Dimensions |
|---|---|---|---|
| `project_reviews` (testimonials) | `rev-1` (avatar) | bedrock-avatar-1.webp | 512×512 |
| `project_reviews` | `rev-2` (avatar) | bedrock-avatar-2.webp | 512×512 |
| `project_reviews` | `rev-3` (avatar) | bedrock-avatar-3.webp | 512×512 |
| `before_after` (comparison-slider) | — (`before_image`) | bedrock-before-livingroom.webp | 1600×1067 |
| `before_after` | — (`after_image`) | bedrock-after-livingroom.webp | 1600×1067 |

No images: `page_opener`, `closing_cta`. `all_projects` renders collection items' featured images.

## process

| Widget ID | Block ID | Image file | Dimensions |
|---|---|---|---|
| `the_steps` (steps) | `step-visit` | bedrock-process-consult.webp | 1024×768 |
| `the_steps` | `step-quote` | bedrock-process-quote.webp | 1024×768 |
| `the_steps` | `step-permits` | bedrock-process-permits.webp | 1024×768 |
| `the_steps` | `step-build` | bedrock-process-build.webp | 1024×768 |
| `the_steps` | `step-walkthrough` | bedrock-process-walkthrough.webp | 1024×768 |
| `warranty` (image-text) | — (widget `image`) | bedrock-warranty.webp | 1024×1280 |

No images: `page_opener`, `typical_timeline`, `closing_cta`.

## about

| Widget ID | Block ID | Image file | Dimensions |
|---|---|---|---|
| `founder_story` (image-text) | — (widget `image`) | bedrock-founder.webp | 1024×1280 |
| `client_voices` (testimonial-slider) | `cv-1` (avatar) | bedrock-avatar-4.webp | 512×512 |
| `client_voices` | `cv-2` (avatar) | bedrock-avatar-5.webp | 512×512 |
| `client_voices` | `cv-3` (avatar) | bedrock-avatar-6.webp | 512×512 |
| `the_crew` (team-highlight) | `crew-dan` (photo) | bedrock-crew-owner.webp | 1280×1600 |
| `the_crew` | `crew-maria` (photo) | bedrock-crew-pm.webp | 1280×1600 |
| `the_crew` | `crew-luis` (photo) | bedrock-crew-super.webp | 1280×1600 |
| `the_crew` | `crew-emma` (photo) | bedrock-crew-office.webp | 1280×1600 |

No images: `page_opener`, `credentials`, `closing_cta`.

## contact

No images on any widget: `page_opener`, `reach_us`, `next_steps`, `office_map`, `closing_cta`.

## Collections (`collections/projects/`)

| Item slug | Field | Image file | Dimensions |
|---|---|---|---|
| kitchen-remodel | `featured_image` | bedrock-project-kitchen-remodel.webp | 1600×1200 |
| bath-remodel | `featured_image` | bedrock-project-bath-remodel.webp | 1600×1200 |
| two-story-addition | `featured_image` | bedrock-project-two-story-addition.webp | 1600×1200 |
| whole-home-renovation | `featured_image` | bedrock-project-whole-home.webp | 1600×1200 |
| cedar-deck-pergola | `featured_image` | bedrock-project-cedar-deck.webp | 1600×1200 |
| cafe-fit-out | `featured_image` | bedrock-project-cafe-fitout.webp | 1600×1200 |

## Count by category

| Category | Count |
|---|---|
| Hero | 1 |
| Service category cards | 4 |
| Project featured images | 6 |
| Before/after pairs | 4 |
| Process steps | 5 |
| Founder + crew portraits | 5 |
| One-team / warranty / testimonial-hero portrait | 3 |
| Avatars | 6 |
| **Total** | **34** |

All 34 generator entries are referenced exactly once; no orphans, no missing files.

## User-supplied images (outside the generator pipeline)

- Header logo (`logoImage`) and transparent-header variant (`transparent_logo`)
- Footer logo (`logo_text` block `logo`) — optional; block currently uses text
- Favicon (theme setting)
