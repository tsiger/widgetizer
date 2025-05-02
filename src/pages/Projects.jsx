import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Star, Pencil, AlertCircle, CirclePlus } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import Tooltip from "../components/ui/Tooltip";
import LoadingSpinner from "../components/ui/LoadingSpinner";

import useProjectStore from "../stores/projectStore";
import useToastStore from "../stores/toastStore";
import { getAllProjects, deleteProject, setActiveProject as setActiveProjectInBackend } from "../utils/projectManager";

import ConfirmationModal from "../components/ui/ConfirmationModal";
import useConfirmationModal from "../hooks/useConfirmationModal";

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get the showToast function from the toast store
  const showToast = useToastStore((state) => state.showToast);

  // Get state from the project store
  const activeProject = useProjectStore((state) => state.activeProject);
  const fetchActiveProject = useProjectStore((state) => state.fetchActiveProject);

  // Handle project deletion with confirmation
  const handleDelete = async (data) => {
    try {
      await deleteProject(data.projectId);
      await loadProjects(); // Reload the list
      showToast(`Project "${data.projectName}" was deleted successfully`, "success");
    } catch (err) {
      showToast("Failed to delete project", "error");
    }
  };

  // Use our custom confirmation modal hook
  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectsData = await getAllProjects();
      setProjects(projectsData);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirmation = (id, name) => {
    // Check if it's the active project
    if (activeProject && id === activeProject.id) {
      showToast("Cannot delete the active project. Please set another project as active first.", "error");
      return;
    }

    openModal({
      title: "Delete Project",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      data: { projectId: id, projectName: name },
    });
  };

  const handleSetActive = async (id) => {
    try {
      await setActiveProjectInBackend(id);
      // Update the store with the new active project
      await fetchActiveProject();
      await loadProjects(); // Reload to update active status

      // Find the project name to show in toast
      const project = projects.find((p) => p.id === id);
      if (project) {
        showToast(`"${project.name}" is now the active project`, "success");
      }
    } catch (err) {
      showToast("Failed to set active project", "error");
    }
  };

  if (loading) {
    return (
      <PageLayout title="Projects">
        <LoadingSpinner message="Loading projects..." />
      </PageLayout>
    );
  }

  if (!activeProject) {
    return (
      <PageLayout
        title="Projects"
        buttonProps={{
          onClick: () => navigate("/projects/add"),
          children: "New project",
          icon: <CirclePlus size={18} />,
        }}
      >
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">No Active Project</h2>
          <p className="text-slate-600 mb-4">Time to create your next big thing!</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Projects"
      buttonProps={{
        onClick: () => navigate("/projects/add"),
        children: "New project",
        icon: <CirclePlus size={18} />,
      }}
    >
      <div>
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-3 px-4">Title</th>
              <th className="text-left py-3 px-4">Created</th>
              <th className="text-left py-3 px-4">Updated</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-slate-500">
                  No projects yet. Create your first project!
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-slate-200 hover:bg-slate-50 transition-colors duration-150 group"
                >
                  <td className="py-3 px-4">
                    {activeProject && project.id === activeProject.id && (
                      <span className="mr-2 text-xs bg-pink-100 text-pink-600 border border-pink-200 px-2 py-1 rounded-full">
                        Active
                      </span>
                    )}
                    {project.name}
                  </td>
                  <td className="py-3 px-4">{new Date(project.created).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{new Date(project.updated).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Tooltip
                        content={
                          activeProject && project.id === activeProject.id
                            ? "Current active project"
                            : "Set as active project"
                        }
                      >
                        <button
                          onClick={() => handleSetActive(project.id)}
                          className={`p-2 hover:bg-slate-100 rounded-sm ${
                            activeProject && project.id === activeProject.id ? "cursor-default" : "cursor-pointer"
                          }`}
                          title={
                            activeProject && project.id === activeProject.id
                              ? "Current active project"
                              : "Set as active project"
                          }
                          disabled={activeProject && project.id === activeProject.id}
                        >
                          <Star
                            size={18}
                            className={
                              activeProject && project.id === activeProject.id
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-400 hover:text-yellow-400"
                            }
                          />
                        </button>
                      </Tooltip>
                      <Tooltip content="Edit project">
                        <button
                          onClick={() => navigate(`/projects/edit/${project.id}`)}
                          className="p-2 hover:bg-slate-100 rounded-sm text-slate-600 cursor-pointer"
                        >
                          <Pencil size={18} />
                        </button>
                      </Tooltip>
                      <Tooltip
                        content={
                          activeProject && project.id === activeProject.id
                            ? "Cannot delete active project"
                            : "Delete project"
                        }
                      >
                        <button
                          onClick={() => openDeleteConfirmation(project.id, project.name)}
                          className={`p-2 hover:bg-slate-100 rounded-sm ${
                            activeProject && project.id === activeProject.id
                              ? "text-slate-400 cursor-not-allowed"
                              : "text-red-600 cursor-pointer"
                          }`}
                          disabled={activeProject && project.id === activeProject.id}
                        >
                          <Trash2 size={18} />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        variant={modalState.variant}
      />
    </PageLayout>
  );
}
