import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpCircle } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

import { getAllThemes, getThemeScreenshotUrl, uploadThemeZip, updateTheme } from "../queries/themeManager";

import useProjectStore from "../stores/projectStore";
import useToastStore from "../stores/toastStore";
import useThemeUpdateStore from "../stores/themeUpdateStore";
import FileUploader from "../components/ui/FileUploader";

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

  const handleUploadSuccess = (newTheme) => {
    if (newTheme.isUpdate) {
      // Update existing theme in the list
      setThemes((prevThemes) =>
        prevThemes.map((theme) =>
          theme.id === newTheme.id ? { ...theme, ...newTheme } : theme
        )
      );
    } else {
      // Add new theme to the list
      setThemes((prevThemes) => [...prevThemes, newTheme]);
    }
  };

  const handleUpdateTheme = useCallback(async (themeId) => {
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
  }, [showToast, t, fetchThemes, fetchUpdateCount]);

  const onThemeDrop = useCallback(async (files) => {
    if (files.length !== 1) {
       showToast(t("themes.toasts.singleFileError"), "error");
       return;
    }
    const file = files[0];
    setIsUploading(true);
    // Fake progress for now since uploadThemeZip doesn't support it yet match interface
    setUploadProgress({ [file.name]: 0 });

    try {
        // Simulate progress
        const interval = setInterval(() => {
           setUploadProgress(prev => ({ ...prev, [file.name]: Math.min((prev[file.name] || 0) + 10, 90) }));
        }, 100);

        const result = await uploadThemeZip(file);

        clearInterval(interval);
        setUploadProgress({ [file.name]: 100 });

        if (result.theme) {
          handleUploadSuccess(result.theme);
        }
        showToast(result.message || t("themes.toasts.uploadSuccess"), "success");
    } catch (error) {
        console.error("Theme upload error:", error);
        showToast(error.message || t("themes.toasts.uploadError"), "error");
    } finally {
        setIsUploading(false);
        setUploadProgress({});
    }
  }, [showToast, t]);


  if (loading) {
    return (
      <PageLayout title={t("themes.title")}>
        <LoadingSpinner message={t("themes.loading")} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={t("themes.title")}
      description={t("themes.description")}
    >
      <div className="mb-6">
        <FileUploader
          onUpload={onThemeDrop}
          uploading={isUploading}
          uploadProgress={uploadProgress}
          accept={{ "application/zip": [".zip"] }}
          multiple={false}
          title={t("themes.uploader.title")}
          description={t("themes.uploader.description")}
          maxSizeText={t("themes.uploader.supported")}
        />
      </div>

      {themes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => {
            const isActiveTheme = activeProject && activeProject.theme === theme.id;

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
                    <span className="text-xs text-slate-500">{t("themes.by", { author: theme.author || "Unknown" })}</span>
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

                {isActiveTheme && (
                  <Badge variant="pink" className="absolute top-2 right-2">
                    {t("themes.active")}
                  </Badge>
                )}
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
