# Widget Standards Audit

Reference: [standards.md](./standards.md)

---

## Completed Work

### Session Fixes Applied:

- ✅ `accordion` - Fixed duplicate CSS properties
- ✅ `bento-grid` - Fixed block settings order (image → overlay → background)
- ✅ `comparison-slider` - Added missing data-setting attributes
- ✅ `podcast-player` - Added missing data-setting attributes
- ✅ `video` - Added missing data-setting attributes
- ✅ `video-embed` - Added missing data-setting attributes
- ✅ `image-callout` - Refactored to unified block pattern (heading, text, features, button)
- ✅ `image-text` - Added features block
- ✅ `card-grid` - Merged `feature-grid` into it, added icon support
- ✅ `comparison-slider` - Verified compliant
- ✅ `comparison-table` - Verified compliant
- ✅ `contact-form` - Moved styles to global base.css
- ✅ `content-switcher` - Refactored to use standard card layout
- ✅ `countdown` - Refactored typography to use utilities, removed empty blocks

---

## Widget Categories

### Category A: Unified Block Pattern (heading/text/features/button)

These widgets use flexible, reorderable content blocks:

| Widget          | Status      | Notes                      |
| --------------- | ----------- | -------------------------- |
| `image-text`    | ✅ Complete | Reference implementation   |
| `image-callout` | ✅ Complete | Overlapping layout variant |

### Category B: Row/Item Block Pattern

These widgets have repeatable items with fixed structure per item:

| Widget             | Needs Work | Details                                                |
| ------------------ | ---------- | ------------------------------------------------------ |
| `alternating-rows` | ⚠️         | Add `features` textarea to row block, add size options |
| `card-grid`        | Review     | Check for text options consistency                     |
| `feature-grid`     | Review     | Check for text options consistency                     |
| `featured-cards`   | Review     | Check for text options consistency                     |
| `numbered-cards`   | Review     | Check for text options consistency                     |
| `profile-grid`     | Review     | Check for text options consistency                     |
| `testimonials`     | Review     | Check for text options consistency                     |

### Category C: Specialized Widgets

These have unique functionality that may not fit the standard pattern:

| Widget              | Status | Notes                                |
| ------------------- | ------ | ------------------------------------ |
| `accordion`         | ✅     | FAQ pattern - question/answer blocks |
| `bento-grid`        | ✅     | Grid items with background/overlay   |
| `comparison-slider` | ✅     | Before/after comparison              |
| `comparison-table`  | Review | Table structure                      |
| `countdown`         | Review | Timer functionality                  |
| `event-list`        | Review | Event items                          |
| `gallery`           | Review | Image lightbox                       |
| `image-hotspots`    | Review | Interactive hotspots                 |
| `image-tabs`        | Review | Tabbed content                       |
| `job-listing`       | Review | Job posts                            |
| `key-figures`       | Review | Statistics display                   |
| `logo-cloud`        | ✅     | Logo grid                            |
| `map`               | Review | Location embed                       |
| `masonry-gallery`   | Review | Masonry layout                       |
| `podcast-player`    | ✅     | Audio player                         |
| `priced-list`       | Review | Menu/services list                   |
| `pricing`           | Review | Pricing tables                       |
| `project-showcase`  | Review | Portfolio items                      |
| `schedule-table`    | Review | Schedule/timetable                   |
| `social-icons`      | Review | Social links                         |
| `timeline`          | Review | Timeline events                      |
| `video`             | ✅     | Video player                         |
| `video-embed`       | ✅     | YouTube/Vimeo embed                  |

### Category D: Hero Widgets (Skip)

Different pattern - full-width with background images:

| Widget      | Status              |
| ----------- | ------------------- |
| `banner`    | Skip - hero pattern |
| `slideshow` | Skip - hero pattern |

### Category E: Global Widgets (Skip)

Header/footer - different architecture:

| Widget          | Status |
| --------------- | ------ |
| `global/header` | Skip   |
| `global/footer` | Skip   |

### Category F: Internal (Skip)

| Widget   | Status                 |
| -------- | ---------------------- |
| `styles` | Skip - design showcase |

---

## Standards Checklist Per Widget

When auditing each widget, check:

### Structure (Rules 1-2)

- [ ] Section has id, class, data-widget-id, data-widget-type
- [ ] Uses widget-eyebrow, widget-headline, widget-description for header
- [ ] Uses data-setting attributes on editable elements

### Typography (Rule 3)

- [ ] Uses block-text utilities (not hardcoded font-size/color in CSS)
- [ ] No redundant typography CSS in style block

### Semantic HTML (Rule 4)

- [ ] h2 for widget title, h3 for items
- [ ] ARIA attributes on interactive elements

### Layout (Rule 5)

- [ ] Uses flex/grid with gap for spacing
- [ ] No hardcoded margins on semantic classes

### Background (Rule 6)

- [ ] Background setting at END of settings array
- [ ] Correct liquid implementation on section/container

### Block Settings Order (Rules 7, 10)

- [ ] For items with backgrounds: image → overlay_color → background_color
- [ ] Content settings first, layout, style, background last

### Block Architecture (Rule 9)

- [ ] Uses blocksOrder loop for rendering
- [ ] Flexible blocks where appropriate

### Local Styles (Rule 11)

- [ ] Only widget-specific layout in style block
- [ ] Uses design system variables
- [ ] No duplicate CSS properties

---

## Priority Queue

### High Priority (Structural Changes):

1. `alternating-rows` - Add features, add text options
2. `card-grid` - Review block structure consistency
3. `feature-grid` - Review block structure consistency

### Medium Priority (Minor Fixes):

4. `gallery` - Has hardcoded colors (deferred per user)
5. Other Category B widgets - Review for consistency

### Low Priority (Review Only):

6. Category C specialized widgets - Case-by-case review
