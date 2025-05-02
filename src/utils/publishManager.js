import { API_URL } from "../config";

/**
 * Calls the backend API to trigger the publishing process for a project.
 */
export async function publishProjectAPI(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required to publish.");
  }

  const response = await fetch(API_URL(`/api/publish/${projectId}`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Add any other necessary headers like authorization if needed
    },
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMessage = result?.message || `HTTP error! status: ${response.status}`;
    console.error("Publish API Error:", result);
    throw new Error(errorMessage);
  }

  return result; // Should contain { success: true, message: "...", outputDir: "..." }
}
