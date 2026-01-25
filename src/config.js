// Single source of truth for API URL
export const BASE_URL = import.meta.env.VITE_API_URL;

// Helper function to build API URLs
export const API_URL = (path) => `${BASE_URL}${path}`;

export const MEDIA_TYPES = {
  image: [".jpeg", ".jpg", ".png", ".gif", ".webp", ".svg"],
  video: [".mp4", ".webm", ".mov", ".avi", ".mkv"],
  audio: [".mp3", ".wav", ".ogg", ".m4a"],
};
