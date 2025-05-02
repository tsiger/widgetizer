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
  } catch (error) {
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
  } catch (error) {
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
      throw new Error("Failed to create project");
    }

    return await response.json();
  } catch (error) {
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
  } catch (error) {
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
      throw new Error("Failed to update project");
    }
    return await response.json();
  } catch (error) {
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
  } catch (error) {
    throw new Error("Failed to delete project");
  }
}
