# Code Comments Guidelines

## Philosophy

**Comments should explain _why_ and _how_ complex logic works, not _what_ the code does.**

Code should be self-documenting through clear naming and structure. Comments are a tool to help new contributors understand complex pieces of logic so they can navigate the codebase and eventually simplify or refactor it.

---

## Core Principles

### 1. Don't Repeat What the Code Does

**Bad:**

```javascript
// Increment the counter by 1
counter += 1;

// Check if user is logged in
if (user.isLoggedIn) {
  // Show the dashboard
  showDashboard();
}
```

**Good:**

```javascript
counter += 1;

if (user.isLoggedIn) {
  showDashboard();
}
```

### 2. Explain Complex Logic and Decisions

**Good:**

```javascript
// We debounce the preview reload to prevent rapid-fire requests during fast typing.
// The immediate UPDATE_WIDGET_SETTINGS provides instant feedback, while the
// debounced reload ensures scripts execute fresh with no stale state.
if (hasContentChanges) {
  postMessage({ type: 'UPDATE_WIDGET_SETTINGS', ... });
  debouncedReload();
}
```

**Good:**

```javascript
// Widget index is 1-based (first widget = 1, second = 2, etc.) to match
// CSS :nth-child() selectors and user expectations. It's null for global widgets
// (header/footer) since they don't have a position in the page flow.
widgetIndex += 1;
```

### 3. Help Navigate Complex Systems

**Good:**

```javascript
// This service handles widget rendering for both preview and publish modes.
// Key differences:
// - Preview mode: Uses API URLs for assets, injects runtime script
// - Publish mode: Uses relative paths, no runtime script
// See renderWidget() for the core rendering logic.
```

**Good:**

```javascript
// Global widgets (header/footer) are stored separately from page widgets.
// They're loaded via loadGlobalWidgets() and persisted to pages/global/.
// Unlike page widgets, changes affect all pages in the project.
```

### 4. Document Non-Obvious Behavior

**Good:**

```javascript
// We use a Map here instead of an object to preserve insertion order,
// which is critical for CSS/JS asset enqueueing in the correct sequence.
const enqueuedStyles = new Map();
```

**Good:**

```javascript
// LiquidJS requires globals to be passed separately from the render context.
// Without this, custom tags (like {% enqueue_style %}) can't access shared state.
await engine.parseAndRender(template, context, {
  globals: renderContext.globals,
});
```

### 5. Explain Workarounds and Technical Debt

**Good:**

```javascript
// TODO: Controllers shouldn't ideally be imported into services.
// We might need to move readProjectsFile/readMediaFile to utils or their own services later.
import { readMediaFile } from "../controllers/mediaController.js";
```

**Good:**

```javascript
// Browser security prevents script execution when HTML is inserted via innerHTML.
// Full iframe reload via srcdoc ensures scripts execute naturally on load.
// See page-editor-preview.md for details on the preview system architecture.
iframe.srcdoc = newHtml;
```

---

## When to Comment

### ✅ Do Comment:

- **Complex algorithms or business logic** that isn't immediately obvious
- **Architectural decisions** and why certain patterns were chosen
- **Integration points** between systems or services
- **Workarounds** for bugs or limitations
- **Performance optimizations** and why they're necessary
- **Non-obvious behavior** that might surprise other developers
- **Temporary code** or technical debt that needs future attention

### ❌ Don't Comment:

- **Self-explanatory code** that reads like English
- **Simple operations** like variable assignments or function calls
- **Obvious conditionals** or loops
- **Standard patterns** that any developer familiar with the language would understand
- **Code that should be refactored** instead of commented

---

## Comment Styles

### Inline Comments

Use sparingly for brief explanations:

```javascript
const widgetIndex = 0; // 1-based index (first widget = 1)
```

### Block Comments

Use for multi-line explanations:

```javascript
/**
 * Renders a widget template with given data.
 *
 * This function handles both core widgets (prefixed with "core-") and theme widgets.
 * Core widgets are loaded from /src/core/widgets/, while theme widgets come from
 * the project's theme folder. The rendering service caches LiquidJS engines per project
 * to improve performance.
 *
 * @param {string} projectId - The project ID
 * @param {string} widgetId - Unique widget instance ID
 * @param {object} widgetData - Widget configuration and settings
 * @param {object} rawThemeSettings - Unprocessed theme settings
 * @param {string} renderMode - 'preview' or 'publish'
 * @param {object} sharedGlobals - Optional shared globals for asset enqueueing
 * @param {number} index - Optional 1-based widget index (null for global widgets)
 */
async function renderWidget(...) {
  // Implementation
}
```

### TODO Comments

Use for known improvements or technical debt:

```javascript
// TODO: Refactor this to use a more efficient data structure
// TODO: Remove this workaround when upstream library fixes the bug
// TODO: Consider extracting this into a separate utility function
```

---

## Examples from the Codebase

### Good Example: Explaining Complex Flow

```javascript
// Create shared globals for asset enqueue system
// Each page gets fresh enqueue Maps to prevent cross-page asset pollution
const sharedGlobals = {
  projectId,
  apiUrl,
  renderMode: "preview",
  themeSettingsRaw: rawThemeSettings,
  enqueuedStyles: new Map(),
  enqueuedScripts: new Map(),
};
```

### Good Example: Documenting Non-Obvious Behavior

```javascript
// Determine if this is a core widget (prefixed with "core-")
// Core widgets are loaded from /src/core/widgets/ regardless of theme
const isCoreWidget = type.startsWith("core-");
```

### Good Example: Explaining Architectural Decision

```javascript
// Cache for LiquidJS engines, keyed by project directory path
// Each project gets its own engine instance to avoid shared state pollution
// and ensure correct snippet/partial resolution
const engineCache = new Map();
```

---

## Best Practices

1. **Write self-documenting code first** - Use clear variable and function names
2. **Comment the "why" not the "what"** - Explain reasoning, not implementation
3. **Keep comments up-to-date** - Outdated comments are worse than no comments
4. **Use comments to guide refactoring** - Help future developers simplify complex code
5. **Prefer code structure over comments** - Extract complex logic into well-named functions
6. **Document public APIs** - Use JSDoc for exported functions and classes
7. **Explain domain concepts** - Help new contributors understand business logic

---

## Anti-Patterns to Avoid

### ❌ Commenting Obvious Code

```javascript
// Set the variable to 5
let count = 5;

// Return the result
return result;
```

### ❌ Over-Commenting Simple Logic

```javascript
// Loop through all widgets
for (const widget of widgets) {
  // Render each widget
  renderWidget(widget);
}
```

### ❌ Commenting Instead of Refactoring

```javascript
// This function does a lot of things:
// 1. Validates the input
// 2. Processes the data
// 3. Saves to database
// 4. Sends notification
// 5. Returns the result
function doEverything(input) {
  // ... 200 lines of code
}
```

**Better:** Extract into well-named functions:

```javascript
function processUserRegistration(input) {
  const validated = validateInput(input);
  const processed = processUserData(validated);
  const saved = saveToDatabase(processed);
  sendWelcomeNotification(saved);
  return saved;
}
```

---

## Summary

**Remember:** Comments are a tool to help new contributors understand complex logic. If you find yourself writing a comment that just repeats what the code does, consider:

1. Can the code be made more self-explanatory?
2. Can a complex function be broken into smaller, well-named functions?
3. Can variable names be more descriptive?

Good comments make the codebase easier to navigate and simplify. Bad comments add noise and maintenance burden.
