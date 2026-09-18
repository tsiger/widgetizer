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
      const { pageId, pageNumber = "1", lang = "-" } = useParams();
      return <p>{`page ${lang} ${pageId} ${pageNumber}`}</p>;
    },
  };
});

vi.mock("../pages/CollectionItemPagePreview", async () => {
  const { useParams } = await import("react-router-dom");
  return {
    default: function CollectionItemPagePreviewStub() {
      const { prefix, slug, lang = "-" } = useParams();
      return <p>{`item ${lang} ${prefix} ${slug}`}</p>;
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
    expect(target).toBe("/preview/page/en/collection/page/2");
    expect(await screen.findByText("page en collection 2")).toBeTruthy();
    view.unmount();
  });

  it("opens item 2 of the collection published under page/", async () => {
    const { target, view } = await openLink("page/2.html");
    expect(target).toBe("/preview/collection/en/page/2");
    expect(await screen.findByText("item en page 2")).toBeTruthy();
    view.unmount();
  });

  it("resolves both the same way from Clean URLs links at depth", async () => {
    const paged = await openLink("../../collection/page/2");
    expect(await screen.findByText("page en collection 2")).toBeTruthy();
    paged.view.unmount();

    const item = await openLink("../page/2");
    expect(await screen.findByText("item en page 2")).toBeTruthy();
    item.view.unmount();
  });

  it("still opens an ordinary page", async () => {
    const { view } = await openLink("collection.html");
    expect(await screen.findByText("page en collection 1")).toBeTruthy();
    view.unmount();
  });
});

// The whole point of the namespace: `/preview/el/contact` cannot say whether
// `el` is a language or a collection prefix, so the language gets its own slot.
describe("standalone preview routing on a translated site", () => {
  const SITE = { collectionPrefixes: ["news"], languages: ["el"], defaultLanguage: "en" };

  async function open(href, options = SITE) {
    const target = getStandalonePreviewTarget(href, options);
    expect(isStandalonePreviewNavigationUrl(target)).toBe(true);
    const router = createMemoryRouter([{ path: "/preview", element: <Outlet />, children: previewRoutes }], {
      initialEntries: [target],
    });
    render(<RouterProvider router={router} />);
    return target;
  }

  it("opens the Greek page a cross-language link points at", async () => {
    const target = await open("el/contact.html");
    expect(target).toBe("/preview/page/el/contact");
    expect(screen.getByText("page el contact 1")).toBeTruthy();
  });

  it("opens the default language's page for a link that names no folder", async () => {
    await open("contact.html");
    expect(screen.getByText("page en contact 1")).toBeTruthy();
  });

  it("opens a paginated copy inside its language", async () => {
    const target = await open("el/blog/page/3.html");
    expect(target).toBe("/preview/page/el/blog/page/3");
    expect(screen.getByText("page el blog 3")).toBeTruthy();
  });

  it("opens a translated collection item", async () => {
    const target = await open("el/news/istoria.html");
    expect(target).toBe("/preview/collection/el/news/istoria");
    expect(screen.getByText("item el news istoria")).toBeTruthy();
  });

  it("still serves the flat routes, which mean the default language", async () => {
    const router = createMemoryRouter([{ path: "/preview", element: <Outlet />, children: previewRoutes }], {
      initialEntries: ["/preview/about"],
    });
    render(<RouterProvider router={router} />);
    expect(screen.getByText("page - about 1")).toBeTruthy();
  });

  it("does not mistake a collection prefix that looks like a language", async () => {
    // "de" is not enabled here, so de/guide.html is an item, not a German page.
    const target = await open("de/guide.html", { ...SITE, collectionPrefixes: ["news", "de"] });
    expect(target).toBe("/preview/collection/en/de/guide");
    expect(screen.getByText("item en de guide")).toBeTruthy();
  });
});
