import Link from "@tiptap/extension-link";

// Persist stable internal-link refs on richtext anchors (LINK-022→025) so renames
// follow / deletes clear at render. Crucially, this makes the editor ROUND-TRIP these
// attrs: without it, opening enriched/preset richtext and saving would strip them.
// renderHTML omits the attr entirely when null (external/file links stay clean).
const attr = (name) => ({
  default: null,
  parseHTML: (el) => el.getAttribute(name) || null,
  renderHTML: (attrs) => (attrs[name] ? { [name]: attrs[name] } : {}),
});

export const StableLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-page-uuid": attr("data-page-uuid"),
      "data-collection-item-uuid": attr("data-collection-item-uuid"),
    };
  },
});
