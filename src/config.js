// Single source of truth for API URL
export const BASE_URL = import.meta.env.VITE_API_URL;

// Helper function to build API URLs
export const API_URL = (path) => `${BASE_URL}${path}`;
