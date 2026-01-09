import { API_URL } from "../config";

// Per-project cache for media data to prevent redundant API calls
const mediaCache = new Map(); // projectId -> { data, timestamp, promise }
const CACHE_DURATION = 30000; // 30 seconds cache

/**
 * Get all media files for a project (with caching and request deduplication)
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
    } catch {
      // If the cached promise fails, we'll try fetching again below
    }
  }

  // Create a new fetch promise
  const fetchPromise = (async () => {
    try {
      const response = await fetch(API_URL(`/api/media/projects/${projectId}/media`));
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
 * Invalidate the media cache for a project (call after uploads/deletes)
 */
export function invalidateMediaCache(projectId) {
  mediaCache.delete(projectId);
}

/**
 * Update the media cache with new data (optimistic update after uploads)
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
 * Upload media files to a project
 */
export async function uploadProjectMedia(projectId, files, onProgress) {
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append("files", file);
  });

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
    xhr.send(formData);
  });
}

/**
 * Delete a media file from a project
 */
export async function deleteProjectMedia(projectId, fileId) {
  try {
    const response = await fetch(API_URL(`/api/media/projects/${projectId}/media/${fileId}`), {
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
 * Delete multiple media files from a project
 */
export async function deleteMultipleMedia(projectId, fileIds) {
  try {
    const response = await fetch(API_URL(`/api/media/projects/${projectId}/media/bulk-delete`), {
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
 * Get usage information for a media file
 */
export async function getMediaFileUsage(projectId, fileId) {
  try {
    const response = await fetch(API_URL(`/api/media/projects/${projectId}/media/${fileId}/usage`));
    if (!response.ok) {
      throw new Error("Failed to get media usage");
    }
    return await response.json();
  } catch {
    throw new Error("Failed to get media usage");
  }
}

/**
 * Refresh media usage tracking
 */
export async function refreshMediaUsage(projectId) {
  try {
    const response = await fetch(API_URL(`/api/media/projects/${projectId}/refresh-usage`), {
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
 * Get the URL for a media file
 */
export function getMediaUrl(projectId, fileId, type = "original") {
  const folder = type === "thumbnail" ? "thumbnails" : "originals";
  return `${API_URL(`/api/media/projects/${projectId}/uploads/${folder}/${fileId}`)}`;
}
