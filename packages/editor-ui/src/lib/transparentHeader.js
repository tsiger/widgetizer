import { renderedWidgetOrder } from "@widgetizer/core/widgetOrder";

/**
 * Whether a header set to turn transparent over a hero does so on this page: the
 * first widget the page shows (as the full render picks it) supports it. Read from
 * the page's own widgets — a shared area's widget is never the page's first.
 *
 * @param {{ widgets?: object, widgetsOrder?: unknown }|null} page
 * @param {Record<string, object>} schemas - widget schemas keyed by type
 * @returns {boolean}
 */
export function pageOpensTransparent(page, schemas) {
  const firstId = renderedWidgetOrder(page?.widgets, page?.widgetsOrder)[0];
  return !!firstId && schemas?.[page.widgets[firstId]?.type]?.supportsTransparentHeader === true;
}
