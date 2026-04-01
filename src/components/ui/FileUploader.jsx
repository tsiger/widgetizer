import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { UploadCloud } from "lucide-react";
import Button from "./Button";

export default function FileUploader({
  onUpload,
  onReject,
  uploading = false,
  accept,
  multiple = false,
  title,
  description,
  maxSizeText,
  maxSize,
  uploadProgress = {},
  uploadingFiles = [],
}) {
  const { t } = useTranslation();

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      onUpload(acceptedFiles);
    },
    [onUpload],
  );

  const onDropRejected = useCallback(
    (fileRejections) => {
      if (fileRejections.length === 0 || !onReject) return;
      onReject(fileRejections);
    },
    [onReject],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    onDropRejected,
    accept,
    multiple,
    maxSize,
    disabled: uploading,
  });

  const progressEntries = Object.entries(uploadProgress);
  const uploadItems =
    progressEntries.length > 0
      ? progressEntries.map(([filename, progress]) => ({ filename, progress }))
      : uploadingFiles.map((filename) => ({ filename, progress: null }));

  // Determine styles based on state
  let borderColor = "border-slate-300";
  let bgColor = "bg-slate-50";
  let textColor = "text-slate-600";
  let iconColor = "text-slate-400";

  if (isDragActive) {
    borderColor = "border-pink-500";
    bgColor = "bg-pink-50";
    textColor = "text-pink-600";
    iconColor = "text-pink-500";
  } else if (isDragReject) {
    borderColor = "border-red-500";
    bgColor = "bg-red-50";
    textColor = "text-red-600";
    iconColor = "text-red-500";
  } else if (uploading) {
    borderColor = "border-slate-200";
    bgColor = "bg-slate-100";
    textColor = "text-slate-400";
    iconColor = "text-slate-300";
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative p-8 border-2 border-dashed ${borderColor} ${bgColor} rounded-lg text-center cursor-pointer transition-all duration-200 hover:border-slate-400 focus:outline-none`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className={`p-3 rounded-full bg-white shadow-sm ${uploading ? "opacity-50" : ""}`}>
            <UploadCloud className={`h-8 w-8 ${iconColor}`} />
          </div>

          <div className="space-y-1">
            <h3 className={`font-medium text-lg ${textColor}`}>
              {title ||
                (isDragActive ? t("components.fileUploader.dropHere") : t("components.fileUploader.clickOrDrop"))}
            </h3>
            {description && (
              <p className={`text-sm ${uploading ? "text-slate-400" : "text-slate-500"}`}>{description}</p>
            )}
          </div>

          {!uploading && (
            <Button variant="secondary" size="sm" className="mt-2 pointer-events-none" type="button">
              {t("components.fileUploader.browseFiles")}
            </Button>
          )}

          {maxSizeText && <p className="text-xs text-slate-400 mt-2">{maxSizeText}</p>}
        </div>
      </div>

      {/* Progress Bars */}
      {uploading && uploadItems.length > 0 && (
        <div className="mt-4 p-4 border border-slate-200 rounded-sm bg-slate-50">
          <h3 className="font-medium text-sm text-slate-700 mb-3">{t("components.fileUploader.uploading")}</h3>
          <div className="space-y-3">
            {uploadItems.map(({ filename, progress }) => (
              <div key={filename}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium truncate max-w-[200px]">{filename}</span>
                  <span className="text-slate-500">
                    {typeof progress === "number" ? `${progress}%` : t("components.fileUploader.uploading")}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`bg-pink-500 h-full rounded-full ${typeof progress === "number" ? "transition-all duration-300 ease-out" : "animate-pulse w-1/2"}`}
                    style={typeof progress === "number" ? { width: `${progress}%` } : undefined}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
