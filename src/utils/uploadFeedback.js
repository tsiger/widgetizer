export function showRejectedFiles(showToast, rejectedFiles, { summaryMessage, summaryLevel = "error", maxDetails = 5 } = {}) {
  if (!Array.isArray(rejectedFiles) || rejectedFiles.length === 0) return;

  const uniqueTimestamp = Date.now();

  if (summaryMessage) {
    showToast(summaryMessage, summaryLevel, {
      duration: 5000,
      id: `upload-summary-${uniqueTimestamp}`,
    });
  }

  rejectedFiles.slice(0, maxDetails).forEach((file, index) => {
    showToast(`${file.originalName}: ${file.reason}`, "error", {
      duration: 7000,
      id: `upload-reject-${uniqueTimestamp}-${index}-${file.originalName}`,
    });
  });

  if (rejectedFiles.length > maxDetails) {
    showToast(`... and ${rejectedFiles.length - maxDetails} more files were rejected.`, "error", {
      duration: 5000,
      id: `upload-reject-overflow-${uniqueTimestamp}`,
    });
  }
}

export function showUploadOutcome(showToast, { processedFiles = [], rejectedFiles = [], message, error } = {}, options = {}) {
  const {
    successMessage,
    partialMessage,
    rejectedMessage,
    networkErrorMessage = "Upload failed.",
    summaryLevel = "warning",
  } = options;

  if (error) {
    showToast(error, "error");
    return;
  }

  if (processedFiles.length > 0 && rejectedFiles.length === 0) {
    showToast(message || successMessage || `Uploaded ${processedFiles.length} file(s) successfully.`, "success");
    return;
  }

  if (processedFiles.length > 0 && rejectedFiles.length > 0) {
    showRejectedFiles(showToast, rejectedFiles, {
      summaryMessage: partialMessage || `Uploaded ${processedFiles.length} file(s). ${rejectedFiles.length} file(s) rejected.`,
      summaryLevel,
    });
    return;
  }

  if (rejectedFiles.length > 0) {
    showRejectedFiles(showToast, rejectedFiles, {
      summaryMessage: rejectedMessage || `Upload failed. ${rejectedFiles.length} file(s) rejected.`,
    });
    return;
  }

  showToast(message || networkErrorMessage, "error");
}
