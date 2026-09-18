import PagePreview from "./pages/PagePreview";
import CollectionItemPagePreview from "./pages/CollectionItemPagePreview";

// `/preview/el/contact` cannot say whether `el` is a language or a collection
// prefix, so a language is always spelled out under its own namespace. The flat
// routes stay, and mean the default language.
export const previewRoutes = [
  { path: "page/:lang/:pageId", element: <PagePreview /> },
  { path: "page/:lang/:pageId/page/:pageNumber", element: <PagePreview /> },
  { path: "collection/:lang/:prefix/:slug", element: <CollectionItemPagePreview /> },
  { path: ":pageId", element: <PagePreview /> },
  { path: "paged/:pageId/:pageNumber", element: <PagePreview /> },
  { path: "collection/:prefix/:slug", element: <CollectionItemPagePreview /> },
];
