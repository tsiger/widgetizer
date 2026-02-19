import { API_URL } from "../config";

export async function apiFetch(path, options = {}) {
  const url = API_URL(path);
  const headers = { ...options.headers };

  if (window.Clerk?.session) {
    const token = await window.Clerk.session.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}
