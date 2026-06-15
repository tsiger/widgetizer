/**
 * Rich-text (RTE) helpers.
 *
 * Richtext fields are never truly `blank` when "empty" — the editor leaves
 * behind markup like `<p></p>`, `<p><br></p>`, or `<p>&nbsp;</p>`, so the usual
 * `{% if x == blank %}` guard (which works for `text`/`textarea`) always thinks
 * the field has content. These filters collapse that markup so visibility and
 * layout can key off real content presence.
 *
 *   rte_text  — collapse an RTE value to its plain text (strip tags, nbsp, whitespace)
 *   rte_blank — boolean: is the RTE value visually empty? (<p></p>, <p><br></p>, &nbsp; …)
 *
 * Usage:
 *   {% assign t = widget.settings.copyright | rte_text %}{% if t != blank %}…{% endif %}
 *   {% unless widget.settings.copyright | rte_blank %}…{% endunless %}
 *
 * Note: always output the **raw original** (`| raw`) for display — these filters
 * are for the emptiness test only, never for rendering.
 */
export function registerRteFilters(engine) {
  const toText = (html) => {
    if (!html || typeof html !== "string") return "";
    return html
      .replace(/<[^>]*>/g, "") // strip tags
      .replace(/&nbsp;|&#160;|&#xa0;/gi, "") // non-breaking spaces (named, decimal, hex)
      .replace(/\s+/g, " ") // collapse whitespace
      .trim();
  };

  engine.registerFilter("rte_text", toText);
  engine.registerFilter("rte_blank", (html) => toText(html) === "");
}
