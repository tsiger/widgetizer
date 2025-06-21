import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import ProjectForm from "../components/projects/ProjectForm.jsx";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Button from "../components/ui/Button";

import useToastStore from "../stores/toastStore";
import { updateProject, getAllProjects, getActiveProject } from "../utils/projectManager";
import useProjectStore from "../stores/projectStore";

export default function ProjectsEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccessActions, setShowSuccessActions] = useState(false);

  const showToast = useToastStore((state) => state.showToast);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  const activeProject = useProjectStore((state) => state.activeProject);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const projects = await getAllProjects();
      const project = projects.find((p) => p.id === id);
      if (!project) {
        showToast("Project not found", "error");
        return;
      }
      setProject(project);
    } catch (err) {
      showToast(err.message || "Failed to load project", "error");
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

      // Check if the project ID changed (due to name change)
      if (updatedProject.id !== id) {
        // If this was the active project, refresh the active project state
        if (activeProject && activeProject.id === id) {
          const refreshedActiveProject = await getActiveProject();
          setActiveProject(refreshedActiveProject);
        }
        // Navigate to the new URL with the updated project ID
        navigate(`/projects/edit/${updatedProject.id}`, { replace: true });
        showToast(`Project "${formData.name}" was updated successfully and URL was changed.`, "success");
        return false;
      }

      if (activeProject && activeProject.id === id) {
        const refreshedActiveProject = await getActiveProject();
        setActiveProject(refreshedActiveProject);
      }

      showToast(`Project "${formData.name}" was updated successfully!`, "success");
      setShowSuccessActions(true);
      return false;
    } catch (err) {
      showToast(err.message || "Failed to update project", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <PageLayout title="Edit project">
        <LoadingSpinner message="Loading project..." />
      </PageLayout>
    );

  if (!project) return <PageLayout title="Edit Project">Project not found</PageLayout>;

  if (!activeProject) {
    showToast("Please select or create a project to manage your projects", "error");
    return (
      <PageLayout title="Edit project">
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No Active Project</h2>
          <p className="text-slate-600 mb-4">Please select or create a project to manage your projects.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Edit project">
      {showSuccessActions && (
        <div className="mb-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate("/projects")} icon={<ChevronLeft size={18} />}>
            Back to Projects List
          </Button>
        </div>
      )}

      {project && (
        <ProjectForm
          initialData={project}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
          onCancel={() => navigate("/projects")}
        />
      )}
    </PageLayout>
  );
}
