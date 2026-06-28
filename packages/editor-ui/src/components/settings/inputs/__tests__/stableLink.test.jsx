// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { StableLink } from "../stableLink";

// Headless editor over the SAME Link extension the rich-text input uses, so we can
// assert the stable-ref attribute behavior without mounting the whole React component.
function mount() {
  return new Editor({
    extensions: [StarterKit.configure({ link: false }), StableLink],
    content: "<p>hello</p>",
  });
}

describe("StableLink", () => {
  it("round-trips data-page-uuid through the editor (preserves the ref on edit)", () => {
    const editor = mount();
    editor.commands.selectAll();
    editor.commands.setLink({ href: "about.html", "data-page-uuid": "p1" });
    expect(editor.getHTML()).toContain('data-page-uuid="p1"');
    editor.destroy();
  });

  it("clears both stable refs when switched to a file link (P1 regression)", () => {
    const editor = mount();
    editor.commands.selectAll();
    // Start as an internal page link…
    editor.commands.setLink({ href: "about.html", "data-page-uuid": "p1" });
    expect(editor.getHTML()).toContain('data-page-uuid="p1"');
    // …then switch to a file link, clearing both refs (mirrors handleLinkFile's fix).
    editor.commands.setLink({
      href: "/uploads/files/x.pdf",
      "data-page-uuid": null,
      "data-collection-item-uuid": null,
    });
    const html = editor.getHTML();
    expect(html).toContain('href="/uploads/files/x.pdf"');
    expect(html).not.toContain("data-page-uuid");
    expect(html).not.toContain("data-collection-item-uuid");
    editor.destroy();
  });
});
