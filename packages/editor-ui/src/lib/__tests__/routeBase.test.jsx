// @vitest-environment jsdom
//
// Guards the route-base contract the collection pages now depend on. The
// CollectionItems / CollectionItemAdd / CollectionItemEdit pages were changed to
// route every internal collection link through useEditorPath() so that, when the
// editor is mounted under a host base (hosted: "/sites/:siteId/edit"), the links
// stay inside the editor subtree instead of escaping to the host catch-all.
//
// A render-level test of those pages is impractical here: each one pulls live
// data + global state through useCollections / useCollectionItems /
// collectionManager / projectStore / toastStore / i18n / useFormatDate, so
// standing them up in isolation would be mostly mock scaffolding. Instead we pin
// the seam they all rely on — useEditorPath under a RouteBaseProvider — proving a
// "/collections/<type>..." path is prefixed with the configured mount base (and
// is left bare at the OSS root).

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { RouteBaseProvider, useEditorPath } from "../routeBase.jsx";

function wrapperFor(base) {
  return function Wrapper({ children }) {
    return <RouteBaseProvider base={base}>{children}</RouteBaseProvider>;
  };
}

describe("useEditorPath (collection-page route base contract)", () => {
  it("prefixes a collection list path with the hosted mount base", () => {
    const { result } = renderHook(() => useEditorPath(), {
      wrapper: wrapperFor("/sites/s1/edit"),
    });
    expect(result.current("/collections/news")).toBe("/sites/s1/edit/collections/news");
  });

  it("prefixes the collection add path with the hosted mount base", () => {
    const { result } = renderHook(() => useEditorPath(), {
      wrapper: wrapperFor("/sites/s1/edit"),
    });
    expect(result.current("/collections/news/add")).toBe(
      "/sites/s1/edit/collections/news/add",
    );
  });

  it("prefixes the collection item edit path with the hosted mount base", () => {
    const { result } = renderHook(() => useEditorPath(), {
      wrapper: wrapperFor("/sites/s1/edit"),
    });
    expect(result.current("/collections/news/hello-world/edit")).toBe(
      "/sites/s1/edit/collections/news/hello-world/edit",
    );
  });

  it("leaves collection paths bare at the OSS root (no provider / empty base)", () => {
    // No RouteBaseProvider => default context value is "" (the OSS shell).
    const { result } = renderHook(() => useEditorPath());
    expect(result.current("/collections/news")).toBe("/collections/news");
    expect(result.current("/collections/news/add")).toBe("/collections/news/add");
  });

  it("normalizes a trailing slash on the base and tolerates a leading-slash-less path", () => {
    const { result } = renderHook(() => useEditorPath(), {
      wrapper: wrapperFor("/sites/s1/edit/"),
    });
    // Trailing slash on the base is stripped; a path without a leading slash is
    // still joined with exactly one separator.
    expect(result.current("collections/news")).toBe("/sites/s1/edit/collections/news");
  });
});
