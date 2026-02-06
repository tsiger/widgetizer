# Testing

This document describes the test suites available for Widgetizer and how to run them.

## Available Tests

| Test          | File                                | Description                     |
| ------------- | ----------------------------------- | ------------------------------- |
| Theme Updates | `server/tests/themeUpdates.test.js` | Tests the theme update pipeline |

---

## Theme Updates Test

Tests the complete theme update system including:

- Version detection and layering
- File additions and updates
- Widget additions and updates
- Settings additions in `theme.json`
- File deletions (single files)
- Folder deletions (entire widgets)
- Preservation of untouched files

### Running

```bash
node server/tests/themeUpdates.test.js
```

### Output

The test creates a temporary theme fixture, builds a `latest/` snapshot across multiple versions, and verifies the results:

```
Theme Update System Tests

Running 25 tests:

  ✓ Detects all versions (base + updates)
  ✓ Creates latest/ directory
  ✓ theme.json has version 1.2.0 (latest)
  ✓ assets/deprecated.css DELETED in v1.2.0
  ✓ widgets/deprecated-widget/ DELETED in v1.2.0
  ...

Results:
  Passed: 25
```

### Test Fixtures

The test creates a temporary theme (`__test_theme_updates__`) with:

- **Base v1.0.0**: Initial theme structure with assets, widgets, snippets, templates, menus
- **Update v1.1.0**: File additions/updates, new widget, new settings
- **Update v1.2.0**: File deletion, widget folder deletion, more settings

Fixtures are automatically cleaned up after tests complete.
