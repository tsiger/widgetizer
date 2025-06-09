# App Settings (`AppSettings.jsx`)

## Overview

The `AppSettings` page is responsible for managing global configurations that apply across the entire application, rather than to a specific project. These are system-level settings that control the application's behavior. An example of this is setting the maximum file upload size for the media manager.

## Component Breakdown

- **`PageLayout`**: Provides the standard page structure with a title.
- **`SettingsField`**: A reusable wrapper component that groups a label, a description, and an input field into a single, organized row.
- **`TextInput`**: The specific input component used for the setting.
- **`LoadingSpinner`**: Displayed while the initial settings are fetched from the server.
- **`Button`**: The "Save Settings" button to persist changes.

## Data Flow and State Management

The `AppSettings` component follows a straightforward pattern for managing its data.

### 1. Fetching Settings

- When the component mounts, a `useEffect` hook calls the `fetchSettings` function.
- `fetchSettings` uses the `getAppSettings` utility from `appSettingsManager.js` to retrieve the current application settings from the backend API.
- The fetched settings object is stored in the component's local state using `useState`.

### 2. Updating Settings

- The component uses a generic `handleInputChange` function to manage state updates for potentially nested setting objects.
- It takes the new `value` and a `name` string (e.g., `"media.maxFileSizeMB"`), which it splits to traverse the state object and update the correct property without mutating the original state directly.
- This makes it easy to add new, nested settings in the future without needing to write new state update logic.

### 3. Saving Settings

- When the user clicks "Save Settings", the `handleSave` function is triggered.
- Before sending the data, it performs any necessary data transformation. For example, it ensures the `maxFileSizeMB` is parsed into an integer.
- It then calls `saveAppSettings` from the `appSettingsManager.js` to send the entire updated settings object to the backend for persistence.
- Finally, it uses the global `useToastStore` to provide immediate visual feedback to the user, indicating whether the save was successful or failed.

## How App Settings Are Used

Unlike theme settings, which are primarily consumed by the frontend via a global store, App Settings are mainly used by the **backend** to control system-level behavior.

A clear example is the `maxFileSizeMB` setting. Here's how it's used:

1.  When a user uploads a file through the Media Manager, the file is sent directly to the server.
2.  The backend route (`/api/media/projects/:projectId/media`) receives the file.
3.  Before processing the upload, the server-side controller (`mediaController.js`) reads the `maxFileSizeMB` value directly from the application's settings file.
4.  It compares the uploaded file's size against this value. If the file is too large, the server rejects it and sends an error message back to the client.

This server-side validation ensures that the constraints are always enforced securely, regardless of any frontend logic.
