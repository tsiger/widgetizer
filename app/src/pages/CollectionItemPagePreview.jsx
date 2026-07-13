import { useEffect, useMemo } from "react";
import { useParams, useOutletContext } from "react-router-dom";

import useCollections from "@widgetizer/editor-ui/hooks/useCollections";
import { getCollectionItem, previewCollectionItem } from "@widgetizer/editor-ui/queries/collectionManager";
import { buildPreviewUrl } from "@widgetizer/editor-ui/lib/previewBase";

/**
 * Standalone site preview for a collection item page, reached by navigating to
 * `/preview/collection/:prefix/:slug` — from the editor's item Preview button or
 * by clicking a nested item link while browsing the site preview. A thin child of
 * SitePreviewLayout: it resolves the URL slugPrefix to a collection type via
 * useCollections (only hasItemPages collections qualify), loads the saved item,
 * requests a render token through previewCollectionItem -> /render/:token, and
 * reports the iframe src up to the layout. All chrome lives in the layout.
 */
export default function CollectionItemPagePreview() {
  const { prefix, slug } = useParams();
  const { setPreview } = useOutletContext();
  const { schemas, loading: schemasLoading } = useCollections();

  // Resolve the URL slugPrefix (e.g. "rooms") to a collection type (e.g.
  // "accommodation"). Only collections that actually produce item pages qualify.
  const schema = useMemo(
    () => (schemas || []).find((s) => s.slugPrefix === prefix && s.hasItemPages),
    [schemas, prefix],
  );

  useEffect(() => {
    if (schemasLoading) {
      setPreview({ src: null, loading: true, notFound: false });
      return undefined;
    }
    if (!schema) {
      setPreview({ src: null, loading: false, notFound: true });
      return undefined;
    }

    let cancelled = false;
    setPreview({ src: null, loading: true, notFound: false });
    (async () => {
      try {
        const item = await getCollectionItem(schema.type, slug);
        const { token } = await previewCollectionItem({
          collectionType: schema.type,
          slug: item.slug,
          settings: item.settings || {},
        });
        if (!cancelled) setPreview({ src: buildPreviewUrl(token), loading: false, notFound: false });
      } catch {
        if (!cancelled) setPreview({ src: null, loading: false, notFound: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schema, schemasLoading, slug, setPreview]);

  return null;
}
