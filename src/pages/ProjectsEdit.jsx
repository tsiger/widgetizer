import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import ProjectForm from "../components/projects/ProjectForm.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";

import useToastStore from "../stores/toastStore";
import { updateProject, getAllProjects, getActiveProject } from "../queries/projectManager";
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

  const showToast = useToastStore((state) => state.showToast);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  const activeProject = useProjectStore((state) => state.activeProject);

  // Add navigation guard
  useFormNavigationGuard(isDirty);

  useEffect(() => {
    loadProject();
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
    } catch (err) {
      showToast(err.message || t("projectsEdit.toasts.loadError"), "error");
    } finally {
      setLoading(false);
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

      // Check if the project slug changed
      if (updatedProject.slug !== project.slug) {
        // If this was the active project, refresh the active project state
        if (activeProject && activeProject.id === id) {
          const refreshedActiveProject = await getActiveProject();
          setActiveProject(refreshedActiveProject);
        }
        showToast(t("projectsEdit.toasts.updateSuccessRenamed", { name: formData.name }), "success");
        // No need to navigate as ID is stable
      } else {
        // If this was the active project, refresh the active project state
        if (activeProject && activeProject.id === id) {
          const refreshedActiveProject = await getActiveProject();
          setActiveProject(refreshedActiveProject);
        }
        showToast(t("projectsEdit.toasts.updateSuccess", { name: formData.name }), "success");
      }

      setShowSuccessActions(true);
      setIsDirty(false); // Reset dirty state after successful save
      return true;


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

  return (
    <PageLayout title={t("projectsEdit.title")}>
      {showSuccessActions && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/projects")} icon={<ChevronLeft size={18} />}>
            {t("projectsEdit.backToList")}
          </Button>
        </div>
      )}

      {project && (
        <ProjectForm
          initialData={project}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={t("projectsEdit.saveChanges")}
          onCancel={() => navigate("/projects")}
          onDirtyChange={setIsDirty}
        />
      )}

      {isDirty && (
        <div className="mt-4 text-sm text-amber-600">
          {t("common.unsavedChanges")}
        </div>
      )}
    </PageLayout>
  );
}
