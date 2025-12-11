# Hero Widget

> **Status:** ✅ Active - Fully Implemented

## Overview

The Hero widget is a versatile, high-impact component designed for the top of pages. It supports various layouts, background types (color, image, video), and content alignments. It also includes a slideshow variation powered by Swiper.

## Variations

### 1. Standard Hero (`hero.html`)

The standard hero is a static section.

- **Structure**: Single `.widget` section.
- **Backgrounds**: Supports solid colors and images via CSS variables.
- **Content**: Can be aligned left, center, or right.
- **Height**: Configurable via height modifier classes.

### 2. Hero Slideshow (`hero-slider.html`)

A dynamic slideshow variation using Swiper.js.

- **Structure**: A wrapper `.widget-hero-slider` containing a Swiper instance.
- **Slides**: Each slide contains a fully structured `.widget` element.
- **Height**: Supports both full-viewport height and auto-height (content-driven).

## HTML Structure

### Standard Hero

```html
<section class="widget widget-hero [modifiers]">
  <div class="widget-container">
    <div class="widget-content [size-modifiers] [alignment-modifiers]">
      <span class="widget-eyebrow">Eyebrow</span>
      <h1 class="widget-headline">Headline</h1>
      <p class="widget-description">Description</p>
      <div class="widget-actions">
        <!-- Buttons -->
      </div>
    </div>
  </div>
</section>
```

### Hero Slideshow (Crucial Nesting)

**IMPORTANT:** For the slideshow, the `.widget` class and its background/overlay properties must be placed **INSIDE** the `.swiper-slide`, not on the outer container.

```html
<section class="widget-hero-slider">
  <div class="swiper">
    <div class="swiper-wrapper">
      <div class="swiper-slide">
        <!-- Widget IS the slide content -->
        <div class="widget [height-modifier] has-bg-image ...">
          <div class="widget-container">
            <!-- Content -->
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

## Height Modifiers

Control the height of the hero section (works for both Standard and Slideshow).

| Class                       | Description                           |
| :-------------------------- | :------------------------------------ |
| `.widget-height-half`       | Minimum 50vh height.                  |
| `.widget-height-two-thirds` | Minimum 66vh height.                  |
| `.widget-height-full`       | Minimum 100vh (and 100dvh) height.    |
| _(none)_                    | Height determined by content padding. |

## Design System Compliance

### Do's

- **Use CSS Variables**: Always use `--widget-bg-image`, `--widget-bg-color`, etc.
- **Use Color Schemes**: Apply `.color-scheme-dark` or `.color-scheme-light` to ensure text contrast.
- **Use Overlay Classes**: Use `.has-overlay` with `.overlay-dark`, `.overlay-medium`, or `.overlay-light`.
- **Use Button Classes**: Use `.widget-button-primary` and `.widget-button-secondary`.

### Don'ts

- **❌ Do NOT use `!important`**: Structure your CSS to avoid needing overrides.
- **❌ Do NOT put `.widget` on the slider wrapper**: This causes double margins and breaks full-bleed layouts.
- **❌ Do NOT hardcode colors**: Use the defined CSS variables.

## CSS Reference

### Slideshow Specifics

The slideshow requires specific CSS to ensure the inner widget fills the slide.

```css
.widget-hero-slider .swiper-slide .widget {
  height: 100%;
  width: 100%;
  margin: 0; /* Reset default widget margin */
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Mobile Guardrails */
@media (max-width: 749px) {
  /* Prevent content from overlapping with arrows */
  .widget-hero-slider .widget-content {
    padding-inline: 5rem;
  }

  /* Smaller arrows on mobile */
  .widget-hero-slider .swiper-button-prev,
  .widget-hero-slider .swiper-button-next {
    width: 4rem;
    height: 4rem;
  }
}
```
