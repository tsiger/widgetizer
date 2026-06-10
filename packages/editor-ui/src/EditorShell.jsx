import { useEffect, useMemo } from "react";
import { PluginProvider } from "./extension/PluginProvider.jsx";
import { builtinNavPlugin } from "./extension/builtinNav.js";
import Layout from "./components/layout/Layout.jsx";
import RequireActiveProject from "./components/layout/RequireActiveProject.jsx";
import { setApiBase } from "./lib/apiBase.js";
import useProjectStore from "./stores/projectStore.js";

import Pages from "./pages/Pages.jsx";
import PagesAdd from "./pages/PagesAdd.jsx";
import PagesEdit from "./pages/PagesEdit.jsx";
import PageEditor from "./pages/PageEditor.jsx";
import Menus from "./pages/Menus.jsx";
import MenusAdd from "./pages/MenusAdd.jsx";
import MenusEdit from "./pages/MenusEdit.jsx";
import MenuStructure from "./pages/MenuStructure.jsx";
import Media from "./pages/Media.jsx";
import Settings from "./pages/Settings.jsx";
import ExportSite from "./pages/ExportSite.jsx";

// The mountable editor surface (design doc §5). Because `useBlocker`/navigation
// guards require a single data-router context, EditorShell does NOT own a
// router — it is the *element* for the editor layout route, and the host splices
// `createEditorRoutes()` into its own `createBrowserRouter`. EditorShell wraps
// the editor chrome in a <PluginProvider> ([builtinNav, ...plugins]) and binds
// the two per-shell singletons (api base, active project) on mount:
//   - OSS composes with no `project` (its App still drives fetchActiveProject);
//   - hosted passes a known `project` (+ cloud `scope`) to seed without a fetch.
//
// @param {{ apiBase?: string, project?: object, scope?: object,
//           plugins?: Array<object>, slots?: Record<string, React.ReactNode> }} props
export function EditorShell({ apiBase, project, scope, plugins = [], slots = {} }) {
  const allPlugins = useMemo(() => [builtinNavPlugin, ...plugins], [plugins]);

  useEffect(() => {
    if (apiBase !== undefined) setApiBase(apiBase);
  }, [apiBase]);

  useEffect(() => {
    if (project) useProjectStore.getState().seedProject(project, scope ?? null);
  }, [project, scope]);

  return (
    <PluginProvider plugins={allPlugins} slots={slots}>
      <Layout />
    </PluginProvider>
  );
}

// The editor route children (relative paths), gated by RequireActiveProject so
// editor-scoped stores reset on project switch. Both shells render the same set.
function editorRouteChildren() {
  return [
    {
      element: <RequireActiveProject />,
      children: [
        { path: "pages", element: <Pages /> },
        { path: "pages/add", element: <PagesAdd /> },
        { path: "pages/:id/edit", element: <PagesEdit /> },
        { path: "page-editor", element: <PageEditor /> },
        { path: "menus", element: <Menus /> },
        { path: "menus/add", element: <MenusAdd /> },
        { path: "menus/edit/:id", element: <MenusEdit /> },
        { path: "menus/:id/structure", element: <MenuStructure /> },
        { path: "media", element: <Media /> },
        { path: "settings", element: <Settings /> },
        { path: "export-site", element: <ExportSite /> },
      ],
    },
  ];
}

/**
 * Build the editor route object for a host `createBrowserRouter`. The host
 * supplies `basename` (its own route `path`) and `errorElement` (a shell page
 * editor-ui can't import). EditorShell-specific props (apiBase/project/scope/
 * plugins/slots) flow into the layout element.
 *
 * @param {{ path?: string, errorElement?: React.ReactNode, apiBase?: string,
 *           project?: object, scope?: object, plugins?: Array<object>,
 *           slots?: Record<string, React.ReactNode> }} [options]
 * @returns {object} a react-router route object
 */
export function createEditorRoutes({
  path = "/",
  errorElement,
  apiBase,
  project,
  scope,
  plugins = [],
  slots = {},
} = {}) {
  return {
    path,
    element: <EditorShell apiBase={apiBase} project={project} scope={scope} plugins={plugins} slots={slots} />,
    errorElement,
    children: editorRouteChildren(),
  };
}
