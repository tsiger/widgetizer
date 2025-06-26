import { useState } from "react";
import DOMPurify from "dompurify";
import { uploadProjectMedia } from "../utils/mediaManager";

const CHUNK_SIZE = 5; // Process 5 files at a time

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

  const uploadChunk = async (filesChunk) => {
    return new Promise((resolve) => {
      uploadProjectMedia(activeProject.id, filesChunk, (progress) => {
        filesChunk.forEach((file) => {
          setUploadProgress((prev) => ({ ...prev, [file.name]: progress }));
        });
      })
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          resolve({
            processedFiles: [],
            rejectedFiles: filesChunk.map((file) => ({
              originalName: file.name,
              reason: error?.message || "Upload failed due to network error",
            })),
          });
        });
    });
  };

  const handleUpload = async (acceptedFiles) => {
    if (!activeProject) {
      showToast("No active project selected. Please select a project first.", "error");
      return;
    }

    setUploading(true);
    const filesToUpload = await sanitizeFiles(acceptedFiles);

    // Initialize progress for all files
    filesToUpload.forEach((file) => {
      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
    });

    try {
      const allProcessedFiles = [];
      const allRejectedFiles = [];

      // Split files into chunks
      const chunks = [];
      for (let i = 0; i < filesToUpload.length; i += CHUNK_SIZE) {
        chunks.push(filesToUpload.slice(i, i + CHUNK_SIZE));
      }

      // Process chunks sequentially to avoid overwhelming the server
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkIndex = i + 1;
        const totalChunks = chunks.length;

        // Show progress for multi-chunk uploads
        if (totalChunks > 1) {
          showToast(`Processing batch ${chunkIndex} of ${totalChunks} (${chunk.length} files)...`, "info", {
            id: `chunk-progress-${chunkIndex}`,
            duration: 2000,
          });
        }

        const result = await uploadChunk(chunk);

        const processed = result.processedFiles || [];
        const rejected = result.rejectedFiles || [];

        allProcessedFiles.push(...processed);
        allRejectedFiles.push(...rejected);

        // Mark completed files as 100%
        chunk.forEach((file) => {
          setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        });
      }

      console.log("Upload Result:", { processedFiles: allProcessedFiles, rejectedFiles: allRejectedFiles });

      // Update state ONLY with successfully processed files from all batches
      if (allProcessedFiles.length > 0) {
        const newFilesWithMetadata = allProcessedFiles.map((file) => ({
          ...file,
          metadata: file.metadata || { alt: "", title: "" },
        }));
        setFiles((prevFiles) => [...prevFiles, ...newFilesWithMetadata]);
      }

      // Handle toast notifications with proper unique IDs
      handleUploadToasts(allProcessedFiles, allRejectedFiles, chunks.length > 1);
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

  const handleUploadToasts = (processed, rejected, wasChunked) => {
    const uniqueTimestamp = Date.now();
    const chunkInfo = wasChunked ? " (processed in batches)" : "";

    if (processed.length > 0 && rejected.length === 0) {
      // All successful
      showToast(`Successfully uploaded ${processed.length} file(s)${chunkInfo}.`, "success", {
        id: `success-${uniqueTimestamp}-${Math.random().toString(36).substring(2, 9)}`,
      });
    } else if (processed.length > 0 && rejected.length > 0) {
      // Partial success - Summary Toast
      showToast(`Uploaded ${processed.length} file(s). ${rejected.length} file(s) rejected${chunkInfo}.`, "warning", {
        duration: 5000,
        id: `summary-partial-${uniqueTimestamp}`,
      });
      // Individual Rejection Toasts (limit to first 5 to avoid spam)
      rejected.slice(0, 5).forEach((rf, index) =>
        showToast(`${rf.originalName}: ${rf.reason}`, "error", {
          duration: 7000,
          id: `reject-${uniqueTimestamp}-${index}-${rf.originalName}`,
        }),
      );
      if (rejected.length > 5) {
        showToast(`... and ${rejected.length - 5} more files were rejected.`, "error", {
          duration: 5000,
          id: `reject-overflow-${uniqueTimestamp}`,
        });
      }
      console.warn("Rejected files details:", rejected);
    } else if (processed.length === 0 && rejected.length > 0) {
      // All rejected - Summary Toast
      showToast(`Upload failed. ${rejected.length} file(s) rejected${chunkInfo}.`, "error", {
        duration: 5000,
        id: `summary-rejected-${uniqueTimestamp}`,
      });
      // Individual Rejection Toasts (limit to first 5)
      rejected.slice(0, 5).forEach((rf, index) =>
        showToast(`${rf.originalName}: ${rf.reason}`, "error", {
          duration: 7000,
          id: `reject-${uniqueTimestamp}-${index}-${rf.originalName}`,
        }),
      );
      if (rejected.length > 5) {
        showToast(`... and ${rejected.length - 5} more files were rejected.`, "error", {
          duration: 5000,
          id: `reject-overflow-${uniqueTimestamp}`,
        });
      }
      console.error("Rejected files details:", rejected);
    }
  };

  return {
    uploading,
    uploadProgress,
    handleUpload,
  };
}
