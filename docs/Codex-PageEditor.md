# Codex: Page Editor Deep Dive

This document explains in detail how the current Page Editor works within Widgetizer. It also highlights shortcomings and proposes directions for improvement.

## 1. Overview of the Editor

Widgetizer includes a fully visual page editor built with React. The editor allows users to compose pages from widgets defined by the active theme. The main screen is divided into three columns: a widget list on the left, a live preview in the center, and a settings panel on the right. Above these panels is the top bar with save and preview actions.

The editor relies on several Zustand stores to centralize state:

- **useProjectStore** – tracks the active project so all data is scoped correctly.
- **usePageStore** – loads core page data such as widget order and page name.
- **useWidgetStore** – holds widget schemas, currently selected widget/block, and all update actions.
- **useThemeStore** – provides global theme settings used when rendering the preview.
- **useAutoSave** – manages auto‑saving and tracks whether there are unsaved changes.

The editor orchestrates these stores but does not hold complex state itself. User actions (adding widgets, editing settings, reordering blocks) call store methods, which in turn update the preview.

### Rendering Flow

1. **Initial load** – `PageEditor` fetches the page, widget schemas and theme settings when the component mounts.
2. **Preview generation** – `PreviewPanel` requests rendered HTML from the backend. The HTML is written into an iframe that runs a small runtime script (`PreviewRuntime`), allowing the editor to highlight selected elements and update CSS variables.
3. **Widget updates** – When a setting changes, the editor re-fetches HTML for that widget and replaces the DOM node inside the iframe.
4. **Theme setting changes** – These are pushed to the iframe by postMessage calls that update CSS variables without reloading.

## 2. Current Weaknesses

The Page Editor works but has some limitations that affect user experience and scalability:

### 2.1 Full Widget Re-renders

Every change to a widget setting requires a server roundtrip. The backend renders the widget’s Liquid template using LiquidJS and returns the new HTML. The preview iframe then replaces the entire widget node. This leads to noticeable delays and flicker, especially on slower connections.

### 2.2 Iframe Refreshes

The entire iframe is refreshed whenever widget order changes or when widgets are added or removed. This causes even longer pauses where the preview goes blank while the new HTML loads. The runtime script must also reinitialize on every reload.

### 2.3 Heavy Reliance on LiquidJS

Because all rendering is server-side through LiquidJS, the frontend cannot update parts of the DOM without a trip to the server. This makes quick interactions like color changes or text edits feel sluggish.

### 2.4 Limited Offline Capability

Since the editor depends on the backend for each HTML snippet, it cannot function offline or when the server is unreachable. Preview updates simply fail if the network request does not succeed.

## 3. Potential Improvements

The goal is to offer near instant feedback while maintaining the flexibility of Liquid templates. Several strategies can be combined:

### 3.1 Client-Side Patching

Instead of replacing the entire widget, analyze the widget schema to see which settings map directly to simple DOM updates. For example:

- **CSS property updates** – Apply style changes directly via postMessage.
- **Text content updates** – Replace the text of known elements without re-rendering.

Only structural changes would require a fresh HTML snippet from the server.

### 3.2 Partial Hydration

Ship additional metadata with rendered widgets describing how settings map to DOM nodes. This allows the client runtime to update elements without contacting the server. Template authors could mark elements with data attributes to opt into this behavior.

### 3.3 Local Template Execution

Consider running LiquidJS directly in the browser for simple cases. If widget templates are available as part of the theme assets, the editor could render them locally using a lightweight version of LiquidJS. Network requests would be needed only for more complex features or to persist changes.

### 3.4 Virtual DOM Diffing

Another approach is compiling widgets to React components during theme build time. The editor would then render the preview using React in the iframe. Standard diffing would handle updates efficiently. This requires more tooling but would give extremely fast updates and reduce reliance on LiquidJS for in-editor previews.

### 3.5 Incremental Rendering Service

If server rendering remains necessary, a specialized API endpoint could return only the changed HTML fragments instead of the entire widget. The preview runtime would patch those fragments into place. Batching multiple updates would further reduce network overhead.

## 4. Summary

The Page Editor currently relies on full HTML re-rendering via LiquidJS for most operations, which results in iframe refreshes and slower feedback. Adopting a multi-layer update strategy—combining client-side DOM patches, optional local template execution, and smarter server APIs—would greatly improve responsiveness. These changes would let creators see updates immediately without waiting for the entire preview to reload.

