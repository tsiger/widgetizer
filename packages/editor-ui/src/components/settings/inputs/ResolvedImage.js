/**
 * ResolvedImage — a TipTap Image extension that keeps the *stored* `src` a portable
 * `/uploads/…` path while *displaying* a resolved, loadable URL in the editor.
 *
 * Why: the stored HTML must contain the portable path — that's what the backend
 * sanitizes, usage-tracks, and rewrites to `assets/…` on export. But the browser
 * can't load `/uploads/…` directly (media is served under `/api/media/projects/…`),
 * so the on-screen `<img>` needs a resolved URL.
 *
 * The decoupling lives entirely in a NodeView: `editor.getHTML()` serializes through
 * the schema's `renderHTML` (the portable path, untouched), and the NodeView only
 * swaps the `src` of the on-screen `<img>`. Pass a resolver via
 * `ResolvedImage.configure({ resolveSrc: (path) => url })`.
 */
import Image from "@tiptap/extension-image";

const ResolvedImage = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      // Identity by default → behaves like the stock extension until a resolver is
      // supplied (e.g. when no active project is available to resolve against).
      resolveSrc: (src) => src,
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const img = document.createElement("img");
      // Mirror every rendered attribute (alt, class, title, …) onto the DOM node…
      for (const [key, val] of Object.entries(HTMLAttributes)) {
        if (val != null) img.setAttribute(key, val);
      }
      // …then override only the on-screen src with the resolved, loadable URL. The
      // node's stored `src` attribute is left alone, so getHTML() stays portable.
      img.setAttribute("src", this.options.resolveSrc(node.attrs.src || ""));
      return { dom: img };
    };
  },
});

export default ResolvedImage;
