import { API_URL } from "../config";

/**
 * Get all projects
 */
export async function getAllProjects() {
  try {
    const response = await fetch(API_URL("/api/projects"));
    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }
    return await response.json();
  } catch {
    throw new Error("Failed to get projects");
  }
}

/**
 * Get the active project
 */
export async function getActiveProject() {
  try {
    const response = await fetch(API_URL("/api/projects/active"));
    if (!response.ok) {
      throw new Error("Failed to fetch active project");
    }
    return await response.json();
  } catch {
    throw new Error("Failed to get active project");
  }
}

/**
 * Create a new project
 */
export async function createProject(projectData) {
  try {
    const response = await fetch(API_URL("/api/projects"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create project");
    }

    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error; // Re-throw with original message if it's our custom error
    }
    throw new Error("Failed to create project");
  }
}

/**
 * Set the active project
 */
export async function setActiveProject(projectId) {
  try {
    const response = await fetch(API_URL(`/api/projects/active/${projectId}`), {
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error("Failed to set active project");
    }
    const result = await response.json();
    return result;
  } catch {
    throw new Error("Failed to set active project");
  }
}

/**
 * Update a project
 */
export async function updateProject(projectId, updates) {
  try {
    const response = await fetch(API_URL(`/api/projects/${projectId}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update project");
    }

    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error; // Re-throw with original message if it's our custom error
    }
    throw new Error("Failed to update project");
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId) {
  try {
    const response = await fetch(API_URL(`/api/projects/${projectId}`), {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete project");
    }
    return await response.json();
  } catch {
    throw new Error("Failed to delete project");
  }
}

/**
 * Duplicate a project
 */
export async function duplicateProject(projectId) {
  try {
    const response = await fetch(API_URL(`/api/projects/${projectId}/duplicate`), {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to duplicate project");
    }

    return await response.json();
  } catch (error) {
    console.error("Error duplicating project:", error);
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error; // Re-throw with original message if it's our custom error
    }
    throw new Error("Failed to duplicate project");
  }
}

/**
 * Export project as ZIP
 */
export async function exportProject(projectId) {
  try {
    const response = await fetch(API_URL(`/api/projects/${projectId}/export`), {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to export project");
    }

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "project-export.zip";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error;
    }
    throw new Error("Failed to export project");
  }
}

/**
 * Import project from ZIP file
 */
export async function importProject(file) {
  try {
    const formData = new FormData();
    formData.append("projectZip", file);

    const response = await fetch(API_URL("/api/projects/import"), {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to import project");
    }

    return await response.json();
  } catch (error) {
    if (error.message && !error.message.includes("Failed to fetch")) {
      throw error;
    }
    throw new Error("Failed to import project");
  }
}
