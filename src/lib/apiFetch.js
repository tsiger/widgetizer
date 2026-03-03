import { API_URL } from "../config";
import { getActiveProjectId } from "./activeProjectId";

export async function apiFetch(path, options = {}) {
  const url = API_URL(path);
  const headers = { ...options.headers };

  const projectId = getActiveProjectId();
  if (projectId) {
    headers["X-Project-Id"] = projectId;
  }

  const response = await fetch(url, { ...options, headers });

  return response;
}
