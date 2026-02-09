import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Upload, CheckCircle, AlertCircle } from "lucide-react";
import FileUploader from "../ui/FileUploader";
import LoadingSpinner from "../ui/LoadingSpinner";
import { importProject } from "../../queries/projectManager";
import useAppSettings from "../../hooks/useAppSettings";

export default function ProjectImportModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const maxSizeMB = settings?.export?.maxImportSizeMB || 500;

  if (!isOpen) return null;

  const handleFileSelect = (files) => {
    if (files.length > 0) {
      const file = files[0];
      // Validate file type
      if (
        !file.name.endsWith(".zip") &&
        file.type !== "application/zip" &&
        file.type !== "application/x-zip-compressed"
      ) {
        setError(t("projects.importModal.invalidFileType"));
        setSelectedFile(null);
        return;
      }

      // Validate file size
      const fileSizeMB = file.size / 1024 / 1024;
      if (fileSizeMB > maxSizeMB) {
        setError(
          t("projects.importModal.fileTooLarge", {
            size: fileSizeMB.toFixed(2),
            max: maxSizeMB,
          }),
        );
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError(t("projects.importModal.noFileSelected"));
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await importProject(selectedFile);
      setSuccess(result);
      if (onSuccess) {
        onSuccess(result);
      }
      // Auto-close after 2 seconds on success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.message || t("projects.importModal.importError"));
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    setUploading(false);
    onClose();
  };

  // Prevent clicks inside the modal from closing it
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col"
        onClick={handleModalClick}
      >
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{t("projects.importModal.title")}</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            aria-label={t("common.close")}
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
              <h4 className="text-lg font-semibold text-slate-800 mb-2">{t("projects.importModal.successTitle")}</h4>
              <p className="text-slate-600 mb-2">{t("projects.importModal.successMessage", { name: success.name })}</p>
              <p className="text-sm text-slate-500">{t("projects.importModal.redirecting")}</p>
            </div>
          ) : (
            <>
              <p className="text-slate-600 mb-4">{t("projects.importModal.description")}</p>

              <FileUploader
                onUpload={handleFileSelect}
                uploading={uploading}
                accept={{
                  "application/zip": [".zip"],
                  "application/x-zip-compressed": [".zip"],
                }}
                multiple={false}
                title={t("projects.importModal.uploadTitle")}
                description={t("projects.importModal.uploadDescription")}
                maxSizeText={t("projects.importModal.maxSize", { max: maxSizeMB })}
              />

              {selectedFile && !uploading && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-sm">
                  <div className="flex items-center gap-2">
                    <Upload size={16} className="text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">{selectedFile.name}</span>
                    <span className="text-xs text-slate-500">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-start gap-2">
                  <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {uploading && (
                <div className="mt-4">
                  <LoadingSpinner message={t("projects.importModal.importing")} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="px-4 py-2 border border-slate-300 rounded-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedFile || uploading}
              className="px-4 py-2 bg-pink-600 text-white rounded-sm hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("projects.importModal.importButton")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
