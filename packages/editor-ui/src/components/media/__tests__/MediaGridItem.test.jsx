// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import MediaGridItem from "../MediaGridItem.jsx";

// Finding D5: audio files lost their distinct Music icon in the grid view and
// fell back to the generic FileText (document) icon. Non-audio non-images must
// still show FileText.

const ACTIVE_PROJECT = { id: "proj-1" };

function renderItem(file) {
  return render(
    <MediaGridItem
      file={file}
      isSelected={false}
      onSelect={vi.fn()}
      onDelete={vi.fn()}
      onView={vi.fn()}
      onEdit={vi.fn()}
      onCopyUrl={vi.fn()}
      activeProject={ACTIVE_PROJECT}
    />,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("MediaGridItem — non-image icon", () => {
  it("shows the Music icon for an audio file", () => {
    const { container } = renderItem({ id: "a", type: "audio/mpeg", filename: "song.mp3" });
    expect(container.querySelector(".lucide-music")).not.toBeNull();
    expect(container.querySelector(".lucide-file-text")).toBeNull();
  });

  it("shows the FileText icon for a non-audio document", () => {
    const { container } = renderItem({ id: "p", type: "application/pdf", filename: "doc.pdf" });
    expect(container.querySelector(".lucide-file-text")).not.toBeNull();
    expect(container.querySelector(".lucide-music")).toBeNull();
  });
});
