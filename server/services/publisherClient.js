import { PUBLISHER_API_URL } from "../hostedMode.js";

/**
 * Error thrown when the Publisher API returns a non-OK response.
 * Preserves the HTTP status code so callers can forward it to the client.
 */
export class PublisherError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "PublisherError";
    this.status = status;
  }
}

/**
 * Deploy a ZIP archive to the Publisher service.
 *
 * @param {Buffer} zipBuffer - ZIP file contents
 * @param {object} metadata - Deployment metadata
 * @param {string} [metadata.siteId] - Existing site ID for republishing (omit for first publish)
 * @param {string} metadata.projectName - Project name for display
 * @param {string} clerkToken - Clerk JWT to forward for authentication
 * @returns {Promise<{success: boolean, siteId: string, subdomain: string, url: string, version: number}>}
 * @throws {PublisherError} If the Publisher API returns a non-OK response (preserves HTTP status)
 * @throws {Error} If PUBLISHER_API_URL is not configured or the deploy request fails
 */
export async function deployToPublisher(zipBuffer, metadata, clerkToken) {
  if (!PUBLISHER_API_URL) {
    throw new Error("Publisher API URL is not configured (PUBLISHER_API_URL env var)");
  }

  const formData = new FormData();
  formData.append("file", new Blob([zipBuffer], { type: "application/zip" }), "site.zip");
  formData.append("projectName", metadata.projectName);
  if (metadata.siteId) {
    formData.append("siteId", metadata.siteId);
  }

  let response;
  try {
    response = await fetch(`${PUBLISHER_API_URL}/api/deploy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
      body: formData,
    });
  } catch (fetchError) {
    throw new Error(`Could not reach Publisher service: ${fetchError.message}`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Publisher returned invalid response (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new PublisherError(data.error || `Publisher deploy failed (HTTP ${response.status})`, response.status);
  }

  return data;
}
