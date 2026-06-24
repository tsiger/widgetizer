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
import SitePreviewLayout from "./pages/SitePreviewLayout";
import PagePreview from "./pages/PagePreview";
import CollectionItemPagePreview from "./pages/CollectionItemPagePreview";
import NotFound from "./pages/NotFound";
import RouteError from "./pages/RouteError";
import AdminMenu from "./components/layout/AdminMenu";
import UpdateBanner from "./components/layout/UpdateBanner";
import DebugStatePanel from "./components/dev/DebugStatePanel";
import ToastContainer from "@widgetizer/editor-ui/components/ui/ToastContainer.jsx";
import ErrorBoundary from "@widgetizer/editor-ui/components/ui/ErrorBoundary.jsx";
import LanguageInitializer from "./components/layout/LanguageInitializer";
import useProjectStore from "@widgetizer/editor-ui/stores/projectStore";
import useThemeStore from "@widgetizer/editor-ui/stores/themeStore";
import useWidgetStore from "@widgetizer/editor-ui/stores/widgetStore";
import useAutoSave from "@widgetizer/editor-ui/stores/saveStore";
import usePageStore from "@widgetizer/editor-ui/stores/pageStore";
import { registerProjectStore } from "@widgetizer/editor-ui/lib/activeProjectId";
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
    // Persistent shell for the standalone site preview: the toolbar + iframe
    // stage live here so navigating page<->item never remounts them. Children are
    // headless resolvers that report a render src up via the outlet context.
    path: "/preview",
    element: <SitePreviewLayout />,
    errorElement: <RouteError />,
    children: [
      { path: ":pageId", element: <PagePreview /> },
      { path: "collection/:prefix/:slug", element: <CollectionItemPagePreview /> },
    ],
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
