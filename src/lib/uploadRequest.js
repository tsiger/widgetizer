import { API_URL } from "../config";
import { getActiveProjectId } from "./activeProjectId";

function parseResponseBody(responseText) {
  if (!responseText) return null;

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

function getErrorMessage(data, fallbackMessage) {
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  return fallbackMessage;
}

export function createUploadError(message, status, data) {
  const error = new Error(message);
  error.status = status;
  error.data = data;
  return error;
}

export async function uploadFormData(path, formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const projectId = getActiveProjectId();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      const data = parseResponseBody(xhr.responseText);

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true, status: xhr.status, data });
        return;
      }

      reject(createUploadError(getErrorMessage(data, "Upload failed"), xhr.status, data));
    };

    xhr.onerror = () => {
      reject(createUploadError("Upload failed due to a network error or server issue.", xhr.status || 0, null));
    };

    xhr.open("POST", API_URL(path));

    if (projectId) {
      xhr.setRequestHeader("X-Project-Id", projectId);
    }

    xhr.send(formData);
  });
}
