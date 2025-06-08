# 📝 Widgetizer Development Notes

## 🏷️ LiquidJS Custom Tags - Variable Access (CRITICAL!)

### 🚨 **The Problem:** Custom Tags Can't Access Template Variables

When creating custom LiquidJS tags, the standard variable access methods **DO NOT WORK**:

```javascript
❌ context.page                    // undefined
❌ context.get('page')            // undefined
❌ context.getSync('page')        // undefined
❌ context.globals.page           // undefined
❌ context.scopes[0].page         // undefined
```

### ✅ **The Solution:** Use `context.getAll()`

```javascript
// ALWAYS use this pattern in custom tags:
const allVars = context.getAll();
const page = allVars.page; // ✅ Gets complete page data
const imagePath = allVars.imagePath; // ✅ Gets image path
const theme = allVars.theme; // ✅ Gets theme data
const content = allVars.content; // ✅ Gets rendered content
```

### 📋 **Custom Tag Template (Copy/Paste Ready)**

```javascript
export const MyCustomTag = {
  parse: function (tagToken, remainTokens) {
    this.tagName = tagToken.name;
  },
  render: function (context, hash) {
    try {
      const allVars = context.getAll();
      const page = allVars.page;
      const imagePath = allVars.imagePath || "uploads/images";

      if (!page) {
        return "<!-- No page data found -->";
      }

      // Access page data and SEO
      const seo = page?.seo || {};
      const title = page?.name || "Default";

      return `<!-- Your rendered content -->`;
    } catch (error) {
      console.error("Custom tag error:", error);
      return `<!-- Error: ${error.message} -->`;
    }
  },
};
```

### 🔍 **Debug Pattern (When Things Break)**

```javascript
render: function (context, hash) {
  // Quick debug - see what's actually available
  console.log('=== DEBUG CUSTOM TAG ===');
  console.log('Available vars:', Object.keys(context.getAll()));
  console.log('Page data:', context.getAll().page);
  console.log('========================');

  // Your tag logic here...
}
```

### 🎯 **Key Insights**

1. **Template variables** (like `{{ page.name }}`) work fine in `.liquid` files
2. **Custom tags** need `context.getAll()` to access the same variables
3. The data IS being passed correctly from `renderPageLayout()` - it's just the access method
4. **Always wrap custom tag logic in try/catch** for better error handling
5. Variables available: `page`, `content`, `body_class`, `theme`, `imagePath`, `globals`, etc.

---

## 🛠️ Rendering Pipeline

### Page Rendering Flow:

1. `renderPageLayout()` receives `pageData` with complete info (including SEO)
2. Creates `renderContext` with all variables: `{ page: pageData, content, body_class, theme, imagePath, ... }`
3. Calls `engine.parseAndRender(template, renderContext, { globals })`
4. Template variables like `{{ page.name }}` work directly
5. Custom tags must use `context.getAll()` to access the same data

---

## 🎨 SEO Implementation

### SEO Data Structure (in page JSON files):

```json
{
  "name": "Page Name",
  "slug": "page-slug",
  "seo": {
    "description": "Meta description",
    "og_title": "Social media title",
    "og_image": "path/to/image.jpg",
    "og_type": "website",
    "twitter_card": "summary_large_image",
    "canonical_url": "",
    "robots": "index,follow"
  }
}
```

### Usage in Templates:

- **Layout**: `{% seo %}` tag outputs all meta tags
- **Fallbacks**: If SEO data missing, uses page name for title
- **Images**: Relative paths auto-converted to full URLs

---

## 🔧 Backend Controllers

### Page Data Flow:

- **Create**: `createPage()` saves complete `req.body` including SEO
- **Update**: `updatePage()` uses `...pageData` to preserve all fields
- **Save from Editor**: `savePageContent()` merges `...existingData` with `...pageData`
- **Get**: `getPage()` returns complete JSON file data

### Key: Always use spread operators to preserve unknown fields (like SEO)

---

## 📚 Theme Settings

### Theme authors can create ANY category structure:

```json
{
  "settings": {
    "global": {
      "colors": [...],
      "typography": [...],
      "custom_section": [...],  // ✅ Completely flexible
      "any_name_here": [...]    // ✅ Works fine
    }
  }
}
```

### Processing is completely generic - no hardcoded category names.

---

## 🚨 Common Gotchas

1. **Custom tags**: Remember `context.getAll()` not `context.get()`
2. **Page saving**: Always use spread operators to preserve fields
3. **SEO missing**: Tag handles gracefully with fallbacks
4. **Image paths**: Auto-converts relative to absolute in SEO tag
5. **Theme flexibility**: Never hardcode category names - always iterate `Object.keys()`

---

## 🎯 Architecture Wins

- **Generic systems**: Theme settings, SEO, page data - all extensible
- **Flexible data flow**: Controllers preserve unknown fields automatically
- **Smart fallbacks**: Missing data handled gracefully
- **Clean separation**: Template variables vs custom tag access patterns
