// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createEditorRoutes, EditorShell } from "../EditorShell.jsx";

describe("createEditorRoutes", () => {
  it("returns an EditorShell route with the editor child paths, gated by RequireActiveProject", () => {
    const errorElement = <div>boom</div>;
    const route = createEditorRoutes({ apiBase: "/api", errorElement, slots: { topbarRight: <span /> } });

    expect(route.path).toBe("/");
    expect(route.element.type).toBe(EditorShell);
    expect(route.errorElement).toBe(errorElement);

    // EditorShell props flow through to the layout element.
    expect(route.element.props.apiBase).toBe("/api");
    expect(route.element.props.slots.topbarRight).toBeTruthy();

    // One guarded child group holding the editor pages.
    expect(route.children).toHaveLength(1);
    const childPaths = route.children[0].children.map((r) => r.path);
    expect(childPaths).toEqual([
      "pages",
      "pages/add",
      "pages/:id/edit",
      "page-editor",
      "menus",
      "menus/add",
      "menus/edit/:id",
      "menus/:id/structure",
      "media",
      "settings",
      "export-site",
    ]);
  });

  it("honors a host-supplied basename path and default-empty plugins/slots", () => {
    const route = createEditorRoutes({ path: "/projects/:projectId/editor" });
    expect(route.path).toBe("/projects/:projectId/editor");
    expect(route.element.props.plugins).toEqual([]);
    expect(route.element.props.slots).toEqual({});
  });
});
