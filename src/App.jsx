import { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
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
import Plugins from "./pages/Plugins";
import ExportSite from "./pages/ExportSite";
import AppSettings from "./pages/AppSettings";
import PageEditor from "./pages/PageEditor";
import PagePreview from "./pages/PagePreview";
import ProjectsAdd from "./pages/ProjectsAdd";
import ProjectsEdit from "./pages/ProjectsEdit";
import MenuStructure from "./pages/MenuStructure";
import ToastContainer from "./components/ui/ToastContainer";
import RequireActiveProject from "./components/layout/RequireActiveProject";
import RouteSourceGuard from "./components/layout/RouteSourceGuard";
import HostedModeGuard from "./components/layout/HostedModeGuard";
import DeepLinkResolver from "./components/layout/DeepLinkResolver";
import useProjectStore from "./stores/projectStore";
import useAppInfoStore from "./stores/appInfoStore";
import "./i18n";
import LanguageInitializer from "./components/layout/LanguageInitializer";

// Create router with data router API (required for useBlocker)
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        element: <DeepLinkResolver />,
        children: [
          {
            // Dashboard/Projects routes — blocked in hosted mode (HostedModeGuard)
            element: <HostedModeGuard />,
            children: [
              {
                index: true,
                element: <Dashboard />,
              },
              {
                path: "projects",
                element: <Projects />,
              },
              {
                path: "projects/add",
                element: <ProjectsAdd />,
              },
              {
                path: "projects/edit/:id",
                element: <ProjectsEdit />,
              },
            ],
          },
          {
            element: <RequireActiveProject />,
            children: [
              {
                element: <RouteSourceGuard />,
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
                path: "plugins",
                element: <Plugins />,
              },
              {
                path: "export-site",
                element: <ExportSite />,
              },
              {
                path: "app-settings",
                element: <AppSettings />,
              },
            ],
          },
        ],
      },
        ],
      },
    ],
  },
  {
    path: "/preview/:pageId",
    element: <PagePreview />,
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
  // Bootstrap stores on mount
  useEffect(() => {
    useProjectStore.getState().fetchActiveProject();
    useAppInfoStore.getState().fetchAppInfo();
  }, []);

  return <AppWithToast />;
}

export default App;
