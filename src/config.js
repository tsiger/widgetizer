// Single source of truth for API URL
export const BASE_URL = import.meta.env.VITE_API_URL;

// Helper function to build API URLs
export const API_URL = (path) => `${BASE_URL}${path}`;

// Preview isolation config (for multi-user / SaaS deployments)
export const PREVIEW_ISOLATION = import.meta.env.VITE_PREVIEW_ISOLATION === "true";
export const PREVIEW_ORIGIN = import.meta.env.VITE_PREVIEW_ORIGIN || "";

export const MEDIA_TYPES = {
  image: [".jpeg", ".jpg", ".png", ".gif", ".webp", ".svg"],
  video: [".mp4"],
  audio: [".mp3"],
};
