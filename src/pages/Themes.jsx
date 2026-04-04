import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpCircle, Trash2, MoreVertical, ChevronDown, ExternalLink } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Tooltip from "../components/ui/Tooltip";

import {
  getAllThemes,
  getThemeScreenshotUrl,
  getThemePresets,
  getPresetScreenshotUrl,
  uploadThemeZip,
  updateTheme,
  deleteTheme,
} from "../queries/themeManager";

import useProjectStore from "../stores/projectStore";
import useToastStore from "../stores/toastStore";
import useThemeUpdateStore from "../stores/themeUpdateStore";
import useAppSettings from "../hooks/useAppSettings";
import FileUploader from "../components/ui/FileUploader";
import { showRejectedFiles, showUploadOutcome } from "../utils/uploadFeedback";
import { ZIP_ACCEPT, mapDropzoneRejections, validateZipFiles } from "../utils/uploadValidation";

function ThemeSection({ theme, activeProject, onUpdate, onDelete, updatingThemeId }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [presets, setPresets] = useState([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  const isActiveTheme = activeProject && activeProject.theme === theme.id;
  const projectsUsingTheme = theme.projectsUsingTheme || [];
  const isThemeInUse = projectsUsingTheme.length > 0;
  const hasPresets = theme.presets > 0;

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

  // Fetch presets on mount
  useEffect(() => {
    if (hasPresets && !presetsLoaded) {
      getThemePresets(theme.id).then((data) => {
        setPresets(data.presets || []);
        setPresetsLoaded(true);
      });
    }
  }, [theme.id, hasPresets, presetsLoaded]);

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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {/* Theme header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Collapse toggle */}
        {hasPresets ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex shrink-0 items-center justify-center rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`}
            />
          </button>
        ) : (
          <div className="w-[22px] shrink-0" />
        )}

        {/* Theme info */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{theme.name}</h3>
              {isThemeInUse && (
                <Tooltip
                  content={projectsUsingTheme.map((p) => p.name).join(", ")}
                >
                  <span className="text-base font-semibold text-pink-600">In use</span>
                </Tooltip>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <span>{t("themes.version", { version: theme.version })}</span>
              <span className="text-slate-300">·</span>
              <span>{t("themes.by", { author: theme.author || "Unknown" })}</span>
            </div>
          </div>
        </div>

        {/* Update button */}
        {theme.hasPendingUpdate && (
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-pink-600">
              <ArrowUpCircle size={16} />
              <span>v{theme.latestVersion}</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onUpdate(theme.id)}
              disabled={updatingThemeId === theme.id}
            >
              {updatingThemeId === theme.id
                ? t("themes.buttons.updating", "Updating...")
                : t("themes.buttons.update", "Update")}
            </Button>
          </div>
        )}

        {/* Three-dot menu */}
        <div className="relative shrink-0" ref={openMenuId === theme.id ? menuRef : null}>
          <button
            onClick={() => setOpenMenuId(openMenuId === theme.id ? null : theme.id)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={t("themes.menuLabel", "Theme options")}
          >
            <MoreVertical size={16} />
          </button>
          {openMenuId === theme.id && (
            <div className="absolute right-0 z-10 mt-1 w-64 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  setOpenMenuId(null);
                  if (!isThemeInUse) {
                    onDelete(theme.id, theme.name);
                  }
                }}
                disabled={isThemeInUse}
                title={
                  isThemeInUse ? projectsUsingTheme.map((project) => project.name).join(", ") : undefined
                }
                className={`flex w-full items-center gap-2 whitespace-normal px-3 py-2 text-left text-sm ${
                  isThemeInUse ? "cursor-not-allowed text-red-300" : "text-red-600 hover:bg-red-50"
                }`}
              >
                <Trash2 size={14} />
                {cannotDeleteThemeLabel}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Presets grid (collapsible) */}
      {hasPresets && isExpanded && presetsLoaded && presets.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {presets.map((preset) => (
              <div key={preset.id} className="min-w-0">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <img
                    src={getPresetScreenshotUrl(theme.id, preset.id, preset.hasScreenshot)}
                    alt={`${preset.name} preset`}
                    className="w-full aspect-video object-cover"
                  />
                </div>
                <p className="mt-2 text-center text-sm font-medium text-slate-800">{preset.name}</p>
                {preset.description && (
                  <p className="text-center text-xs text-slate-500">{preset.description}</p>
                )}
                {preset.liveDemo && (
                  <a
                    href={preset.liveDemo}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center justify-center gap-1 text-xs text-pink-600 hover:text-pink-700 hover:underline"
                  >
                    Live demo
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No presets — show theme screenshot inline */}
      {!hasPresets && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          <div className="w-48 overflow-hidden rounded-md border border-slate-200">
            <div className="aspect-video overflow-hidden bg-slate-100">
              <img
                src={getThemeScreenshotUrl(theme.id)}
                alt={`${theme.name} preview`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Themes() {
  const { t } = useTranslation();
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [updatingThemeId, setUpdatingThemeId] = useState(null);

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
      console.error("Error fetching themes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const handleUploadSuccess = useCallback((newTheme) => {
    if (newTheme.isUpdate) {
      setThemes((prevThemes) =>
        prevThemes.map((theme) => (theme.id === newTheme.id ? { ...theme, ...newTheme } : theme)),
      );
    } else {
      setThemes((prevThemes) => [...prevThemes, newTheme]);
    }
  }, []);

  const handleUpdateTheme = useCallback(
    async (themeId) => {
      setUpdatingThemeId(themeId);
      try {
        const result = await updateTheme(themeId);
        showToast(result.message || t("themes.toasts.updateSuccess", "Theme updated successfully"), "success");
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
        <div className="space-y-4">
          {themes.map((theme) => (
            <ThemeSection
              key={theme.id}
              theme={theme}
              activeProject={activeProject}
              onUpdate={handleUpdateTheme}
              onDelete={handleDeleteTheme}
              updatingThemeId={updatingThemeId}
            />
          ))}
        </div>
      ) : (
        <EmptyState title={t("themes.emptyTitle")} description={t("themes.emptyDesc")} />
      )}
    </PageLayout>
  );
}
