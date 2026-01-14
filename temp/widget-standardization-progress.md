# Widget Standardization Checklist & Progress

For each widget, check and verify the following standardization rules. If a rule is not applicable (N/A), mark it as checked.

## Standardization Rules Refrence

1.  **Widget Header h1/h2**:
    - If `widget.settings.title` exists (STRICT CHECK):
      - `widget.index == 1` → `<h1>`
      - `widget.index != 1` → `<h2>`
2.  **Block/Item Heading Level**:
    - **If Widget Title Exists**:
      - `widget.index == 1` → Items are `<h2>` (Flattened request)
      - `widget.index != 1` → Items are `<h3>`
    - **If NO Widget Title**:
      - `widget.index == 1` → First Item `<h1>`, Others `<h2>`
      - `widget.index != 1` → All Items `<h2>`
3.  **Content Flow Spacing**:
    - Use `.content-flow` class on the content wrapper.
    - Add `* + *` margin-top logic (usually via `content-flow` utility or local style).
4.  **Standardized Text Block**:
    - Settings: `size` (sm, base, lg), `uppercase`, `muted`.
5.  **Standardized Heading Block**:
    - Settings: `size` (lg, xl, 2xl, 3xl, 4xl, 5xl).
6.  **Standardized Button Block**:
    - Settings: `size` (small, medium, large, xlarge).
    - Template: Use string concatenation `{% assign size_class = 'widget-button-' | append: block.settings.size %}` (handle 'small' as empty).

---

## Widgets Status

### Completed ✅

#### `accordion`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A - uses specific `item` blocks)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `banner`

- [x] Widget Header h1/h2 (N/A)
- [x] Block Heading h1/h2
- [x] Content Flow Spacing
- [x] Standardized Text Block
- [x] Standardized Heading Block
- [x] Standardized Button Block

#### `bento-grid`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Item titles updated)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `card-grid`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Card titles updated)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `comparison-slider`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Card titles updated)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `comparison-table`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `contact-form`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Sidebar kept secondary H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `content-switcher`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Card titles H3/H2)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `countdown`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `embed`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `event-list`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Items dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `gallery`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A - Captions)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `icon-list`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A - Spans)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `image-callout`

- [x] Widget Header h1/h2 (Heading block dynamic)
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `image-hotspots`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Tooltips default to H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `image-tabs`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Tabs dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `image-text`

- [x] Widget Header h1/h2 (N/A)
- [x] Block Heading h1/h2
- [x] Content Flow Spacing
- [x] Standardized Text Block
- [x] Standardized Heading Block
- [x] Standardized Button Block

#### `job-listing`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Items dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `key-figures`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Items dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `logo-cloud`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A - Images)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `map`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `masonry-gallery`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Items dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `newsletter`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `numbered-cards`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Items dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `podcast-player`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Main Title dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `priced-list`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Items dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `pricing`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Items dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `profile-grid`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Items dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `project-showcase`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Items dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `rich-text`

- [x] Widget Header h1/h2 (N/A)
- [x] Block Heading h1/h2
- [x] Content Flow Spacing
- [x] Standardized Text Block
- [x] Standardized Heading Block
- [x] Standardized Button Block

#### `schedule-table`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `slideshow`

- [x] Widget Header h1/h2 (First slide h1 if index 1, else h2)
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `social-icons`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `testimonials`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `timeline`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (Items dynamic H2/H3)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `video`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)

#### `video-embed`

- [x] Widget Header h1/h2
- [x] Block Heading h1/h2 (N/A)
- [x] Content Flow Spacing (N/A)
- [x] Standardized Text Block (N/A)
- [x] Standardized Heading Block (N/A)
- [x] Standardized Button Block (N/A)
