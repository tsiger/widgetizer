import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PageLayout from "@widgetizer/editor-ui/components/layout/PageLayout.jsx";
import ProjectForm from "../components/projects/ProjectForm.jsx";
import useToastStore from "@widgetizer/editor-ui/stores/toastStore";
import { createProject, setActiveProject, updateProject } from "@widgetizer/editor-ui/queries/projectManager";
import { uploadProjectMedia } from "@widgetizer/editor-ui/queries/mediaManager";
import useProjectStore from "@widgetizer/editor-ui/stores/projectStore";
import useGuardedFormPage from "@widgetizer/editor-ui/hooks/useGuardedFormPage";
import { resolveWorkspaceDestination } from "@widgetizer/editor-ui/utils/projectNavigation";

async function addLogo(project, file) {
  try {
    const { processedFiles } = await uploadProjectMedia(project.id, [file]);
    const logo = processedFiles[0]?.path;
    if (!logo) return false;
    await updateProject(project.id, { name: project.name, siteIdentity: { ...project.siteIdentity, logo } });
    return true;
  } catch {
    return false;
  }
}

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
      const { logoFile, ...projectData } = formData;
      const newProject = await createProject(projectData);
      await setActiveProject(newProject.id);
      // Uploads go to the active project, so the logo waits until the new project is active.
      await fetchActiveProject();
      const logoAdded = !logoFile || (await addLogo(newProject, logoFile));
      showToast(t("projectsAdd.toasts.createActiveSuccess", { name: newProject.name }), "success");
      if (!logoAdded) showToast(t("projectsAdd.toasts.logoError"), "warning");

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
