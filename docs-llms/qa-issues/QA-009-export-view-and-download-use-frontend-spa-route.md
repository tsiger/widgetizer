# QA-009 — Export View and Download actions use the frontend SPA route in web dev

| Field | Value |
| --- | --- |
| Story IDs | `EXPORT-005`, `EXPORT-007` |
| Severity | High |
| Environment | Web app dev mode; Vite on `localhost:3000`, Express on `localhost:3001`; `experimentation` at `c7dff686` |
| Preconditions | Active disposable project `QA Media Regression 2026-06-22` with export `qa-media-regression-2026-06-22-v2` |
| Status | Confirmed |
| Reproducibility | Always in the inspected web dev environment |
| Data impact | Users can create exports but cannot view or download them through the web UI in dev mode |

## Minimal reproduction

1. Open `/export-site`.
2. Create an export.
3. Open the export row actions menu.
4. Click **View site**.
5. Check the destination.

## Expected

The exported site opens from the backend static export route, and Download retrieves a ZIP.

## Actual

The View action navigates to `http://localhost:3000/api/export/view/qa-media-regression-2026-06-22-v2/index.html`, where the frontend app renders its 404 page. The backend route itself works on port `3001`.

Download has the same origin issue: `http://localhost:3000/api/export/download/qa-media-regression-2026-06-22-v2` returns the Vite/React HTML shell, while `http://localhost:3001/api/export/download/qa-media-regression-2026-06-22-v2` returns `Content-Type: application/zip`.

## Evidence

- Clicking **View site** changed the active tab URL to `http://localhost:3000/api/export/view/qa-media-regression-2026-06-22-v2/index.html` and displayed the app-level `404 / Page not found` screen.
- `curl -I http://localhost:3001/api/export/view/qa-media-regression-2026-06-22-v2/index.html` returned `200 OK` with `Content-Type: text/html`.
- `curl -I http://localhost:3001/api/export/download/qa-media-regression-2026-06-22-v2` returned `200 OK` with `Content-Type: application/zip` and the expected `Content-Disposition`.
- `curl -I http://localhost:3000/api/export/download/qa-media-regression-2026-06-22-v2` returned the frontend HTML shell (`Content-Type: text/html`).
- `packages/editor-ui/src/components/export/ExportHistoryTable.jsx` and `packages/editor-ui/src/queries/exportManager.js` build direct navigation/download URLs from `getApiBase()`. In this dev surface that resolves to the frontend-relative `/api`, which is safe for XHR fetches but not for browser-native navigation/download actions.
