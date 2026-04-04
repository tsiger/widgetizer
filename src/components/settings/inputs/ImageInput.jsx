import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { uploadProjectMedia, getProjectMedia } from "../../../queries/mediaManager";
import { API_URL } from "../../../config";
import { apiFetch } from "../../../lib/apiFetch";
import useProjectStore from "../../../stores/projectStore";
import useToastStore from "../../../stores/toastStore";
import useAppSettings from "../../../hooks/useAppSettings";
import { X, Edit, UploadCloud } from "lucide-react";
import MediaDrawer from "../../../components/media/MediaDrawer";
import MediaSelectorDrawer from "../../../components/media/MediaSelectorDrawer";
import Button from "../../ui/Button";
import { showRejectedFiles, showUploadOutcome } from "../../../utils/uploadFeedback";
import { IMAGE_ACCEPT, validateFileSizes } from "../../../utils/uploadValidation";

/**
 * @param {"full"|"narrow"} [size="full"] — Constrains overall width: `narrow` caps at 14rem (e.g. favicon in theme settings).
 */
export default function ImageInput({ id, value = "", onChange, size = "full" }) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const activeProject = useProjectStore((state) => state.activeProject);
  const showToast = useToastStore((state) => state.showToast);
  const { settings } = useAppSettings();

  // State for the media drawers
  const [metadataDrawerVisible, setMetadataDrawerVisible] = useState(false);
  const [selectorDrawerVisible, setSelectorDrawerVisible] = useState(false);
  const [currentImageFile, setCurrentImageFile] = useState(null);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  const isNarrow = size === "narrow";

  // Get the current image metadata when value changes
  useEffect(() => {
    if (value && activeProject) {
      const filename = value.split("/").pop();
      const fetchImageData = async () => {
        try {
          const mediaData = await getProjectMedia(activeProject.id);
          const imageFile = mediaData.files.find((file) => file.path.includes(filename));
          setCurrentImageFile(imageFile || null);
        } catch (error) {
          console.error("Error fetching image metadata:", error);
          setCurrentImageFile(null);
        }
      };
      fetchImageData();
    } else {
      setCurrentImageFile(null);
    }
  }, [value, activeProject]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !activeProject) return;

    const limitMB = settings?.media?.maxFileSizeMB ?? 5;
    const { valid, rejected } = validateFileSizes([file], { maxSizeMB: limitMB });
    if (rejected.length > 0) {
      showRejectedFiles(showToast, rejected);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadProjectMedia(activeProject.id, valid, (progress) => {
        setUploadProgress(progress);
      });
      const { processedFiles, rejectedFiles, error } = result;

      if (processedFiles?.length > 0) {
        onChange(processedFiles[0].path);
      }

      showUploadOutcome(
        showToast,
        {
          processedFiles,
          rejectedFiles,
          error,
        },
        {
          successMessage: "Image uploaded successfully.",
          networkErrorMessage: "Upload failed.",
        },
      );
    } catch (err) {
      showRejectedFiles(showToast, [{ originalName: file.name, reason: err?.message || "Upload failed." }]);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => onChange("");
  const handleEditMetadata = () => setMetadataDrawerVisible(true);
  const handleOpenMediaSelector = () => setSelectorDrawerVisible(true);

  const handleSaveMetadata = async (fileId, metadata) => {
    setIsSavingMetadata(true);
    try {
      const response = await apiFetch(`/api/media/projects/${activeProject.id}/media/${fileId}/metadata`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) throw new Error("Failed to update metadata");

      const updatedFileData = await response.json();
      setCurrentImageFile((prev) => ({ ...prev, metadata: updatedFileData.file.metadata }));
      setMetadataDrawerVisible(false);
      showToast("Metadata updated.", "success");
    } catch (err) {
      showToast(err.message || "Failed to save metadata", "error");
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleSelectMedia = (selectedFile) => {
    if (selectedFile && selectedFile.type && selectedFile.type.startsWith("image/")) {
      onChange(selectedFile.path);
      setSelectorDrawerVisible(false);
    } else {
      showToast("Please select an image file.", "error");
    }
  };

  const rootClassName = isNarrow ? "w-full max-w-56" : "w-full";
  const mediaClassName =
    "relative w-full aspect-video bg-slate-100 rounded-sm flex items-center justify-center group overflow-hidden";
  const emptyStateClassName =
    "w-full aspect-video bg-slate-50 rounded-sm border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-400 cursor-pointer transition-colors";

  return (
    <div className={rootClassName}>
      <input
        ref={fileInputRef}
        type="file"
        id={id}
        accept={Object.values(IMAGE_ACCEPT).flat().join(",")}
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      {value && currentImageFile ? (
        <div
          className={`${mediaClassName} cursor-pointer`}
          onClick={handleOpenMediaSelector}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleOpenMediaSelector();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <img
            src={API_URL(`/api/media/projects/${activeProject.id}${currentImageFile.path}`)}
            alt={currentImageFile.metadata?.alt || "Preview"}
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="icon"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                handleEditMetadata();
              }}
              title="Edit metadata"
            >
              <Edit size={16} />
            </Button>
            <Button
              variant="icon"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                handleRemove();
              }}
              title="Remove image"
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <div onClick={() => !uploading && fileInputRef.current?.click()} className={emptyStateClassName}>
          <UploadCloud size={32} />
          <p className="mt-2 text-sm font-semibold">
            {uploading ? `Uploading... ${uploadProgress}%` : t("components.mediaSelector.importNew")}
          </p>
          <p className="text-xs">PNG, JPG, GIF, WEBP, SVG</p>
        </div>
      )}

      <div className="mt-2 flex flex-col gap-2">
        <Button
          onClick={handleOpenMediaSelector}
          disabled={uploading}
          variant="secondary"
          className="w-full"
          type="button"
        >
          {t("components.mediaSelector.browseLibrary")}
        </Button>
      </div>

      {metadataDrawerVisible && currentImageFile && (
        <MediaDrawer
          visible={metadataDrawerVisible}
          onClose={() => setMetadataDrawerVisible(false)}
          selectedFile={currentImageFile}
          onSave={handleSaveMetadata}
          loading={isSavingMetadata}
          activeProject={activeProject}
        />
      )}

      {selectorDrawerVisible && (
        <MediaSelectorDrawer
          visible={selectorDrawerVisible}
          onClose={() => setSelectorDrawerVisible(false)}
          onSelect={handleSelectMedia}
          activeProject={activeProject}
          filterType="image" // Filter to only show images
        />
      )}
    </div>
  );
}
