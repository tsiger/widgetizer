import { useEffect, useState, useCallback } from "react";
import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";
import { UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { getAllThemes, getThemeScreenshotUrl, uploadThemeZip } from "../utils/themeManager";

import useProjectStore from "../stores/projectStore";
import useToastStore from "../stores/toastStore";

// Functional Theme Uploader component using react-dropzone
const ThemeUploader = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ status: "idle", message: "" }); // Add state for upload status
  const showToast = useToastStore((state) => state.showToast);

  // Effect to show toast based on uploadStatus
  useEffect(() => {
    if (uploadStatus.status === "success") {
      showToast(uploadStatus.message || "Theme uploaded successfully!", "success");
      setUploadStatus({ status: "idle", message: "" }); // Reset status
    } else if (uploadStatus.status === "error") {
      showToast(uploadStatus.message || "Failed to upload theme.", "error");
      setUploadStatus({ status: "idle", message: "" }); // Reset status
    }
  }, [uploadStatus, showToast]);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length !== 1) {
        showToast("Please upload a single zip file.", "error");
        return;
      }

      const file = acceptedFiles[0];
      setIsUploading(true);
      setUploadStatus({ status: "uploading", message: "" }); // Set status to uploading

      try {
        const result = await uploadThemeZip(file);
        // Trigger state update first
        if (result.theme) {
          onUploadSuccess(result.theme);
        }
        // Then set status to trigger toast effect
        setUploadStatus({ status: "success", message: result.message });
      } catch (error) {
        console.error("Theme upload error:", error);
        // Set status to trigger error toast effect
        setUploadStatus({ status: "error", message: error.message });
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadSuccess, showToast],
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: { "application/zip": [".zip"] },
    multiple: false,
    disabled: isUploading, // Disable dropzone while uploading
  });

  return (
    <div
      {...getRootProps()}
      className={`mb-6 p-6 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ${isUploading ? "cursor-not-allowed bg-slate-50" : "cursor-pointer hover:border-slate-400"} ${isDragAccept ? "border-green-500 bg-green-50" : "border-slate-300"} ${isDragReject ? "border-red-500 bg-red-50" : "border-slate-300"}`}
    >
      <input {...getInputProps()} />
      <UploadCloud className={`mx-auto h-12 w-12 ${isUploading ? "text-slate-300" : "text-slate-400"}`} />
      <p className={`mt-2 text-sm ${isUploading ? "text-slate-400" : "text-slate-600"}`}>
        {isUploading
          ? "Uploading theme..."
          : isDragActive
            ? "Drop the theme zip file here..."
            : "Drag & drop your theme zip file here, or click to select file"}
      </p>
      <p className={`text-xs ${isUploading ? "text-slate-300" : "text-slate-500"}`}>Max file size: 10MB</p>
    </div>
  );
};

export default function StarterKits() {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get the active project from the store
  const activeProject = useProjectStore((state) => state.activeProject);

  // Define fetchThemes outside useEffect, wrapped in useCallback
  const fetchThemes = useCallback(async () => {
    try {
      setLoading(true);
      const themesData = await getAllThemes();
      setThemes(themesData);
    } catch (error) {
      console.error("Error fetching themes:", error); // Add better error logging
      // TODO: Add toast for fetch error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Call fetchThemes on component mount (initial load)
    fetchThemes();
  }, [fetchThemes]); // Include fetchThemes in dependency array

  // Function to update themes list locally after upload
  const handleUploadSuccess = (newTheme) => {
    setThemes((prevThemes) => [...prevThemes, newTheme]);
  };

  if (loading) {
    return (
      <PageLayout title="Starter kits">
        <LoadingSpinner message="Loading starter kits..." />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Starter kits" description="Manage and customize your starter kits.">
      <ThemeUploader onUploadSuccess={handleUploadSuccess} />

      {themes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => {
            // Check if this theme is the active project's theme
            const isActiveTheme = activeProject && activeProject.theme === theme.id;

            return (
              <div
                key={theme.id}
                className="relative bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                  <img
                    src={getThemeScreenshotUrl(theme.id)}
                    alt={`${theme.name} preview`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-base font-semibold">{theme.name}</h3>
                      <div className="text-xs text-slate-500">Version {theme.version}</div>
                    </div>
                    <Badge variant="neutral">{theme.widgets} widgets</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">By {theme.author || "Unknown"}</span>
                  </div>
                </div>

                {isActiveTheme && (
                  <Badge variant="pink" className="absolute top-2 right-2">
                    Active
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No starter kits available"
          description="Upload a starter kit using the area above to get started"
        />
      )}
    </PageLayout>
  );
}
