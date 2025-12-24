# Selection Overlay Scroll Scenarios

All scenarios for widget selection and scrolling behavior in the page editor preview.

---

## Scroll Scenarios When Selecting a Widget

### 1. Widget completely below viewport

- **State**: Widget is entirely below the visible area
- **Expected**: Scroll down to put widget top near viewport top (with ~40px padding)
- **Status**: [x] ✅

### 2. Widget completely above viewport

- **State**: Widget is entirely above the visible area
- **Expected**: Scroll up to put widget top near viewport top
- **Status**: [x] ✅

### 3. Widget partially visible (top cut off)

- **State**: Widget bottom is visible but top is above viewport
- **Expected**: Scroll up to show widget top at viewport top
- **Status**: [x] ✅

### 4. Widget partially visible (bottom cut off)

- **State**: Widget top is visible but bottom is below viewport
- **Expected**: Should scroll to put widget top at viewport top
- **Status**: [x] ✅

### 5. Widget top already near viewport top

- **State**: Widget top is within 80px of viewport top
- **Expected**: NO scroll, just show selection
- **Status**: [x] ✅

### 6. Widget fully visible and centered

- **State**: Entire widget visible in middle of viewport
- **Expected**: Scroll to put widget top near viewport top
- **Status**: [x] ✅

### 7. Last widget on page (near bottom)

- **State**: Selecting the last widget which is near document bottom
- **Expected**: Scroll as much as possible without creating gap/overscroll
- **Status**: [x] ✅

### 8. First widget on page (header or first content)

- **State**: Selecting header or first widget
- **Expected**: Scroll to top (scroll position 0 or widget at top)
- **Status**: [x] ✅

---

## Selection Overlay Scenarios

### 9. Select widget from sidebar

- **Expected**: Selection overlay appears on correct widget, preview scrolls
- **Status**: [x] ✅

### 10. Select widget from preview click

- **Expected**: Selection overlay appears, sidebar highlights widget
- **Status**: [x] ✅

### 11. Select block from sidebar

- **Expected**: Block selection overlay appears on correct block
- **Status**: [x] ✅

### 12. Select block from preview click

- **Expected**: Block is selected and highlighted
- **Status**: [x] ✅

---

## Hover Scenarios

### 13. Hover widget in sidebar (different from selected)

- **Expected**: Hover overlay appears on that widget in preview
- **Status**: [x] ✅

### 14. Hover block in sidebar (of selected widget)

- **Expected**: Block hover overlay appears in preview
- **Status**: [x] ✅

### 15. Hover block in sidebar (of different widget)

- **Expected**: Block hover overlay appears in preview
- **Status**: [x] N/A (only selected widget shows blocks)

### 16. Hover widget in preview

- **Expected**: Hover overlay appears on hovered widget
- **Status**: [x] ✅

### 17. Hover block in preview (of selected widget)

- **Expected**: Block hover overlay appears
- **Status**: [x] ✅

### 18. Hover block in preview (of different widget)

- **Expected**: Both widget hover and block hover show
- **Status**: [x] ✅

### 19. Clear hover (mouse leaves sidebar/preview)

- **Expected**: Hover overlays clear
- **Status**: [x] ✅

---

## Widget Operations

### 20. Add new widget

- **Expected**: New widget scrolls into view, selection overlay on it
- **Status**: [x] ✅

### 21. Duplicate widget

- **Expected**: New duplicate scrolls into view with selection
- **Status**: [x] ✅

### 22. Delete widget

- **Expected**: Selection moves to next widget, no ghost overlay
- **Status**: [x] ✅

### 23. Reorder widget (sidebar drag)

- **Expected**: Selection follows moved widget
- **Status**: [x] ✅

### 24. Reorder widget (preview arrows)

- **Expected**: Selection stays on widget at new position
- **Status**: [x] ✅

---

## Scroll Tracking

### 25. Manual scroll in preview (with selection)

- **Expected**: Selection overlay tracks widget position during scroll
- **Status**: [x] ✅

### 26. Manual scroll in preview (with hover)

- **Expected**: Hover overlay tracks widget position during scroll
- **Status**: [x] ✅

---

## Edge Cases

### 27. Resize preview (desktop/mobile toggle)

- **Expected**: Overlays update positions correctly
- **Status**: [x] ✅

### 28. No lingering overlays after operations

- **Expected**: No ghost/stuck overlays remain
- **Status**: [x] ✅

### 29. Rapid selection changes

- **Expected**: Overlays respond correctly without flickering
- **Status**: [x] ✅

---

## Notes

_Record issues here:_

-
