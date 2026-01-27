export const PROJECT_ERROR_CODES = {
  PROJECTS_FILE_MISSING: "PROJECTS_FILE_MISSING",
  PROJECTS_FILE_READ_FAILED: "PROJECTS_FILE_READ_FAILED",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  PROJECT_DIR_MISSING: "PROJECT_DIR_MISSING",
};

/**
 * Check if an error is a project resolution error.
 * Used to determine if an error should be handled specially (e.g., return 404).
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error has a recognized project resolution error code
 */
export function isProjectResolutionError(error) {
  if (!error || !error.code) return false;
  return Object.values(PROJECT_ERROR_CODES).includes(error.code);
}

/**
 * Handle a project resolution error by sending an appropriate HTTP response.
 * Returns 404 for not found errors, 500 for other resolution failures.
 * @param {object} res - Express response object
 * @param {Error} error - The error to handle
 * @returns {boolean} True if the error was handled, false if not a project resolution error
 */
export function handleProjectResolutionError(res, error) {
  if (!isProjectResolutionError(error)) return false;

  if (
    error.code === PROJECT_ERROR_CODES.PROJECT_NOT_FOUND ||
    error.code === PROJECT_ERROR_CODES.PROJECT_DIR_MISSING
  ) {
    res.status(404).json({
      error: "Project not found",
      message: error.message,
    });
    return true;
  }

  res.status(500).json({
    error: "Failed to resolve project folder",
    message: error.message,
  });
  return true;
}
