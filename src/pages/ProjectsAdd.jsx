import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PageLayout from "../components/layout/PageLayout";
import ProjectForm from "../components/projects/ProjectForm.jsx";
import useToastStore from "../stores/toastStore";
import { createProject } from "../queries/projectManager";
import useProjectStore from "../stores/projectStore";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";
import { HOSTED_MODE } from "../config";

export default function ProjectsAdd() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const skipNavigationGuardRef = useRef(false);

  const showToast = useToastStore((state) => state.showToast);
  const { setActiveProject: setActiveProjectInStore } = useProjectStore();

  // Add navigation guard with skip ref
  useFormNavigationGuard(isDirty, skipNavigationGuardRef);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      // Create the project (backend handles activation if needed)
      const newProject = await createProject(formData);

      // Update store if backend activated it
      if (newProject.wasSetAsActive) {
        setActiveProjectInStore(newProject);
        showToast(t("projectsAdd.toasts.createActiveSuccess", { name: newProject.name }), "success");
      } else {
        showToast(t("projectsAdd.toasts.createSuccess", { name: newProject.name }), "success");
      }

      // In hosted mode, go straight to editing (Projects list is hidden).
      // In open-source mode, go to the projects list.
      skipNavigationGuardRef.current = true;
      navigate(HOSTED_MODE ? "/pages" : "/projects");
      return true;
    } catch (err) {
      showToast(err.message || t("projectsAdd.toasts.createError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageTitle = (
    <span className="flex items-center gap-2">
      {t("projectsAdd.title")}
      {isDirty && <span className="w-2 h-2 bg-pink-500 rounded-full" />}
    </span>
  );

  return (
    <PageLayout title={pageTitle}>
      <ProjectForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={t("projectsAdd.create")}
        onCancel={() => {
          skipNavigationGuardRef.current = true;
          navigate(HOSTED_MODE ? "/pages" : "/projects");
        }}
        onDirtyChange={setIsDirty}
        isDirty={isDirty}
      />
    </PageLayout>
  );
}
