// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, Outlet } from "react-router-dom";
import { isStandalonePreviewNavigationUrl } from "@widgetizer/editor-ui/utils/previewLinkUtils";
import { getStandalonePreviewTarget } from "../../../packages/core/src/runtime/standalonePreviewTarget.js";

vi.mock("../pages/PagePreview", async () => {
  const { useParams } = await import("react-router-dom");
  return {
    default: function PagePreviewStub() {
      const { pageId, pageNumber = "1" } = useParams();
      return <p>{`page ${pageId} ${pageNumber}`}</p>;
    },
  };
});

vi.mock("../pages/CollectionItemPagePreview", async () => {
  const { useParams } = await import("react-router-dom");
  return {
    default: function CollectionItemPagePreviewStub() {
      const { prefix, slug } = useParams();
      return <p>{`item ${prefix} ${slug}`}</p>;
    },
  };
});

const { previewRoutes } = await import("../previewRoutes.jsx");

const PROJECT = { collectionPrefixes: ["news", "page"] };

async function openLink(href) {
  const target = getStandalonePreviewTarget(href, PROJECT);
  expect(isStandalonePreviewNavigationUrl(target)).toBe(true);
  const router = createMemoryRouter([{ path: "/preview", element: <Outlet />, children: previewRoutes }], {
    initialEntries: [target],
  });
  const view = render(<RouterProvider router={router} />);
  return { target, view };
}

describe("standalone preview routing — a page named collection next to a collection published under page/", () => {
  it("opens page 2 of the page named collection", async () => {
    const { target, view } = await openLink("collection/page/2.html");
    expect(target).toBe("/preview/paged/collection/2");
    expect(await screen.findByText("page collection 2")).toBeTruthy();
    view.unmount();
  });

  it("opens item 2 of the collection published under page/", async () => {
    const { target, view } = await openLink("page/2.html");
    expect(target).toBe("/preview/collection/page/2");
    expect(await screen.findByText("item page 2")).toBeTruthy();
    view.unmount();
  });

  it("resolves both the same way from Clean URLs links at depth", async () => {
    const paged = await openLink("../../collection/page/2");
    expect(await screen.findByText("page collection 2")).toBeTruthy();
    paged.view.unmount();

    const item = await openLink("../page/2");
    expect(await screen.findByText("item page 2")).toBeTruthy();
    item.view.unmount();
  });

  it("still opens an ordinary page", async () => {
    const { view } = await openLink("collection.html");
    expect(await screen.findByText("page collection 1")).toBeTruthy();
    view.unmount();
  });
});
