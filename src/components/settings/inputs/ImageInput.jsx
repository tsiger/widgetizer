import { useState, useRef, useEffect } from "react";
import { uploadProjectMedia, getProjectMedia } from "../../../utils/mediaManager";
import { API_URL } from "../../../config";
import SettingsField from "../SettingsField";
import useProjectStore from "../../../stores/projectStore";
import useToastStore from "../../../stores/toastStore";
import { X, Edit } from "lucide-react";
import MediaDrawer from "../../../components/media/MediaDrawer";
import MediaSelectorDrawer from "../../../components/media/MediaSelectorDrawer";

export default function ImageInput({ id, label, value = "", onChange, description, error }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const activeProject = useProjectStore((state) => state.activeProject);
  const activePage = useProjectStore((state) => state.activePage);
  const showToast = useToastStore((state) => state.showToast);

  // State for the media drawers
  const [metadataDrawerVisible, setMetadataDrawerVisible] = useState(false);
  const [selectorDrawerVisible, setSelectorDrawerVisible] = useState(false);
  const [currentImageFile, setCurrentImageFile] = useState(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  // Track previous value for usage tracking (if enabled later)
  const prevValueRef = useRef(value);

  // Get the current image metadata when value changes
  useEffect(() => {
    if (value && activeProject) {
      // Extract the image filename from the path
      const filename = value.split("/").pop();

      // Fetch metadata for this image if needed
      const fetchImageData = async () => {
        try {
          const mediaData = await getProjectMedia(activeProject.id);
          const imageFile = mediaData.files.find((file) => file.path.includes(filename));
          if (imageFile) {
            setCurrentImageFile(imageFile);
          }
        } catch (error) {
          console.error("Error fetching image metadata:", error);
        }
      };

      fetchImageData();
    } else {
      setCurrentImageFile(null);
    }
    prevValueRef.current = value; // Update previous value ref
  }, [value, activeProject]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!activeProject) {
      showToast("No active project selected.", "error");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadProjectMedia(activeProject.id, [file]);

      const processed = result.processedFiles || [];
      const rejected = result.rejectedFiles || [];

      console.log("ImageInput Upload Result:", result);

      if (processed.length > 0) {
        const uploadedFile = processed[0];
        onChange(uploadedFile.path);
        setCurrentImageFile(uploadedFile);
        showToast("Image uploaded successfully.", "success");
      } else if (rejected.length > 0) {
        const rejectionReason = rejected[0].reason || "Image rejected by server.";
        showToast(rejectionReason, "error");
        console.error("Rejected file:", rejected[0]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else if (result.status >= 400 && result.error) {
        showToast(result.error, "error");
        console.error("Upload Error from Backend:", result);
      } else if (result.status >= 400) {
        showToast("Upload failed with an unknown server error.", "error");
        console.error("Unknown Upload Error:", result);
      } else {
        showToast("Upload failed unexpectedly.", "error");
        console.error("Unexpected Upload Result structure:", result);
      }
    } catch (error) {
      showToast(error?.message || "Upload failed due to a network or client error.", "error");
      console.error("Upload Client/Network Error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange("");
    setCurrentImageFile(null);
  };

  const handleEditMetadata = () => {
    if (currentImageFile) {
      setMetadataDrawerVisible(true);
    }
  };

  const handleCloseMetadataDrawer = () => {
    setMetadataDrawerVisible(false);
  };

  const handleSaveMetadata = async (fileId, metadata) => {
    setIsSavingMetadata(true);
    try {
      const response = await fetch(API_URL(`/api/media/projects/${activeProject.id}/media/${fileId}/metadata`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        throw new Error("Failed to update metadata");
      }

      const updatedFileData = await response.json();
      setCurrentImageFile((prev) => ({
        ...prev,
        metadata: updatedFileData.file.metadata,
      }));

      setMetadataDrawerVisible(false);
      showToast("Metadata updated.", "success");
    } catch (error) {
      console.error("Error updating metadata:", error);
      showToast(error.message || "Failed to save metadata", "error");
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleOpenMediaSelector = () => {
    setSelectorDrawerVisible(true);
  };

  const handleCloseMediaSelector = () => {
    setSelectorDrawerVisible(false);
  };

  const handleSelectMedia = (selectedFile) => {
    if (selectedFile) {
      onChange(selectedFile.path);
      setCurrentImageFile(selectedFile);
      setSelectorDrawerVisible(false);
    }
  };

  return (
    <SettingsField id={id} label={label} description={description} error={error}>
      <div className="space-y-2">
        {value && currentImageFile && (
          <div className="relative w-full h-32 bg-slate-100 rounded flex items-center justify-center group">
            <img
              src={API_URL(`/api/media/projects/${activeProject.id}${currentImageFile.path}`)}
              alt={currentImageFile.metadata?.alt || ""}
              className="max-w-full max-h-full object-contain"
            />
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleEditMetadata}
                className="p-1 bg-white rounded-full shadow hover:bg-blue-50"
                title="Edit image metadata"
                disabled={!currentImageFile}
              >
                <Edit size={16} className="text-blue-500" />
              </button>
              <button
                onClick={handleRemove}
                className="p-1 bg-white rounded-full shadow hover:bg-red-50"
                title="Remove image"
              >
                <X size={16} className="text-red-500" />
              </button>
            </div>
          </div>
        )}
        {value && !currentImageFile && !uploading && (
          <div className="w-full h-32 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">
            Loading image data...
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          id={id}
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />

        <div className="flex space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-sm text-sm hover:bg-slate-50"
          >
            {uploading ? "Uploading..." : value ? "Replace Image" : "Upload Image"}
          </button>

          <button
            onClick={handleOpenMediaSelector}
            disabled={uploading}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-sm text-sm hover:bg-slate-50"
          >
            Browse Media
          </button>
        </div>
      </div>

      {metadataDrawerVisible && currentImageFile && (
        <MediaDrawer
          visible={metadataDrawerVisible}
          onClose={handleCloseMetadataDrawer}
          selectedFile={currentImageFile}
          onSave={handleSaveMetadata}
          loading={isSavingMetadata}
          activeProject={activeProject}
        />
      )}

      {selectorDrawerVisible && (
        <MediaSelectorDrawer
          visible={selectorDrawerVisible}
          onClose={handleCloseMediaSelector}
          onSelect={handleSelectMedia}
          activeProject={activeProject}
        />
      )}
    </SettingsField>
  );
}
