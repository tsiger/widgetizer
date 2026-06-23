# QA-007 — Invalid export settings are accepted

| Field | Value |
| --- | --- |
| Story IDs | `APPSET-006`, `APPSET-007`, `APPSET-011`, `EXPORT-004` |
| Severity | Medium |
| Environment | Web app/server; isolated settings database; `experimentation` at `c7dff686` |
| Preconditions | General Settings > Export |
| Status | Confirmed |
| Reproducibility | Always |
| Data impact | Invalid retention/import limits can be persisted and consumed by export/import code |

## Minimal reproduction

1. Set `Maximum export versions` to `0` (schema minimum `1`).
2. Set `Maximum project import size` to `1 MB` (schema minimum `10 MB`).
3. Save settings.

## Expected

The form or server rejects the values with useful field-level errors and retains the previous valid settings.

## Actual

The settings update returns HTTP 200 and persists both out-of-range values.

## Evidence

- Isolated controller test submitted `{ export: { maxVersionsToKeep: 0, maxImportSizeMB: 1 } }` and received `Settings updated successfully`; a subsequent read returned the same invalid values.
- Live UI check on `/app-settings` > Export & Versioning accepted entry of `0` and `1` into controls whose rendered min/max were `1..50` and `10..2000`; the Save button remained enabled. The invalid values were cancelled rather than saved in the real app settings.
- `appSettings.schema.json` declares the respective minimums as `1` and `10`.
- `TextInput` forwards HTML `min`/`max`, but `AppSettings` does not run validity checks before saving.
- `appSettingsController.updateAppSettings` validates media settings only and has no export-setting validation.
