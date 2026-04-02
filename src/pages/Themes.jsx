import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpCircle, Trash2, MoreVertical } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

import { getAllThemes, getThemeScreenshotUrl, uploadThemeZip, updateTheme, deleteTheme } from "../queries/themeManager";

import useProjectStore from "../stores/projectStore";
import useToastStore from "../stores/toastStore";
import useThemeUpdateStore from "../stores/themeUpdateStore";
import useAppSettings from "../hooks/useAppSettings";
import FileUploader from "../components/ui/FileUploader";
import { showRejectedFiles, showUploadOutcome } from "../utils/uploadFeedback";
import { ZIP_ACCEPT, mapDropzoneRejections, validateZipFiles } from "../utils/uploadValidation";

export default function Themes() {
  const { t } = useTranslation();
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [updatingThemeId, setUpdatingThemeId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeProject = useProjectStore((state) => state.activeProject);
  const showToast = useToastStore((state) => state.showToast);
  const fetchUpdateCount = useThemeUpdateStore((state) => state.fetchUpdateCount);
  const { settings } = useAppSettings();
  const maxSizeMB = settings?.export?.maxImportSizeMB || 500;

  const fetchThemes = useCallback(async () => {
    try {
      setLoading(true);
      const themesData = await getAllThemes();
      setThemes(themesData);
    } catch (error) {
      console.error("Error fetching themes:", error); // Add better error logging
      // TODO: Add toast for fetch error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const handleUploadSuccess = useCallback((newTheme) => {
    if (newTheme.isUpdate) {
      // Update existing theme in the list
      setThemes((prevThemes) =>
        prevThemes.map((theme) => (theme.id === newTheme.id ? { ...theme, ...newTheme } : theme)),
      );
    } else {
      // Add new theme to the list
      setThemes((prevThemes) => [...prevThemes, newTheme]);
    }
  }, []);

  const handleUpdateTheme = useCallback(
    async (themeId) => {
      setUpdatingThemeId(themeId);
      try {
        const result = await updateTheme(themeId);
        showToast(result.message || t("themes.toasts.updateSuccess", "Theme updated successfully"), "success");
        // Refresh themes list and sidebar badge
        await fetchThemes();
        fetchUpdateCount();
      } catch (error) {
        showToast(error.message || t("themes.toasts.updateError", "Failed to update theme"), "error");
      } finally {
        setUpdatingThemeId(null);
      }
    },
    [showToast, t, fetchThemes, fetchUpdateCount],
  );

  const handleDeleteTheme = useCallback(
    async (themeId, themeName) => {
      if (
        !window.confirm(
          t("themes.delete.confirmMessage", {
            themeName,
            defaultValue: `Are you sure you want to delete "${themeName}"? This action cannot be undone.`,
          }),
        )
      ) {
        return;
      }

      try {
        await deleteTheme(themeId);
        showToast(
          t("themes.delete.success", { themeName, defaultValue: `Theme "${themeName}" deleted successfully` }),
          "success",
        );
        await fetchThemes();
      } catch (error) {
        if (error.response?.status === 409) {
          showToast(
            t("themes.delete.inUse", {
              themeName,
              defaultValue: `Cannot delete "${themeName}" - it is currently used by one or more projects`,
            }),
            "error",
            { duration: 5000 },
          );
        } else {
          showToast(
            t("themes.delete.error", { themeName, defaultValue: `Failed to delete theme "${themeName}"` }),
            "error",
          );
        }
      }
    },
    [showToast, t, fetchThemes],
  );

  const onThemeDrop = useCallback(
    async (files) => {
      const { valid, rejected } = validateZipFiles(files, { maxSizeMB, multiple: false });
      if (rejected.length > 0) {
        showRejectedFiles(showToast, rejected, {
          summaryMessage: rejected.length === 1 ? null : t("themes.toasts.singleFileError"),
        });
      }

      if (valid.length !== 1) {
        return;
      }

      const file = valid[0];
      setIsUploading(true);
      setUploadProgress({ [file.name]: 0 });

      try {
        const result = await uploadThemeZip(file, (progress) => {
          setUploadProgress((prev) => ({ ...prev, [file.name]: progress }));
        });

        setUploadProgress({ [file.name]: 100 });

        if (result.processedFiles?.[0]) {
          handleUploadSuccess(result.processedFiles[0]);
        }

        showUploadOutcome(showToast, result, {
          successMessage: t("themes.toasts.uploadSuccess"),
          networkErrorMessage: t("themes.toasts.uploadError"),
        });
      } catch (error) {
        console.error("Theme upload error:", error);
        showRejectedFiles(showToast, [{ originalName: file.name, reason: error.message || t("themes.toasts.uploadError") }], {
          summaryMessage: t("themes.toasts.uploadError"),
        });
      } finally {
        setIsUploading(false);
        setUploadProgress({});
      }
    },
    [handleUploadSuccess, maxSizeMB, showToast, t],
  );

  const onThemeReject = useCallback(
    (fileRejections) => {
      showRejectedFiles(showToast, mapDropzoneRejections(fileRejections));
    },
    [showToast],
  );

  if (loading) {
    return (
      <PageLayout title={t("themes.title")}>
        <LoadingSpinner message={t("themes.loading")} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t("themes.title")} description={t("themes.description")}>
      <div className="mb-6">
        <FileUploader
          onUpload={onThemeDrop}
          onReject={onThemeReject}
          uploading={isUploading}
          uploadProgress={uploadProgress}
          uploadingFiles={Object.keys(uploadProgress)}
          accept={ZIP_ACCEPT}
          multiple={false}
          maxSize={maxSizeMB * 1024 * 1024}
          title={t("themes.uploader.title")}
          description={t("themes.uploader.description")}
          maxSizeText={`${t("themes.uploader.supported")} - ${maxSizeMB}MB max`}
        />
      </div>

      {themes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => {
            const isActiveTheme = activeProject && activeProject.theme === theme.id;
            const projectsUsingTheme = theme.projectsUsingTheme || [];
            const isThemeInUse = projectsUsingTheme.length > 0;
            const cannotDeleteThemeLabel = isThemeInUse
              ? t("themes.buttons.cannotDeleteInUse", {
                  count: projectsUsingTheme.length,
                  defaultValue:
                    projectsUsingTheme.length === 1
                      ? "Cannot delete theme in use by 1 project"
                      : `Cannot delete theme in use by ${projectsUsingTheme.length} projects`,
                })
              : t("themes.buttons.delete", "Delete");

            return (
              <div
                key={theme.id}
                className="relative bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                  <img
                    src={getThemeScreenshotUrl(theme.id)}
                    alt={`${theme.name} preview`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-base font-semibold">{theme.name}</h3>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{t("themes.version", { version: theme.version })}</span>
                        {theme.versions && theme.versions.length > 1 && (
                          <span className="text-slate-400">
                            ({theme.versions.length} {t("themes.versionsAvailable", "versions")})
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="neutral">{t("themes.widgets", { count: theme.widgets })}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      {t("themes.by", { author: theme.author || "Unknown" })}
                    </span>
                  </div>

                  {/* Update available section */}
                  {theme.hasPendingUpdate && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-pink-600">
                          <ArrowUpCircle size={16} />
                          <span>
                            {t("themes.updateAvailable", "Update available")}: v{theme.latestVersion}
                          </span>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateTheme(theme.id)}
                          disabled={updatingThemeId === theme.id}
                        >
                          {updatingThemeId === theme.id
                            ? t("themes.buttons.updating", "Updating...")
                            : t("themes.buttons.update", "Update")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Three-dot menu - positioned top-right corner */}
                <div
                  className="absolute top-2 right-2 flex items-center gap-2"
                  ref={openMenuId === theme.id ? menuRef : null}
                >
                  {isActiveTheme && <Badge variant="pink">{t("themes.active")}</Badge>}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === theme.id ? null : theme.id)}
                      className="p-1.5 rounded-md bg-white/90 hover:bg-white text-slate-600 hover:text-slate-800 shadow-sm"
                      aria-label={t("themes.menuLabel", "Theme options")}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === theme.id && (
                      <div className="absolute right-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-10">
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            if (!isThemeInUse) {
                              handleDeleteTheme(theme.id, theme.name);
                            }
                          }}
                          disabled={isThemeInUse}
                          title={
                            isThemeInUse
                              ? projectsUsingTheme.map((project) => project.name).join(", ")
                              : undefined
                          }
                          className={`w-full px-3 py-2 text-left text-sm whitespace-normal flex items-center gap-2 ${
                            isThemeInUse
                              ? "text-red-300 cursor-not-allowed"
                              : "text-red-600 hover:bg-red-50"
                          }`}
                        >
                          <Trash2 size={14} />
                          {cannotDeleteThemeLabel}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title={t("themes.emptyTitle")} description={t("themes.emptyDesc")} />
      )}
    </PageLayout>
  );
}
