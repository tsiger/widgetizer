import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trash2, Star, Pencil, AlertCircle, CirclePlus, Copy, Download, Upload, ArrowUpCircle } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";
import Tooltip from "../components/ui/Tooltip";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Button, { IconButton } from "../components/ui/Button";

import useProjectStore from "../stores/projectStore";
import useToastStore from "../stores/toastStore";
import useAppSettings from "../hooks/useAppSettings";
import {
  getAllProjects,
  deleteProject,
  duplicateProject,
  setActiveProject as setActiveProjectInBackend,
  exportProject,
} from "../queries/projectManager";
import { formatDate } from "../utils/dateFormatter";

import ConfirmationModal from "../components/ui/ConfirmationModal";
import useConfirmationModal from "../hooks/useConfirmationModal";
import ProjectImportModal from "../components/projects/ProjectImportModal";

export default function Projects() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportingProjectId, setExportingProjectId] = useState(null);

  const showToast = useToastStore((state) => state.showToast);
  const dismissToast = useToastStore((state) => state.dismissToast);
  const activeProject = useProjectStore((state) => state.activeProject);
  const fetchActiveProject = useProjectStore((state) => state.fetchActiveProject);
  const { settings: appSettings } = useAppSettings();

  const handleDelete = async (data) => {
    try {
      await deleteProject(data.projectId);
      await loadProjects();
      showToast(t("projects.toasts.deleteSuccess", { name: data.projectName }), "success");
    } catch (error) {
      console.error("Failed to delete project:", error);
      showToast(t("projects.toasts.deleteError"), "error");
    }
  };

  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDelete);

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (activeProject && id === activeProject.id) {
      showToast(t("projects.toasts.cannotDeleteActive"), "error");
      return;
    }

    openModal({
      title: t("projects.deleteModal.title"),
      message: t("projects.deleteModal.message", { name }),
      confirmText: t("projects.deleteModal.confirm"),
      cancelText: t("projects.deleteModal.cancel"),
      variant: "danger",
      data: { projectId: id, projectName: name },
    });
  };

  const handleSetActive = async (id) => {
    try {
      await setActiveProjectInBackend(id);
      await fetchActiveProject();
      await loadProjects();

      const project = projects.find((p) => p.id === id);
      if (project) {
        showToast(t("projects.toasts.setActiveSuccess", { name: project.name }), "success");
      }
    } catch (error) {
      console.error("Failed to set active project:", error);
      showToast(t("projects.toasts.setActiveError"), "error");
    }
  };

  const handleDuplicate = async (projectId) => {
    try {
      await duplicateProject(projectId);
      await loadProjects();
      showToast(t("projects.toasts.duplicateSuccess"), "success");
    } catch (error) {
      console.error("Failed to duplicate project:", error);
      showToast(t("projects.toasts.duplicateError"), "error");
    }
  };

  const handleExport = async (projectId) => {
    let loadingToastId = null;
    try {
      setExportingProjectId(projectId);
      
      // Show loading toast immediately (persistent - no auto-dismiss)
      loadingToastId = showToast(t("projects.toasts.exportInProgress"), "info", { duration: null });

      await exportProject(projectId);
      
      // Dismiss loading toast before showing success
      if (loadingToastId) {
        dismissToast(loadingToastId);
      }
      showToast(t("projects.toasts.exportSuccess"), "success");
    } catch (error) {
      console.error("Failed to export project:", error);
      // Dismiss loading toast before showing error
      if (loadingToastId) {
        dismissToast(loadingToastId);
      }
      showToast(error.message || t("projects.toasts.exportError"), "error");
    } finally {
      setExportingProjectId(null);
    }
  };

  const handleImportSuccess = async (importedProject) => {
    await loadProjects();
    showToast(t("projects.toasts.importSuccess", { name: importedProject.name }), "success");
    setImportModalOpen(false);
  };

  if (loading) {
    return (
      <PageLayout title={t("projects.title")}>
        <LoadingSpinner message={t("projects.loading")} />
      </PageLayout>
    );
  }

  if (!activeProject) {
    return (
      <PageLayout
        title={t("projects.title")}
        buttonProps={{
          onClick: () => navigate("/projects/add"),
          children: t("projects.newProject"),
          icon: <CirclePlus size={18} />,
        }}
      >
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-semibold mb-2">{t("projects.noActiveProject")}</h2>
          <p className="text-slate-600 mb-4">{t("projects.noActiveProjectDesc")}</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={t("projects.title")}
      buttonProps={{
        onClick: () => navigate("/projects/add"),
        children: t("projects.newProject"),
        icon: <CirclePlus size={18} />,
      }}
      additionalButtons={
        <Button variant="secondary" onClick={() => setImportModalOpen(true)} icon={<Download size={18} />}>
          {t("projects.import")}
        </Button>
      }
    >
      <div>
        <Table
          headers={[
            t("projects.headers.title"),
            t("projects.headers.folderName"),
            t("projects.headers.theme", "Theme"),
            t("projects.headers.created"),
            t("projects.headers.updated"),
            t("projects.headers.actions"),
          ]}
          data={projects}
          emptyMessage={t("projects.noProjects")}
          renderRow={(project) => {
            const dateFormat = appSettings?.general?.dateFormat || "MM/DD/YYYY";

            return (
              <>
                <td className="py-3 px-4">
                  {activeProject && project.id === activeProject.id && (
                    <Badge variant="pink" className="mr-2">
                      {t("projects.badges.active")}
                    </Badge>
                  )}
                  {project.name}
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-slate-600">{project.folderName}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">
                      {project.themeName || project.theme}
                      {project.themeVersion && (
                        <span className="ml-1 text-xs text-slate-400">v{project.themeVersion}</span>
                      )}
                    </span>
                    {project.hasThemeUpdate && (
                      <Tooltip content={t("projects.badges.updateAvailable", "Update available")}>
                        <ArrowUpCircle size={16} className="text-pink-500" />
                      </Tooltip>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">{formatDate(project.created, dateFormat)}</td>
                <td className="py-3 px-4">{formatDate(project.updated, dateFormat)}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="flex gap-2 pr-2 border-r border-slate-200">
                      <Tooltip
                        content={
                          activeProject && project.id === activeProject.id
                            ? t("projects.actions.currentActive")
                            : t("projects.actions.setActive")
                        }
                      >
                        <IconButton
                          onClick={() => handleSetActive(project.id)}
                          variant="neutral"
                          size="sm"
                          disabled={activeProject && project.id === activeProject.id}
                          title={
                            activeProject && project.id === activeProject.id
                              ? t("projects.actions.currentActive")
                              : t("projects.actions.setActive")
                          }
                        >
                          <Star
                            size={18}
                            className={
                              activeProject && project.id === activeProject.id
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-400 hover:text-yellow-400"
                            }
                          />
                        </IconButton>
                      </Tooltip>
                    </div>
                    <Tooltip content={t("projects.actions.edit")}>
                      <IconButton onClick={() => navigate(`/projects/edit/${project.id}`)} variant="neutral" size="sm">
                        <Pencil size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content={t("projects.actions.duplicate")}>
                      <IconButton onClick={() => handleDuplicate(project.id)} variant="neutral" size="sm">
                        <Copy size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip content={t("projects.actions.export")}>
                      <IconButton
                        onClick={() => handleExport(project.id)}
                        variant="neutral"
                        size="sm"
                        disabled={exportingProjectId === project.id}
                      >
                        <Upload size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip
                      content={
                        activeProject && project.id === activeProject.id
                          ? t("projects.actions.cannotDeleteActive")
                          : t("projects.actions.delete")
                      }
                    >
                      <IconButton
                        onClick={() => openDeleteConfirmation(project.id, project.name)}
                        variant={activeProject && project.id === activeProject.id ? "neutral" : "danger"}
                        size="sm"
                        disabled={activeProject && project.id === activeProject.id}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Tooltip>
                  </div>
                </td>
              </>
            );
          }}
        />
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

      <ProjectImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </PageLayout>
  );
}
