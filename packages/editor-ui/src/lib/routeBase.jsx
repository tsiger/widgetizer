import { createContext, useContext } from "react";

// The base path the editor is mounted under in the host's router. The OSS shell
// mounts the editor at the root ("") so its internal links are plain absolute
// paths ("/pages", "/page-editor"); hosted mounts the same routes under
// `/sites/:siteId/edit`, so those links must be prefixed with that base or they
// escape the editor subtree and fall through to the host's catch-all route
// (which, in hosted, bounces to the dashboard / first site).
//
// This is a React context — not a module singleton like apiBase — because link
// hrefs are computed at render time, so the panels must re-render when the base
// resolves. apiBase can stay a singleton because it is read at fetch time.
const RouteBaseContext = createContext("");

export function RouteBaseProvider({ base = "", children }) {
  const normalized = base ? base.replace(/\/+$/, "") : "";
  return <RouteBaseContext.Provider value={normalized}>{children}</RouteBaseContext.Provider>;
}

/**
 * Returns a function that prefixes an editor-relative path with the configured
 * mount base: `editorPath("/pages")` → "/pages" in OSS, "/sites/s1/edit/pages"
 * in hosted. A leading slash is optional; query strings pass through unchanged.
 *
 * @returns {(path?: string) => string}
 */
export function useEditorPath() {
  const base = useContext(RouteBaseContext);
  return (path = "") => {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${base}${p}`;
  };
}
