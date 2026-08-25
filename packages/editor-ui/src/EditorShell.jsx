import { useEffect, useMemo } from "react";
import { PluginProvider } from "./extension/PluginProvider.jsx";
import { builtinNavPlugin } from "./extension/builtinNav.js";
import Layout from "./components/layout/Layout.jsx";
import RequireActiveProject from "./components/layout/RequireActiveProject.jsx";
import { setApiBase } from "./lib/apiBase.js";
import { setPreviewRenderBase, setStandalonePreviewPath, setStandaloneCollectionPreviewPath } from "./lib/previewBase.js";
import { RouteBaseProvider } from "./lib/routeBase.jsx";
import { ConfirmProvider } from "./components/ui/ConfirmProvider.jsx";
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
import { EMPTY_ARRAY, EMPTY_OBJECT } from "./lib/emptyValues.js";
import CollectionItems from "./pages/CollectionItems.jsx";
import CollectionItemAdd from "./pages/CollectionItemAdd.jsx";
import CollectionItemEdit from "./pages/CollectionItemEdit.jsx";

// The mountable editor surface. Because `useBlocker`/navigation
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
// EditorProvider is the chrome-agnostic core: it registers plugins (incl. the
// built-in nav) into a <PluginProvider> and binds the two per-shell singletons
// (api base, active project) on mount, then renders whatever chrome the host
// passes as `children`. EditorShell uses it with the editor's own Layout; hosted
// uses it with the hosted dashboard Layout so the editor's section routes render
// natively in the dashboard chrome (the native-merge goal — no embedded shell).
export function EditorProvider({
  apiBase,
  previewRenderBase,
  standalonePreviewPath,
  standaloneCollectionPreviewPath,
  routeBase = "",
  project,
  scope,
  plugins = EMPTY_ARRAY,
  slots = EMPTY_OBJECT,
  children,
}) {
  const allPlugins = useMemo(() => [builtinNavPlugin, ...plugins], [plugins]);

  useEffect(() => {
    if (apiBase !== undefined) setApiBase(apiBase);
  }, [apiBase]);

  useEffect(() => {
    if (previewRenderBase !== undefined) setPreviewRenderBase(previewRenderBase);
  }, [previewRenderBase]);

  useEffect(() => {
    if (standalonePreviewPath !== undefined) setStandalonePreviewPath(standalonePreviewPath);
  }, [standalonePreviewPath]);

  useEffect(() => {
    if (standaloneCollectionPreviewPath !== undefined) setStandaloneCollectionPreviewPath(standaloneCollectionPreviewPath);
  }, [standaloneCollectionPreviewPath]);

  useEffect(() => {
    if (project) useProjectStore.getState().seedProject(project, scope ?? null);
  }, [project, scope]);

  return (
    <PluginProvider plugins={allPlugins} slots={slots}>
      {/* Mounted here rather than in Layout so hosted — which supplies its own
          chrome around EditorProvider — gets the navigation guards' confirm too. */}
      <ConfirmProvider>
        <RouteBaseProvider base={routeBase}>{children}</RouteBaseProvider>
      </ConfirmProvider>
    </PluginProvider>
  );
}

export function EditorShell({
  apiBase,
  previewRenderBase,
  standalonePreviewPath,
  standaloneCollectionPreviewPath,
  routeBase,
  project,
  scope,
  plugins = EMPTY_ARRAY,
  slots = EMPTY_OBJECT,
}) {
  return (
    <EditorProvider
      apiBase={apiBase}
      previewRenderBase={previewRenderBase}
      standalonePreviewPath={standalonePreviewPath}
      standaloneCollectionPreviewPath={standaloneCollectionPreviewPath}
      routeBase={routeBase}
      project={project}
      scope={scope}
      plugins={plugins}
      slots={slots}
    >
      <Layout />
    </EditorProvider>
  );
}

// The editor route children (relative paths), gated by RequireActiveProject so
// editor-scoped stores reset on project switch. Both shells render the same
// built-in set; plugin-contributed `routes` are merged into the same gated group
// (so e.g. a hosted Forms/Analytics nav item has a route to render).
// `excludePaths` drops named children (by `path`) from this built-in set — see
// `createEditorRoutes` JSDoc for why a host would use it.
function editorRouteChildren(plugins = EMPTY_ARRAY, excludePaths = EMPTY_ARRAY) {
  const pluginRoutes = plugins.flatMap((p) => (Array.isArray(p?.routes) ? p.routes : []));
  const children = [
    { path: "pages", element: <Pages /> },
    { path: "pages/add", element: <PagesAdd /> },
    { path: "pages/:id/edit", element: <PagesEdit /> },
    { path: "page-editor", element: <PageEditor /> },
    { path: "menus", element: <Menus /> },
    { path: "menus/add", element: <MenusAdd /> },
    { path: "menus/edit/:id", element: <MenusEdit /> },
    { path: "menus/:id/structure", element: <MenuStructure /> },
    { path: "media", element: <Media /> },
    { path: "collections/:type", element: <CollectionItems /> },
    { path: "collections/:type/add", element: <CollectionItemAdd /> },
    { path: "collections/:type/:slug/edit", element: <CollectionItemEdit /> },
    { path: "settings", element: <Settings /> },
    { path: "export-site", element: <ExportSite /> },
    ...pluginRoutes,
  ];
  const visible = excludePaths?.length ? children.filter((c) => !excludePaths.includes(c.path)) : children;
  return [
    {
      element: <RequireActiveProject />,
      children: visible,
    },
  ];
}

/**
 * Build the editor route object for a host `createBrowserRouter`. The host
 * supplies `basename` (its own route `path`) and `errorElement` (a shell page
 * editor-ui can't import). EditorShell-specific props (apiBase/project/scope/
 * plugins/slots) flow into the layout element.
 *
 * `excludePaths` is **route-only**: it omits the named built-in child routes
 * (matched by their relative `path`, e.g. `"export-site"`) so the host's
 * server can 404 the surface without a dead route still resolving client-side.
 * It does NOT touch navigation — the built-in nav plugin (`builtinNav.js`)
 * still advertises every built-in entry regardless of this option, so a host
 * using the stock `Layout`/`Sidebar` must separately filter its nav or it will
 * render a link to a route that no longer exists. Standalone OSS passes no
 * `excludePaths` and is unaffected (default keeps every route).
 *
 * @param {{ path?: string, errorElement?: React.ReactNode, apiBase?: string,
 *           project?: object, scope?: object, plugins?: Array<object>,
 *           slots?: Record<string, React.ReactNode>, excludePaths?: string[] }} [options]
 * @returns {object} a react-router route object
 */
export function createEditorRoutes({
  path = "/",
  routeBase,
  previewRenderBase,
  standalonePreviewPath,
  standaloneCollectionPreviewPath,
  errorElement,
  apiBase,
  project,
  scope,
  plugins = EMPTY_ARRAY,
  slots = EMPTY_OBJECT,
  excludePaths,
} = {}) {
  return {
    path,
    element: (
      <EditorShell
        apiBase={apiBase}
        previewRenderBase={previewRenderBase}
        standalonePreviewPath={standalonePreviewPath}
        standaloneCollectionPreviewPath={standaloneCollectionPreviewPath}
        routeBase={routeBase}
        project={project}
        scope={scope}
        plugins={plugins}
        slots={slots}
      />
    ),
    errorElement,
    children: editorRouteChildren(plugins, excludePaths),
  };
}
