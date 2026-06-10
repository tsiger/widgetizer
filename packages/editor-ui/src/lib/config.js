// API base URL for the editor client. In dev, VITE_API_URL points at the
// Express dev server (a separate origin from Vite); in production (web/Electron)
// the bundle and the API share an origin, so an empty base yields same-origin
// requests regardless of the bound port. (MEDIA_TYPES and other shell config
// stay in the OSS shell's own config.)
export const BASE_URL = import.meta.env.VITE_API_URL || "";

export const API_URL = (path) => `${BASE_URL}${path}`;
