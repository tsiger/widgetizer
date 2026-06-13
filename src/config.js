// Single source of truth for API URL.
// In production (web app, Electron) the bundle and the API are served by the
// same Express origin, so an empty BASE_URL produces same-origin requests and
// the renderer works regardless of which port the server bound to. In dev,
// VITE_API_URL points at the Express dev server (separate origin from Vite).
export const BASE_URL = import.meta.env.VITE_API_URL || "";

// Helper function to build API URLs
export const API_URL = (path) => `${BASE_URL}${path}`;

export const MEDIA_TYPES = {
  image: [".jpeg", ".jpg", ".png", ".gif", ".webp", ".svg"],
  audio: [".mp3"],
  file: [".pdf"],
};
