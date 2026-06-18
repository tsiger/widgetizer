import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { uploadProjectMedia, getProjectMedia, invalidateMediaCache } from "../../../queries/mediaManager";
import { API_URL } from "../../../lib/config";
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
 * @param {"stacked"|"row"} [layout="stacked"] — `stacked` puts a full-width preview above the controls; `row` renders a
 *   fixed 100×100 thumbnail on the left with the controls in a column beside it (the compact GalleryInput row).
 * @param {boolean} [framed=false] — Wraps a `row` input in the same bordered/bg card gallery rows use. GalleryInput
 *   leaves this off (it supplies its own card around drag + image + trash); a standalone row image turns it on.
 */
export default function ImageInput({ id, value = "", onChange, size = "full", layout = "stacked", framed = false }) {
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
  const isRow = layout === "row";

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

    const limitMB = settings?.media?.maxFileSizeMB ?? 50;
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
      // Drop the shared 30s media cache so the Media page (and other image inputs)
      // re-fetch fresh metadata on their next load instead of serving stale data.
      invalidateMediaCache(activeProject.id);
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

  const rootClassName = isRow
    ? `flex items-start gap-3 w-full${framed ? " rounded-md border border-slate-200 bg-slate-50 p-3" : ""}`
    : isNarrow
      ? "w-full max-w-56"
      : "w-full";
  // In `row` layout the media box is a fixed 100×100 square; otherwise it spans the full width at video aspect.
  const boxSizeClassName = isRow ? "w-[100px] h-[100px] shrink-0" : "w-full aspect-video";
  const mediaClassName = `relative ${boxSizeClassName} bg-slate-100 rounded-sm flex items-center justify-center group overflow-hidden`;
  const emptyStateClassName = `${boxSizeClassName} bg-slate-50 rounded-sm border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center text-slate-500 hover:bg-slate-100 hover:border-slate-400 cursor-pointer transition-colors`;

  const mediaEl =
    value && currentImageFile ? (
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
          className={isRow ? "w-full h-full object-cover" : "max-w-full max-h-full object-contain"}
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
        <UploadCloud size={isRow ? 24 : 32} />
        {isRow ? (
          <p className="mt-1 text-xs font-semibold">
            {uploading ? `${uploadProgress}%` : t("components.mediaSelector.upload")}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm font-semibold">
              {uploading ? `Uploading... ${uploadProgress}%` : t("components.mediaSelector.importNew")}
            </p>
            <p className="text-xs">PNG, JPG, GIF, WEBP, SVG</p>
          </>
        )}
      </div>
    );

  // In the compact gallery row, the dashed box is the primary "Upload" affordance, so the
  // library option is demoted to a quiet inline accent link rather than a competing button.
  const controls = isRow ? (
    <button
      type="button"
      onClick={handleOpenMediaSelector}
      disabled={uploading}
      className="rounded p-5 text-sm font-medium text-pink-600 transition-colors hover:text-pink-700 hover:underline disabled:opacity-50"
    >
      {/* "…or choose from library" only reads right next to the Upload box; once a
          thumbnail replaces it, drop the "…or". */}
      {value && currentImageFile
        ? t("components.mediaSelector.browseLibrary")
        : t("components.mediaSelector.orBrowseLibrary")}
    </button>
  ) : (
    <Button
      onClick={handleOpenMediaSelector}
      disabled={uploading}
      variant="secondary"
      className="w-full settings-action-btn"
      type="button"
    >
      {t("components.mediaSelector.browseLibrary")}
    </Button>
  );

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
      {mediaEl}

      <div
        className={
          isRow ? "flex-1 min-w-0 self-stretch flex flex-col items-center justify-center" : "mt-2 flex flex-col gap-2"
        }
      >
        {controls}
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
