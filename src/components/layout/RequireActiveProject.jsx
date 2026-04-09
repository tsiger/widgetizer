import { useEffect, useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import useProjectStore from "../../stores/projectStore";
import useThemeStore from "../../stores/themeStore";
import useWidgetStore from "../../stores/widgetStore";
import useAutoSave from "../../stores/saveStore";
import usePageStore from "../../stores/pageStore";
import LoadingSpinner from "../ui/LoadingSpinner";

function RequireActiveProject() {
  const activeProject = useProjectStore((state) => state.activeProject);
  const loading = useProjectStore((state) => state.loading);
  const prevProjectIdRef = useRef(activeProject?.id);

  // Centralized store reset on project switch.
  // Zustand stores are singletons that live outside the React tree, so
  // remounting components alone does not clear their state. This effect
  // is the single place that coordinates store resets when the active
  // project changes.
  useEffect(() => {
    const prevId = prevProjectIdRef.current;
    const nextId = activeProject?.id;
    prevProjectIdRef.current = nextId;

    if (prevId && nextId && prevId !== nextId) {
      useThemeStore.getState().resetForProjectChange();
      useWidgetStore.getState().resetForProjectChange();
      useAutoSave.getState().reset();
      usePageStore.getState().clearPage();
    }
  }, [activeProject?.id]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!activeProject) {
    return <Navigate to="/projects" replace />;
  }

  // Key by project ID so all project-owned routes remount on project switch,
  // giving every component and effect a clean initial state. This works
  // together with the store resets above — stores clear the singleton state,
  // the key forces React to remount the UI tree.
  return <Outlet key={activeProject.id} />;
}

export default RequireActiveProject;
