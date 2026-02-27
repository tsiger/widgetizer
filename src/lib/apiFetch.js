import { API_URL } from "../config";

export async function apiFetch(path, options = {}) {
  const url = API_URL(path);
  const headers = { ...options.headers };

  const response = await fetch(url, { ...options, headers });

  return response;
}
