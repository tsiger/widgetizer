import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config", () => ({
  API_URL: vi.fn((path) => `http://api.test${path}`),
}));

vi.mock("../activeProjectId", () => ({
  getActiveProjectId: vi.fn(() => "project-123"),
}));

const xhrInstances = [];

class MockXMLHttpRequest {
  constructor() {
    this.upload = {};
    this.headers = {};
    this.status = 0;
    this.responseText = "";
    xhrInstances.push(this);
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key, value) {
    this.headers[key] = value;
  }

  send(body) {
    this.body = body;
  }
}

describe("uploadFormData", () => {
  beforeEach(() => {
    xhrInstances.length = 0;
    global.XMLHttpRequest = MockXMLHttpRequest;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete global.XMLHttpRequest;
  });

  it("uploads form data, reports progress, and resolves parsed JSON", async () => {
    const { uploadFormData } = await import("../uploadRequest");
    const onProgress = vi.fn();
    const formData = { marker: "form-data" };

    const promise = uploadFormData("/api/themes/upload", formData, { onProgress });
    const xhr = xhrInstances[0];

    xhr.upload.onprogress({ lengthComputable: true, loaded: 25, total: 100 });
    xhr.status = 201;
    xhr.responseText = JSON.stringify({ message: "Uploaded", theme: { id: "arch" } });
    xhr.onload();

    await expect(promise).resolves.toEqual({
      ok: true,
      status: 201,
      data: { message: "Uploaded", theme: { id: "arch" } },
    });

    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("http://api.test/api/themes/upload");
    expect(xhr.headers["X-Project-Id"]).toBe("project-123");
    expect(xhr.body).toBe(formData);
    expect(onProgress).toHaveBeenCalledWith(25);
  });

  it("rejects with a normalized error from a JSON message payload", async () => {
    const { uploadFormData } = await import("../uploadRequest");

    const promise = uploadFormData("/api/projects/import", {});
    const xhr = xhrInstances[0];

    xhr.status = 400;
    xhr.responseText = JSON.stringify({ error: "Invalid project export" });
    xhr.onload();

    await expect(promise).rejects.toMatchObject({
      message: "Invalid project export",
      status: 400,
      data: { error: "Invalid project export" },
    });
  });

  it("rejects with a network error when the request fails to connect", async () => {
    const { uploadFormData } = await import("../uploadRequest");

    const promise = uploadFormData("/api/media/projects/test/media", {});
    const xhr = xhrInstances[0];

    xhr.onerror();

    await expect(promise).rejects.toMatchObject({
      message: "Upload failed due to a network error or server issue.",
      status: 0,
      data: null,
    });
  });
});
