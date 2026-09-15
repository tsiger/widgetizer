// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MediaDrawer from "../MediaDrawer.jsx";

// The drawer has two load-bearing behaviors:
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

  it("does not submit a form it was opened from inside", async () => {
    const outerSubmit = vi.fn((event) => event.preventDefault());
    const onSave = vi.fn();
    render(
      <form onSubmit={outerSubmit}>
        <MediaDrawer
          visible
          onClose={vi.fn()}
          selectedFile={SELECTED_FILE}
          onSave={onSave}
          loading={false}
          activeProject={ACTIVE_PROJECT}
        />
      </form>,
    );

    await waitFor(() => expect(document.getElementById("alt").value).toBe("Sunset over the bay"));
    fireEvent.click(screen.getByRole("button", { name: "forms.media.save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(outerSubmit).not.toHaveBeenCalled();
  });
});
