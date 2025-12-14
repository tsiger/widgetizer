# Page Editor Preview System

This document explains how the Page Editor's preview system works, including the iframe-based preview, real-time updates, and widget script execution.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    PageEditor.jsx                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ WidgetList  │  │ PreviewPanel │  │ SettingsPanel  │ │
│  └─────────────┘  └──────┬───────┘  └────────────────┘ │
└──────────────────────────┼──────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   iframe (srcdoc)      │
              │  ┌──────────────────┐  │
              │  │ previewRuntime.js │  │ ◄── injected script
              │  │ Widget HTML       │  │
              │  │ Widget Scripts    │  │
              │  └──────────────────┘  │
              └────────────────────────┘
```

## Key Components

### PreviewPanel.jsx

The React component that manages the preview iframe. It:

- Loads initial HTML via `fetchPreview()`
- Injects the preview runtime script
- Sends updates to the iframe via `postMessage`
- Handles debounced full reloads for content changes

### previewRuntime.js

Injected into the iframe, this script:

- Listens for messages from the parent window
- Handles CSS variable updates
- Highlights selected widgets/blocks
- Processes real-time setting updates
- Manages click interactions for widget selection

### previewManager.js

Server-side preview utilities:

- `fetchPreview()` - Fetches full page HTML from the render API
- `highlightWidget()` - Sends highlight message to iframe
- Widget rendering and theme setting utilities

## Update Flow

### 1. Initial Load

```
PageEditor mounts
    ↓
PreviewPanel calls fetchPreview()
    ↓
Server renders full page HTML with Liquid
    ↓
HTML set as iframe srcdoc (includes previewRuntime.js)
    ↓
Widget scripts execute naturally
```

### 2. Setting Changes (Real-time)

```
User types in settings panel
    ↓
Widget state updates in React store
    ↓
PreviewPanel detects change
    ↓
IMMEDIATE: postMessage → UPDATE_WIDGET_SETTINGS
    ↓
previewRuntime finds elements by data-setting attribute
    ↓
DOM updated in real-time (scripts keep running)
    ↓
AFTER 300ms: Full reload for consistency
```

### 3. Structural Changes (Reload)

```
User adds/removes block or widget
    ↓
Widget state updates in React store
    ↓
PreviewPanel detects change
    ↓
After 300ms debounce: fetchPreview()
    ↓
New HTML set as srcdoc
    ↓
Full page reload → Scripts execute fresh
```

### 4. Selection Changes (No Reload)

```
User clicks widget in preview or sidebar
    ↓
Selection state updates
    ↓
postMessage → HIGHLIGHT_WIDGET
    ↓
previewRuntime adds CSS classes for outline
```

## Message Types

| Type                     | Direction       | Purpose                   |
| ------------------------ | --------------- | ------------------------- |
| `WIDGET_SELECTED`        | iframe → parent | User clicked a widget     |
| `HIGHLIGHT_WIDGET`       | parent → iframe | Show selection outline    |
| `SCROLL_TO_WIDGET`       | parent → iframe | Scroll widget into view   |
| `UPDATE_CSS_VARIABLES`   | parent → iframe | Update theme CSS vars     |
| `UPDATE_WIDGET_SETTINGS` | parent → iframe | Real-time setting updates |
| `LOAD_FONTS`             | parent → iframe | Load Google Fonts         |

## Widget Script Execution

### The Problem

When HTML is inserted via `innerHTML` or `srcdoc` updates, browser security prevents script tags from executing automatically.

### The Solution

Full iframe reload via `srcdoc` update:

1. Setting changes trigger debounced reload after 300ms
2. New HTML includes all widget scripts
3. Browser executes scripts naturally on load
4. Scripts initialize fresh with no stale state

### Interactive Elements

The preview runtime intercepts clicks for widget selection, but allows interactive elements (`<button>`, `<a>`, etc.) to function normally. This ensures slideshow arrows, accordion toggles, and other interactive widgets work correctly.

## Real-time Updates

All widgets use `data-setting` attributes on text elements for instant feedback while typing:

```liquid
<h2 data-setting="headline">{{ block.settings.headline }}</h2>
<p data-setting="description">{{ block.settings.description }}</p>
<a data-setting="button_link" href="...">{{ button_text }}</a>
```

When a setting changes:

1. PreviewPanel sends `UPDATE_WIDGET_SETTINGS` immediately
2. previewRuntime finds elements with matching `data-setting`
3. Updates `textContent`, `src`, or `href` based on element type
4. Debounced reload still happens for script consistency

All 21 core widgets have `data-setting` attributes and `defaultBlocks` for initial content, ensuring a seamless editing experience.

## Performance Considerations

### Debouncing

- 300ms debounce on content changes
- Prevents rapid reloads during fast typing
- Immediate visual feedback via `UPDATE_WIDGET_SETTINGS`

### Scroll Position

- Scroll position saved before reload
- Restored after new content loads
- Selection highlight reapplied after reload

### Change Detection

- Only triggers reload when content actually changes
- Selection-only changes skip reload entirely
- Uses JSON comparison for deep equality checks
