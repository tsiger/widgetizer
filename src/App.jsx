import { useEffect, useRef } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { createEditorRoutes } from "@widgetizer/editor-ui";
import ProjectPickerLayout from "./components/layout/ProjectPickerLayout";
import Projects from "./pages/Projects";
import Themes from "./pages/Themes";
import AppSettings from "./pages/AppSettings";
import ProjectsAdd from "./pages/ProjectsAdd";
import ProjectsEdit from "./pages/ProjectsEdit";
import HomeRedirect from "./pages/HomeRedirect";
import PagePreview from "./pages/PagePreview";
import NotFound from "./pages/NotFound";
import RouteError from "./pages/RouteError";
import AdminMenu from "./components/layout/AdminMenu";
import UpdateBanner from "./components/layout/UpdateBanner";
import DebugStatePanel from "./components/dev/DebugStatePanel";
import ToastContainer from "./components/ui/ToastContainer";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import LanguageInitializer from "./components/layout/LanguageInitializer";
import useProjectStore from "./stores/projectStore";
import useThemeStore from "./stores/themeStore";
import useWidgetStore from "./stores/widgetStore";
import useAutoSave from "./stores/saveStore";
import usePageStore from "./stores/pageStore";
import { registerProjectStore } from "./lib/activeProjectId";
import { handleActiveProjectChange } from "./lib/projectSwitchCoordinator";
import "./i18n";

// Register project store for apiFetch X-Project-Id header injection.
// Safe at module level — Zustand stores are singletons that exist immediately.
registerProjectStore(useProjectStore);

// Create router with data router API (required for useBlocker). The editor tree
// is contributed by editor-ui's `createEditorRoutes` and composed in here; the
// OSS shell supplies its chrome through slots and keeps its own picker routes.
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomeRedirect />,
    errorElement: <RouteError />,
  },
  {
    path: "/",
    element: <ProjectPickerLayout />,
    errorElement: <RouteError />,
    children: [
      { path: "projects", element: <Projects /> },
      { path: "projects/add", element: <ProjectsAdd /> },
      { path: "projects/edit/:id", element: <ProjectsEdit /> },
      { path: "app-settings", element: <AppSettings /> },
      { path: "themes", element: <Themes /> },
    ],
  },
  createEditorRoutes({
    apiBase: "/api",
    errorElement: <RouteError />,
    slots: {
      topbarRight: <AdminMenu />,
      topbarBanner: <UpdateBanner />,
      overlay: <DebugStatePanel />,
    },
  }),
  {
    path: "/preview/:pageId",
    element: <PagePreview />,
    errorElement: <RouteError />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

// Wrapper component to include ToastContainer
function AppWithToast() {
  return (
    <>
      <RouterProvider router={router} />
      <LanguageInitializer />
      <ToastContainer />
    </>
  );
}

function App() {
  const activeProjectId = useProjectStore((state) => state.activeProject?.id);
  const prevProjectIdRef = useRef(activeProjectId);

  // Bootstrap stores on mount
  useEffect(() => {
    useProjectStore.getState().fetchActiveProject();
  }, []);

  useEffect(() => {
    handleActiveProjectChange({
      prevProjectId: prevProjectIdRef.current,
      nextProjectId: activeProjectId,
      themeStore: useThemeStore,
      widgetStore: useWidgetStore,
      autoSaveStore: useAutoSave,
      pageStore: usePageStore,
    });
    prevProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  return (
    <ErrorBoundary>
      <AppWithToast />
    </ErrorBoundary>
  );
}

export default App;
