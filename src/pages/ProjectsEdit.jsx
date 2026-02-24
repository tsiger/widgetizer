import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, RefreshCw } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import ProjectForm from "../components/projects/ProjectForm.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

import useToastStore from "../stores/toastStore";
import {
  updateProject,
  getAllProjects,
  getActiveProject,
  checkThemeUpdates,
  applyThemeUpdate,
} from "../queries/projectManager";
import useProjectStore from "../stores/projectStore";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function ProjectsEdit() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const skipNavigationGuardRef = useRef(false);

  const showToast = useToastStore((state) => state.showToast);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  const activeProject = useProjectStore((state) => state.activeProject);

  // Add navigation guard with skip ref for intentional navigation
  useFormNavigationGuard(isDirty, skipNavigationGuardRef);

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProject = async () => {
    try {
      const projects = await getAllProjects();
      const project = projects.find((p) => p.id === id);
      if (!project) {
        showToast(t("projectsEdit.toasts.notFound"), "error");
        return;
      }
      setProject(project);

      // Check for theme updates
      try {
        const status = await checkThemeUpdates(id);
        setUpdateStatus(status);
      } catch (updateErr) {
        console.warn("Could not check for theme updates:", updateErr);
      }
    } catch (err) {
      showToast(err.message || t("projectsEdit.toasts.loadError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUpdate = async () => {
    setIsApplyingUpdate(true);
    try {
      const result = await applyThemeUpdate(id);
      if (result.success) {
        showToast(
          t("projectsEdit.toasts.updateApplied", {
            from: result.previousVersion,
            to: result.newVersion,
          }) || `Theme updated from v${result.previousVersion} to v${result.newVersion}`,
          "success",
        );
        // Reload project to get updated version
        await loadProject();
      } else {
        showToast(result.message || t("projectsEdit.toasts.noUpdateAvailable"), "info");
      }
    } catch (err) {
      showToast(err.message || t("projectsEdit.toasts.updateError"), "error");
    } finally {
      setIsApplyingUpdate(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const updatedProject = await updateProject(id, {
        ...formData,
        theme: project.theme,
      });
      setProject(updatedProject);

      // Check if the project folderName changed
      if (updatedProject.folderName !== project.folderName) {
        // If this was the active project, refresh the active project state
        if (activeProject && activeProject.id === id) {
          const refreshedActiveProject = await getActiveProject();
          setActiveProject(refreshedActiveProject);
        }
        showToast(t("projectsEdit.toasts.updateSuccessRenamed", { name: updatedProject.name }), "success");
        // No need to navigate as ID is stable
      } else {
        // If this was the active project, refresh the active project state
        if (activeProject && activeProject.id === id) {
          const refreshedActiveProject = await getActiveProject();
          setActiveProject(refreshedActiveProject);
        }
        showToast(t("projectsEdit.toasts.updateSuccess", { name: updatedProject.name }), "success");
      }

      setShowSuccessActions(true);
      setIsDirty(false); // Reset dirty state after successful save
      return false; // Don't reset the form on edit
    } catch (err) {
      showToast(err.message || t("projectsEdit.toasts.updateError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <PageLayout title={t("projectsEdit.title")}>
        <LoadingSpinner message={t("projectsEdit.loading")} />
      </PageLayout>
    );

  if (!project) return <PageLayout title={t("projectsEdit.title")}>{t("projectsEdit.notFound")}</PageLayout>;

  if (!activeProject) {
    showToast(t("projectsEdit.toasts.noActiveProject"), "error");
    return (
      <PageLayout title={t("projectsEdit.title")}>
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">{t("projectsEdit.noActiveProjectTitle")}</h2>
          <p className="text-slate-600 mb-4">{t("projectsEdit.noActiveProjectDesc")}</p>
        </div>
      </PageLayout>
    );
  }

  const pageTitle = (
    <span className="flex items-center gap-2">
      {t("projectsEdit.title")}
      {isDirty && <span className="w-2 h-2 bg-pink-500 rounded-full" />}
    </span>
  );

  return (
    <PageLayout title={pageTitle}>
      {showSuccessActions && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/projects")} icon={<ChevronLeft size={18} />}>
            {t("projectsEdit.backToList")}
          </Button>
        </div>
      )}

      {/* Theme Update Banner – inside white box, before the form */}
      {project && updateStatus && updateStatus.hasUpdate && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg border-l-4 border-l-amber-500">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800">
                  {t("projectsEdit.themeUpdate.title", "Theme Update Available")}
                </h3>
                <Badge variant="neutral">
                  v{updateStatus.currentVersion} → v{updateStatus.latestVersion}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                {t(
                  "projectsEdit.themeUpdate.description",
                  "A new version of your theme is available. Your pages, menus, and uploads will not be affected.",
                )}
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleApplyUpdate}
              disabled={isApplyingUpdate}
              icon={<RefreshCw size={18} className={isApplyingUpdate ? "animate-spin" : ""} />}
              className="shrink-0"
            >
              {isApplyingUpdate
                ? t("projectsEdit.themeUpdate.applying", "Applying...")
                : t("projectsEdit.themeUpdate.apply", "Apply Update")}
            </Button>
          </div>
        </div>
      )}

      {project && (
        <ProjectForm
          initialData={project}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={t("projectsEdit.saveChanges")}
          onCancel={() => {
            skipNavigationGuardRef.current = true;
            navigate("/projects");
          }}
          onDirtyChange={setIsDirty}
          isDirty={isDirty}
        />
      )}
    </PageLayout>
  );
}
