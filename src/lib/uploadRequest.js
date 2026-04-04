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

export async function uploadFormData(path, formData, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const projectId = getActiveProjectId();
    let settled = false;

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener("abort", handleAbort);
      }
    };

    const rejectOnce = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const resolveOnce = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const handleAbort = () => {
      xhr.abort();
    };

    if (signal?.aborted) {
      rejectOnce(Object.assign(createUploadError("Upload canceled.", 0, null), { name: "AbortError", aborted: true }));
      return;
    }

    if (signal) {
      signal.addEventListener("abort", handleAbort);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      const data = parseResponseBody(xhr.responseText);

      if (xhr.status >= 200 && xhr.status < 300) {
        resolveOnce({ ok: true, status: xhr.status, data });
        return;
      }

      rejectOnce(createUploadError(getErrorMessage(data, "Upload failed"), xhr.status, data));
    };

    xhr.onerror = () => {
      rejectOnce(createUploadError("Upload failed due to a network error or server issue.", xhr.status || 0, null));
    };

    xhr.onabort = () => {
      rejectOnce(Object.assign(createUploadError("Upload canceled.", xhr.status || 0, null), { name: "AbortError", aborted: true }));
    };

    xhr.open("POST", API_URL(path));

    if (projectId) {
      xhr.setRequestHeader("X-Project-Id", projectId);
    }

    xhr.send(formData);
  });
}
