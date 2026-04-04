import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Upload, CheckCircle, AlertCircle } from "lucide-react";
import FileUploader from "../ui/FileUploader";
import Button from "../ui/Button";
import { importProject } from "../../queries/projectManager";
import useAppSettings from "../../hooks/useAppSettings";
import useToastStore from "../../stores/toastStore";
import { showRejectedFiles, showUploadOutcome } from "../../utils/uploadFeedback";
import { ZIP_ACCEPT, mapDropzoneRejections, validateZipFiles } from "../../utils/uploadValidation";

export default function ProjectImportModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const showToast = useToastStore((state) => state.showToast);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const abortControllerRef = useRef(null);

  const maxSizeMB = settings?.export?.maxImportSizeMB || 500;
  const canClose = !uploading;

  if (!isOpen) return null;

  const handleFileSelect = (files) => {
    const { valid, rejected } = validateZipFiles(files, { maxSizeMB, multiple: false });

    if (rejected.length > 0) {
      setError(rejected[0].reason);
      setSelectedFile(null);
      showRejectedFiles(showToast, rejected);
      return;
    }

    if (valid.length === 0) return;

    setSelectedFile(valid[0]);
    setError(null);
    setSuccess(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError(t("projects.importModal.noFileSelected"));
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setUploading(true);
    setUploadProgress({ [selectedFile.name]: 0 });
    setError(null);
    setSuccess(null);

    try {
      const result = await importProject(selectedFile, {
        onProgress: (progress) => {
          setUploadProgress((prev) => ({ ...prev, [selectedFile.name]: progress }));
        },
        signal: controller.signal,
      });

      setUploadProgress({ [selectedFile.name]: 100 });
      const importedProject = result.processedFiles?.[0] || result;

      setSuccess(importedProject);
      if (onSuccess) {
        onSuccess(importedProject);
      } else {
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
      if (!onSuccess) {
        showUploadOutcome(showToast, result, {
          successMessage: importedProject?.name
            ? t("projects.importModal.successMessage", { name: importedProject.name })
            : undefined,
          networkErrorMessage: t("projects.importModal.importError"),
        });
      }
    } catch (err) {
      if (err?.name === "AbortError" || err?.aborted) {
        return;
      }

      const message = err.message || t("projects.importModal.importError");
      setError(message);
      showRejectedFiles(showToast, [{ originalName: selectedFile.name, reason: message }], {
        summaryMessage: t("projects.importModal.importError"),
      });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setUploading(false);
        setUploadProgress({});
      }
    }
  };

  const handleClose = () => {
    if (!canClose) {
      return;
    }

    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    setUploading(false);
    setUploadProgress({});
    onClose();
  };

  const handleCancel = () => {
    if (uploading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    setUploading(false);
    setUploadProgress({});
    abortControllerRef.current = null;
    onClose();
  };

  const handleReject = (fileRejections) => {
    const rejected = mapDropzoneRejections(fileRejections);
    if (rejected.length > 0) {
      setSelectedFile(null);
      setError(rejected[0].reason);
      showRejectedFiles(showToast, rejected);
    }
  };

  // Prevent clicks inside the modal from closing it
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={canClose ? handleClose : undefined}
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
            disabled={!canClose}
            className="p-1 rounded transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
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
                onReject={handleReject}
                uploading={uploading}
                uploadProgress={uploadProgress}
                uploadingFiles={selectedFile ? [selectedFile.name] : []}
                accept={ZIP_ACCEPT}
                multiple={false}
                maxSize={maxSizeMB * 1024 * 1024}
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
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
            <Button onClick={handleCancel} variant="secondary">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || uploading}
              loading={uploading}
            >
              {t("projects.importModal.importButton")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
