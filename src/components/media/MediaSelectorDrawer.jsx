import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Search, Play, Upload, Music } from "lucide-react";
import { API_URL, MEDIA_TYPES } from "../../config";
import { getProjectMedia } from "../../queries/mediaManager";
import LoadingSpinner from "../ui/LoadingSpinner";
import useMediaUpload from "../../hooks/useMediaUpload";
import useToastStore from "../../stores/toastStore";

export default function MediaSelectorDrawer({ visible, onClose, onSelect, activeProject, filterType = "all" }) {
  const { t } = useTranslation();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const showToast = useToastStore((state) => state.showToast);
  const fileInputRef = useRef(null);

  // Initialize media upload hook
  const { uploading, handleUpload } = useMediaUpload({
    activeProject,
    showToast,
    setFiles: setMediaFiles,
  });

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(Array.from(e.target.files));
      // Reset the input so the same file can be selected again if needed
      e.target.value = "";
    }
  };

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
  const filteredFiles = mediaFiles.filter((file) => {
    const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === "all") {
      return matchesSearch;
    } else if (filterType === "image") {
      return matchesSearch && file.type && file.type.startsWith("image/");
    } else if (filterType === "video") {
      return matchesSearch && file.type && file.type.startsWith("video/");
    } else if (filterType === "audio") {
      return matchesSearch && file.type && file.type.startsWith("audio/");
    }

    return matchesSearch;
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("components.mediaSelector.searchPlaceholder")}
                className="form-input pl-10"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept={
                filterType === "image"
                  ? MEDIA_TYPES.image.join(",")
                  : filterType === "video"
                  ? MEDIA_TYPES.video.join(",")
                  : filterType === "audio"
                  ? MEDIA_TYPES.audio.join(",")
                  : [...MEDIA_TYPES.image, ...MEDIA_TYPES.video, ...MEDIA_TYPES.audio].join(",")
              }
              onChange={handleFileInputChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 rounded-md border bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={16} />
              <span className="text-sm font-medium">
                {uploading ? t("components.fileUploader.uploading") : t("components.mediaSelector.upload")}
              </span>
            </button>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="border border-slate-200 rounded-sm overflow-hidden bg-slate-50 cursor-pointer hover:border-pink-400 transition-colors"
                  onClick={() => onSelect(file)}
                >
                  <div className="aspect-square relative bg-slate-100 flex items-center justify-center">
                    {file.type && file.type.startsWith("video/") ? (
                      <div className="flex flex-col items-center justify-center text-slate-500 p-2">
                        <Play size={32} />
                        <p className="text-xs text-center mt-1 font-medium truncate max-w-full">{t("components.mediaSelector.video")}</p>
                      </div>
                    ) : file.type && file.type.startsWith("audio/") ? (
                      <div className="flex flex-col items-center justify-center text-slate-500 p-2">
                        <Music size={32} />
                        <p className="text-xs text-center mt-1 font-medium truncate max-w-full">{t("components.mediaSelector.audio")}</p>
                      </div>
                    ) : (
                      <img
                        src={API_URL(`/api/media/projects/${activeProject.id}${file.thumbnail || file.path}`)}
                        alt={file.metadata?.alt || ""}
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs truncate" title={file.originalName}>
                      {file.originalName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
