# Widgetizer Design System

A comprehensive guide to the visual design patterns, colors, typography, and component styling used in the Widgetizer application. Use this document to build new applications with a consistent look and feel.

---

## Technology Stack

- **CSS Framework:** Tailwind CSS v4.1.3
- **Icon Library:** lucide-react
- **Font:** System sans-serif (Tailwind's `font-sans`)

---

## Color Palette

### Primary Accent — Pink

The primary brand color used for interactive elements, focus states, and highlights.

| Token      | Hex     | Usage                                               |
| ---------- | ------- | --------------------------------------------------- |
| `pink-50`  | #fdf2f8 | Selected row backgrounds, error message backgrounds |
| `pink-100` | #fce7f3 | Primary badge backgrounds                           |
| `pink-200` | #fbcfe8 | Primary badge borders                               |
| `pink-500` | #ec4899 | Icons, links, focus rings, checkmarks               |
| `pink-600` | #db2777 | Primary buttons, active sidebar items               |
| `pink-700` | #be185d | Button hover states, link hovers                    |
| `pink-800` | #9d174d | Button active/pressed states                        |

### Neutral — Slate

The neutral palette for text, backgrounds, and UI chrome.

| Token       | Hex     | Usage                                        |
| ----------- | ------- | -------------------------------------------- |
| `slate-900` | #0f172a | Sidebar background, dark buttons             |
| `slate-800` | #1e293b | Sidebar hover states, dark borders           |
| `slate-700` | #334155 | Form labels, table header text               |
| `slate-600` | #475569 | Secondary text, sidebar section titles       |
| `slate-500` | #64748b | Muted text, help text, disabled icons        |
| `slate-400` | #94a3b8 | Placeholders, subtle icons                   |
| `slate-300` | #cbd5e1 | Input borders                                |
| `slate-200` | #e2e8f0 | Dividers, table row borders, section borders |
| `slate-100` | #f1f5f9 | Subtle backgrounds, table row borders        |
| `slate-50`  | #f8fafc | Table headers, section backgrounds           |

### Page Background

| Token      | Hex     | Usage                |
| ---------- | ------- | -------------------- |
| `gray-50`  | #f9fafb | Main page background |
| `gray-900` | #111827 | Primary body text    |

### Semantic Colors

#### Success — Green

| Token       | Hex     | Usage                                |
| ----------- | ------- | ------------------------------------ |
| `green-50`  | #f0fdf4 | Success badge background (light)     |
| `green-100` | #dcfce7 | Success badge background             |
| `green-200` | #bbf7d0 | Success badge border                 |
| `green-600` | #16a34a | Success text                         |
| `green-700` | #15803d | Success badge text, toast background |
| `green-800` | #166534 | Success toast border                 |

#### Warning — Yellow/Amber

| Token        | Hex     | Usage                          |
| ------------ | ------- | ------------------------------ |
| `yellow-50`  | #fefce8 | Warning toast/modal background |
| `yellow-100` | #fef9c3 | Warning badge background       |
| `yellow-200` | #fef08a | Warning toast border           |
| `yellow-500` | #eab308 | Warning icons                  |
| `yellow-700` | #a16207 | Warning badge text, toast text |
| `amber-600`  | #d97706 | Warning messages               |

#### Error/Danger — Red

| Token     | Hex     | Usage                                       |
| --------- | ------- | ------------------------------------------- |
| `red-50`  | #fef2f2 | Error toast background, danger modal header |
| `red-100` | #fee2e2 | Error badge background                      |
| `red-200` | #fecaca | Error toast/badge border                    |
| `red-500` | #ef4444 | Danger icons                                |
| `red-600` | #dc2626 | Danger buttons, error badge text            |
| `red-700` | #b91c1c | Danger button hover                         |
| `red-800` | #991b1b | Danger button active                        |

#### Info — Blue

| Token      | Hex     | Usage                 |
| ---------- | ------- | --------------------- |
| `blue-50`  | #eff6ff | Info toast background |
| `blue-200` | #bfdbfe | Info toast border     |
| `blue-600` | #2563eb | Info toast text       |

---

## Typography

### Font Family

```css
font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
```

Use Tailwind's `font-sans` class.

### Type Scale

| Class       | Size | Usage                                                 |
| ----------- | ---- | ----------------------------------------------------- |
| `text-xs`   | 12px | Badges, hints, timestamps, sidebar section titles     |
| `text-sm`   | 14px | Body text, form inputs, labels, table cells (default) |
| `text-base` | 16px | Large buttons, section subtitles                      |
| `text-lg`   | 18px | Form section titles                                   |
| `text-xl`   | 20px | Empty state headings                                  |
| `text-2xl`  | 24px | Page titles                                           |

### Font Weights

| Class           | Weight | Usage                                  |
| --------------- | ------ | -------------------------------------- |
| `font-normal`   | 400    | Body text                              |
| `font-medium`   | 500    | Labels, section titles, table row text |
| `font-semibold` | 600    | Buttons, empty state headings          |
| `font-bold`     | 700    | Page titles                            |

### Special Typography

- **Monospace:** Use `font-mono` for filenames, slugs, and code (e.g., `page-slug.html`)

### Text Colors

| Class            | Usage                                  |
| ---------------- | -------------------------------------- |
| `text-gray-900`  | Primary body text                      |
| `text-slate-800` | Section titles                         |
| `text-slate-700` | Labels, table headers                  |
| `text-slate-600` | Secondary text, optional labels        |
| `text-slate-500` | Help text, descriptions, muted content |
| `text-slate-400` | Placeholders, subtle icons             |
| `text-white`     | Text on dark/colored backgrounds       |

---

## Spacing System

Based on Tailwind's default spacing scale with 4px increments.

### Common Values

| Class                 | Value | Usage                                |
| --------------------- | ----- | ------------------------------------ |
| `gap-1` / `space-y-1` | 4px   | Tight spacing (label to input)       |
| `gap-2` / `space-y-2` | 8px   | Standard spacing (between items)     |
| `gap-3`               | 12px  | Medium spacing                       |
| `gap-4` / `space-y-4` | 16px  | Section spacing                      |
| `space-y-6`           | 24px  | Form container vertical spacing      |
| `p-2`                 | 8px   | Small padding (icon buttons)         |
| `p-4`                 | 16px  | Standard padding (cards, modals)     |
| `p-6`                 | 24px  | Large padding (structured card body) |
| `p-8`                 | 32px  | Page container padding               |

### Form Spacing Patterns

- **Field wrapper:** `space-y-1` (4px between label and input)
- **Form sections:** `space-y-4` (16px between fields)
- **Form container:** `space-y-6 max-w-xl` (24px between sections)
- **Form actions:** `gap-2 pt-4` (8px between buttons, 16px top padding)

---

## Border Radius

| Class          | Value  | Usage                       |
| -------------- | ------ | --------------------------- |
| `rounded-sm`   | 2px    | Form inputs, small elements |
| `rounded-md`   | 6px    | Buttons                     |
| `rounded-lg`   | 8px    | Tables, cards               |
| `rounded-xl`   | 12px   | Page content containers     |
| `rounded-full` | 9999px | Badges, avatar circles      |

---

## Shadows

| Class       | Usage                  |
| ----------- | ---------------------- |
| `shadow-xs` | Form inputs            |
| `shadow-sm` | Buttons, tables, cards |
| `shadow-md` | Feature cards          |
| `shadow-lg` | Modals, dropdowns      |

### Hover Shadow Effect

```css
hover: shadow-[0_2px_0_rgba(0, 0, 0, 0.1)];
```

Used on buttons to create a subtle "lift" effect on hover.

---

## Components

### Buttons

#### Primary Button

```html
<button
  class="inline-flex items-center justify-center gap-2 px-4 py-2 
  bg-pink-600 text-white text-sm font-semibold rounded-md shadow-sm
  hover:bg-pink-700 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)]
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
  active:bg-pink-800
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all duration-200"
>
  Save Changes
</button>
```

#### Secondary Button

```html
<button
  class="inline-flex items-center justify-center gap-2 px-4 py-2 
  bg-white text-gray-700 text-sm font-semibold rounded-md shadow-sm
  border border-gray-300
  hover:bg-gray-50 hover:border-gray-400 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)]
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
  active:bg-gray-100
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all duration-200"
>
  Cancel
</button>
```

#### Danger Button

```html
<button
  class="inline-flex items-center justify-center gap-2 px-4 py-2 
  bg-red-600 text-white text-sm font-semibold rounded-md shadow-sm
  hover:bg-red-700 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)]
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
  active:bg-red-800
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all duration-200"
>
  Delete
</button>
```

#### Dark Button

```html
<button
  class="inline-flex items-center justify-center gap-2 px-4 py-2 
  bg-slate-900 text-white text-sm font-semibold rounded-md shadow-sm
  hover:bg-slate-800 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)]
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500
  active:bg-slate-950
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all duration-200"
>
  Export
</button>
```

#### Ghost Button

```html
<button
  class="inline-flex items-center justify-center gap-2 px-4 py-2 
  bg-transparent text-gray-700 text-sm font-semibold rounded-md
  hover:bg-gray-100
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all duration-200"
>
  Learn More
</button>
```

#### Button Sizes

| Size             | Classes               |
| ---------------- | --------------------- |
| Small            | `px-3 py-1.5 text-sm` |
| Medium (default) | `px-4 py-2 text-sm`   |
| Large            | `px-6 py-3 text-base` |

### Icon Buttons

Square buttons for icon-only actions.

#### Neutral Icon Button

```html
<button
  class="p-2 rounded-md text-gray-600
  hover:bg-gray-100 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)]
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
  transition-all duration-200"
>
  <svg><!-- icon --></svg>
</button>
```

#### Primary Icon Button

```html
<button
  class="p-2 rounded-md text-pink-600
  hover:bg-pink-50 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)]
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
  transition-all duration-200"
>
  <svg><!-- icon --></svg>
</button>
```

#### Danger Icon Button

```html
<button
  class="p-2 rounded-md text-red-600
  hover:bg-red-50 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)]
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
  transition-all duration-200"
>
  <svg><!-- icon --></svg>
</button>
```

#### Icon Button Sizes

| Size             | Classes |
| ---------------- | ------- |
| Small            | `p-1.5` |
| Medium (default) | `p-2`   |
| Large            | `p-3`   |

---

### Form Inputs

#### Text Input

```html
<input
  type="text"
  class="w-full px-3 py-2 
  bg-white border border-slate-300 rounded-sm 
  text-sm shadow-xs placeholder-slate-400
  focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500
  disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
  placeholder="Enter value..."
/>
```

#### Input with Error State

```html
<input
  type="text"
  class="w-full px-3 py-2 
  bg-white border border-pink-500 rounded-sm 
  text-sm text-pink-600 shadow-xs placeholder-slate-400
  focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
/>
```

#### Textarea

```html
<textarea
  class="w-full px-3 py-2 min-h-[80px]
  bg-white border border-slate-300 rounded-sm 
  text-sm shadow-xs placeholder-slate-400
  focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500
  disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200"
  placeholder="Enter description..."
></textarea>
```

#### Select Dropdown

```html
<select
  class="w-full px-3 py-2 pr-10
  bg-white border border-slate-300 rounded-sm 
  text-sm shadow-xs appearance-none
  bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em]
  bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]
  focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
>
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

#### Form Labels

```html
<!-- Standard label -->
<label class="block text-sm font-medium text-slate-700 mb-1"> Field Name </label>

<!-- Required field label -->
<label class="block text-sm font-medium text-slate-700 mb-1"> Field Name <span class="text-pink-500">*</span> </label>

<!-- Optional field label -->
<label class="block text-sm font-medium text-slate-600 mb-1"> Field Name (optional) </label>
```

#### Help Text & Descriptions

```html
<!-- Standard description -->
<p class="text-sm text-slate-500 mt-1">Helpful description text goes here.</p>

<!-- Hint text -->
<p class="text-xs text-slate-400 mt-1 italic">A subtle hint for the user.</p>
```

#### Error Messages

```html
<p class="text-sm font-medium bg-pink-50 py-1 px-2 rounded-sm text-pink-600 mt-1">This field is required.</p>
```

#### Complete Form Field Example

```html
<div class="space-y-1">
  <label class="block text-sm font-medium text-slate-700 mb-1"> Page Title <span class="text-pink-500">*</span> </label>
  <input
    type="text"
    class="w-full px-3 py-2 
    bg-white border border-slate-300 rounded-sm 
    text-sm shadow-xs placeholder-slate-400
    focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
    placeholder="Enter page title..."
  />
  <p class="text-sm text-slate-500 mt-1">The title that appears in the browser tab.</p>
</div>
```

#### Form Section

```html
<div class="space-y-4">
  <h3 class="text-lg font-medium text-slate-800 border-b border-slate-200 pb-2 mb-4">Section Title</h3>
  <!-- Form fields go here -->
</div>
```

#### Form Actions

```html
<div class="flex gap-2 pt-4 border-t border-slate-200">
  <button class="...primary button classes...">Save</button>
  <button class="...secondary button classes...">Cancel</button>
</div>
```

---

### Tables

#### Table Container

```html
<table class="w-full border-collapse bg-white rounded-lg shadow-sm overflow-hidden">
  <!-- table content -->
</table>
```

#### Table Header

```html
<thead>
  <tr class="bg-slate-50 border-b border-slate-200">
    <th class="text-left py-3 px-4 font-medium text-slate-700">Name</th>
    <th class="text-left py-3 px-4 font-medium text-slate-700">Status</th>
    <th class="text-right py-3 px-4 font-medium text-slate-700">Actions</th>
  </tr>
</thead>
```

#### Table Body Row

```html
<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150 group">
  <td class="py-3 px-4 text-sm">
    <span class="font-medium text-slate-900">Page Name</span>
  </td>
  <td class="py-3 px-4 text-sm text-slate-600">Published</td>
  <td class="py-3 px-4 text-right">
    <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <!-- action buttons -->
    </div>
  </td>
</tr>
```

#### Selected Row

```html
<tr class="border-b border-slate-100 bg-pink-50">
  <!-- cells with bg-pink-50 background -->
</tr>
```

#### Checkbox in Table

```html
<!-- Unchecked -->
<div class="w-4 h-4 border border-slate-400 rounded-sm bg-white"></div>

<!-- Checked -->
<div class="w-4 h-4 border border-pink-500 rounded-sm bg-pink-500 flex items-center justify-center">
  <svg class="w-3 h-3 text-white"><!-- checkmark icon --></svg>
</div>
```

#### Empty State

```html
<tr>
  <td colspan="4" class="text-center py-8 text-slate-500">No items found.</td>
</tr>
```

---

### Cards

#### Standard Card

```html
<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
  <!-- card content -->
</div>
```

#### Compact Card

```html
<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
  <!-- card content -->
</div>
```

#### Structured Card with Header/Footer

```html
<div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
  <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
    <h3 class="font-medium text-slate-800">Card Title</h3>
  </div>
  <div class="p-6">
    <!-- card body content -->
  </div>
  <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
    <!-- card footer / actions -->
  </div>
</div>
```

---

### Badges

#### Neutral Badge

```html
<span
  class="text-xs font-medium px-2 py-1 rounded-full border
  bg-slate-100 text-slate-700 border-slate-200"
>
  Default
</span>
```

#### Primary Badge

```html
<span
  class="text-xs font-medium px-2 py-1 rounded-full border
  bg-pink-100 text-pink-700 border-pink-200"
>
  Active
</span>
```

#### Success Badge

```html
<span
  class="text-xs font-medium px-2 py-1 rounded-full border
  bg-green-100 text-green-700 border-green-200"
>
  Published
</span>
```

#### Warning Badge

```html
<span
  class="text-xs font-medium px-2 py-1 rounded-full border
  bg-yellow-100 text-yellow-700 border-yellow-200"
>
  Pending
</span>
```

#### Error Badge

```html
<span
  class="text-xs font-medium px-2 py-1 rounded-full border
  bg-red-100 text-red-700 border-red-200"
>
  Failed
</span>
```

---

### Toast Notifications

#### Toast Container

```html
<div class="fixed top-4 right-4 z-50 space-y-2">
  <!-- toasts go here -->
</div>
```

#### Success Toast

```html
<div
  class="mb-4 p-4 border rounded-sm flex justify-between items-start
  bg-green-700 border-green-800 text-green-50
  transform transition-all duration-300 ease-in-out"
>
  <span>Changes saved successfully!</span>
  <button class="ml-4 text-green-200 hover:text-white">×</button>
</div>
```

#### Error Toast

```html
<div
  class="mb-4 p-4 border rounded-sm flex justify-between items-start
  bg-red-50 border-red-200 text-red-600
  transform transition-all duration-300 ease-in-out"
>
  <span>An error occurred. Please try again.</span>
  <button class="ml-4 text-slate-400 hover:text-slate-600">×</button>
</div>
```

#### Warning Toast

```html
<div
  class="mb-4 p-4 border rounded-sm flex justify-between items-start
  bg-yellow-50 border-yellow-200 text-yellow-700
  transform transition-all duration-300 ease-in-out"
>
  <span>Please review before continuing.</span>
  <button class="ml-4 text-slate-400 hover:text-slate-600">×</button>
</div>
```

#### Info Toast

```html
<div
  class="mb-4 p-4 border rounded-sm flex justify-between items-start
  bg-blue-50 border-blue-200 text-blue-600
  transform transition-all duration-300 ease-in-out"
>
  <span>New features are available.</span>
  <button class="ml-4 text-slate-400 hover:text-slate-600">×</button>
</div>
```

---

### Modals

#### Modal Overlay

```html
<div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
  <!-- modal content -->
</div>
```

#### Confirmation Modal (Danger)

```html
<div class="bg-white rounded-lg shadow-lg max-w-md w-full overflow-hidden">
  <!-- Header -->
  <div class="p-4 bg-red-50 flex items-start gap-3">
    <div class="text-red-500">
      <svg><!-- warning icon --></svg>
    </div>
    <div>
      <h3 class="font-semibold text-slate-900">Delete Item?</h3>
      <p class="text-sm text-slate-600 mt-1">This action cannot be undone.</p>
    </div>
  </div>

  <!-- Body (optional) -->
  <div class="p-4 text-slate-600">Additional context or details about the action.</div>

  <!-- Footer -->
  <div class="p-4 bg-slate-50 flex justify-end gap-2">
    <button class="px-4 py-2 border border-slate-300 rounded-sm hover:bg-slate-100 text-sm font-medium">Cancel</button>
    <button class="px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 text-sm font-medium">Delete</button>
  </div>
</div>
```

#### Confirmation Modal (Warning)

Same structure but with:

- Header: `bg-yellow-50`
- Icon: `text-yellow-500`
- Confirm button: `bg-pink-600 hover:bg-pink-700`

---

### Tooltips

```html
<div class="relative inline-block group">
  <button>Hover me</button>
  <div
    class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
    opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0
    transition-all duration-150 pointer-events-none"
  >
    <div class="px-2 py-1 text-xs text-white bg-black/75 rounded whitespace-nowrap">Tooltip text</div>
    <div
      class="absolute top-full left-1/2 -translate-x-1/2
      border-l-[6px] border-l-transparent 
      border-r-[6px] border-r-transparent 
      border-t-[6px] border-t-black/75"
    ></div>
  </div>
</div>
```

---

### Loading Spinner

```html
<div class="p-6 text-center">
  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
  <p class="mt-2 text-slate-500">Loading...</p>
</div>
```

---

### Empty States

```html
<div class="p-8 text-center">
  <div class="text-slate-400 mb-4">
    <svg class="w-12 h-12 mx-auto"><!-- icon --></svg>
  </div>
  <h3 class="text-xl font-semibold text-slate-700 mb-2">No pages yet</h3>
  <p class="text-sm text-slate-500 mb-4">Create your first page to get started.</p>
  <button class="...primary button...">Create Page</button>
</div>
```

---

## Layout Patterns

### Sidebar Navigation (Dark Theme)

```html
<div class="w-[72px] md:w-48 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 overflow-y-auto">
  <!-- Logo -->
  <div class="border-b border-slate-800 py-0 pb-2 mb-4 md:mb-4 md:py-4 px-2 md:px-4">
    <img src="/logo.svg" class="hidden md:block" />
    <img src="/logo-symbol.svg" class="md:hidden w-12 h-12 mx-auto" />
  </div>

  <!-- Navigation Sections -->
  <div class="pb-2 px-2 md:px-4 grow">
    <!-- Section -->
    <div class="border-b border-slate-800 pb-4 mb-4">
      <h4 class="text-slate-600 text-xs font-bold mb-2 ml-2 hidden md:block">SECTION TITLE</h4>
      <ul class="space-y-2 md:space-y-1">
        <!-- Navigation items -->
      </ul>
    </div>
  </div>

  <!-- Bottom Section -->
  <div class="px-2 md:px-4 pb-2 border-t border-slate-800 pt-4">
    <!-- Settings, etc. -->
  </div>
</div>
```

#### Sidebar Navigation Item (Inactive)

```html
<a
  href="#"
  class="flex items-center justify-center md:justify-start p-2 rounded-sm
  border border-slate-700 md:border-none
  hover:bg-slate-800 transition-all duration-150"
>
  <span class="w-8 h-8 md:w-4 md:h-4 flex items-center justify-center text-pink-600">
    <svg><!-- icon --></svg>
  </span>
  <span class="hidden md:inline ml-1 text-sm">Pages</span>
</a>
```

#### Sidebar Navigation Item (Active)

```html
<a
  href="#"
  class="flex items-center justify-center md:justify-start p-2 rounded-sm
  bg-pink-600 border-pink-600 transition-all duration-150"
>
  <span class="w-8 h-8 md:w-4 md:h-4 flex items-center justify-center text-white">
    <svg><!-- icon --></svg>
  </span>
  <span class="hidden md:inline ml-1 text-sm">Pages</span>
</a>
```

#### Sidebar Navigation Item (Disabled)

```html
<span
  class="flex items-center justify-center md:justify-start p-2 rounded-sm
  opacity-40 cursor-not-allowed"
>
  <span class="w-8 h-8 md:w-4 md:h-4 flex items-center justify-center text-slate-500">
    <svg><!-- icon --></svg>
  </span>
  <span class="hidden md:inline ml-1 text-sm">Pages</span>
</span>
```

#### Sidebar Badge (Notification)

```html
<span class="ml-auto bg-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
  3
</span>
```

---

### Page Layout

```html
<div class="flex h-screen overflow-hidden">
  <!-- Sidebar -->
  <aside class="...sidebar classes...">
    <!-- sidebar content -->
  </aside>

  <!-- Main Content -->
  <main class="flex-1 overflow-auto ml-[72px] md:ml-48 bg-gray-50">
    <div class="p-8 max-w-7xl mx-auto">
      <!-- Page Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Page Title</h1>
          <p class="text-gray-700 mt-1">Optional description text.</p>
        </div>
        <div class="flex gap-2 items-center">
          <!-- Header actions -->
        </div>
      </div>

      <!-- Page Content -->
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <!-- content -->
      </div>
    </div>
  </main>
</div>
```

---

### Toolbar (Above Table)

```html
<div class="flex flex-wrap justify-between items-center mb-4">
  <!-- Left side -->
  <div class="flex items-center gap-2 mb-2 sm:mb-0">
    <button class="...secondary button...">Action</button>
  </div>

  <!-- Right side -->
  <div class="flex items-center gap-2">
    <!-- Search input with icon -->
    <div class="relative">
      <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
        <svg><!-- search icon --></svg>
      </span>
      <input type="text" class="form-input pl-10" placeholder="Search..." />
    </div>
    <button class="...primary button...">Add New</button>
  </div>
</div>
```

---

## Animations & Transitions

### Standard Transitions

| Use Case          | Classes                                   |
| ----------------- | ----------------------------------------- |
| Buttons & general | `transition-all duration-200`             |
| Table row hovers  | `transition-colors duration-150`          |
| Action reveals    | `transition-opacity duration-150`         |
| Toasts & modals   | `transition-all duration-300 ease-in-out` |

### Hover Reveal Pattern

For actions that appear on hover (e.g., table row actions):

```html
<div class="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
  <!-- hidden content -->
</div>
```

Parent element needs `group` class:

```html
<tr class="group hover:bg-slate-50">
  <!-- row content with hover-reveal actions -->
</tr>
```

---

## Focus States

### Global Focus Ring

Applied to all focusable elements via CSS:

```css
*:focus-visible {
  outline: none;
  ring-width: 2px;
  ring-color: #ec4899; /* pink-500 */
  ring-offset: 0;
}
```

Tailwind classes:

```
focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-0
```

### Input Focus

```
focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500
```

### Button Focus

```
focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
```

---

## Icons

**Library:** lucide-react (https://lucide.dev)

**Standard size:** 20px (`size={20}`)

**Common icons used:**

- Navigation: `Home`, `File`, `Folder`, `Menu`, `Image`, `Settings`, `Layers`
- Actions: `Plus`, `Pencil`, `Trash2`, `Copy`, `Download`, `Upload`, `ExternalLink`
- UI: `ChevronDown`, `ChevronUp`, `ChevronRight`, `X`, `Check`, `Search`
- Status: `AlertTriangle`, `Info`, `CheckCircle`, `XCircle`

**Icon colors follow text context:**

- Default: `text-slate-400` or `text-slate-500`
- Interactive: `text-pink-600`
- On dark background: `text-white`
- Danger: `text-red-600`

---

## Quick Reference

### Most Common Patterns

**Page background:** `bg-gray-50`

**Content container:** `bg-white rounded-xl border border-gray-200 p-4`

**Page title:** `text-2xl font-bold text-gray-900 tracking-tight`

**Section title:** `text-lg font-medium text-slate-800 border-b border-slate-200 pb-2 mb-4`

**Body text:** `text-sm text-gray-900`

**Muted text:** `text-sm text-slate-500`

**Primary button:** `bg-pink-600 text-white hover:bg-pink-700 rounded-md px-4 py-2 text-sm font-semibold`

**Secondary button:** `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md px-4 py-2 text-sm font-semibold`

**Form input:** `w-full px-3 py-2 bg-white border border-slate-300 rounded-sm text-sm focus:ring-1 focus:ring-pink-500 focus:border-pink-500`

**Form label:** `block text-sm font-medium text-slate-700 mb-1`

**Table header:** `bg-slate-50 border-b border-slate-200 py-3 px-4 text-left font-medium text-slate-700`

**Table row hover:** `hover:bg-slate-50 transition-colors duration-150`

**Selected state:** `bg-pink-50`

**Focus ring:** `focus:ring-2 focus:ring-pink-500 focus:ring-offset-2`

**Sidebar active:** `bg-pink-600 text-white`

**Sidebar inactive icon:** `text-pink-600`

---

## Tailwind Configuration

This design system uses Tailwind CSS v4 with default configuration. No custom `tailwind.config.js` is required—all styling uses Tailwind's default utility classes.

To set up in a new project:

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

**postcss.config.js:**

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**Main CSS file:**

```css
@import "tailwindcss";

@layer base {
  body {
    @apply text-sm font-sans text-gray-900 bg-gray-50;
  }

  button {
    @apply cursor-pointer;
  }

  *:focus-visible {
    @apply outline-none ring-2 ring-pink-500 ring-offset-0;
  }
}
```

---

_This design system document is self-contained and includes all patterns needed to recreate the Widgetizer visual style in new applications._
