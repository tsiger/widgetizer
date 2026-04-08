import { API_URL } from "../config";
import { getActiveProjectId } from "./activeProjectId";

export class ApiError extends Error {
  constructor(message, { status = 0, statusText = "", code, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.code = code;
    this.data = data ?? null;
    this.response = {
      status,
      data: this.data,
    };
  }
}

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

export function isApiError(error) {
  return error instanceof ApiError || error?.name === "ApiError";
}

export function rethrowQueryError(error, fallbackMessage) {
  if (isApiError(error)) {
    throw error;
  }

  throw new Error(fallbackMessage);
}

async function readResponseBody(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data, fallbackMessage) {
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((entry) => entry?.msg || entry?.message || fallbackMessage).join("; ");
  }

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data?.message) {
    return data.message;
  }

  if (data?.error) {
    return data.error;
  }

  return fallbackMessage;
}

export async function throwApiError(response, fallbackMessage = "Request failed") {
  const data = await readResponseBody(response);
  throw new ApiError(getErrorMessage(data, fallbackMessage), {
    status: response.status,
    statusText: response.statusText,
    code: data?.code,
    data,
  });
}

export async function parseJsonResponse(response, { fallbackMessage = "Request failed", emptyValue = null } = {}) {
  if (!response.ok) {
    await throwApiError(response, fallbackMessage);
  }

  const data = await readResponseBody(response);
  return data ?? emptyValue;
}

export async function apiFetchJson(path, options = {}, config = {}) {
  const response = await apiFetch(path, options);
  return parseJsonResponse(response, config);
}
