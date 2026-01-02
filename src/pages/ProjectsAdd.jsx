import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Pencil } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import ProjectForm from "../components/projects/ProjectForm.jsx";
import Button from "../components/ui/Button";
import useToastStore from "../stores/toastStore";
import { createProject } from "../queries/projectManager";
import useProjectStore from "../stores/projectStore";
import useFormNavigationGuard from "../hooks/useFormNavigationGuard";

export default function ProjectsAdd() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedProject, setLastCreatedProject] = useState(null);
  const [formKey, setFormKey] = useState("initial");
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
      setLastCreatedProject(newProject);

      // Update store if backend activated it
      if (newProject.wasSetAsActive) {
        setActiveProjectInStore(newProject);
        showToast(t("projectsAdd.toasts.createActiveSuccess", { name: formData.name }), "success");
      } else {
        showToast(t("projectsAdd.toasts.createSuccess", { name: formData.name }), "success");
      }

      setFormKey(`new-form-${Date.now()}`);
      setIsDirty(false); // Reset dirty state after successful save
      return true;
    } catch (err) {
      showToast(err.message || t("projectsAdd.toasts.createError"), "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout title={t("projectsAdd.title")}>
      {lastCreatedProject && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/projects")} icon={<ChevronLeft size={18} />}>
            {t("projectsAdd.goToList")}
          </Button>
          {lastCreatedProject && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/projects/edit/${lastCreatedProject.id}`)}
              icon={<Pencil size={18} />}
            >
              {t("projectsAdd.editThis")}
            </Button>
          )}
        </div>
      )}

      <ProjectForm
        key={formKey}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={t("projectsAdd.create")}
        onCancel={() => {
          skipNavigationGuardRef.current = true;
          navigate("/projects");
        }}
        onDirtyChange={setIsDirty}
      />
      
      {isDirty && (
        <div className="mt-4 text-sm text-amber-600">
          {t("common.unsavedChanges")}
        </div>
      )}
    </PageLayout>
  );
}
