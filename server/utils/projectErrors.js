export const PROJECT_ERROR_CODES = {
  PROJECTS_FILE_MISSING: "PROJECTS_FILE_MISSING",
  PROJECTS_FILE_READ_FAILED: "PROJECTS_FILE_READ_FAILED",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  PROJECT_DIR_MISSING: "PROJECT_DIR_MISSING",
};

export function isProjectResolutionError(error) {
  if (!error || !error.code) return false;
  return Object.values(PROJECT_ERROR_CODES).includes(error.code);
}

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
