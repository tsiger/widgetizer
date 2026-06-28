// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import MediaListItem from "../MediaListItem.jsx";

// Audio files get their distinct Music icon in the list view. Non-audio
// non-images still show FileText.

const ACTIVE_PROJECT = { id: "proj-1" };

function renderItem(file) {
  return render(
    <table>
      <tbody>
        <tr>
          <MediaListItem
            file={file}
            isSelected={false}
            onSelect={vi.fn()}
            onDelete={vi.fn()}
            onView={vi.fn()}
            onEdit={vi.fn()}
            onCopyUrl={vi.fn()}
            activeProject={ACTIVE_PROJECT}
          />
        </tr>
      </tbody>
    </table>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("MediaListItem — non-image icon", () => {
  it("shows the Music icon for an audio file", () => {
    const { container } = renderItem({ id: "a", type: "audio/mpeg", filename: "song.mp3", size: 1024, uploaded: "2026-01-01" });
    expect(container.querySelector(".lucide-music")).not.toBeNull();
    expect(container.querySelector(".lucide-file-text")).toBeNull();
  });

  it("shows the FileText icon for a non-audio document", () => {
    const { container } = renderItem({ id: "p", type: "application/pdf", filename: "doc.pdf", size: 1024, uploaded: "2026-01-01" });
    expect(container.querySelector(".lucide-file-text")).not.toBeNull();
    expect(container.querySelector(".lucide-music")).toBeNull();
  });
});
