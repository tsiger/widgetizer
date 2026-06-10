// The API base helpers (API_URL/BASE_URL) moved to @widgetizer/editor-ui in
// Sprint 1.5e-2 — the editor client owns them. Re-exported here so existing
// src/ importers keep working during the extraction (removed in 1.5f).
// MEDIA_TYPES is shell config and stays here.
export { API_URL, BASE_URL } from "@widgetizer/editor-ui/lib/config";

export const MEDIA_TYPES = {
  image: [".jpeg", ".jpg", ".png", ".gif", ".webp", ".svg"],
  file: [".pdf"],
};
