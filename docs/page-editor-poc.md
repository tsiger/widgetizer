# Page Editor Real-Time Updates POC

> **⚠️ IMPORTANT NOTICE - NOT IMPLEMENTED ⚠️**
>
> **THIS IS A PROOF OF CONCEPT / DESIGN PROPOSAL ONLY**
>
> The content in this document represents a theoretical design and has **NOT BEEN IMPLEMENTED**. This is purely conceptual documentation for potential future development.
>
> **DO NOT USE THIS DOCUMENT AS A REFERENCE FOR CURRENT FUNCTIONALITY**
>
> LLMs and developers should not reference this document when providing guidance about existing features, as none of the described functionality exists in the current codebase.
>
> For actual implemented functionality, refer to [page-editor.md](page-editor.md) instead.

## Overview

This document outlines a comprehensive approach for implementing real-time visual updates in the PageEditor's iframe preview without refreshing the iframe and without imposing limitations on theme authors. The system provides instant visual feedback for settings changes like colors, text, layouts, and more.

## Current State Analysis

The existing system has some real-time update infrastructure:

- **PostMessage Communication**: Theme settings updates via CSS variables
- **DOM Replacement**: Widget-level updates by replacing DOM nodes
- **Preview Runtime**: Basic runtime in iframe for some operations

However, it currently requires full widget re-rendering for most changes, causing noticeable delays and flickering.

## 🎯 Core Strategy: Multi-Layer Update System

Create a sophisticated update system that handles different types of changes through the most appropriate method, while maintaining full flexibility for theme authors.

---

## 📋 Phase 1: Enhanced Communication Layer

### 1.1 Unified Message System

**File: `src/utils/previewCommunicator.js`**

```javascript
export class PreviewCommunicator {
  constructor(iframe) {
    this.iframe = iframe;
    this.messageQueue = [];
    this.isReady = false;
  }

  sendMessage(type, payload) {
    const message = { type, payload, timestamp: Date.now() };

    if (this.isReady) {
      this.iframe.contentWindow.postMessage(message, "*");
    } else {
      this.messageQueue.push(message);
    }
  }

  // Handle different update types
  updateCSSProperty(selector, property, value) {
    this.sendMessage("UPDATE_CSS_PROPERTY", { selector, property, value });
  }

  updateTextContent(selector, content) {
    this.sendMessage("UPDATE_TEXT_CONTENT", { selector, content });
  }

  updateClass(selector, className, action) {
    this.sendMessage("UPDATE_CLASS", { selector, className, action });
  }

  updateCSSVariable(variable, value) {
    this.sendMessage("UPDATE_CSS_VARIABLE", { variable, value });
  }

  batchUpdate(updates) {
    this.sendMessage("BATCH_UPDATE", { updates });
  }
}
```

### 1.2 Enhanced Preview Runtime

**Enhanced iframe runtime (injected into theme templates):**

```html
<script>
  window.PreviewRuntime = {
    // CSS Variable Management
    updateCSSVariables(variables) {
      const root = document.documentElement;
      Object.entries(variables).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
    },

    // Direct CSS Property Updates
    updateCSSProperty(selector, property, value) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        el.style[property] = value;
      });
    },

    // Text Content Updates
    updateTextContent(selector, content) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
          el.value = content;
        } else {
          el.textContent = content;
        }
      });
    },

    // Class Management
    updateClass(selector, className, action) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        if (action === "add") el.classList.add(className);
        else if (action === "remove") el.classList.remove(className);
        else if (action === "toggle") el.classList.toggle(className);
      });
    },

    // Message handler
    handleMessage(event) {
      const { type, payload } = event.data;

      switch (type) {
        case "UPDATE_CSS_PROPERTY":
          this.updateCSSProperty(payload.selector, payload.property, payload.value);
          break;
        case "UPDATE_TEXT_CONTENT":
          this.updateTextContent(payload.selector, payload.content);
          break;
        case "UPDATE_CSS_VARIABLE":
          this.updateCSSVariables({ [payload.variable]: payload.value });
          break;
        case "UPDATE_CLASS":
          this.updateClass(payload.selector, payload.className, payload.action);
          break;
      }
    },
  };

  // Initialize message listener
  window.addEventListener("message", window.PreviewRuntime.handleMessage.bind(window.PreviewRuntime));
</script>
```

---

## 📋 Phase 2: Smart Setting Classification System

### 2.1 Setting Type Analyzer

**File: `src/utils/settingAnalyzer.js`**

```javascript
export class SettingAnalyzer {
  static classifySetting(settingSchema, value, widgetType) {
    const { type, id, updateMethod } = settingSchema;

    // Let theme authors specify update method
    if (updateMethod) {
      return {
        method: updateMethod.type,
        target: updateMethod.target,
        property: updateMethod.property,
        classMap: updateMethod.classMap,
        variable: updateMethod.variable,
        unit: updateMethod.unit,
      };
    }

    // Auto-detect based on setting type and naming
    return this.autoDetectUpdateMethod(type, id, value, widgetType);
  }

  static autoDetectUpdateMethod(type, id, value, widgetType) {
    // Color settings - usually CSS properties
    if (type === "color") {
      if (id.includes("background") || id.includes("Background")) {
        return {
          method: "css-property",
          property: "background-color",
          target: `[data-widget-id='{widgetId}']`,
        };
      }
      if (id.includes("text") || id.includes("Text")) {
        return {
          method: "css-property",
          property: "color",
          target: `[data-widget-id='{widgetId}'] .${widgetType}__content`,
        };
      }
      if (id.includes("heading") || id.includes("Heading")) {
        return {
          method: "css-property",
          property: "color",
          target: `[data-widget-id='{widgetId}'] .${widgetType}__heading`,
        };
      }
    }

    // Text content - direct content updates
    if (type === "text" && (id.includes("content") || id.includes("heading") || id.includes("title"))) {
      return {
        method: "text-content",
        target: `[data-setting='${id}']`,
      };
    }

    // Select fields - often class-based
    if (type === "select" && id.includes("alignment")) {
      return {
        method: "class-update",
        target: `[data-widget-id='{widgetId}'] .${widgetType}__heading`,
        classMap: {
          left: "text-left",
          center: "text-center",
          right: "text-right",
        },
      };
    }

    // Range/number inputs for sizing
    if ((type === "range" || type === "number") && (id.includes("size") || id.includes("Size"))) {
      return {
        method: "css-property",
        property: "font-size",
        target: `[data-widget-id='{widgetId}'] .${widgetType}__heading`,
        unit: "px",
      };
    }

    // Default to DOM replacement for complex changes
    return { method: "dom-replacement" };
  }
}
```

---

## 📋 Phase 3: Examples Based on Default Theme

### 3.1 Enhanced Basic Text Widget Schema

Based on the default theme's `basic-text.liquid`, here's the enhanced schema with update methods:

```json
{
  "type": "basic-text",
  "displayName": "Basic Text",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "description": "Main heading text",
      "default": "Default heading",
      "updateMethod": {
        "type": "text-content",
        "target": "[data-setting='heading']"
      }
    },
    {
      "type": "textarea",
      "id": "content",
      "label": "Content",
      "description": "Main paragraph text",
      "default": "This is a simple text section with a heading and paragraph.",
      "updateMethod": {
        "type": "text-content",
        "target": "[data-setting='content']"
      }
    },
    {
      "type": "color",
      "id": "backgroundColor",
      "label": "Background Color",
      "description": "Background color of the section",
      "default": "#ffffff",
      "updateMethod": {
        "type": "css-property",
        "target": "[data-widget-id='{widgetId}']",
        "property": "background-color"
      }
    },
    {
      "type": "color",
      "id": "headingColor",
      "label": "Heading Color",
      "description": "Color of the heading text",
      "default": "#333333",
      "updateMethod": {
        "type": "css-property",
        "target": "[data-widget-id='{widgetId}'] .basic-text__heading",
        "property": "color"
      }
    },
    {
      "type": "range",
      "id": "headingSize",
      "label": "Heading Size",
      "description": "Size of the heading in pixels",
      "default": 20,
      "min": 16,
      "max": 72,
      "step": 1,
      "updateMethod": {
        "type": "css-property",
        "target": "[data-widget-id='{widgetId}'] .basic-text__heading",
        "property": "font-size",
        "unit": "px"
      }
    },
    {
      "type": "select",
      "id": "textAlignment",
      "label": "Text Alignment",
      "description": "Alignment of the heading text",
      "default": "left",
      "options": [
        { "value": "left", "label": "Left" },
        { "value": "center", "label": "Center" },
        { "value": "right", "label": "Right" }
      ],
      "updateMethod": {
        "type": "class-update",
        "target": "[data-widget-id='{widgetId}'] .basic-text__heading",
        "classMap": {
          "left": "text-left",
          "center": "text-center",
          "right": "text-right"
        }
      }
    }
  ]
}
```

### 3.2 Enhanced Default Theme Template

Enhanced version of the default theme's `basic-text.liquid`:

```html
<section class="basic-text" data-widget-id="{{ widget.id }}" data-widget-type="basic-text">
  <style>
    #{{ widget.id }}.basic-text__container {
      background-color: {{ widget.settings.backgroundColor }};
      padding: {{ widget.settings.padding }}px;
    }

    #{{ widget.id }} .basic-text__heading {
      font-size: {{ widget.settings.headingSize }}px;
      margin-bottom: 1rem;
      color: {{ widget.settings.headingColor }};
    }

    #{{ widget.id }} .basic-text__content {
      font-size: 1rem;
      line-height: 1.5;
      color: {{ widget.settings.textColor }};
    }

    /* Text alignment classes for instant updates */
    #{{ widget.id }} .text-left { text-align: left; }
    #{{ widget.id }} .text-center { text-align: center; }
    #{{ widget.id }} .text-right { text-align: right; }
  </style>

  <div id="{{ widget.id }}" class="basic-text__container">
    {% if widget.settings.heading != blank %}
    <h2 class="basic-text__heading text-{{ widget.settings.textAlignment }}" data-setting="heading">
      {{ widget.settings.heading }}
    </h2>
    {% endif %}

    <div class="basic-text__content" data-setting="content">
      {% if widget.settings.content != blank %} {{ widget.settings.content }} {% endif %}
    </div>
  </div>
</section>
```

---

## 📋 Phase 4: Implementation Timeline

### Week 1-2: Foundation

- [ ] Implement PreviewCommunicator class
- [ ] Enhance iframe runtime with message handlers
- [ ] Create SettingAnalyzer utility
- [ ] Basic CSS property and text content updates

### Week 3-4: Intelligence Layer

- [ ] Build UpdateRouter with strategy pattern
- [ ] Implement smart setting classification
- [ ] Add fallback mechanisms
- [ ] Class-based and attribute updates

### Week 5-6: Integration & Optimization

- [ ] Integrate with existing PreviewPanel
- [ ] Add update batching for performance
- [ ] Implement CSS variable management
- [ ] Complex DOM update strategies

### Week 7-8: Developer Experience

- [ ] Create documentation for theme authors
- [ ] Build schema validation tools
- [ ] Add debugging/monitoring tools
- [ ] Performance profiling and optimization

---

## 🎯 Key Benefits

1. **Zero Limitations**: Theme authors can use any HTML/CSS structure
2. **Progressive Enhancement**: Existing themes work without changes
3. **Performance Optimized**: Batched updates, minimal DOM manipulation
4. **Flexible Targeting**: Multiple update strategies for different needs
5. **Graceful Degradation**: Falls back to server rendering when needed
6. **Developer Friendly**: Clear documentation and debugging tools

## 📊 Expected Performance Gains

- **Color Changes**: ~50ms → ~5ms (90% improvement)
- **Text Updates**: ~100ms → ~2ms (98% improvement)
- **Layout Changes**: ~150ms → ~10ms (93% improvement)
- **Batch Updates**: Handle 10+ simultaneous changes in <16ms

This system provides instant visual feedback while maintaining complete flexibility for theme authors to implement their designs however they prefer.

---

## 🚀 **Network Efficiency & Update Scope Analysis**

### Network Request Reduction

**Current System vs. POC System:**

| Update Type        | Current System        | POC System            | Network Reduction |
| ------------------ | --------------------- | --------------------- | ----------------- |
| Color Changes      | 1 API call per change | 0 network requests    | **100%**          |
| Text Updates       | 1 API call per change | 0 network requests    | **100%**          |
| Font Size          | 1 API call per change | 0 network requests    | **100%**          |
| Alignment          | 1 API call per change | 0 network requests    | **100%**          |
| CSS Variables      | 1 API call per change | 0 network requests    | **100%**          |
| Complex Structural | 1 API call per change | 1 API call per change | **0%**            |

**Real-world Example:**

- User adjusts heading color, size, alignment, and background color
- **Current**: 4 network requests + 4 DOM replacements
- **POC**: 0 network requests + 4 direct DOM updates

### Update Scope Targeting

The system updates **only the specific widget/block that changed**, not the entire preview:

```javascript
// Example: Only updates the specific heading element
updateCSSProperty("[data-widget-id='widget_123'] .basic-text__heading", "color", "#ff0000");

// NOT updating the entire page or all widgets
```

### Update Method Efficiency Breakdown

```javascript
// NO NETWORK REQUESTS (Instant Updates)
const ZERO_NETWORK_METHODS = {
  "css-property": {
    description: "Direct style updates",
    networkRequests: 0,
    updateScope: "Single element",
    examples: ["colors", "sizes", "spacing", "fonts"],
  },

  "text-content": {
    description: "Direct text updates",
    networkRequests: 0,
    updateScope: "Single text element",
    examples: ["headings", "descriptions", "labels"],
  },

  "class-update": {
    description: "CSS class swapping",
    networkRequests: 0,
    updateScope: "Single element classes",
    examples: ["alignment", "layout variations"],
  },

  "css-variable": {
    description: "CSS custom property updates",
    networkRequests: 0,
    updateScope: "Global or scoped variables",
    examples: ["theme colors", "global settings"],
  },
};

// FALLBACK WITH NETWORK REQUESTS
const NETWORK_METHODS = {
  "dom-replacement": {
    description: "Server-side re-rendering",
    networkRequests: 1,
    updateScope: "Single widget only",
    examples: ["conditional content", "complex structures"],
  },
};
```

---

## 📊 **Performance Metrics Comparison**

### Network Traffic Analysis

**Typical User Session (10 setting changes):**

| Scenario           | Current System      | POC System       | Savings    |
| ------------------ | ------------------- | ---------------- | ---------- |
| Network Requests   | 10 API calls        | 1-2 API calls    | **80-90%** |
| Data Transfer      | ~50KB HTML × 10     | ~5KB × 1-2       | **90%**    |
| Update Latency     | 50-150ms per change | 2-5ms per change | **95%**    |
| Total Session Time | 500-1500ms          | 10-20ms          | **98%**    |

### Bandwidth Usage Example

```javascript
// Real-world bandwidth comparison
const BANDWIDTH_COMPARISON = {
  colorChange: {
    current: "5KB HTML response + network overhead",
    poc: "0 bytes (local DOM update)",
    savings: "100%",
  },

  textUpdate: {
    current: "5KB HTML response + network overhead",
    poc: "0 bytes (local DOM update)",
    savings: "100%",
  },

  complexUpdate: {
    current: "5KB HTML response + network overhead",
    poc: "5KB HTML response + network overhead",
    savings: "0% (but still only single widget)",
  },
};
```

---
