import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";

export default function MediaUploader({ onUpload, uploading, uploadProgress = {} }) {
  const { t } = useTranslation();

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      onUpload(acceptedFiles);
    },
    [onUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".svg"],
      "video/*": [".mp4", ".webm", ".mov", ".avi", ".mkv"],
    },
  });

  return (
    <>
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed ${
          isDragActive ? "border-pink-400 bg-pink-50" : "border-slate-300 bg-slate-50"
        } rounded-sm text-center cursor-pointer`}
      >
        <input {...getInputProps()} />
        <p className="text-slate-500 mb-2">
          {isDragActive ? t("components.mediaUploader.dropActive") : t("components.mediaUploader.dropInactive")}
        </p>
        <Button variant="primary">{t("components.mediaUploader.selectFiles")}</Button>
        <p className="text-xs text-slate-500 mt-2">
          {t("components.mediaUploader.supportedImages")}
          <br />
          {t("components.mediaUploader.supportedVideos")}
        </p>
      </div>

      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="mb-4 p-4 border border-slate-200 rounded-sm bg-slate-50">
          <h3 className="font-medium mb-2">{t("components.mediaUploader.uploading")}</h3>
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm truncate max-w-xs">{filename}</span>
                <span className="text-sm">{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-pink-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
