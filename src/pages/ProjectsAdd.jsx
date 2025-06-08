import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import ProjectForm from "../components/projects/ProjectForm.jsx";
import Button from "../components/ui/Button";
import useToastStore from "../stores/toastStore";
import { createProject, setActiveProject, getActiveProject } from "../utils/projectManager";
import useProjectStore from "../stores/projectStore";

export default function ProjectsAdd() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedProject, setLastCreatedProject] = useState(null);
  const [formKey, setFormKey] = useState("initial");

  const showToast = useToastStore((state) => state.showToast);
  const { setActiveProject: setActiveProjectInStore } = useProjectStore();

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      // Try to get active project first
      const activeProject = await getActiveProject();

      // Create the new project
      const newProject = await createProject(formData);
      setLastCreatedProject(newProject);

      // If we had no active project, this is our first one - set it as active
      if (!activeProject) {
        await setActiveProject(newProject.id);
        setActiveProjectInStore(newProject);
        showToast(`Project "${formData.name}" was created and set as active`, "success");
      } else {
        showToast(`Project "${formData.name}" was created successfully!`, "success");
      }

      setFormKey(`new-form-${Date.now()}`);
      return true;
    } catch (err) {
      showToast(err.message || "Failed to create project", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout title="Add project">
      {lastCreatedProject && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/projects")} icon={<ChevronLeft size={18} />}>
            Go to Projects List
          </Button>
          {lastCreatedProject && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/projects/edit/${lastCreatedProject.slug}`)}
              icon={<Pencil size={18} />}
            >
              Edit This Project
            </Button>
          )}
        </div>
      )}

      <ProjectForm
        key={formKey}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Create Project"
        onCancel={() => navigate("/projects")}
      />
    </PageLayout>
  );
}
