import { apiFetch } from "../lib/apiFetch";

/**
 * Publish a project to the web via the hosted publish adapter.
 * @param {string} projectId
 * @returns {Promise<{success: boolean, siteId: string, url: string, version: number}>}
 */
export async function publishProject(projectId) {
  const response = await apiFetch(`/api/publish/${projectId}`, {
    method: "POST",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || data.error || "Failed to publish");
  }

  return await response.json();
}

/**
 * Get the publish status for a project.
 * @param {string} projectId
 * @returns {Promise<{published: boolean, siteId: string|null, url: string|null, publishedAt: string|null}>}
 */
export async function getPublishStatus(projectId) {
  const response = await apiFetch(`/api/publish/status/${projectId}`);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || data.error || "Failed to get publish status");
  }

  return await response.json();
}
