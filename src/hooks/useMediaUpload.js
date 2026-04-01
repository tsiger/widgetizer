import { useState } from "react";
import DOMPurify from "dompurify";
import { uploadProjectMedia } from "../queries/mediaManager";
import useAppSettings from "./useAppSettings";
import { validateFileSizes } from "../utils/mediaValidation";
import { showUploadOutcome } from "../utils/uploadFeedback";

const CHUNK_SIZE = 5; // Process 5 files at a time

/**
 * Hook for managing media file uploads with chunked processing, progress tracking, and SVG sanitization.
 * Handles uploading multiple files in batches to avoid server overload.
 *
 * @param {Object} params - Hook parameters
 * @param {Object} params.activeProject - The currently active project to upload files to
 * @param {Function} params.showToast - Function to display toast notifications
 * @param {Function} params.setFiles - State setter to add uploaded files to the media list
 * @returns {{
 *   uploading: boolean,
 *   uploadProgress: Object<string, number>,
 *   handleUpload: (acceptedFiles: Array<File>) => Promise<void>
 * }} Upload state and handler
 * @property {boolean} uploading - Whether an upload is in progress
 * @property {Object<string, number>} uploadProgress - Map of filename to upload progress percentage (0-100)
 * @property {Function} handleUpload - Process and upload an array of files
 */
export default function useMediaUpload({ activeProject, showToast, setFiles }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const { settings } = useAppSettings();

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

    // Client-side size validation — rejects files before any network request
    let filesToProcess = acceptedFiles;
    const preRejected = [];
    if (settings?.media) {
      const { valid, rejected } = validateFileSizes(acceptedFiles, {
        maxImageMB: settings.media.maxFileSizeMB,
      });
      filesToProcess = valid;
      preRejected.push(...rejected);
    }

    const filesToUpload = await sanitizeFiles(filesToProcess);

    // Initialize progress for all files
    filesToUpload.forEach((file) => {
      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
    });

    try {
      const allProcessedFiles = [];
      const allRejectedFiles = [...preRejected];

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

        const processedNames = new Set(processed.map((file) => file.originalName));
        const rejectedNames = new Set(rejected.map((file) => file.originalName));

        setUploadProgress((prev) => {
          const next = { ...prev };

          chunk.forEach((file) => {
            if (processedNames.has(file.name)) {
              next[file.name] = 100;
            } else if (rejectedNames.has(file.name)) {
              delete next[file.name];
            }
          });

          return next;
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

      const chunkInfo = chunks.length > 1 ? " (processed in batches)" : "";
      showUploadOutcome(
        showToast,
        {
          processedFiles: allProcessedFiles,
          rejectedFiles: allRejectedFiles,
        },
        {
          successMessage: `Successfully uploaded ${allProcessedFiles.length} file(s)${chunkInfo}.`,
          partialMessage: `Uploaded ${allProcessedFiles.length} file(s). ${allRejectedFiles.length} file(s) rejected${chunkInfo}.`,
          rejectedMessage: `Upload failed. ${allRejectedFiles.length} file(s) rejected${chunkInfo}.`,
          networkErrorMessage: "Failed to upload files due to a network or client error.",
        },
      );
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

  return {
    uploading,
    uploadProgress,
    handleUpload,
  };
}
