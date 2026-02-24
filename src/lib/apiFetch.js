import { API_URL, HOSTED_MODE, PUBLISHER_URL } from "../config";

export async function apiFetch(path, options = {}) {
  const url = API_URL(path);
  const headers = { ...options.headers };

  if (window.Clerk?.session) {
    const token = await window.Clerk.session.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // In hosted mode, redirect to sign-in on 401 — but only if Clerk has
  // finished loading. If Clerk is still initializing, the AuthGuard will
  // handle the unauthenticated state instead of a hard redirect.
  if (HOSTED_MODE && response.status === 401 && window.Clerk?.loaded) {
    window.location.href = PUBLISHER_URL ? `${PUBLISHER_URL}/sign-in` : "/sign-in";
    return new Promise(() => {});
  }

  return response;
}
