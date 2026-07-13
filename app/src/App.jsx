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
import StaleProjectCurtain from "@widgetizer/editor-ui/components/ui/StaleProjectCurtain.jsx";
import LanguageInitializer from "./components/layout/LanguageInitializer";
import useProjectStore from "@widgetizer/editor-ui/stores/projectStore";
import useThemeStore from "@widgetizer/editor-ui/stores/themeStore";
import useWidgetStore from "@widgetizer/editor-ui/stores/widgetStore";
import useAutoSave from "@widgetizer/editor-ui/stores/saveStore";
import usePageStore from "@widgetizer/editor-ui/stores/pageStore";
import { registerProjectStore } from "@widgetizer/editor-ui/lib/activeProjectId";
import { useStaleActiveProjectDetection } from "@widgetizer/editor-ui/hooks/useStaleActiveProjectDetection";
import { handleActiveProjectChange } from "./lib/projectSwitchCoordinator";
import "./i18n";

// Register project store for apiFetch X-Project-Id header injection.
// Safe at module level — Zustand stores are singletons that exist immediately.
registerProjectStore(useProjectStore);

// Runs the cross-tab stale-active-project detection and renders its curtain,
// mounted via the editor `overlay` slot so it is scoped to the editor route — the
// blocking overlay never appears on the picker/preview routes. OSS-only: hosted's
// shell doesn't pass this slot content, so it opts out.
//
// Reload sends the tab to the editor's pages list rather than reloading the
// current URL: a deep editor URL (e.g. /page-editor?pageId=…) belongs to the *old*
// project and would 404 under the new active project. /pages re-enters through
// RequireActiveProject, which re-resolves the (now-current) active project and
// lands on its pages list.
function EditorStaleProjectGuard() {
  useStaleActiveProjectDetection();
  return <StaleProjectCurtain onReload={() => window.location.assign("/pages")} />;
}

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
      overlay: (
        <>
          <DebugStatePanel />
          <EditorStaleProjectGuard />
        </>
      ),
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
      <UpdateBanner />
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
