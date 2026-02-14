# Theme Generation Guide

> **A professional web design approach to creating Widgetizer themes**

This guide provides the design principles, available tools, and strict rules for generating industry-specific themes. The goal is to think like a professional web designer while adhering to Widgetizer's theming system.

## Required Reading

Before generating any theme, understand these core documents:

- **[Theming Guide](theming.md)** - Theme structure, `theme.json` schema, layout templates, Liquid tags, global settings, blocks system
- **[Widget Authoring Guide](theming-widgets.md)** - CSS design tokens, typography system, layout utilities, component patterns
- **[Setting Types Reference](theming-setting-types.md)** - All available setting types for widget schemas

---

## Part 1: Design Thinking

### Understanding the Client's Industry

Before selecting colors, fonts, or layouts, answer these questions:

1. **Who is the target audience?** (demographics, expectations, technical comfort)
2. **What emotions should the site evoke?** (trust, excitement, calm, urgency, luxury, approachability)
3. **What actions should visitors take?** (contact, purchase, subscribe, learn, book)
4. **What differentiates this industry?** (terminology, conventions, regulatory requirements)
5. **What are the competitive expectations?** (what do visitors expect from this type of site)

### Visual Hierarchy Principles

Every page should guide the user's eye through:

1. **Primary focus** - The most important message or action (hero headline, main CTA)
2. **Supporting content** - Evidence and context (stats, features, testimonials)
3. **Secondary actions** - Alternative paths (learn more, explore, browse)
4. **Footer/navigation** - Utility and trust (contact, legal, social proof)

### Content Strategy

Consider what content blocks the industry needs:

- **Credibility builders** - Awards, certifications, years in business, client logos
- **Social proof** - Testimonials, reviews, case studies, success metrics
- **Service/product presentation** - Features, benefits, differentiators
- **Team/expertise** - People, qualifications, experience
- **Process explanation** - How it works, what to expect
- **Call to action** - What you want them to do next

---

## Part 2: Color Theory

### The Psychology of Color

Colors communicate before words are read:

| Feeling                           | Color Families                           |
| --------------------------------- | ---------------------------------------- |
| Trust, stability, professionalism | Blues, deep navies, slate                |
| Warmth, comfort, approachability  | Warm neutrals, earth tones, soft oranges |
| Luxury, prestige, elegance        | Gold, deep purples, black, rich browns   |
| Energy, urgency, passion          | Reds, bright oranges                     |
| Growth, health, nature            | Greens, teals                            |
| Innovation, creativity            | Purples, magentas, electric blues        |
| Cleanliness, simplicity           | Whites, light grays, minimal palettes    |
| Sophistication, boldness          | High contrast, black + single accent     |

### Building a Cohesive Palette

The Widgetizer color system requires two schemes:

**Standard Scheme (Light):**

- Background colors should provide enough contrast for readability
- Text colors must be accessible (WCAG AA minimum)
- Accent color is the primary brand/action color
- Use accent sparingly for CTAs and key elements

**Highlight Scheme (Dark):**

- Inverted for sections that need visual separation
- Often used for heroes, CTAs, footers
- Accent may shift to a lighter/brighter variant for visibility

### Color Relationships

- **Monochromatic** - Single hue with varying lightness (elegant, cohesive)
- **Complementary** - Opposite on color wheel (high contrast, energetic)
- **Analogous** - Adjacent hues (harmonious, natural)
- **Triadic** - Three equidistant hues (vibrant, balanced)

### Practical Application

When defining `theme.json` colors:

```
standard_bg_primary     → Main page background
standard_bg_secondary   → Alternate sections, cards
standard_text_content   → Body text (ensure contrast ratio ≥ 4.5:1)
standard_text_heading   → Headlines (can be darker/bolder)
standard_text_muted     → Secondary text, captions, meta
standard_border_color   → Subtle dividers, card borders
standard_accent         → CTAs, links, key highlights
standard_accent_text    → Text on accent-colored buttons
standard_rating_star    → Star ratings (typically warm/gold)
```

---

## Part 3: Typography

### Font Psychology

Typography sets the tone:

| Character                               | Font Types                                                 |
| --------------------------------------- | ---------------------------------------------------------- |
| Traditional, authoritative, established | Serif fonts (Libre Baskerville, Playfair Display, Lora)    |
| Modern, clean, professional             | Geometric sans (Inter, DM Sans, Outfit)                    |
| Friendly, approachable, warm            | Rounded sans (Nunito, Poppins, Quicksand)                  |
| Technical, precise, digital             | Monospace or technical sans (Space Grotesk, IBM Plex)      |
| Elegant, refined, luxury                | High-contrast serif (Playfair Display, Cormorant Garamond) |
| Bold, impactful, contemporary           | Display fonts (Bebas Neue, Oswald, Anton)                  |

### Font Pairing Principles

1. **Contrast** - Pair fonts with different characteristics (serif + sans-serif)
2. **Hierarchy** - Heading font should be distinctive; body font should be readable
3. **Mood alignment** - Both fonts should support the same emotional tone
4. **Weight variety** - Ensure the fonts have the weights you need (400, 600, 700)

### Available Fonts

All fonts are defined in `src/core/config/fonts.json`. Each entry includes:

- `name` - Display name
- `stack` - CSS font-family value
- `isGoogleFont` - Whether it loads from Google/Bunny Fonts
- `availableWeights` - Which weights can be used
- `defaultWeight` - Recommended weight

Select fonts that have appropriate weights for both headings (typically 600-700) and body (typically 400).

---

## Part 4: Layout & Page Structure

### Page Anatomy

A typical page flows:

1. **Hero/Header** - First impression, primary message, main CTA
2. **Trust/Credibility** - Logos, stats, awards (builds confidence to continue)
3. **Core Content** - Services, features, value proposition
4. **Social Proof** - Testimonials, case studies, reviews
5. **Secondary Content** - Additional info, FAQs, team
6. **Final CTA** - Reminder of desired action
7. **Footer** - Navigation, contact, legal

### Section Rhythm

Vary the visual rhythm to maintain interest:

- Alternate `color_scheme: "standard"` and `color_scheme: "highlight"`
- Alternate image positions (left/right) in image-text widgets
- Vary section density (full-width vs. contained)
- Use different widget types to break monotony

### Whitespace

The Widgetizer design system uses consistent spacing tokens. Widgets automatically apply appropriate spacing. Trust the system—don't fight it with excessive customization.

---

## Part 5: Available Widgets

### The Complete Widget Toolkit

These are all widgets available in the `arch` theme. Each widget serves specific purposes:

#### Heroes & Banners

| Widget             | Purpose                    | Key Features                             |
| ------------------ | -------------------------- | ---------------------------------------- |
| `banner`           | Flexible hero/CTA sections | Text blocks, buttons, background options |
| `slideshow`        | Multiple rotating messages | Auto-play, multiple slides, transitions  |
| `split-hero`       | Side-by-side hero layout   | Image + content columns                  |
| `testimonial-hero` | Lead with social proof     | Featured testimonial as hero             |

#### Content Sections

| Widget           | Purpose                      | Key Features                               |
| ---------------- | ---------------------------- | ------------------------------------------ |
| `image-text`     | Image alongside text content | Alternating image position, feature lists  |
| `image-callout`  | Feature highlight with image | Similar to image-text with callout styling |
| `features-split` | Two-column feature layout    | Side-by-side comparison                    |
| `rich-text`      | Long-form text content       | Markdown-style formatting                  |
| `bento-grid`     | Modern grid layout           | Flexible grid cells                        |

#### Cards & Grids

| Widget           | Purpose                   | Key Features                        |
| ---------------- | ------------------------- | ----------------------------------- |
| `card-grid`      | Grid of content cards     | Images, titles, descriptions, links |
| `icon-card-grid` | Cards with icons          | Icon + title + description          |
| `numbered-cards` | Sequential/numbered items | Numbers, steps, rankings            |
| `icon-list`      | List items with icons     | Compact feature lists               |

#### People & Teams

| Widget         | Purpose              | Key Features               |
| -------------- | -------------------- | -------------------------- |
| `profile-grid` | Team member profiles | Photo, name, role, bio     |
| `testimonials` | Customer reviews     | Quote, name, title, rating |

#### Data & Comparison

| Widget             | Purpose            | Key Features                                 |
| ------------------ | ------------------ | -------------------------------------------- |
| `key-figures`      | Statistics display | Blocks: `figure` (value, label, description) |
| `comparison-table` | Feature comparison | See detailed structure below                 |
| `pricing`          | Pricing tiers      | Price, features, CTA                         |
| `priced-list`      | Menu/price list    | Blocks: `item` (title, description, price)   |

##### comparison-table Widget Structure (IMPORTANT)

This widget uses TWO block types that work together:

1. **`column` blocks** - Define the columns/plans being compared
   - `name`: Column header (e.g., "Free", "Pro", "Enterprise")
   - `badge`: Optional badge text (e.g., "Popular")
   - `featured`: Boolean to highlight this column

2. **`feature` blocks** - Define the feature rows
   - `name`: Feature name (e.g., "Storage", "API Access")
   - `values`: One value per line, matching column order (use ✓, ✗, or custom text)

Example structure:

```json
"blocks": {
  "col_1": { "type": "column", "settings": { "name": "Basic", "featured": false } },
  "col_2": { "type": "column", "settings": { "name": "Pro", "badge": "Popular", "featured": true } },
  "col_3": { "type": "column", "settings": { "name": "Enterprise", "featured": false } },
  "feature_1": { "type": "feature", "settings": { "name": "Users", "values": "1\n5\nUnlimited" } },
  "feature_2": { "type": "feature", "settings": { "name": "Storage", "values": "5GB\n50GB\n500GB" } },
  "feature_3": { "type": "feature", "settings": { "name": "Support", "values": "✗\n✓\n✓" } }
},
"blocksOrder": ["col_1", "col_2", "col_3", "feature_1", "feature_2", "feature_3"]
```

#### Timeline & Process

| Widget           | Purpose                | Key Features                                    |
| ---------------- | ---------------------- | ----------------------------------------------- |
| `timeline`       | Chronological events   | Date, title, description                        |
| `countdown`      | Event countdown        | Target date, time units                         |
| `schedule-table` | Hours/schedule display | Blocks: `day` (day name, hours, closed boolean) |

#### Media

| Widget              | Purpose                 | Key Features           |
| ------------------- | ----------------------- | ---------------------- |
| `gallery`           | Image grid              | Lightbox, captions     |
| `masonry-gallery`   | Pinterest-style gallery | Variable height images |
| `image`             | Single image            | Simple image display   |
| `video`             | Self-hosted video       | Controls, autoplay     |
| `video-embed`       | YouTube/Vimeo           | Responsive embed       |
| `image-hotspots`    | Interactive image       | Clickable hotspots     |
| `image-tabs`        | Tabbed image content    | Tab navigation         |
| `comparison-slider` | Before/after slider     | Draggable comparison   |

#### Navigation & Organization

| Widget             | Purpose            | Key Features              |
| ------------------ | ------------------ | ------------------------- |
| `accordion`        | Expandable content | FAQ, collapsible sections |
| `content-switcher` | Tabbed content     | Tab-based navigation      |

#### Forms & Contact

| Widget         | Purpose          | Key Features          |
| -------------- | ---------------- | --------------------- |
| `contact-form` | Lead capture     | Configurable fields   |
| `newsletter`   | Email signup     | Simple subscription   |
| `map`          | Location display | Address, embedded map |

#### Trust & Social

| Widget         | Purpose              | Key Features        |
| -------------- | -------------------- | ------------------- |
| `logo-cloud`   | Client/partner logos | Logo grid           |
| `trust-bar`    | Trust indicators     | Compact trust strip |
| `social-icons` | Social media links   | Icon links          |

#### Specialty

| Widget             | Purpose           | Key Features               |
| ------------------ | ----------------- | -------------------------- |
| `project-showcase` | Portfolio display | Project cards with details |
| `event-list`       | Upcoming events   | Date, title, details       |
| `job-listing`      | Career postings   | Job cards                  |
| `podcast-player`   | Audio content     | Player interface           |
| `embed`            | External content  | iFrame embed               |

---

## Part 6: Widgetizer Rules (Strict Compliance)

### Theme Structure Requirements

A valid theme MUST contain:

```
themes/{theme-name}/
├── theme.json              # REQUIRED: Metadata + settings schema
├── layout.liquid           # REQUIRED: Main layout template
├── screenshot.png          # REQUIRED: 1280x720 preview image
├── widgets/                # REQUIRED: Widget templates
│   └── (inherited from arch - do not modify)
├── templates/              # REQUIRED: Page templates
│   ├── global/
│   │   ├── header.json     # REQUIRED: Global header config
│   │   └── footer.json     # REQUIRED: Global footer config
│   └── {page}.json         # Page templates
├── menus/                  # Navigation menus
│   ├── main-menu.json
│   └── footer-menu.json
├── presets/                # OPTIONAL: Preset variants
│   ├── presets.json        # Preset registry
│   └── {preset-id}/
│       ├── preset.json     # Settings overrides (flat map of setting_id → value)
│       ├── screenshot.png  # Preset preview (falls back to root screenshot.png)
│       ├── templates/      # Optional: custom page templates for this preset
│       └── menus/          # Optional: custom menus for this preset
├── assets/                 # Theme assets (CSS, JS, icons)
├── snippets/               # Reusable Liquid partials
└── prompt-widget.md        # Widget generation prompt (optional)
```

### theme.json Requirements

```json
{
  "name": "Theme Name",           // REQUIRED
  "version": "0.8.8",             // REQUIRED: Match base theme
  "description": "Description",   // REQUIRED
  "author": "Widgetizer",         // REQUIRED
  "settings": {
    "global": {
      "layout": [...],            // Animation settings
      "colors": [...],            // 18 color settings (9 standard + 9 highlight)
      "typography": [...],        // heading_font + body_font
      "privacy": [...],           // use_bunny_fonts
      "advanced": [...]           // custom_css, custom_head_scripts, custom_footer_scripts
    }
  }
}
```

### Color Settings (All Required)

Standard scheme (prefix `standard_`):

- `standard_bg_primary`, `standard_bg_secondary`
- `standard_text_content`, `standard_text_heading`, `standard_text_muted`
- `standard_border_color`
- `standard_accent`, `standard_accent_text`
- `standard_rating_star`

Highlight scheme (prefix `highlight_`):

- Same 9 settings with `highlight_` prefix

### Typography Settings (Required)

```json
{
  "type": "font_picker",
  "id": "heading_font",
  "label": "Heading Font",
  "default": {
    "stack": "\"Font Name\", fallback",
    "weight": 600
  }
},
{
  "type": "font_picker",
  "id": "body_font",
  "label": "Body Font",
  "default": {
    "stack": "\"Font Name\", fallback",
    "weight": 400
  }
}
```

### Template JSON Structure

```json
{
  "name": "Page Name",
  "slug": "page-slug",
  "widgets": {
    "unique_widget_id": {
      "type": "widget-type-from-widgets-folder",
      "settings": { },
      "blocks": {
        "unique_block_id": {
          "type": "block-type-from-schema",
          "settings": { }
        }
      },
      "blocksOrder": ["unique_block_id", ...]
    }
  },
  "widgetsOrder": ["unique_widget_id", ...]
}
```

### Menu JSON Structure

```json
{
  "name": "Menu Name",
  "description": "Menu description",
  "items": [
    {
      "label": "Link Text",
      "link": "/page-slug",
      "items": []
    }
  ]
}
```

### Global Header/Footer Structure

```json
{
  "type": "header",
  "settings": {
    // Settings from widgets/global/header/schema.json
  }
}
```

---

## Part 7: Generation Workflow

### Step 1: Research & Strategy

1. Understand the industry's audience and expectations
2. Identify the emotional tone needed
3. List the essential pages and content types
4. Determine the primary calls to action

### Step 2: Visual Design Decisions

1. Select a color palette based on desired emotions
2. Choose font pairing that supports the tone
3. Plan the page structure and widget selection

### Step 3: Create Theme Files

1. Copy base theme: `cp -r themes/arch themes/arch-{name}`
2. Remove old templates: `rm themes/arch-{name}/templates/*.json` (keep `global/`)
3. Update `theme.json` with new name, colors, fonts
4. Create navigation menus
5. Update global header/footer templates
6. Create each page template

### Step 4: Content Creation

For each page template:

1. Select appropriate widgets for the content needs
2. Write industry-appropriate copy
3. Use realistic data (names, statistics, addresses)
4. Include appropriate CTAs
5. Add necessary disclaimers if required by industry

### Step 5: Create Presets (Optional)

If the theme should support multiple visual styles or demo content variants:

1. Create `presets/presets.json` with the preset registry (list of id, name, description; specify which is default)
2. For each preset, create `presets/{preset-id}/`:
   - **`preset.json`** (required): Flat map of `{ setting_id: value }` overrides for colors, fonts, animations, etc.
   - **`screenshot.png`** (recommended): 1280×720 preview image shown in the preset selector
   - **`templates/`** (optional): Full set of page templates if this preset needs different page content than root. Include `global/header.json` and `global/footer.json` if the preset has custom branding.
   - **`menus/`** (optional): Custom navigation menus if the preset needs different page links
3. The `"default"` preset can either have its own directory or fall through to root `templates/`, `menus/`, and `theme.json` defaults

**Preset design tips:**
- A settings-only preset (just `preset.json`) is the quickest way to offer a different visual style
- A full preset with templates + menus lets you showcase completely different industries (e.g., hotel vs. agency vs. portfolio)
- Each preset can use any widget available in the theme — use this to showcase different widget combinations
- Preset menus should have links matching the preset's template slugs

### Step 6: Validation

Verify:

- All required files exist
- `theme.json` has all 18 color settings
- Typography settings reference valid fonts from `fonts.json`
- All templates have valid widget types
- All block types match widget schemas
- Menu links match page slugs
- No placeholder text remains
- If presets exist: `presets.json` is valid JSON, each preset's `preset.json` has valid setting IDs, preset template slugs match preset menu links

---

## Part 8: Content Writing Principles

### Headlines

- Lead with the benefit or outcome
- Use active, confident language
- Match the industry's vocabulary
- Keep primary headlines concise (under 10 words ideal)

### Body Copy

- Write for scanning (short paragraphs, bullet points)
- Focus on benefits over features
- Use the audience's language
- Include specific details (numbers, names, credentials)

### Calls to Action

- Be specific about what happens next
- Use action verbs (Get, Start, Schedule, Download)
- Reduce friction (Free, No obligation, Instant)
- Match urgency to context

### Testimonials

- Include full names and titles/context
- Use specific results when possible
- Keep quotes conversational and believable
- Vary the testimonials across different aspects

### Statistics

- Use credible, specific numbers
- Provide context (timeframe, source)
- Round appropriately for readability
- Ensure they support the value proposition

---

## Part 9: Quality Standards

### Professional Polish

- Consistent capitalization and punctuation
- No typos or grammatical errors
- Appropriate industry terminology
- Realistic contact information format
- Consistent brand voice throughout

### Visual Consistency

- Widget IDs follow consistent naming convention
- Color schemes used appropriately (highlight for emphasis)
- Image positions alternate where logical
- Section rhythm varies for interest

### Completeness

- Every page has a clear purpose
- Every section has appropriate content
- CTAs appear at logical decision points
- Navigation includes all pages
- Footer has complete information

---

## Reference: Font Stack Formats

When specifying fonts in `theme.json`, use the exact stack format from `fonts.json`:

```json
// Serif examples
"stack": "\"Playfair Display\", serif"
"stack": "\"Libre Baskerville\", serif"
"stack": "\"Lora\", serif"

// Sans-serif examples
"stack": "\"Inter\", sans-serif"
"stack": "\"DM Sans\", sans-serif"
"stack": "\"Poppins\", sans-serif"

// Display examples
"stack": "\"Bebas Neue\", sans-serif"
"stack": "\"Oswald\", sans-serif"
```

Always verify the font exists in `src/core/config/fonts.json` before using.
