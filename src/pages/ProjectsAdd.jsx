import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PageLayout from "../components/layout/PageLayout";
import ProjectForm from "../components/projects/ProjectForm.jsx";
import useToastStore from "../stores/toastStore";
import { createProject, setActiveProject } from "../queries/projectManager";
import useProjectStore from "../stores/projectStore";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";
import { resolveWorkspaceDestination } from "../utils/projectNavigation";

export default function ProjectsAdd() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const skipNavigationGuardRef = useRef(false);

  const showToast = useToastStore((state) => state.showToast);
  const fetchActiveProject = useProjectStore((state) => state.fetchActiveProject);
  const workspaceDestination = resolveWorkspaceDestination(searchParams.get("next"));
  const projectsListHref = searchParams.get("next")
    ? `/projects?next=${encodeURIComponent(searchParams.get("next"))}`
    : "/projects";

  // Add navigation guard with skip ref
  useFormNavigationGuard(isDirty, skipNavigationGuardRef);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      const newProject = await createProject(formData);
      await setActiveProject(newProject.id);
      await fetchActiveProject();
      showToast(t("projectsAdd.toasts.createActiveSuccess", { name: newProject.name }), "success");

      skipNavigationGuardRef.current = true;
      navigate(workspaceDestination);
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
          navigate(projectsListHref);
        }}
        onDirtyChange={setIsDirty}
        isDirty={isDirty}
      />
    </PageLayout>
  );
}
