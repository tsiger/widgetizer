import { API_URL } from "../config";
import { apiFetch } from "../lib/apiFetch";

/**
 * @typedef {Object} MediaFile
 * @property {string} id - Unique file identifier
 * @property {string} filename - Original filename
 * @property {string} mimeType - MIME type of the file
 * @property {number} size - File size in bytes
 * @property {number} [width] - Image width (for images)
 * @property {number} [height] - Image height (for images)
 * @property {string} [thumbnailUrl] - URL to thumbnail version
 * @property {string} originalUrl - URL to original file
 * @property {string[]} [usedIn] - Array of page/content IDs using this file
 * @property {string} createdAt - ISO timestamp of upload
 */

/**
 * @typedef {Object} MediaCollection
 * @property {MediaFile[]} files - Array of media files
 * @property {number} totalSize - Total size of all files in bytes
 * @property {number} count - Total number of files
 */

/**
 * @typedef {Object} UploadResult
 * @property {boolean} success - Whether upload completed successfully
 * @property {MediaFile[]} processedFiles - Array of successfully uploaded files
 * @property {Array<{filename: string, error: string}>} [errors] - Any upload errors
 * @property {number} status - HTTP status code
 */

// Per-project cache for media data to prevent redundant API calls
const mediaCache = new Map(); // projectId -> { data, timestamp, promise }
const CACHE_DURATION = 30000; // 30 seconds cache

/**
 * Fetch all media files for a project with caching and request deduplication.
 * Subsequent calls within the cache duration return cached data.
 * @param {string} projectId - The ID of the project
 * @param {boolean} [forceRefresh=false] - Bypass cache and fetch fresh data
 * @returns {Promise<MediaCollection>} Collection of media files with metadata
 * @throws {Error} If the API request fails
 */
export async function getProjectMedia(projectId, forceRefresh = false) {
  const now = Date.now();
  const cached = mediaCache.get(projectId);

  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && cached && cached.data && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // If there's already a fetch in progress for this project, wait for it
  if (cached && cached.promise) {
    try {
      return await cached.promise;
    } catch (error) {
      // If the cached promise fails, log it and try fetching again below
      console.warn(`[MediaManager] Cached fetch promise failed, retrying. Reason: ${error.message}`);
    }
  }

  // Create a new fetch promise
  const fetchPromise = (async () => {
    try {
      const response = await apiFetch(`/api/media/projects/${projectId}/media`);
      if (!response.ok) {
        throw new Error("Failed to fetch media files");
      }
      const data = await response.json();

      // Update cache with successful data
      mediaCache.set(projectId, {
        data,
        timestamp: Date.now(),
        promise: null,
      });

      return data;
    } catch (error) {
      // Clear the promise on error so retry is possible
      const current = mediaCache.get(projectId);
      if (current) {
        mediaCache.set(projectId, { ...current, promise: null });
      }
      throw error;
    }
  })();

  // Store the promise so concurrent requests can share it
  mediaCache.set(projectId, {
    ...(cached || {}),
    promise: fetchPromise,
  });

  try {
    return await fetchPromise;
  } catch {
    throw new Error("Failed to get media files");
  }
}

/**
 * Invalidate the media cache for a project.
 * Call this after uploads or deletions to ensure fresh data on next fetch.
 * @param {string} projectId - The ID of the project to invalidate cache for
 * @returns {void}
 */
export function invalidateMediaCache(projectId) {
  mediaCache.delete(projectId);
}

/**
 * Optimistically update the media cache with newly uploaded files.
 * Used to immediately reflect uploads in the UI without a full refresh.
 * @param {string} projectId - The ID of the project
 * @param {MediaFile[]} newFiles - Array of newly uploaded file objects to add
 * @returns {void}
 */
export function updateMediaCache(projectId, newFiles) {
  const cached = mediaCache.get(projectId);
  if (cached && cached.data) {
    const updatedData = {
      ...cached.data,
      files: [...cached.data.files, ...newFiles],
    };
    mediaCache.set(projectId, {
      data: updatedData,
      timestamp: Date.now(),
      promise: null,
    });
  }
}

/**
 * Upload one or more media files to a project.
 * Supports progress tracking via callback for upload progress UI.
 * @param {string} projectId - The ID of the project to upload to
 * @param {FileList|File[]} files - Files to upload from file input or drag-drop
 * @param {function(number): void} [onProgress] - Progress callback receiving percentage (0-100)
 * @returns {Promise<UploadResult>} Upload result with processed files and any errors
 * @throws {Error} If upload fails due to network error
 */
export async function uploadProjectMedia(projectId, files, onProgress) {
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append("files", file);
  });

  // Get auth token before creating the XHR promise
  let authToken = null;
  if (window.Clerk?.session) {
    authToken = await window.Clerk.session.getToken();
  }

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      try {
        const responseJson = JSON.parse(xhr.responseText);

        // Update the cache with newly uploaded files
        if (responseJson.processedFiles && responseJson.processedFiles.length > 0) {
          updateMediaCache(projectId, responseJson.processedFiles);
        }

        resolve({ ...responseJson, status: xhr.status });
      } catch (parseError) {
        console.error("Failed to parse upload response:", parseError);
        reject({ message: "Failed to parse server response after upload." });
      }
    };

    xhr.onerror = () => {
      reject({ message: "Upload failed due to a network error or server issue." });
    };

    xhr.open("POST", API_URL(`/api/media/projects/${projectId}/media`));
    if (authToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    }
    xhr.send(formData);
  });
}

/**
 * Permanently delete a single media file from a project.
 * Automatically invalidates the media cache.
 * @param {string} projectId - The ID of the project
 * @param {string} fileId - The ID of the file to delete
 * @returns {Promise<{success: boolean, message: string}>} Deletion confirmation
 * @throws {Error} If the file cannot be deleted
 */
export async function deleteProjectMedia(projectId, fileId) {
  try {
    const response = await apiFetch(`/api/media/projects/${projectId}/media/${fileId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete file");
    }

    // Invalidate cache since files changed
    invalidateMediaCache(projectId);

    return await response.json();
  } catch {
    throw new Error("Failed to delete file");
  }
}

/**
 * Delete multiple media files from a project in a single operation.
 * Automatically invalidates the media cache if files were deleted.
 * @param {string} projectId - The ID of the project
 * @param {string[]} fileIds - Array of file IDs to delete
 * @returns {Promise<{success: boolean, deletedCount: number, errors?: string[]}>} Deletion result
 * @throws {Error} If the bulk delete operation fails
 */
export async function deleteMultipleMedia(projectId, fileIds) {
  try {
    const response = await apiFetch(`/api/media/projects/${projectId}/media/bulk-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to delete files");
    }

    // Invalidate cache only if files were actually deleted
    if (data.deletedCount > 0) {
      invalidateMediaCache(projectId);
    }

    return data;
  } catch (error) {
    // Only throw if it's not already a handled error
    if (error.message) {
      throw error;
    }
    throw new Error("Failed to delete files");
  }
}

/**
 * Get usage information for a specific media file.
 * Shows which pages and content blocks reference this file.
 * @param {string} projectId - The ID of the project
 * @param {string} fileId - The ID of the file to check
 * @returns {Promise<{usedIn: Array<{type: string, id: string, title: string}>, usageCount: number}>} Usage details
 * @throws {Error} If the usage check fails
 */
export async function getMediaFileUsage(projectId, fileId) {
  try {
    const response = await apiFetch(`/api/media/projects/${projectId}/media/${fileId}/usage`);
    if (!response.ok) {
      throw new Error("Failed to get media usage");
    }
    return await response.json();
  } catch {
    throw new Error("Failed to get media usage");
  }
}

/**
 * Refresh media usage tracking for a project.
 * Scans all pages and content to rebuild the usage index.
 * @param {string} projectId - The ID of the project to refresh
 * @returns {Promise<{success: boolean, filesUpdated: number}>} Refresh result
 * @throws {Error} If the refresh operation fails
 */
export async function refreshMediaUsage(projectId) {
  try {
    const response = await apiFetch(`/api/media/projects/${projectId}/refresh-usage`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to refresh media usage");
    }
    return await response.json();
  } catch {
    throw new Error("Failed to refresh media usage");
  }
}

/**
 * Generate the URL for accessing a media file.
 * @param {string} projectId - The ID of the project
 * @param {string} fileId - The ID of the file
 * @param {"original"|"thumbnail"} [type="original"] - Which version to get URL for
 * @returns {string} The full URL to access the media file
 */
export function getMediaUrl(projectId, fileId, type = "original") {
  const folder = type === "thumbnail" ? "thumbnails" : "originals";
  return `${API_URL(`/api/media/projects/${projectId}/uploads/${folder}/${fileId}`)}`;
}
