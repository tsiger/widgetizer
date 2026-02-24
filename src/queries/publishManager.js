import { apiFetch } from "../lib/apiFetch";

/**
 * @typedef {Object} PublishResult
 * @property {boolean} success - Whether publish completed successfully
 * @property {string} siteId - Publisher site ID
 * @property {string} url - Live URL of the published site
 * @property {string} subdomain - Subdomain assigned by Publisher
 * @property {number} version - Version number on Publisher
 */

/**
 * @typedef {Object} PublishStatus
 * @property {boolean} published - Whether the project has been published
 * @property {string|null} siteId - Publisher site ID or null
 * @property {string|null} url - Live URL or null
 * @property {string|null} publishedAt - ISO timestamp of last publish or null
 */

/**
 * Publish a project to the hosted platform.
 * @param {string} projectId - The project UUID to publish
 * @returns {Promise<PublishResult>}
 * @throws {Error} If projectId is missing or publish fails
 */
export async function publishProjectAPI(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required to publish.");
  }

  const response = await apiFetch(`/api/publish/${projectId}`, {
    method: "POST",
  });

  const result = await response.json();

  if (!response.ok) {
    const err = new Error(result.error || result.message || "Publish failed");
    err.status = response.status;
    throw err;
  }

  return result;
}

/**
 * Get the publish status for a project.
 * @param {string} projectId - The project UUID
 * @returns {Promise<PublishStatus>}
 * @throws {Error} If projectId is missing or request fails
 */
export async function getPublishStatusAPI(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required to get publish status.");
  }

  const response = await apiFetch(`/api/publish/status/${projectId}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || "Failed to get publish status");
  }

  return result;
}
