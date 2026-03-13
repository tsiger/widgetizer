# Theme Design System — Refactor Proposal

## Problem

Three overlapping style layers that fight each other:

1. **`block-text` utilities** (base.css) — composable: `block-text block-text-sm block-text-muted block-text-uppercase`
2. **`widget-*` semantic classes** (base.css) — `widget-headline`, `widget-description` etc. Half are empty comments, half set random properties
3. **Scoped CSS** (per widget `<style>`) — highest specificity, overrides everything

This causes: specificity conflicts (muted toggle bug), inconsistent naming (`widget-description` = two roles), redundant declarations across 3 layers, verbose class lists.

---

## New System

### 1. Semantic Base Classes (`w-` prefix)

Each one is a complete, self-contained text style at **single-class specificity**. Modifiers can always override.

```
.w-eyebrow     → font-size-sm, body-bold weight, letter-spacing 0.05em, uppercase, color: text-muted, line-height-relaxed, margin: 0
.w-headline    → heading font-weight, color: text-heading, line-height-tight, margin: 0
.w-title       → heading font-weight, color: text-heading, line-height-tight, margin: 0
.w-description → line-height-relaxed, color: text-content, margin: 0   (header trio ONLY)
.w-body        → line-height-relaxed, color: text-content, margin: 0   (all other body text)
.w-meta        → font-size-sm, color: text-muted, line-height-relaxed, margin: 0
.w-label       → font-size-sm, font-weight-semibold, color: text-content, line-height-relaxed, margin: 0
.w-rte         → rich text container (p margins, link styles, list styles) — replaces block-rte
```

Notes:
- `w-headline` vs `w-title`: headline = section-level (h1/h2 in widget header), title = item-level (card title, list item name)
- `w-description` is **only** for the header trio (eyebrow + headline + description). It also gets `max-width: 70rem` inside `.widget-header`.
- `w-body` is for all other body-level text
- `w-rte` replaces `block-rte` — keeps the same CSS (p margins, link styles, list formatting)

### 2. Text Modifier Classes (`t-` prefix)

Short, composable. Work with any base class. Declared AFTER base classes in CSS so they win.

**Size** (font-size + correct scale automatically):
```
.t-xs   → font-size-xs * body-scale
.t-sm   → font-size-sm * body-scale
.t-base → font-size-base * body-scale
.t-lg   → font-size-lg * body-scale
.t-xl   → font-size-xl * body-scale
.t-2xl  → font-size-2xl * heading-scale, line-height-tight
.t-3xl  → font-size-3xl * heading-scale, line-height-tight
...through t-9xl
```

**Color**:
```
.t-muted   → color: text-muted
.t-heading → color: text-heading
.t-accent  → color: accent
```

**Style**:
```
.t-uppercase → text-transform: uppercase; letter-spacing: 0.05em
```

**Weight**:
```
.t-normal         → body font-weight (400)
.t-medium         → font-weight-medium
.t-semibold       → font-weight-semibold
.t-heading-weight → heading font-weight (700)
.t-body-bold      → body bold weight (700)
```

### 3. Structural Classes (keep, no prefix change)

```
.content-flow    → adjacent sibling spacing
.features-list   → feature list wrapper (ul)
.feature-item    → feature list item (li) with icon support
```

### 4. Dynamic size/style classes in Liquid

Templates currently build `block-text-{{ size }}` and `block-text-uppercase` / `block-text-muted`.

New:
```liquid
{% assign size_class = 't-' | append: block.settings.size %}
{% assign style_class = '' %}
{% if block.settings.uppercase %}{% assign style_class = style_class | append: ' t-uppercase' %}{% endif %}
{% if block.settings.muted %}{% assign style_class = style_class | append: ' t-muted' %}{% endif %}
```

### 5. Scoped CSS role

Scoped CSS (`& .accordion-question { ... }`) should ONLY handle:
- **Layout** (flex, grid, width, gap, position, text-align)
- **Spacing** (padding, margin-block-end)
- **Widget-specific visual** (transitions, animations, borders, border-radius)

It should **NOT** set: `color`, `font-size`, `font-weight`, `line-height` — these belong in base classes and modifiers.

Exception: elements with hardcoded colors (e.g. project overlay with `color: #fff`) can set color in scoped CSS.

### 6. Card sub-components

Current `.widget-card-*` classes fold into the `w-` system:

```
.widget-card-title       → use w-title instead
.widget-card-subtitle    → use w-eyebrow instead (same styles: small, bold, uppercase, muted)
.widget-card-description → use w-body + w-rte instead
.widget-card-content     → keep as layout container (flex column)
.widget-card-header      → keep as layout container
.widget-card-footer      → keep as layout container
.widget-card-image       → keep as image container
.widget-card-icon        → keep as icon container
.widget-card             → keep as card container
.widget-card-flat        → keep as card variant
```

### 7. Widget header changes

**`.widget-header`** — keep as-is (flex column, centered, gap)

Inside widget-header:
- `w-eyebrow` — fully styled by base class
- `w-headline` — fully styled by base class + h1/h2 tag rules
- `w-description` — styled by base class. Gets `max-width: 70rem` via `.widget-header .w-description`

**Schema change**: In all widgets with the header trio, the `description` field should be `textarea` (not `richtext`). The description in the header is a short subheading — no need for rich text formatting.

Widgets that currently use `richtext` for widget-level description and need to change to `textarea`:
- **accordion** — schema line 19
- **features-split** — schema line 19

All other header-trio widgets already use `textarea`.

---

## Widget Element Map

### Widgets with Header Trio

These widgets share the same header pattern: `w-eyebrow` + `w-headline` + `w-description`

#### accordion
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | Widget setting |
| Headline | — | `w-headline` | — | h1/h2, widget setting |
| Description | — | `w-description` | — | Widget setting. Schema: change richtext → textarea. Remove `block-rte`/`w-rte` |
| Question | `accordion-question` | `w-title` | `t-lg` | Block setting. Scoped: keep flex:1, text-align |
| Answer | `accordion-answer` | `w-body` | — | Block setting. Has `w-rte`. Scoped: keep padding, opacity, transform, transition |

#### bento-grid
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | Widget setting |
| Headline | — | `w-headline` | — | h1/h2, widget setting |
| Description | — | `w-description` | — | Widget setting (textarea) |
| Item title | — | `w-title` | `t-xl` | Block setting. Currently uses `widget-title` |
| Item text | — | `w-body` | `t-sm` | Block setting. Currently uses `widget-description` |

#### card-grid
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Card subtitle | — | `w-eyebrow` | — | Currently `widget-card-subtitle` |
| Card title | — | `w-title` | — | Currently `widget-card-title`. Size from base.css card rule |
| Card description | — | `w-body` | — | Has `w-rte`. Currently `widget-card-description` + `block-rte` |

#### comparison-slider
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Before/After label | `comparison-slider-label` | `w-label` | `t-sm t-uppercase t-heading` | Scoped: position, padding, background |

#### comparison-table
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Column name | `comparison-table-th-name` | `w-body` | — | Scoped: keep layout |
| Badge | `comparison-table-badge` | `w-label` | `t-xs t-uppercase` | Scoped: background, padding, border-radius |
| Feature name | `comparison-table-td` | `w-body` | `t-heading` | Currently `block-text block-text-heading` |
| Cell value | — | `w-body` | — | Currently `block-text` |

#### contact-form
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Info title | `contact-info-title` | `w-title` | `t-lg` | h3 |
| Info text | `contact-info-text` | `w-body` | — | Has `w-rte` |

#### content-switcher
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Card title | — | `w-title` | — | Currently `widget-card-title` |
| Card price | `switcher-item-price` | `w-title` | `t-3xl` | Big price text |
| Card description | — | `w-body` | — | Has `w-rte`. Currently `widget-card-description` |

#### countdown
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Number | `countdown-number` | `w-title` | — | Font-size set in scoped CSS (responsive + style variants). Exception to the rule |
| Label | `countdown-label` | `w-meta` | `t-uppercase` | "Days", "Hours", etc |
| Separator | `countdown-separator` | `w-body` | `t-4xl t-muted` | Colon ":" |
| Expired msg | `countdown-expired` | `w-body` | `t-2xl t-accent` | JS-generated |

#### embed
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |

#### event-list
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Date day | `event-date-day` | `w-title` | `t-4xl` | Big date number |
| Date month | `event-date-month` | `w-meta` | `t-uppercase` | "JAN", "FEB" etc |
| Card title | — | `w-title` | — | Currently `widget-card-title` |
| Card subtitle | — | `w-meta` | — | Location text. Currently `widget-card-subtitle` |
| Card description | — | `w-body` | — | Has `w-rte`. Currently `widget-card-description` |

#### features-split
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | Schema: change richtext → textarea. Remove `block-rte`/`w-rte` |
| Item title | `features-split-item-title` | `w-title` | `t-lg` | Block setting |
| Item description | `features-split-item-description` | `w-body` | `t-sm t-muted` | Block setting. Has `w-rte` |

#### gallery
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Caption | `gallery-caption` | `w-body` | `t-sm` | Scoped: color #fff, text-shadow (overlay text — exception) |
| Modal caption | `gallery-modal-caption` | `w-body` | `t-muted` | |

#### icon-card-grid
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Card subtitle | — | `w-eyebrow` | — | Currently `widget-card-subtitle` |
| Card title | — | `w-title` | — | Currently `widget-card-title` |
| Card description | — | `w-body` | — | Has `w-rte`. Currently `widget-card-description` |

#### icon-list
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Item title | `icon-list-title` | `w-body` | — | Currently has scoped color: text-content (redundant with w-body) |

#### image-hotspots
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Tooltip title | `image-hotspot-tooltip-title` | `w-title` | `t-lg` | h3 |
| Tooltip desc | `image-hotspot-tooltip-description` | `w-body` | `t-sm` | Has `w-rte` |

#### image-tabs
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Tab title | `image-tabs-tab-title` | `w-title` | `t-lg` | h3/h2 |
| Tab desc | `image-tabs-tab-description` | `w-body` | `t-sm` | Has `w-rte` |

#### job-listing
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Job title | — | `w-title` | `t-xl` | Currently `widget-card-title` |
| Job meta | `job-meta` | `w-body` | `t-sm` | Location, type, salary |
| Job badge | `job-badge` | `w-label` | `t-xs t-uppercase` | "Full-Time", "Remote" |
| Filter button | `job-filter-btn` | `w-body` | `t-sm` | Scoped: button styles, active state |

#### key-figures
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Stat number | `stats-number` | `w-title` | `t-5xl` | font-variant-numeric: tabular-nums |
| Card title | — | `w-title` | — | Currently `widget-card-title` |

#### logo-cloud
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |

#### map
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Address text | `map-address` | `w-body` | `t-muted` | |
| Directions link | `map-directions` | `w-body` | `t-accent` | Scoped: hover underline |
| Placeholder | `map-placeholder` | `w-body` | `t-muted` | Editor-only |

#### masonry-gallery
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Card title | — | `w-title` | `t-base` | Currently `widget-card-title` with font-size-base (not lg) |
| Card category | `widget-card-category` | `w-meta` | `t-sm` | |

#### numbered-cards
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Card number | `widget-card-number` | `w-title` | `t-5xl t-muted` | "01", "02" etc |
| Card title | — | `w-title` | — | Currently `widget-card-title` |
| Card description | — | `w-body` | — | Has `w-rte`. Currently `widget-card-description` |

#### priced-list
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Item name | `priced-item-name` | `w-title` | `t-lg` | h3/h2 |
| Item description | `priced-item-description` | `w-body` | `t-sm` | Has `w-rte` |
| Item price | `priced-item-price` | `w-body` | `t-lg t-heading` | Price text |
| Badge | `priced-badge` | `w-label` | `t-xs t-uppercase` | V, VG, GF etc. Scoped: background colors per type |

#### pricing
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Card title | — | `w-title` | — | Currently `widget-card-title` |
| Price | `pricing-price` | `w-title` | `t-5xl` | Big price |
| Period | — | `w-meta` | — | Currently `widget-card-subtitle` |
| Feature item | `pricing-feature` | `w-body` | `t-base` | List item |

#### profile-grid
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Name | `profile-name` | `w-title` | `t-xl` | |
| Role | `profile-role` | `w-body` | `t-base t-semibold t-accent` | |
| Specialty | `profile-specialty` | `w-meta` | `t-sm` | |
| Bio | `profile-bio` | `w-body` | `t-sm` | |
| Placeholder | `profile-image-placeholder` | `w-body` | `t-4xl t-muted` | Editor-only |

#### project-showcase
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Project title | `project-title` | `w-title` | `t-xl` | Scoped: color #fff (overlay — exception) |
| Project desc | `project-description` | `w-body` | `t-sm` | Scoped: color rgba(255,255,255,0.8) (overlay — exception) |

#### schedule-table
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Day label | `schedule-label` | `w-body` | — | |
| Hours value | `schedule-value` | `w-body` | `t-heading` | |
| Closed text | `schedule-closed` | `w-body` | `t-muted` | |
| Note | `schedule-note` | `w-meta` | `t-sm` | |

#### social-icons
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |

#### testimonials
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Quote | `testimonial-quote` | `w-body` | `t-semibold t-heading` | |
| Author name | `testimonial-name` | `w-body` | `t-sm t-semibold t-heading` | |
| Author title | `testimonial-title` | `w-meta` | `t-sm` | |

#### timeline
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Marker number | `marker-number` | `w-body` | `t-base` | Scoped: color uses bg-primary (inverted text in circle) |
| Date | `timeline-date` | `w-meta` | `t-sm t-semibold t-uppercase t-accent` | |
| Duration | `timeline-duration` | `w-meta` | `t-sm` | |
| Title | `timeline-title` | `w-title` | `t-2xl` | |
| Text | `timeline-text` | `w-body` | — | Has `w-rte` |
| Feature item | — | `w-body` | — | Currently `feature-item` (keep structural class too) |

#### trust-bar
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Text | `trust-bar-text` | `w-body` | `t-sm` | No header trio |

#### video-embed
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Eyebrow | — | `w-eyebrow` | — | |
| Headline | — | `w-headline` | — | |
| Description | — | `w-description` | — | textarea |
| Placeholder | `video-embed-placeholder` | `w-body` | `t-muted` | Editor-only |

---

### Block-Based Content Widgets

These widgets don't have a header trio. They use heading/text/button blocks for flexible content.

#### banner
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Heading | — | `w-headline` | `{{ size_class }}` | h1/h2, block setting |
| Text | — | `w-body` | `{{ size_class }}{{ style_class }}` | Has `w-rte`. Block setting |

#### image-callout
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Heading | — | `w-headline` | `{{ size_class }}` | h1/h2, block setting |
| Text | — | `w-body` | `{{ size_class }}{{ style_class }}` | Has `w-rte`. Block setting |
| Feature item | — | `w-body` | — | Keep `feature-item` structural class |

#### image-text
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Heading | — | `w-headline` | `{{ size_class }}` | h1/h2, block setting. Currently `widget-title` |
| Text | — | `w-body` | `{{ size_class }}{{ style_class }}` | Has `w-rte`. Block setting. BUG: currently `widget-description` — muted broken |
| Feature item | — | `w-body` | — | Keep `feature-item` structural class |

#### rich-text
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Heading | — | `w-headline` | `{{ size_class }}` | h1/h2, block setting |
| Text | — | `w-body` | `{{ size_class }}{{ style_class }}` | Has `w-rte`. Block setting |

#### slideshow
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Heading | — | `w-headline` | `{{ size_class }}` | h1/h2, block setting |
| Text | — | `w-body` | `{{ size_class }}{{ style_class }}` | Block setting |

#### split-hero
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Heading | — | `w-headline` | `{{ size_class }}` | h1/h2, block setting. Currently `widget-title` |
| Text | — | `w-body` | `{{ size_class }}{{ style_class }}` | Has `w-rte`. Block setting |
| Feature item | — | `w-body` | — | Keep `feature-item` structural class |

#### testimonial-hero
| Element | Scoped class | Base class | Modifiers | Notes |
|---------|-------------|------------|-----------|-------|
| Heading | — | `w-headline` | `{{ size_class }}` | h1/h2, block setting. Currently `widget-title` |
| Text | — | `w-body` | `{{ size_class }}{{ style_class }}` | Has `w-rte`. Block setting |

---

### Minimal Widgets (no text elements)

- **image** — no text elements
- **core-divider** — no text elements
- **core-spacer** — no text elements

---

## Schema Changes

Widget-level `description` field type changes (richtext → textarea):

| Widget | Current type | New type |
|--------|-------------|----------|
| accordion | richtext | textarea |
| features-split | richtext | textarea |

All other header-trio widgets already use `textarea` for description.

---

## Migration Checklist

### base.css changes
1. Add `w-` base classes with complete styles
2. Add `t-` modifier classes (replace `block-text-*`)
3. Rename `.block-rte` to `.w-rte`
4. Remove old `block-text` base class and all `block-text-*` modifiers
5. Remove old `widget-text`, `widget-description` color rule (line 322-325)
6. Remove old `widget-headline`, `widget-title`, `widget-subtitle` comments
7. Update `.widget-header .widget-description` to `.widget-header .w-description`
8. Remove `.widget-card-title` font-size rule (line 756-764) — replaced by `w-title` + `t-*`
9. Remove `.widget-card-subtitle` (line 767-772) — replaced by `w-eyebrow`
10. Remove `.widget-card-description` (line 775-780) — replaced by `w-body`
11. Keep `.widget-card-content`, `.widget-card-header`, `.widget-card-footer`, `.widget-card-image`, `.widget-card-icon` (layout classes)

### Per-widget changes
For each widget:
1. Update markup: replace old classes with `w-` + `t-` classes
2. Update scoped CSS: remove typography properties, keep layout/spacing/visual
3. Update Liquid variables: `block-text-` → `t-`
4. Update schema if needed (richtext → textarea for header description)

### slideshow.css changes
1. Replace `.widget-headline` and `.widget-description` rules with `w-headline` and `w-body`
