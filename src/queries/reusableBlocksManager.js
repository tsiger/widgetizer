import { API_URL } from "../config";

const API_BASE = "/api/reusable-blocks";

/**
 * Get all reusable blocks for the active project
 */
export async function getReusableBlocks() {
  const response = await fetch(API_URL(API_BASE));
  if (!response.ok) {
    throw new Error("Failed to fetch reusable blocks");
  }
  return response.json();
}

/**
 * Get a specific reusable block
 */
export async function getReusableBlock(blockId) {
  const response = await fetch(API_URL(`${API_BASE}/${blockId}`));
  if (!response.ok) {
    throw new Error("Failed to fetch reusable block");
  }
  return response.json();
}

/**
 * Create a new reusable block from a widget
 */
export async function createReusableBlock(name, widgetData) {
  const response = await fetch(API_URL(API_BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, widgetData }),
  });
  if (!response.ok) {
    throw new Error("Failed to create reusable block");
  }
  return response.json();
}

/**
 * Update a reusable block
 */
export async function updateReusableBlock(blockId, widgetData, name) {
  const response = await fetch(API_URL(`${API_BASE}/${blockId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widgetData, name }),
  });
  if (!response.ok) {
    throw new Error("Failed to update reusable block");
  }
  return response.json();
}

/**
 * Delete a reusable block
 */
export async function deleteReusableBlock(blockId) {
  const response = await fetch(API_URL(`${API_BASE}/${blockId}`), {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete reusable block");
  }
  return response.json();
}

/**
 * Get usage information for a reusable block
 */
export async function getReusableBlockUsage(blockId) {
  const response = await fetch(API_URL(`${API_BASE}/${blockId}/usage`));
  if (!response.ok) {
    throw new Error("Failed to fetch block usage");
  }
  return response.json();
}

