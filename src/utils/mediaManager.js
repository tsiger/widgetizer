import { API_URL } from "../config";

/**
 * Get all media files for a project
 */
export async function getProjectMedia(projectId) {
  try {
    const response = await fetch(API_URL(`/api/media/projects/${projectId}/media`));
    if (!response.ok) {
      throw new Error("Failed to fetch media files");
    }
    return await response.json();
  } catch (error) {
    throw new Error("Failed to get media files");
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

    return await response.json();
  } catch (error) {
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

    if (!response.ok) {
      throw new Error("Failed to delete files");
    }

    return await response.json();
  } catch (error) {
    throw new Error("Failed to delete files");
  }
}

/**
 * Get the URL for a media file
 */
export function getMediaUrl(projectId, fileId, type = "original") {
  const folder = type === "thumbnail" ? "thumbnails" : "originals";
  return `${API_URL(`/api/media/projects/${projectId}/uploads/${folder}/${fileId}`)}`;
}
