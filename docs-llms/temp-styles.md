# Theme Style Settings — Implementation Notes

Temporary reference doc for continuing work on the Arch theme's global style settings system.

## Goal

Make a single theme (Arch) flexible enough to produce 100+ presets across industries by adding global "tone" settings that cascade through CSS to all widgets. Users who don't care about design can get a professional website by choosing a preset.

## Current Style Settings (theme.json → `settings.global.style`)

| Setting ID | UI Label | Options | Default |
|---|---|---|---|
| `corner_style` | Shapes | `sharp`, `slightly-rounded`, `rounded` | `sharp` |
| `card_style` | Content boxes | `bordered`, `shadow`, `flat` | `bordered` |
| `spacing_density` | Layout density | `compact`, `default`, `airy` | `default` |
| `button_shape` | Button shape | `auto`, `pill`, `sharp` | `auto` |

**Removed:** `heading_style` was removed from theme settings entirely (removed from theme.json, layout.liquid, previewManager.js classMap, and all presets). It could be a per-widget option in the future.

## How It Works

### Body Class Pattern

Style settings do NOT use `outputAsCssVar`. Instead, `layout.liquid` renders body classes:

```liquid
<body class="{{ body_class }} corner-{{ theme.style.corner_style | default: 'sharp' }} cards-{{ theme.style.card_style | default: 'bordered' }} spacing-{{ theme.style.spacing_density | default: 'default' }} buttons-{{ theme.style.button_shape | default: 'auto' }}">
```

### CSS Token Cascade (base.css `:root`)

Default values (sharp/zero):
```css
--radius-sm: 0;
--radius-md: 0;
--radius-lg: 0;
--radius-button: 0;
--card-border: var(--border-width-thin) solid var(--border-color);
--card-shadow: none;
--spacing-scale: 1;
```

Body classes override these tokens:

**Shapes:**
- `.corner-slightly-rounded` → `--radius-sm: 0.4rem; --radius-md: 0.6rem; --radius-lg: 0.8rem; --radius-button: 0.4rem`
- `.corner-rounded` → `--radius-sm: 0.6rem; --radius-md: 1.2rem; --radius-lg: 1.6rem; --radius-button: 0.8rem`

**Button shape** (overrides `--radius-button` from shapes):
- `.buttons-pill` → `--radius-button: 99rem`
- `.buttons-sharp` → `--radius-button: 0`
- `.buttons-auto` → inherits from corner_style

**Content boxes:**
- `.cards-bordered` → default (border, no shadow)
- `.cards-shadow` → `--card-border: none; --card-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)`
- `.cards-flat` → `--card-border: none; --card-shadow: none`

**Layout density:**
- `.spacing-compact` → `--spacing-scale: 0.8`
- `.spacing-airy` → `--spacing-scale: 1.25`

### base.css Consuming Selectors

These classes in base.css consume the tokens automatically:
- `.widget-card` → `border: var(--card-border); box-shadow: var(--card-shadow); border-radius: var(--radius-md); padding: calc(var(--space-lg) * var(--spacing-scale))`
- `.widget-button` → `border-radius: var(--radius-button)`
- `.form-input`, `.form-textarea`, `.form-select` → `border-radius: var(--radius-sm)`
- `.carousel-btn` → `border-radius: var(--radius-sm)`
- `.widget-container` → `margin-block: calc(var(--section-padding-block) * var(--spacing-scale))`
- `.widget-container-padded` → `padding-block: calc(var(--section-padding-block) * var(--spacing-scale))`
- `.widget-header` → `margin-block-end: calc(var(--space-2xl) * var(--spacing-scale))`

## Per-Widget Token Usage

Widgets that already inherit via `.widget-card` class (no extra work needed):
card-grid, icon-card-grid, pricing, testimonials, numbered-cards, key-figures, event-list, job-listing, content-switcher, project-showcase, gallery, masonry-gallery

Widgets with custom token usage added:

| Widget | Element | Token |
|---|---|---|
| image | `.image-wrapper`, `.image-link` (when not fullwidth) | `--radius-lg` |
| slideshow | `.slideshow-constrained` (slideshow.css) | `--radius-lg` |
| banner | section (when not fullwidth) | `--radius-lg` |
| accordion | `.accordion-item` | `--radius-sm` |
| accordion | `.accordion-list` (bordered variant) | `--radius-sm` |
| comparison-table | `.comparison-table-badge` | `--radius-sm` |
| content-switcher | `.switcher-btn` | `--radius-button` |
| image-tabs | `.image-tabs-image-area` | `--radius-md` |
| image-hotspots | `.image-hotspots-wrapper` | `--radius-md` |
| image-hotspots | `.image-hotspot-tooltip` (both desktop + mobile) | `--radius-sm` |
| testimonial-hero | `.testimonial-image-wrapper` | `--radius-lg` |
| event-list | `.event-date` | `--radius-sm` |
| timeline | `.timeline-content` | `--radius-sm` |
| logo-cloud | `.logo-item` | `--radius-sm` |
| job-listing | `.job-badge` | `--radius-sm` |
| job-listing | `.job-filter-btn` | `--radius-button` |
| gallery | `.gallery-modal-image` | `--radius-md` |
| image-text | image container | `--radius-lg` |
| image-callout | `.callout-image` / `.callout-content` | `--radius-lg` / `--radius-md` |
| bento-grid | bento items | `--radius-lg` |
| countdown | `.style-cards .countdown-unit` | `--radius-lg` |
| contact-form | `.form-status` | `--radius-md` |
| comparison-slider | wrapper | `--radius-md` |
| video-embed | iframe | `--radius-md` |
| map | `.map-container` | `--radius-md` |
| priced-list | `.priced-item-image` | `--radius-sm` |

Widgets that are NOT affected by shapes (intentionally):
- banner/slideshow/split-hero when fullwidth (edge-to-edge backgrounds)
- profile-grid avatars (`border-radius: 50%` — always circular)
- testimonials avatars (`border-radius: 50%`)
- timeline markers (`border-radius: 50%`)
- hotspot buttons (`border-radius: 50%`)
- gallery/masonry `.widget-card-image` (`border-radius: 0` — images fill card, card has radius)
- project-showcase `.project-image` (`border-radius: 0` — same pattern)

## Live Preview System

### The Problem
Style settings use body classes, not CSS variables. The existing `UPDATE_CSS_VARIABLES` message only updates the `<style id="theme-settings-styles">` tag — it doesn't touch body classes.

### The Solution

**`src/queries/previewManager.js`** — `extractStyleClasses()` function + `UPDATE_STYLE_CLASSES` message:

```javascript
function extractStyleClasses(settings) {
  const classMap = {
    corner_style: "corner",
    card_style: "cards",
    spacing_density: "spacing",
    button_shape: "buttons",
  };
  const classes = {};
  if (!settings?.settings?.global?.style) return classes;
  settings.settings.global.style.forEach((item) => {
    if (item.id && classMap[item.id]) {
      const value = item.value !== undefined ? item.value : item.default;
      if (value !== undefined) {
        classes[classMap[item.id]] = value;
      }
    }
  });
  return classes;
}
```

Called at the end of `updateThemeSettings()`, after `UPDATE_CSS_VARIABLES` and `LOAD_FONTS`.

**`src/utils/previewRuntime.js`** — `updateStyleClasses()` handler:

```javascript
function updateStyleClasses(styleClasses) {
  Object.entries(styleClasses).forEach(([prefix, value]) => {
    const toRemove = [];
    document.body.classList.forEach((cls) => {
      if (cls.startsWith(prefix + "-")) toRemove.push(cls);
    });
    toRemove.forEach((cls) => document.body.classList.remove(cls));
    document.body.classList.add(`${prefix}-${value}`);
  });
}
```

Handled in the message switch:
```javascript
case "UPDATE_STYLE_CLASSES":
  updateStyleClasses(payload);
  break;
```

## Preset Integration

Presets override style settings as flat key-value pairs in `preset.json`:

```json
{
  "settings": {
    "corner_style": "sharp",
    "card_style": "bordered",
    "spacing_density": "default",
    "button_shape": "auto"
  }
}
```

All 4 existing presets (financial, coaching, accounting, legal) include these.

**Combinatorial variety:** 3 shapes x 3 card styles x 3 spacing x 3 button shapes = 81 visual combinations, plus unlimited color/font choices → easily 100+ distinct presets.

## Localization

Labels are in all 6 locale files (`en.json`, `de.json`, `el.json`, `es.json`, `fr.json`, `it.json`) under `global.style.settings.*`.

Key labels (EN): Shapes, Content boxes, Layout density, Button shape.

## Files Modified

- `themes/arch/theme.json` — style settings schema
- `themes/arch/layout.liquid` — body classes
- `themes/arch/assets/base.css` — token defaults + body class rulesets + consuming selectors
- `themes/arch/locales/*.json` — all 6 locale files
- `themes/arch/presets/*/preset.json` — all 4 presets
- `themes/arch/widgets/` — 17+ widget templates updated with token usage
- `themes/arch/widgets/slideshow/slideshow.css` — constrained slideshow radius
- `src/queries/previewManager.js` — `extractStyleClasses()` + `UPDATE_STYLE_CLASSES` message
- `src/utils/previewRuntime.js` — `updateStyleClasses()` handler + message case

## Known Issues / TODO

- This is described as a "half-baked solution" that needs iteration
- May need more granular control for specific widget types in the future
- No tests written yet for `extractStyleClasses()` or the style class update mechanism
- The widgetizer-app (SaaS version) needs the same previewManager/previewRuntime changes migrated — theme files have already been transferred
