import { useState } from "react";
import DOMPurify from "dompurify";
import { uploadProjectMedia } from "../utils/mediaManager";

export default function useMediaUpload({ activeProject, showToast, setFiles }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const sanitizeFiles = async (files) => {
    const sanitizedFiles = await Promise.all(
      files.map(async (file) => {
        if (file.type === "image/svg+xml") {
          try {
            const fileText = await file.text();
            const sanitizedSvg = DOMPurify.sanitize(fileText, { USE_PROFILES: { svg: true } });
            return new File([sanitizedSvg], file.name, { type: file.type });
          } catch (error) {
            console.error("Could not sanitize SVG:", error);
            // Return original file if sanitization fails
            return file;
          }
        }
        return file;
      }),
    );
    return sanitizedFiles;
  };

  const handleUpload = async (acceptedFiles) => {
    if (!activeProject) {
      showToast("No active project selected. Please select a project first.", "error");
      return;
    }

    setUploading(true);
    const filesToUpload = await sanitizeFiles(acceptedFiles);

    filesToUpload.forEach((file) => {
      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
    });

    try {
      const result = await uploadProjectMedia(activeProject.id, filesToUpload, (progress) => {
        filesToUpload.forEach((file) => {
          setUploadProgress((prev) => ({ ...prev, [file.name]: progress }));
        });
      });

      const processed = result.processedFiles || [];
      const rejected = result.rejectedFiles || [];

      console.log("Upload Result:", result);
      console.log("Processed Files:", processed);
      console.log("Rejected Files:", rejected);

      // Update state ONLY with successfully processed files from this batch
      if (processed.length > 0) {
        const newFilesWithMetadata = processed.map((file) => ({
          ...file,
          metadata: file.metadata || { alt: "", title: "" },
        }));
        setFiles((prevFiles) => [...prevFiles, ...newFilesWithMetadata]);
      }

      // Handle toast notifications with proper unique IDs
      handleUploadToasts(processed, rejected);
    } catch (error) {
      // Catch network errors or errors from mediaManager itself
      const uniqueTimestamp = Date.now();
      showToast(error?.message || "Failed to upload files due to a network or client error.", "error", {
        id: `error-client-${uniqueTimestamp}-${Math.random().toString(36).substring(2, 9)}`,
      });
      console.error("Upload Client/Network Error:", error);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const handleUploadToasts = (processed, rejected) => {
    const uniqueTimestamp = Date.now();

    if (processed.length > 0 && rejected.length === 0) {
      // All successful
      showToast(`Successfully uploaded ${processed.length} file(s).`, "success", {
        id: `success-${uniqueTimestamp}-${Math.random().toString(36).substring(2, 9)}`,
      });
    } else if (processed.length > 0 && rejected.length > 0) {
      // Partial success - Summary Toast
      showToast(`Uploaded ${processed.length} file(s). ${rejected.length} file(s) rejected.`, "warning", {
        duration: 5000,
        id: `summary-partial-${uniqueTimestamp}`,
      });
      // Individual Rejection Toasts
      rejected.forEach((rf, index) =>
        showToast(`${rf.originalName}: ${rf.reason}`, "error", {
          duration: 7000,
          id: `reject-${uniqueTimestamp}-${index}-${rf.originalName}`,
        }),
      );
      console.warn("Rejected files details:", rejected);
    } else if (processed.length === 0 && rejected.length > 0) {
      // All rejected - Summary Toast
      showToast(`Upload failed. ${rejected.length} file(s) rejected.`, "error", {
        duration: 5000,
        id: `summary-rejected-${uniqueTimestamp}`,
      });
      // Individual Rejection Toasts
      rejected.forEach((rf, index) =>
        showToast(`${rf.originalName}: ${rf.reason}`, "error", {
          duration: 7000,
          id: `reject-${uniqueTimestamp}-${index}-${rf.originalName}`,
        }),
      );
      console.error("Rejected files details:", rejected);
    }
  };

  return {
    uploading,
    uploadProgress,
    handleUpload,
  };
}
