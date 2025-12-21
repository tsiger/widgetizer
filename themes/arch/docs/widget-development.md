---
description: How to build new widgets for the Widgetizer theme
---

## Widget Development Process

1. Check `docs/potential-widgets.md` for the priority queue
2. Review guidelines in `themes/arch/docs/coding-standards.md` and `themes/arch/docs/design-system.md`
3. Look at similar existing widgets for patterns
4. Create an implementation plan
5. Create the widget folder: `themes/arch/widgets/{widget-name}/`
6. Create `schema.json` with widget settings
7. Create `widget.liquid` with template, styles, and scripts
8. **USER handles all testing** - do not attempt browser verification
9. Update `docs/potential-widgets.md` to mark widget as complete

## Key Guidelines

- All CSS scoped to `#{{ widget.id }}`
- Use CSS variables from design system
- Use logical properties for RTL support (margin-inline-start, etc.)
- Use rem units (0.1rem = 1px)
- JS must be wrapped in IIFE and support multiple instances
- Include `data-setting` attributes for real-time preview updates
- **Icons**: Use **Lucide icons only** whenever you need to use icons. Standardize on the Lucide SVG paths.
