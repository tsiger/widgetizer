// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import MediaDrawer from "../MediaDrawer.jsx";

// Two master fixes were dropped in the package port (finding D4):
//
//  1. First-open reset — ImageInput mounts this drawer already-visible with the
//     file set (a conditional `{visible && file && <MediaDrawer/>}`). The
//     populate-form effect only resets when the ref it compares against differs
//     from the current file; seeding that ref with the initial file makes the
//     first open see "no change" and skip the reset, leaving alt/title/caption
//     blank. Seeding the ref with a null sentinel fixes it.
//
//  2. Body portal — the fixed overlay must render through createPortal(document.body)
//     so it escapes any ancestor stacking context (e.g. a @dnd-kit sortable row's
//     transform/z-index in GalleryInput).

const SELECTED_FILE = {
  id: "file-1",
  type: "image/png",
  path: "/uploads/images/sunset.png",
  filename: "sunset.png",
  metadata: { alt: "Sunset over the bay", title: "Sunset", caption: "Golden hour" },
};

const ACTIVE_PROJECT = { id: "proj-1" };

function renderDrawer(overrides = {}) {
  return render(
    <MediaDrawer
      visible
      onClose={vi.fn()}
      selectedFile={SELECTED_FILE}
      onSave={vi.fn()}
      loading={false}
      activeProject={ACTIVE_PROJECT}
      {...overrides}
    />,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("MediaDrawer", () => {
  it("populates the form on first open when mounted already-visible with a file", async () => {
    renderDrawer();

    await waitFor(() => {
      expect(document.getElementById("alt")).not.toBeNull();
    });
    expect(document.getElementById("alt").value).toBe("Sunset over the bay");
    expect(document.getElementById("title").value).toBe("Sunset");
    expect(document.getElementById("caption").value).toBe("Golden hour");
  });

  it("renders the overlay through a portal to document.body, not inline", () => {
    const { container } = renderDrawer();

    // Portaled: the dialog is a child of document.body, NOT of the render container.
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
