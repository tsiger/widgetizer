import { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProjectPickerLayout from "./components/layout/ProjectPickerLayout";
import Projects from "./pages/Projects";
import Pages from "./pages/Pages";
import PagesAdd from "./pages/PagesAdd";
import PagesEdit from "./pages/PagesEdit";
import Menus from "./pages/Menus";
import MenusAdd from "./pages/MenusAdd";
import MenusEdit from "./pages/MenusEdit";
import Media from "./pages/Media";
import Settings from "./pages/Settings";
import Themes from "./pages/Themes";
import ExportSite from "./pages/ExportSite";
import AppSettings from "./pages/AppSettings";
import PageEditor from "./pages/PageEditor";
import PagePreview from "./pages/PagePreview";
import HomeRedirect from "./pages/HomeRedirect";
import ProjectsAdd from "./pages/ProjectsAdd";
import ProjectsEdit from "./pages/ProjectsEdit";
import MenuStructure from "./pages/MenuStructure";
import NotFound from "./pages/NotFound";
import RouteError from "./pages/RouteError";
import ToastContainer from "./components/ui/ToastContainer";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import RequireActiveProject from "./components/layout/RequireActiveProject";
import LanguageInitializer from "./components/layout/LanguageInitializer";
import useProjectStore from "./stores/projectStore";
import { registerProjectStore } from "./lib/activeProjectId";
import "./i18n";

// Register project store for apiFetch X-Project-Id header injection.
// Safe at module level — Zustand stores are singletons that exist immediately.
registerProjectStore(useProjectStore);

// Create router with data router API (required for useBlocker)
const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <HomeRedirect />,
      errorElement: <RouteError />,
    },
    {
      path: "/projects",
      element: <ProjectPickerLayout />,
      errorElement: <RouteError />,
      children: [
        {
          index: true,
          element: <Projects />,
        },
        {
          path: "add",
          element: <ProjectsAdd />,
        },
        {
          path: "edit/:id",
          element: <ProjectsEdit />,
        },
      ],
    },
    {
      path: "/app-settings",
      element: <ProjectPickerLayout />,
      errorElement: <RouteError />,
      children: [
        {
          index: true,
          element: <AppSettings />,
        },
      ],
    },
    {
      path: "/",
      element: <Layout />,
      errorElement: <RouteError />,
      children: [
        {
          element: <RequireActiveProject />,
          children: [
            {
              path: "pages",
              element: <Pages />,
            },
            {
              path: "pages/add",
              element: <PagesAdd />,
            },
            {
              path: "pages/:id/edit",
              element: <PagesEdit />,
            },
            {
              path: "page-editor",
              element: <PageEditor />,
            },
            {
              path: "menus",
              element: <Menus />,
            },
            {
              path: "menus/add",
              element: <MenusAdd />,
            },
            {
              path: "menus/edit/:id",
              element: <MenusEdit />,
            },
            {
              path: "menus/:id/structure",
              element: <MenuStructure />,
            },
            {
              path: "media",
              element: <Media />,
            },
            {
              path: "settings",
              element: <Settings />,
            },
            {
              path: "themes",
              element: <Themes />,
            },
            {
              path: "export-site",
              element: <ExportSite />,
            },
          ],
        },
      ],
    },
    {
      path: "/preview/:pageId",
      element: <PagePreview />,
      errorElement: <RouteError />,
    },
    {
      path: "*",
      element: <NotFound />,
    },
  ],
);

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
  // Bootstrap stores on mount
  useEffect(() => {
    useProjectStore.getState().fetchActiveProject();
  }, []);

  return (
    <ErrorBoundary>
      <AppWithToast />
    </ErrorBoundary>
  );
}

export default App;
