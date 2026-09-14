import PagePreview from "./pages/PagePreview";
import CollectionItemPagePreview from "./pages/CollectionItemPagePreview";

export const previewRoutes = [
  { path: ":pageId", element: <PagePreview /> },
  { path: "paged/:pageId/:pageNumber", element: <PagePreview /> },
  { path: "collection/:prefix/:slug", element: <CollectionItemPagePreview /> },
];
