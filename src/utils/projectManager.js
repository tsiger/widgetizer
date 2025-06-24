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
