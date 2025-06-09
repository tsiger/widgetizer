# Theme Settings Management

This document details the workflow for managing theme settings, from the backend file structure to the frontend React components that render the settings UI.

## 1. Data Structure & Storage

All theme settings for a specific project are stored in a single JSON file within that project's directory. This file serves as both the schema for the settings UI and the storage for its values.

- **Location**: `/data/projects/<projectId>/theme.json`

This file is initially copied from the base theme's `theme.json` when a project is first created.

### `theme.json` Structure

The file contains a `settings` object, which is further divided into groups (e.g., `global`). Each group contains an array of setting objects.

```json
{
  "name": "Default Theme",
  "version": "1.0.0",
  "settings": {
    "global": {
      "general": [
        {
          "id": "site_title",
          "type": "text",
          "label": "Site Title",
          "default": "My Awesome Site",
          "value": "My Live Site Title"
        }
      ],
      "colors": [
        {
          "id": "accent_color",
          "type": "color",
          "label": "Accent Color",
          "default": "#ec4899",
          "value": "#FF00FF"
        }
      ]
    }
  }
}
```

- `value`: This property is not part of the original theme schema. It is added and updated within the project's `theme.json` as the user changes settings. If `value` is not present, the UI uses the `default` value.

## 2. Frontend Implementation (`src/pages/Settings.jsx`)

The **Theme Settings** page provides the user interface for modifying the `theme.json` file.

### Data Flow

1.  **Loading**: When the page loads, it calls `getThemeSettings()` from `src/utils/themeManager.js`. This function fetches the entire `theme.json` file from the backend for the currently active project.
2.  **State Management**: The contents of `theme.json` are stored in a React state variable called `themeData`.
3.  **Rendering**:
    - The `Settings.jsx` component passes the schema (`themeData.settings.global`) to a generic `SettingsPanel` component.
    - Before passing the data, it calls `extractSettingsValues()` to transform the nested settings structure into a flat `values` object (e.g., `{ site_title: "My Live Site Title", accent_color: "#FF00FF" }`). This is the format the `SettingsPanel` expects.
    - The `SettingsPanel` then dynamically renders the correct input component for each setting based on its `type` property.
4.  **Updating**:
    - When a user changes a value in an input, the `onChange` event is fired with the setting's `id` and the new `value`.
    - The `handleSettingChange` function finds the corresponding setting within the nested `themeData` state and updates its `value` property. This ensures the original data structure is preserved.
5.  **Saving**:
    - When the user clicks "Save Settings", the `handleSave` function is called.
    - It calls `saveThemeSettings()`, sending the entire, updated `themeData` object in the body of a `POST` request.

## 3. Backend Implementation

The backend is responsible for reading and overwriting the project's `theme.json` file.

### API Routes (`server/routes/themes.js`)

| Method | Endpoint | Controller Function | Description |
| --- | --- | --- | --- |
| `GET` | `/api/themes/project/:projectId` | `getProjectThemeSettings` | Reads and returns the project's `theme.json`. |
| `POST` | `/api/themes/project/:projectId` | `saveProjectThemeSettings` | Overwrites the project's `theme.json` with the request body. |

### Controller Logic (`server/controllers/themeController.js`)

- `getProjectThemeSettings`: This function locates the `theme.json` file for the given `projectId`, reads its contents, parses the JSON, and returns it to the client.
- `saveProjectThemeSettings`: This function receives the updated theme data object in the request body. It then completely overwrites the existing `theme.json` file for the project with the new data, effectively saving all changes.

## 4. CSS Variable Generation

A critical step connects the theme settings to the live site's styling: the automatic generation of CSS variables. This process happens on the server whenever a page is rendered for the preview or for publishing.

### The `outputAsCssVar` Property

To have a setting's value be output as a CSS variable, you must add the following property to its definition in `theme.json`:

```json
"outputAsCssVar": true
```

### Generation Workflow

1.  **Trigger**: The process is initiated when a page is rendered by the server's `renderingService.js`.
2.  **Liquid Tag**: The main `layout.liquid` file contains a custom Liquid tag, `{% theme_settings %}`.
3.  **Tag Logic**: This tag is powered by `src/core/tags/themeSettings.js`. When the layout is rendered, this tag's logic executes:
    - It iterates through all setting groups and items in `theme.json`.
    - It specifically looks for settings that have `"outputAsCssVar": true`.
    - For each of these settings, it generates a CSS variable. The variable name is constructed from its group and its ID: `--<group_id>-<setting_id>`.
    - The `font_picker` type is handled as a special case, automatically generating two variables for the font stack (`-family`) and weight (`-weight`).
4.  **Injection**: All generated variables are compiled into a `<style id="theme-settings-styles">` block and injected directly into the `<head>` of the final HTML document.

### Example

Given this setting in `theme.json`:

```json
{
  "id": "accent_color",
  "type": "color",
  "label": "Accent Color",
  "default": "#ec4899",
  "outputAsCssVar": true
}
```

If its group is `"colors"`, the following CSS will be injected into the page:

```html
<style id="theme-settings-styles">
  :root {
    --colors-accent_color: #ec4899;
  }
</style>
```

This variable can then be used throughout the theme's CSS files like `var(--colors-accent_color)`.

---

## Available Setting Types

For a complete list of all available setting types and their JSON schema, please refer to the following document:

- [**Theme & Widget Setting Types**](./theme-settings.md)
