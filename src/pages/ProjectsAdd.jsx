import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PageLayout from "../components/layout/PageLayout";
import ProjectForm from "../components/projects/ProjectForm.jsx";
import useToastStore from "../stores/toastStore";
import { createProject, setActiveProject } from "../queries/projectManager";
import useProjectStore from "../stores/projectStore";
import useGuardedFormPage from "../hooks/useGuardedFormPage";
import { resolveWorkspaceDestination } from "../utils/projectNavigation";

export default function ProjectsAdd() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const showToast = useToastStore((state) => state.showToast);
  const fetchActiveProject = useProjectStore((state) => state.fetchActiveProject);
  const workspaceDestination = resolveWorkspaceDestination(searchParams.get("next"));
  const projectsListHref = searchParams.get("next")
    ? `/projects?next=${encodeURIComponent(searchParams.get("next"))}`
    : "/projects";

  const { navigateSafely, getDirtyTitle } = useGuardedFormPage(isDirty);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const newProject = await createProject(formData);
      await setActiveProject(newProject.id);
      await fetchActiveProject();
      showToast(t("projectsAdd.toasts.createActiveSuccess", { name: newProject.name }), "success");

      navigateSafely(workspaceDestination);
      return true;
    } catch (err) {
      showToast(err.message || t("projectsAdd.toasts.createError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout title={getDirtyTitle(t("projectsAdd.title"))}>
      <ProjectForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={t("projectsAdd.create")}
        onCancel={() => navigateSafely(projectsListHref)}
        onDirtyChange={setIsDirty}
        isDirty={isDirty}
      />
    </PageLayout>
  );
}
