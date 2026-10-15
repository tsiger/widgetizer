/**
 * `format_date` filter — renders a date-only "YYYY-MM-DD" value using the active
 * theme's date format (the `date_format` theme setting, exposed by the rendering
 * service as the `globals.dateFormat` render global), with an optional override.
 *
 *   {{ item.settings.date | format_date }}             → respects the theme setting
 *   {{ item.settings.date | format_date: 'D MMM YYYY' } → explicit per-call override
 *
 * Lives under src/core so it imports no backend-only code (same constraint as the
 * `collection` filter). Invalid / blank values format to "".
 */
import { formatDateOnly, DEFAULT_DATE_FORMAT } from "../utils/dateFormat.js";

export function registerDateFilter(engine) {
  engine.registerFilter("format_date", function (value, overrideFormat) {
    // Two sources, as `page_url` has: `{% render %}` isolates the environment
    // scope, so inside a snippet `context.get(["globals"])` is undefined.
    const globals = this.context.get(["globals"]) || this.context.globals;
    const format =
      (typeof overrideFormat === "string" && overrideFormat) || globals?.dateFormat || DEFAULT_DATE_FORMAT;
    // A date on a Greek page reads in Greek. The format itself is the site's
    // choice and does not change with it.
    return formatDateOnly(value, format, globals?.currentPageData?.language || globals?.defaultLanguage);
  });
}
