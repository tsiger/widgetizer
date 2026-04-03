import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Trash2,
  Pencil,
  FolderOpen,
  CirclePlus,
  Copy,
  Download,
  Upload,
  ArrowUpCircle,
  MoreVertical,
} from "lucide-react";

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
  setActiveProject as activateProject,
  exportProject,
} from "../queries/projectManager";
import { sortItemsByCopyName } from "../utils/copyNameSort";
import { formatDate } from "../utils/dateFormatter";
import { resolveWorkspaceDestination } from "../utils/projectNavigation";

import ConfirmationModal from "../components/ui/ConfirmationModal";
import useConfirmationModal from "../hooks/useConfirmationModal";
import ProjectImportModal from "../components/projects/ProjectImportModal";

export default function Projects() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportingProjectId, setExportingProjectId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  const showToast = useToastStore((state) => state.showToast);
  const dismissToast = useToastStore((state) => state.dismissToast);
  const activeProject = useProjectStore((state) => state.activeProject);
  const fetchActiveProject = useProjectStore((state) => state.fetchActiveProject);
  const { settings: appSettings } = useAppSettings();
  const workspaceDestination = resolveWorkspaceDestination(searchParams.get("next"));

  const projectsAddHref = searchParams.get("next")
    ? `/projects/add?next=${encodeURIComponent(searchParams.get("next"))}`
    : "/projects/add";

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

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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

  const openProjectWorkspace = async (project) => {
    try {
      if (!activeProject || activeProject.id !== project.id) {
        await activateProject(project.id);
        await fetchActiveProject();
        await loadProjects();
        showToast(t("projects.toasts.setActiveSuccess", { name: project.name }), "success");
      }

      navigate(workspaceDestination);
    } catch (error) {
      console.error("Failed to open project:", error);
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
    await openProjectWorkspace(importedProject);
  };

  if (loading) {
    return (
      <PageLayout title={t("projects.title")}>
        <LoadingSpinner message={t("projects.loading")} />
      </PageLayout>
    );
  }

  const sortedProjects = sortItemsByCopyName(projects);
  const hasProjects = sortedProjects.length > 0;

  return (
    <PageLayout
      title={hasProjects ? t("projects.title") : undefined}
      description={hasProjects ? t("projects.description") : undefined}
      buttonProps={
        hasProjects
          ? {
              onClick: () => navigate(projectsAddHref),
              children: t("projects.newProject"),
              icon: <CirclePlus size={18} />,
            }
          : undefined
      }
      additionalButtons={
        hasProjects ? (
          <Button variant="secondary" onClick={() => setImportModalOpen(true)} icon={<Download size={18} />}>
            {t("projects.import")}
          </Button>
        ) : undefined
      }
    >
      {!hasProjects ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <FolderOpen size={52} className="mb-4 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900">{t("projects.emptyTitle")}</h2>
          <p className="mt-2 max-w-xl text-slate-600">{t("projects.noProjects")}</p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => navigate(projectsAddHref)} icon={<CirclePlus size={18} />}>
              {t("projects.newProject")}
            </Button>
            <Button variant="secondary" onClick={() => setImportModalOpen(true)} icon={<Download size={18} />}>
              {t("projects.import")}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Table
            headers={[
              t("projects.headers.title"),
              t("projects.headers.theme", "Theme"),
              t("projects.headers.updated"),
              t("projects.headers.actions"),
            ]}
            data={sortedProjects}
            emptyMessage={t("projects.noProjects")}
            renderRow={(project) => {
              const dateFormat = appSettings?.general?.dateFormat || "MMMM D, YYYY h:mm A";
              const isCurrentProject = activeProject && project.id === activeProject.id;
              const themeLabel = project.themeName || project.theme || "Unknown";
              const isExporting = exportingProjectId === project.id;
              const menuButtonClass = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors";

              return (
                <>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => openProjectWorkspace(project)}
                      className="flex w-full min-w-0 items-center gap-3 rounded-sm text-left text-slate-900 transition-colors hover:text-pink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
                      title={project.name}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{project.name}</span>
                        {isCurrentProject && (
                          <Badge
                            variant="neutral"
                            className="mt-1 inline-flex whitespace-nowrap border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                          >
                            {t("projects.badges.active")}
                          </Badge>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex min-w-0 items-baseline gap-1.5 text-slate-600" title={themeLabel}>
                        <span className="min-w-0 truncate text-sm">{themeLabel}</span>
                        {project.themeVersion && <span className="shrink-0 text-xs text-slate-400">v{project.themeVersion}</span>}
                      </div>
                      {project.hasThemeUpdate && (
                        <Tooltip content={t("projects.badges.updateAvailable", "Update available")}>
                          <ArrowUpCircle size={16} className="shrink-0 text-pink-500" />
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600">{formatDate(project.updated, dateFormat)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="relative inline-flex items-center justify-end gap-1.5" ref={openMenuId === project.id ? menuRef : null}>
                      <IconButton
                        onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)}
                        variant="neutral"
                        size="sm"
                        className={`border transition-all ${
                          openMenuId === project.id
                            ? "border-pink-200 bg-pink-50 text-pink-600"
                            : "border-transparent bg-white/80 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                        }`}
                        aria-label={t("projects.actions.menu", "Project actions")}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === project.id}
                      >
                        <MoreVertical size={18} />
                      </IconButton>

                      {openMenuId === project.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              openProjectWorkspace(project);
                            }}
                            className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
                          >
                            <FolderOpen size={14} />
                            {t("projects.actions.setActive")}
                          </button>
                          <div className="my-1 border-t border-slate-200" />
                          <Link
                            to={`/projects/edit/${project.id}`}
                            onClick={() => setOpenMenuId(null)}
                            className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
                          >
                            <Pencil size={14} />
                            {t("projects.actions.editDetails", "Edit project details")}
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDuplicate(project.id);
                            }}
                            className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}
                          >
                            <Copy size={14} />
                            {t("projects.actions.duplicate")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleExport(project.id);
                            }}
                            disabled={isExporting}
                            className={`${menuButtonClass} text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white`}
                          >
                            <Upload size={14} />
                            {isExporting ? t("projects.actions.exporting", "Exporting project...") : t("projects.actions.export")}
                          </button>
                          <div className="my-1 border-t border-slate-200" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              openDeleteConfirmation(project.id, project.name);
                            }}
                            disabled={isCurrentProject}
                            className={`${menuButtonClass} text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white`}
                          >
                            <Trash2 size={14} />
                            {isCurrentProject ? t("projects.actions.cannotDeleteActive") : t("projects.actions.delete")}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </>
              );
            }}
          />
        </div>
      )}

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
