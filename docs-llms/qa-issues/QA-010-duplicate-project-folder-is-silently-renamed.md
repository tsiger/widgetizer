# QA-010 — Duplicate project folder is silently renamed during creation

| Field | Value |
| --- | --- |
| Story IDs | `PROJ-012`, `PROJ-013`, `SAFE-007`, `SAFE-011` |
| Severity | Medium |
| Environment | Web app dev mode; Vite on `localhost:3000`, Express on `localhost:3001`; `experimentation` at `c7dff686` |
| Preconditions | Existing project folder `qa-web-smoke-2026-06-22`; active disposable project `QA Media Regression 2026-06-22` |
| Status | Confirmed |
| Reproducibility | Reproduced once in the inspected web dev environment |
| Data impact | Users can submit a chosen folder name and receive a different saved folder name without any inline warning or confirmation |

## Minimal reproduction

1. Open `/projects/add`.
2. Enter a project title.
3. Select the Arch theme.
4. Open **More settings**.
5. Set **Folder Name** to an existing folder, such as `qa-web-smoke-2026-06-22`.
6. Set a valid website address so URL validation does not block submission.
7. Click **Create Project**.

## Expected

The form should either block submission with a clear duplicate-folder error, or explicitly tell the user that the final folder name will be changed before creating the project.

## Actual

The project was created and activated. The backend saved the folder as `qa-web-smoke-2026-06-22-1`, even though the form value submitted by the user was `qa-web-smoke-2026-06-22`.

## Evidence

- The UI stayed on the new-project form when invalid folder characters were entered and showed `Folder name can only contain lowercase letters, numbers, and hyphens`.
- With duplicate folder `qa-web-smoke-2026-06-22` and valid website URL, the app navigated to `/pages` and activated `QA Project Validation 2026-06-23`.
- `GET /api/projects` showed the created project with `folderName: "qa-web-smoke-2026-06-22-1"`.
- The disposable project and generated folder were deleted afterward; active project was restored to `QA Media Regression 2026-06-22`.
