import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { uploadProjectMedia, getProjectMedia } from "../../../queries/mediaManager";
import { FileText, Film, X, UploadCloud } from "lucide-react";
import useProjectStore from "../../../stores/projectStore";
import useToastStore from "../../../stores/toastStore";
import useAppSettings from "../../../hooks/useAppSettings";
import MediaSelectorDrawer from "../../../components/media/MediaSelectorDrawer";
import Button from "../../ui/Button";
import { showRejectedFiles, showUploadOutcome } from "../../../utils/uploadFeedback";
import { NON_IMAGE_ACCEPT, VIDEO_ACCEPT, createRejectedFile, validateFileSizes } from "../../../utils/uploadValidation";

const MODES = {
  file: {
    filter: "file",
    accept: NON_IMAGE_ACCEPT,
    accepts: (type) => !type?.startsWith("image/"),
    icon: FileText,
    importKey: "components.fileInput.importNew",
    formatsKey: "components.fileInput.fileFormats",
    rejectKey: "components.fileInput.selectFileOnly",
  },
  video: {
    filter: "video",
    accept: VIDEO_ACCEPT,
    accepts: (type) => type === "video/mp4",
    icon: Film,
    importKey: "components.fileInput.importNewVideo",
    formatsKey: "components.fileInput.videoFormats",
    rejectKey: "components.fileInput.selectVideoOnly",
  },
};

export default function FileInput({ id, value = "", onChange, filterType = "file" }) {
  const { t } = useTranslation();
  const mode = MODES[filterType] ?? MODES.file;
  const acceptedExtensions = Object.values(mode.accept).flat();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const activeProject = useProjectStore((state) => state.activeProject);
  const showToast = useToastStore((state) => state.showToast);
  const { settings } = useAppSettings();

  const [selectorDrawerVisible, setSelectorDrawerVisible] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);

  // Get the current file metadata when value changes
  useEffect(() => {
    if (value && activeProject) {
      const fetchFileData = async () => {
        try {
          const mediaData = await getProjectMedia(activeProject.id);
          const fileRecord = mediaData.files.find((file) => file.path === value);
          setCurrentFile(fileRecord || null);
        } catch (error) {
          console.error("Error fetching file metadata:", error);
          setCurrentFile(null);
        }
      };
      fetchFileData();
    } else {
      setCurrentFile(null);
    }
  }, [value, activeProject]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !activeProject) return;

    // `accept` only steers the OS dialog; "All files" can still hand over anything.
    if (!acceptedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      showRejectedFiles(showToast, [createRejectedFile(file.name, "File type not supported.")]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

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
        { processedFiles, rejectedFiles, error },
        {
          successMessage: t("components.fileInput.uploadSuccess"),
          networkErrorMessage: t("components.fileInput.uploadFailed"),
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
  const handleOpenMediaSelector = () => setSelectorDrawerVisible(true);

  const handleSelectMedia = (selectedFile) => {
    if (selectedFile && mode.accepts(selectedFile.type)) {
      onChange(selectedFile.path);
      setSelectorDrawerVisible(false);
    } else {
      showToast(t(mode.rejectKey), "error");
    }
  };

  const displayFilename = currentFile?.filename || currentFile?.originalName || value.split("/").pop();
  const displayExtension = displayFilename?.split(".").pop()?.toUpperCase();
  const FileIcon = mode.icon;

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        id={id}
        accept={acceptedExtensions.join(",")}
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />

      {value && currentFile ? (
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
          <div className="flex-shrink-0 w-10 h-10 bg-slate-200 rounded flex items-center justify-center">
            <FileIcon className="text-slate-500" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{displayFilename}</p>
            {displayExtension && (
              <p className="text-xs text-slate-500 uppercase">{displayExtension}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
            title={t("components.fileInput.remove")}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="w-full py-4 bg-slate-50 rounded-sm border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-400 cursor-pointer transition-colors"
        >
          <UploadCloud size={24} />
          <p className="mt-1 text-sm font-semibold">
            {uploading ? `${t("components.fileInput.uploading")} ${uploadProgress}%` : t(mode.importKey)}
          </p>
          <p className="text-xs">{t(mode.formatsKey)}</p>
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
          {t("components.fileInput.browseLibrary")}
        </Button>
      </div>

      {selectorDrawerVisible && (
        <MediaSelectorDrawer
          visible={selectorDrawerVisible}
          onClose={() => setSelectorDrawerVisible(false)}
          onSelect={handleSelectMedia}
          activeProject={activeProject}
          filterType={mode.filter}
        />
      )}
    </div>
  );
}
