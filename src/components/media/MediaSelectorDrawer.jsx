import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, Search, FileText } from "lucide-react";
import { API_URL } from "../../config";
import { getProjectMedia } from "../../queries/mediaManager";
import LoadingSpinner from "../ui/LoadingSpinner";
import FileUploader from "../ui/FileUploader";
import Tooltip from "../ui/Tooltip";
import useMediaUpload from "../../hooks/useMediaUpload";
import useAppSettings from "../../hooks/useAppSettings";
import useToastStore from "../../stores/toastStore";
import { showRejectedFiles } from "../../utils/uploadFeedback";
import { IMAGE_ACCEPT, FILE_ACCEPT, mapDropzoneRejections } from "../../utils/uploadValidation";

export default function MediaSelectorDrawer({ visible, onClose, onSelect, activeProject, filterType = "all" }) {
  const { t } = useTranslation();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const showToast = useToastStore((state) => state.showToast);
  const { settings } = useAppSettings();
  const maxSizeMB = settings?.media?.maxFileSizeMB ?? 5;

  // Initialize media upload hook
  const { uploading, uploadProgress, handleUpload } = useMediaUpload({
    activeProject,
    showToast,
    setFiles: setMediaFiles,
  });

  const loadMediaFiles = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);

    try {
      const data = await getProjectMedia(activeProject.id);
      setMediaFiles(data.files || []);
    } catch (error) {
      console.error("Failed to load media files:", error);
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  // Load media files when drawer is opened
  useEffect(() => {
    if (visible && activeProject) {
      loadMediaFiles();
    }
  }, [visible, activeProject, loadMediaFiles]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    // Cleanup function to restore scroll on component unmount
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [visible]);

  // Filter files based on search term and type
  const filteredFiles = mediaFiles
    .filter((file) => {
      const normalizedSearch = searchTerm.toLowerCase();
      const displayName = (file.filename || file.originalName || "").toLowerCase();
      const originalName = (file.originalName || "").toLowerCase();
      const matchesSearch = displayName.includes(normalizedSearch) || originalName.includes(normalizedSearch);

      if (filterType === "image") {
        return matchesSearch && file.type && file.type.startsWith("image/");
      }
      if (filterType === "file") {
        return matchesSearch && file.type && !file.type.startsWith("image/");
      }

      return matchesSearch;
    })
    // Sort by upload date (newest first)
    .sort((a, b) => {
      const dateA = a.uploaded ? new Date(a.uploaded).getTime() : 0;
      const dateB = b.uploaded ? new Date(b.uploaded).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });

  // Handle Escape key press to close the drawer
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (visible) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, onClose]);

  const handleUploaderReject = (fileRejections) => {
    showRejectedFiles(showToast, mapDropzoneRejections(fileRejections));
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
      aria-hidden={!visible}
    >
      <div
        className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-50 transition-transform duration-300 ease-in-out transform translate-x-0 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-medium text-slate-800">{t("components.mediaSelector.title")}</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-pink-500"
            aria-label={t("components.mediaSelector.closeLabel")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("components.mediaSelector.searchPlaceholder")}
              className="form-input pl-10"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          </div>
          <div className="mt-3">
            <FileUploader
              onUpload={handleUpload}
              onReject={handleUploaderReject}
              uploading={uploading}
              uploadProgress={uploadProgress}
              accept={filterType === "file" ? FILE_ACCEPT : IMAGE_ACCEPT}
              multiple={true}
              maxSize={maxSizeMB * 1024 * 1024}
              title={t("components.mediaSelector.upload")}
              maxSizeText={`${filterType === "file" ? t("components.mediaUploader.supportedFiles") : t("components.mediaUploader.supportedImages")} - ${maxSizeMB}MB max`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner size="medium" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {searchTerm ? t("components.mediaSelector.noMatch") : t("components.mediaSelector.noFiles")}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredFiles.map((file) => (
                <Tooltip
                  key={file.id}
                  content={file.filename || file.originalName}
                  contentClassName="max-w-64 whitespace-normal break-words text-center text-[11px] leading-4 shadow-lg"
                  wrapperClassName="block"
                  triggerClassName="block"
                >
                  <div
                    className="border border-slate-200 rounded-sm bg-slate-50 cursor-pointer hover:border-pink-400 transition-colors overflow-visible"
                    onClick={() => onSelect(file)}
                  >
                    <div className="aspect-square relative bg-slate-100 flex items-center justify-center rounded-t-sm overflow-hidden">
                      {file.type?.startsWith("image/") ? (
                        <img
                          src={API_URL(`/api/media/projects/${activeProject.id}${file.thumbnail || file.path}`)}
                          alt={file.metadata?.alt || ""}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <FileText className="text-slate-400" size={32} />
                          <span className="text-xs font-medium text-slate-500 uppercase">
                            {file.filename?.split(".").pop()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-4 text-slate-700">
                        {file.filename || file.originalName}
                      </p>
                    </div>
                  </div>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
